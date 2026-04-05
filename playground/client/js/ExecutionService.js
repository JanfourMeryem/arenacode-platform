/* ═══════════════════════════════════════════════════════════
   AlgoArena — ExecutionService (WebSocket client)
   Auto-reconnect with exponential backoff, connection events
   ═══════════════════════════════════════════════════════════ */

export class ExecutionService {
  constructor(wsBaseUrl) {
    this.wsUrl = wsBaseUrl;
    this.ws = null;
    this.running = false;

    /* Reconnection state */
    this._reconnectAttempts = 0;
    this._maxReconnectAttempts = 8;
    this._reconnectTimer = null;
    this._intentionalClose = false;

    /* Callbacks */
    this.onOutput = null;             // (type:'stdout'|'stderr'|'info', data:string)
    this.onExit = null;               // (code:number|null, timedOut:boolean, killed:boolean)
    this.onError = null;              // (message:string)
    this.onConnectionChange = null;   // (state:'connected'|'disconnected'|'reconnecting')
  }

  /* ─── Connection state ─── */

  get connected() {
    return this.ws && this.ws.readyState === WebSocket.OPEN;
  }

  /* ─── Connect ─── */

  _ensureConnection() {
    return new Promise((resolve, reject) => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        resolve();
        return;
      }

      // Close stale socket
      if (this.ws) {
        try { this.ws.close(); } catch {}
        this.ws = null;
      }

      this._intentionalClose = false;
      this.ws = new WebSocket(this.wsUrl);

      this.ws.onopen = () => {
        this._reconnectAttempts = 0;
        this.onConnectionChange?.('connected');
        resolve();
      };

      this.ws.onerror = (e) => {
        // Only reject if this is the initial connect attempt (not a background reconnect)
        if (this._reconnectAttempts === 0) {
          this.onConnectionChange?.('disconnected');
          reject(new Error('WebSocket connection failed'));
        }
      };

      this.ws.onmessage = (event) => {
        this._handleMessage(event);
      };

      this.ws.onclose = () => {
        const wasRunning = this.running;
        this.running = false;
        this.ws = null;

        if (this._intentionalClose) {
          this.onConnectionChange?.('disconnected');
          return;
        }

        if (wasRunning) {
          this.onConnectionChange?.('disconnected');
        }

        // Auto-reconnect with exponential backoff
        this._scheduleReconnect();
      };
    });
  }

  /* ─── Auto-reconnect ─── */

  _scheduleReconnect() {
    if (this._intentionalClose) return;
    if (this._reconnectAttempts >= this._maxReconnectAttempts) {
      this.onConnectionChange?.('disconnected');
      return;
    }

    this._reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this._reconnectAttempts - 1), 30000);
    this.onConnectionChange?.('reconnecting');

    this._reconnectTimer = setTimeout(async () => {
      if (this._intentionalClose) return;
      try {
        await this._ensureConnection();
      } catch {
        // _scheduleReconnect will be called again from ws.onclose
      }
    }, delay);
  }

  /* ─── Run ─── */

  async run(language, files, entryFile) {
    await this._ensureConnection();
    this.running = true;

    this.ws.send(JSON.stringify({
      action: 'run',
      language,
      files,
      entryFile,
    }));
  }

  /* ─── Send stdin ─── */

  sendStdin(data) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ action: 'stdin', data }));
    }
  }

  /* ─── Kill ─── */

  kill() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ action: 'kill' }));
    }
    this.running = false;
  }

  /* ─── Message handler ─── */

  _handleMessage(event) {
    let msg;
    try { msg = JSON.parse(event.data); } catch { return; }

    switch (msg.type) {
      case 'stdout':
      case 'stderr':
      case 'info':
        this.onOutput?.(msg.type, msg.data);
        break;

      case 'exit':
        this.running = false;
        this.onExit?.(msg.code, !!msg.timedOut, !!msg.killed);
        break;

      case 'error':
        this.onError?.(msg.data);
        break;
    }
  }

  /* ─── Disconnect ─── */

  disconnect() {
    this._intentionalClose = true;
    clearTimeout(this._reconnectTimer);
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.running = false;
    this.onConnectionChange?.('disconnected');
  }
}
