/* ═══════════════════════════════════════════════════════════
   AlgoArena — WebSocket execution handler
   Real-time interactive terminal via WebSocket.
   ═══════════════════════════════════════════════════════════ */

'use strict';

const { WebSocketServer } = require('ws');
const config = require('../config');
const { executeInteractive, cleanRunDir } = require('../services/CodeRunner');
const log = require('../utils/logger');

let connectionCount = 0;

/* Per-session limits */
const MAX_WS_OUTPUT  = config.MAX_OUTPUT * 4; // 256 KB default
const MAX_WS_STDIN   = 64 * 1024;            // 64 KB total stdin per session

/**
 * Attach a WebSocket server to the given HTTP server.
 */
function attachWebSocket(httpServer) {
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  /* ─── Heartbeat to detect dead connections ─── */
  const heartbeat = setInterval(() => {
    wss.clients.forEach((ws) => {
      if (ws.isAlive === false) {
        log.debug('Terminating dead WS connection');
        return ws.terminate();
      }
      ws.isAlive = false;
      ws.ping();
    });
  }, config.WS_HEARTBEAT_MS);

  wss.on('close', () => clearInterval(heartbeat));

  wss.on('connection', (ws, req) => {
    connectionCount++;
    ws.isAlive = true;
    const clientIP = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    log.info(`WS connected [${connectionCount} total]`, { ip: clientIP });

    if (connectionCount > config.WS_MAX_CONNECTIONS) {
      log.warn('Max WS connections reached, rejecting');
      ws.close(1013, 'Max connections reached');
      connectionCount--;
      return;
    }

    /* Per-connection state */
    let currentProcess = null;
    let currentRunDir = null;
    let killTimer = null;
    let totalOutputBytes = 0;
    let totalStdinBytes = 0;
    let exitSent = false;

    const sendJSON = (obj) => {
      if (ws.readyState === 1) ws.send(JSON.stringify(obj));
    };

    const resetExitState = () => {
      exitSent = false;
    };

    const sendExit = (payload = {}) => {
      if (exitSent) return;
      exitSent = true;
      sendJSON({ type: 'exit', ...payload });
    };

    const killProcess = (proc) => {
      if (!proc) return;
      try { proc.kill('SIGTERM'); } catch {}
      // Escalate to SIGKILL after 2 seconds if still alive
      setTimeout(() => {
        try { proc.kill('SIGKILL'); } catch {}
      }, 2000).unref();
    };

    const cleanup = async () => {
      if (killTimer) { clearTimeout(killTimer); killTimer = null; }
      if (currentProcess) {
        killProcess(currentProcess);
        currentProcess = null;
      }
      if (currentRunDir) {
        const dir = currentRunDir;
        currentRunDir = null;
        cleanRunDir(dir);
      }
    };

    ws.on('pong', () => { ws.isAlive = true; });

    ws.on('message', async (raw) => {
      let msg;
      try { msg = JSON.parse(raw.toString()); } catch {
        sendJSON({ type: 'error', data: 'Invalid JSON' });
        return;
      }

      /* ── Kill ── */
      if (msg.action === 'kill') {
        sendExit({ code: null, killed: true });
        await cleanup();
        return;
      }

      /* ── Stdin ── */
      if (msg.action === 'stdin') {
        if (currentProcess?.stdin && !currentProcess.stdin.destroyed) {
          const data = String(msg.data || '');
          totalStdinBytes += Buffer.byteLength(data, 'utf8');
          if (totalStdinBytes > MAX_WS_STDIN) {
            sendJSON({ type: 'stderr', data: '\r\n[stdin limit exceeded]\r\n' });
            return;
          }
          currentProcess.stdin.write(data, () => {}); // swallow EPIPE via callback
        }
        return;
      }

      /* ── Run ── */
      if (msg.action === 'run') {
        await cleanup();
        resetExitState();
        totalOutputBytes = 0;
        totalStdinBytes = 0;
        const { language, files, entryFile } = msg;

        if (!language || !Array.isArray(files) || !files.length) {
          sendJSON({ type: 'error', data: 'Missing language or files.' });
          return;
        }

        if (!config.SUPPORTED_LANGUAGES.includes(language)) {
          sendJSON({ type: 'error', data: `Unsupported language: ${language}` });
          return;
        }

        log.info('WS run', { language, filesCount: files.length, entryFile });

        try {
          const result = await executeInteractive(language, files, entryFile, (info) => {
            sendJSON({ type: 'info', data: info });
          });

          currentRunDir = result.runDir;

          if (result.compileError) {
            sendJSON({ type: 'stderr', data: result.compileError });
            sendExit({ code: 1 });
            await cleanup();
            return;
          }

          currentProcess = result.child;

          /* Swallow EPIPE errors on stdin (Critical #2) */
          if (currentProcess.stdin) {
            currentProcess.stdin.on('error', () => {});
          }

          /* Timeout watchdog */
          const timeoutSec = Math.round(config.EXEC_TIMEOUT / 1000);
          killTimer = setTimeout(() => {
            sendJSON({ type: 'stderr', data: `\r\n[Process timed out after ${timeoutSec}s. Program may be waiting for input.]\r\n` });
            sendExit({ code: null, timedOut: true });
            cleanup();
          }, config.EXEC_TIMEOUT);

          /* Capped output forwarding (High #6) */
          const forwardOutput = (type) => (data) => {
            if (totalOutputBytes >= MAX_WS_OUTPUT) return;
            const str = data.toString();
            const remaining = MAX_WS_OUTPUT - totalOutputBytes;
            const chunk = str.length > remaining ? str.slice(0, remaining) : str;
            totalOutputBytes += chunk.length;
            sendJSON({ type, data: chunk });
            if (totalOutputBytes >= MAX_WS_OUTPUT) {
              sendJSON({ type: 'stderr', data: '\r\n[Output limit reached]\r\n' });
            }
          };
          currentProcess.stdout.on('data', forwardOutput('stdout'));
          currentProcess.stderr.on('data', forwardOutput('stderr'));

          currentProcess.on('error', (err) => {
            clearTimeout(killTimer); killTimer = null;
            sendJSON({ type: 'error', data: err.message });
            cleanup().catch(() => {});
          });

          /* Critical #1: capture runDir at attach time, clean immediately */
          const runDirForThisProcess = currentRunDir;
          currentProcess.on('close', (code) => {
            clearTimeout(killTimer); killTimer = null;
            currentProcess = null;
            sendExit({ code });
            // Clean only this run's directory, not the mutable currentRunDir
            if (runDirForThisProcess) {
              if (currentRunDir === runDirForThisProcess) currentRunDir = null;
              cleanRunDir(runDirForThisProcess);
            }
          });

        } catch (err) {
          log.error('WS execution error', { message: err.message });
          sendJSON({ type: 'error', data: err.message || 'Execution failed.' });
          await cleanup();
        }
      }
    });

    ws.on('close', () => {
      connectionCount--;
      log.info(`WS disconnected [${connectionCount} remaining]`);
      cleanup().catch((e) => log.error('cleanup error', { message: e.message }));
    });

    ws.on('error', (err) => {
      log.error('WS error', { message: err.message });
      cleanup().catch((e) => log.error('cleanup error', { message: e.message }));
    });
  });

  log.info('WebSocket server attached');
  return wss;
}

module.exports = { attachWebSocket };
