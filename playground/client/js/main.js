/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   AlgoArena â€” App Bootstrap
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

import { EditorManager } from './EditorManager.js';
import { FileManager } from './FileManager.js';
import { ExecutionService } from './ExecutionService.js';
import { TerminalManager } from './TerminalManager.js';
import { ProjectManager } from './ProjectManager.js';
import { TemplateManager } from './TemplateManager.js';
import { UIController } from './UIController.js';
import { DEFAULT_ENTRY, debounce, MOD, langColorFromFilename, langFromFilename } from './utils.js';
import { BatchExecutionService } from './services/BatchExecutionService.js';
import { detectRuntimeContext } from './modes/runtimeContext.js';
import { SnakeChallengeBridge } from './modes/snake/SnakeChallengeBridge.js';
import { LabyrinthChallengeBridge } from './modes/labyrinth/LabyrinthChallengeBridge.js';
import { TreasureChallengeBridge } from './modes/treasure/TreasureChallengeBridge.js';
import { RockPaperScissorsChallengeBridge } from './modes/rockPaperScissors/RockPaperScissorsChallengeBridge.js';

export async function initApp() {
  /* â”€â”€â”€ DOM refs â”€â”€â”€ */
  const $ = (sel) => document.querySelector(sel);
  const langSelect = $('#language-select');
  const runBtn = $('#run-btn');
  const runIcon = $('#run-icon');
  const runLabel = $('#run-label');
  const projectNameInput = $('#project-name-input');
  const statusLanguage = $('#status-language');
  const statusLineCol = $('#status-line-col');
  const statusConnection = $('#status-connection');
  const statusTimer = $('#status-timer');
  const explorerToggleBtn = $('#explorer-toggle-btn');
  const t = (key, fallback = '') => {
    if (window.ArenaI18n && typeof window.ArenaI18n.t === 'function') {
      return window.ArenaI18n.t(key, fallback);
    }
    return fallback || key;
  };

  /* â”€â”€â”€ Init modules â”€â”€â”€ */
  const runtimeContext = detectRuntimeContext();
  const ui = new UIController(runtimeContext);
  ui.initTheme();

  const editor = new EditorManager($('#editor-container'));
  const files = new FileManager($('#file-tree'), $('#tab-bar'));
  const terminal = new TerminalManager($('#terminal-container'));
  const snakeBridge = new SnakeChallengeBridge(runtimeContext);
  const labyrinthBridge = new LabyrinthChallengeBridge(runtimeContext);
  const treasureBridge = new TreasureChallengeBridge(runtimeContext);
  const rockPaperScissorsBridge = new RockPaperScissorsChallengeBridge(runtimeContext);
  const batchExecution = new BatchExecutionService();

  const syncExplorerToggleState = () => {
    if (!explorerToggleBtn) return;
    const expanded = !ui.sidebarCollapsed;
    explorerToggleBtn.setAttribute('aria-expanded', expanded ? 'true' : 'false');
    explorerToggleBtn.classList.toggle('active', expanded);
  };

  const toggleSidebarAndRefresh = () => {
    ui.toggleSidebar();
    if (runtimeContext.isEmbeddedChallenge) {
      document.body.classList.remove('sidebar-open');
    }
    syncExplorerToggleState();
  };

  if (runtimeContext.isEmbeddedChallenge) {
    document.body.classList.add('challenge-embed');
    document.body.classList.add('sidebar-collapsed');
    document.body.classList.remove('sidebar-open');
    ui.sidebarCollapsed = true;
  }

  syncExplorerToggleState();

  /* Auto-detect WebSocket URL: works in dev (port 3000) and production (behind nginx /ws) */
  const wsProto = location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${wsProto}//${location.host}/ws`;
  const execution = new ExecutionService(wsUrl);

  const projects = new ProjectManager(runtimeContext);
  const templates = new TemplateManager();

  await templates.load().catch(() => {});

  let currentLanguage = langSelect.value;
  let isRunning = false;
  let execTimerInterval = null;
  let execStartTime = null;
  let execIdleHintInterval = null;
  let execLastActivityAt = 0;
  let execIdleHintShown = false;
  let currentProject = null;

  function cloneFiles(fileList = []) {
    return fileList
      .filter((file) => file && typeof file.name === 'string')
      .map((file) => ({ name: file.name, content: typeof file.content === 'string' ? file.content : '' }));
  }

  function inferWorkspaceLanguage(fileList = [], entryFile = null, fallback = 'python') {
    const names = cloneFiles(fileList).map((file) => file.name);
    const preferred = [entryFile, ...names].filter(Boolean);

    for (const name of preferred) {
      const inferred = langFromFilename(name);
      if (inferred) return inferred;
    }

    return fallback;
  }

  function createWorkspace(language, initialFiles = null) {
    const fileList = cloneFiles(initialFiles && initialFiles.length ? initialFiles : templates.getStarterFiles(language));
    const fallbackEntry = DEFAULT_ENTRY[language] || (fileList[0]?.name ?? 'main.txt');
    const entryFile = fileList.find((file) => file.name === fallbackEntry)?.name || fileList[0]?.name || fallbackEntry;

    return {
      files: fileList,
      entryFile,
      openTabs: entryFile ? [entryFile] : [],
      activeFile: entryFile || null,
    };
  }

  function normalizeWorkspace(language, workspaceLike = null) {
    const fileList = cloneFiles(workspaceLike?.files || workspaceLike || []);
    if (!fileList.length) return createWorkspace(language);

    const names = new Set(fileList.map((file) => file.name));
    const fallbackEntry = DEFAULT_ENTRY[language] || fileList[0].name;
    const entryFile = (workspaceLike?.entryFile && names.has(workspaceLike.entryFile))
      ? workspaceLike.entryFile
      : (names.has(fallbackEntry) ? fallbackEntry : fileList[0].name);

    const openTabs = Array.isArray(workspaceLike?.openTabs)
      ? workspaceLike.openTabs.filter((name) => names.has(name))
      : [];
    if (!openTabs.length && entryFile) openTabs.push(entryFile);

    const activeFile = (workspaceLike?.activeFile && names.has(workspaceLike.activeFile))
      ? workspaceLike.activeFile
      : (openTabs[0] || entryFile);

    return {
      files: fileList,
      entryFile,
      openTabs,
      activeFile,
    };
  }

  function normalizeProject(project = null) {
    const name = project?.name || t('playground.project.untitled', 'Untitled Project');
    const language = project?.language || 'python';
    const workspaces = {};
    const legacyFiles = Array.isArray(project?.files) ? cloneFiles(project.files) : [];
    const legacyLanguage = inferWorkspaceLanguage(legacyFiles, project?.entryFile, language);

    if (project?.workspaces && typeof project.workspaces === 'object') {
      for (const [lang, workspace] of Object.entries(project.workspaces)) {
        const normalizedWorkspace = normalizeWorkspace(lang, workspace);
        const inferredLanguage = inferWorkspaceLanguage(
          normalizedWorkspace.files,
          normalizedWorkspace.entryFile,
          lang
        );
        if (inferredLanguage !== lang && workspaces[inferredLanguage]) {
          continue;
        }

        const targetLanguage = inferredLanguage !== lang ? inferredLanguage : lang;

        workspaces[targetLanguage] = targetLanguage === lang
          ? normalizedWorkspace
          : normalizeWorkspace(targetLanguage, normalizedWorkspace);
      }
    }

    if (!Object.keys(workspaces).length && legacyFiles.length) {
      workspaces[legacyLanguage] = normalizeWorkspace(legacyLanguage, project);
    }

    if (!workspaces[language]) {
      workspaces[language] = createWorkspace(language);
    }

    const activeWorkspace = workspaces[language];

    return {
      ...(project || {}),
      name,
      language,
      workspaces,
      files: cloneFiles(activeWorkspace.files),
      entryFile: activeWorkspace.entryFile,
      openTabs: [...activeWorkspace.openTabs],
      activeFile: activeWorkspace.activeFile,
    };
  }

  function syncCurrentWorkspaceToProject() {
    if (!currentProject) return null;

    const workspace = normalizeWorkspace(currentLanguage, {
      files: files.getAllFiles(),
      entryFile: files.getEntryFile(),
      openTabs: files.getOpenTabs(),
      activeFile: files.getActiveFile(),
    });

    currentProject.name = projectNameInput.value || t('playground.project.untitled', 'Untitled Project');
    currentProject.language = currentLanguage;
    currentProject.workspaces[currentLanguage] = workspace;
    currentProject.files = cloneFiles(workspace.files);
    currentProject.entryFile = workspace.entryFile;
    currentProject.openTabs = [...workspace.openTabs];
    currentProject.activeFile = workspace.activeFile;

    return currentProject;
  }

  function applyWorkspace(language) {
    if (!currentProject) return;

    const workspace = currentProject.workspaces[language]
      ? normalizeWorkspace(language, currentProject.workspaces[language])
      : createWorkspace(language);

    currentProject.workspaces[language] = workspace;
    currentProject.language = language;
    currentProject.files = cloneFiles(workspace.files);
    currentProject.entryFile = workspace.entryFile;
    currentProject.openTabs = [...workspace.openTabs];
    currentProject.activeFile = workspace.activeFile;

    currentLanguage = language;
    langSelect.value = language;

    editor.closeAll();
    files.setFiles(workspace.files, workspace.entryFile, workspace.openTabs, workspace.activeFile);

    const active = files.getActiveFile();
    if (active) {
      editor.openFile(active, files.getContent(active));
    }

    updateStatusLanguage();
  }

  /* â”€â”€â”€ Wire: File manager â†” Editor â”€â”€â”€ */
  files.onFileSelect = (name) => {
    editor.openFile(name, files.getContent(name));
    updateStatusLanguage();
    // Update editor accent stripe color
    const lc = langColorFromFilename(name);
    const edArea = document.getElementById('editor-area');
    if (edArea) {
      if (lc) {
        edArea.style.setProperty('--editor-lang-color', lc);
        edArea.classList.add('has-lang-accent');
      } else {
        edArea.classList.remove('has-lang-accent');
      }
    }
  };

  files.onFileClose = (name) => {
    editor.closeFile(name);
    const next = files.getActiveFile();
    if (next) editor.openFile(next, files.getContent(next));
  };

  files.onFilesChanged = () => {
    autoSave();
  };

  files.onFileRename = (oldName, newName) => {
    editor.renameFile(oldName, newName);
  };

  /* Sync editor content back to file manager on change */
  editor.onContentChange = (name, content) => {
    files.updateContent(name, content);
    autoSave();
  };

  /* â”€â”€â”€ Wire: Terminal â†” Execution â”€â”€â”€ */
  terminal.onStdinData = (data) => {
    execution.sendStdin(data);
  };

  terminal.onKillRequest = () => {
    stopExecution();
  };

  execution.onOutput = (type, data) => {
    markExecutionActivity();
    if (type === 'stderr') {
      terminal.writeError(data);
    } else if (type === 'info') {
      terminal.writeSystem(data, 'info');
    } else {
      terminal.write(data);
    }
  };

  execution.onExit = (code, timedOut, killed) => {
    terminal.disableInput();
    terminal.writeEndDivider();
    if (timedOut) {
      terminal.writeSystem('\nâ± Process timed out. If your program needs input, type it in the terminal and press Enter.\n', 'warning');
    } else if (killed) {
      terminal.writeSystem('\nðŸ›‘ Process killed.\n', 'warning');
    } else if (code === null || code === undefined) {
      terminal.writeSystem('\nProcess ended.\n', 'warning');
    } else {
      const icon = code === 0 ? 'âœ“' : 'âœ—';
      const color = code === 0 ? 'success' : 'error';
      terminal.writeSystem(`\nProcess exited with code ${code} ${icon}\n`, color);
    }
    setRunningState(false);
  };

  execution.onError = (msg) => {
    terminal.writeError('\n' + msg);
    setRunningState(false);
  };

  execution.onConnectionChange = (state) => {
    // Update status bar connection indicator
    const dot = statusConnection?.querySelector('.status-dot');
    if (dot) {
      dot.className = 'status-dot';
      if (state === 'connected') {
        dot.classList.add('connected');
        statusConnection.querySelector('.status-label').textContent = t('playground.connection.connected', 'Connected');
      } else if (state === 'reconnecting') {
        dot.classList.add('running');
        statusConnection.querySelector('.status-label').textContent = t('playground.connection.reconnecting', 'Reconnecting...');
      } else {
        dot.classList.add('disconnected');
        statusConnection.querySelector('.status-label').textContent = t('playground.connection.disconnected', 'Disconnected');
      }
    }

    if (state !== 'connected' && isRunning) {
      terminal.writeSystem('\nâš  Connection lost.');
      setRunningState(false);
    }
  };

  /* â”€â”€â”€ Run / Stop â”€â”€â”€ */
  function buildExecutionPayload(language, allFiles, entryFile) {
    return {
      language,
      files: cloneFiles(allFiles),
      entryFile,
    };
  }

  const challengeRejectionMessage = () => t('common.submission_rejected', 'Submission rejected by challenge rules.');

  function renderChallengeRejectionOnly() {
    terminal.clear();
    terminal.writeSystem(`${challengeRejectionMessage()}\n`, 'warning');
  }

  function resolveSnakeChallengeFeedbackMessage(data, deliveryState) {
    if (snakeBridge.isSimulationRejected(data)) {
      return challengeRejectionMessage();
    }

    if (!deliveryState || !deliveryState.reason) return null;

    if (deliveryState.reason === 'invalid_output') {
      return challengeRejectionMessage();
    }

    if (deliveryState.reason === 'missing_simulation' || deliveryState.reason === 'invalid_judge_status') {
      return challengeRejectionMessage();
    }

    return null;
  }

  function resolveLabyrinthChallengeFeedbackMessage(data, deliveryState) {
    if (labyrinthBridge.isSimulationRejected(data)) {
      return challengeRejectionMessage();
    }

    if (!deliveryState || !deliveryState.reason) return null;

    if (
      deliveryState.reason === 'missing_simulation' ||
      deliveryState.reason === 'invalid_judge_status' ||
      deliveryState.reason === 'simulation_rejected'
    ) {
      return challengeRejectionMessage();
    }

    return null;
  }

  function resolveTreasureChallengeFeedbackMessage(data, deliveryState) {
    if (treasureBridge.isSimulationRejected(data)) {
      return challengeRejectionMessage();
    }

    if (!deliveryState || !deliveryState.reason) return null;

    if (
      deliveryState.reason === 'missing_simulation'
      || deliveryState.reason === 'invalid_judge_status'
      || deliveryState.reason === 'simulation_rejected'
    ) {
      return challengeRejectionMessage();
    }

    return null;
  }

  function resolveRockPaperScissorsChallengeFeedbackMessage(data, deliveryState) {
    if (rockPaperScissorsBridge.isSimulationRejected(data)) {
      return challengeRejectionMessage();
    }

    if (!deliveryState || !deliveryState.reason) return null;

    if (
      deliveryState.reason === 'missing_simulation'
      || deliveryState.reason === 'invalid_judge_status'
      || deliveryState.reason === 'simulation_rejected'
    ) {
      return challengeRejectionMessage();
    }

    return null;
  }

  async function runSnakeChallengeExecution(basePayload) {
    const payload = snakeBridge.buildExecutionPayload(basePayload);
    markExecutionActivity();

    const { response, data } = await batchExecution.execute(payload);
    markExecutionActivity();

    if (!response.ok || data.success !== true) {
      if (data.stderr) {
        terminal.writeError(data.stderr);
      } else {
        terminal.writeError('\nExecution failed.');
      }
      snakeBridge.postRejectionToParent(data, challengeRejectionMessage());
      terminal.writeEndDivider();
      return;
    }

    // In challenge mode, rejected/invalid submissions should not look like successful runs.
    // We intentionally suppress stdout in these cases and show one clear challenge message.
    const deliveryState = snakeBridge.getSimulationDeliveryState(data);
    const challengeFeedback = resolveSnakeChallengeFeedbackMessage(data, deliveryState);
    if (challengeFeedback) {
      renderChallengeRejectionOnly();
      ui.showToast(challengeFeedback, 'warning', 3500);
      snakeBridge.postRejectionToParent(data, challengeFeedback);
      return;
    }

    if (data.stdout) terminal.write(data.stdout);
    if (data.stderr) terminal.writeError(data.stderr);

    // Parent integration contract:
    // only post when simulation + judge status are considered deliverable.
    if (deliveryState.deliverable) {
      snakeBridge.postSimulationToParent(data);
    }

    terminal.writeEndDivider();
  }

  async function runLabyrinthChallengeExecution(basePayload) {
    const payload = labyrinthBridge.buildExecutionPayload(basePayload);
    markExecutionActivity();

    const { response, data } = await batchExecution.execute(payload);
    markExecutionActivity();

    if (!response.ok || data.success !== true) {
      if (data.stderr) {
        terminal.writeError(data.stderr);
      } else {
        terminal.writeError('\nExecution failed.');
      }
      const compactStderr = typeof data?.stderr === 'string' && data.stderr.trim().length
        ? data.stderr.trim().replace(/\s+/g, ' ').slice(0, 220)
        : '';
      const rejectionReason = data?.labyrinthJudge?.reason
        || (compactStderr
          ? `Simulation rejected: ${compactStderr}`
          : 'Simulation rejected: execution failed.');
      labyrinthBridge.postRejectionToParent(data, rejectionReason);
      terminal.writeEndDivider();
      return;
    }

    const deliveryState = labyrinthBridge.getSimulationDeliveryState(data);
    const challengeFeedback = resolveLabyrinthChallengeFeedbackMessage(data, deliveryState);
    if (challengeFeedback) {
      renderChallengeRejectionOnly();
      ui.showToast(challengeFeedback, 'warning', 3500);
      labyrinthBridge.postRejectionToParent(data, challengeFeedback);
      return;
    }

    if (data.stdout) terminal.write(data.stdout);
    if (data.stderr) terminal.writeError(data.stderr);

    if (deliveryState.deliverable) {
      labyrinthBridge.postSimulationToParent(data);
    }

    terminal.writeEndDivider();
  }

  async function runTreasureChallengeExecution(basePayload) {
    const payload = treasureBridge.buildExecutionPayload(basePayload);
    markExecutionActivity();

    const { response, data } = await batchExecution.execute(payload);
    markExecutionActivity();

    if (!response.ok || data.success !== true) {
      if (data.stderr) {
        terminal.writeError(data.stderr);
      } else {
        terminal.writeError('\nExecution failed.');
      }

      const rejectionReason = challengeRejectionMessage();

      treasureBridge.postRejectionToParent(data, rejectionReason);
      terminal.writeEndDivider();
      return;
    }

    const deliveryState = treasureBridge.getSimulationDeliveryState(data);
    const challengeFeedback = resolveTreasureChallengeFeedbackMessage(data, deliveryState);
    if (challengeFeedback) {
      renderChallengeRejectionOnly();
      ui.showToast(challengeFeedback, 'warning', 3500);
      treasureBridge.postRejectionToParent(data, challengeFeedback);
      return;
    }

    if (data.stdout) terminal.write(data.stdout);
    if (data.stderr) terminal.writeError(data.stderr);

    if (deliveryState.deliverable) {
      treasureBridge.postSimulationToParent(data);
    }

    terminal.writeEndDivider();
  }

  async function runRockPaperScissorsChallengeExecution(basePayload) {
    const payload = rockPaperScissorsBridge.buildExecutionPayload(basePayload);
    markExecutionActivity();

    const { response, data } = await batchExecution.execute(payload);
    markExecutionActivity();

    if (!response.ok || data.success !== true) {
      if (data.stderr) {
        terminal.writeError(data.stderr);
      } else {
        terminal.writeError('\nExecution failed.');
      }

      rockPaperScissorsBridge.postRejectionToParent(data, challengeRejectionMessage());
      terminal.writeEndDivider();
      return;
    }

    const deliveryState = rockPaperScissorsBridge.getSimulationDeliveryState(data);
    const challengeFeedback = resolveRockPaperScissorsChallengeFeedbackMessage(data, deliveryState);
    if (challengeFeedback) {
      renderChallengeRejectionOnly();
      ui.showToast(challengeFeedback, 'warning', 3500);
      rockPaperScissorsBridge.postRejectionToParent(data, challengeFeedback);
      return;
    }

    if (data.stdout) terminal.write(data.stdout);
    if (data.stderr) terminal.writeError(data.stderr);

    if (deliveryState.deliverable) {
      rockPaperScissorsBridge.postSimulationToParent(data);
    }

    terminal.writeEndDivider();
  }

  function runExecution() {
    const allFiles = files.getAllFiles();
    if (!allFiles.length) {
      ui.showToast(t('playground.toast.no_files', 'No files to run. Create a file first.'), 'warning');
      return;
    }

    // Sync current editor content
    const activeName = files.getActiveFile();
    if (activeName) {
      files.updateContent(activeName, editor.getContent(activeName));
    }

    const entryFile = files.getEntryFile() || allFiles[0].name;
    const payload = buildExecutionPayload(currentLanguage, allFiles, entryFile);
    terminal.clear();
    const isChallengeMode = snakeBridge.enabled
      || labyrinthBridge.enabled
      || treasureBridge.enabled
      || rockPaperScissorsBridge.enabled;
    if (!isChallengeMode) {
      terminal.writeSystem(`$ Running ${entryFile}  [${currentLanguage}]\n`);
      terminal.writeSystem('Preparing execution environment...\n', 'info');
    }

    if (snakeBridge.enabled) {
      terminal.disableInput();
      setRunningState(true);
      startExecutionFeedbackWatchdog();

      runSnakeChallengeExecution(payload)
        .catch((err) => {
          terminal.writeError('\nSnake challenge execution failed: ' + (err.message || 'Cannot reach server'));
          snakeBridge.postRejectionToParent(null, challengeRejectionMessage());
          terminal.writeEndDivider();
        })
        .finally(() => {
          setRunningState(false);
        });
      return;
    }

    if (labyrinthBridge.enabled) {
      terminal.disableInput();
      setRunningState(true);
      startExecutionFeedbackWatchdog();

      runLabyrinthChallengeExecution(payload)
        .catch((err) => {
          terminal.writeError('\nLabyrinth challenge execution failed: ' + (err.message || 'Cannot reach server'));
          terminal.writeEndDivider();
          labyrinthBridge.postRejectionToParent(null, 'Simulation rejected: backend execution failed.');
        })
        .finally(() => {
          setRunningState(false);
        });
      return;
    }

    if (treasureBridge.enabled) {
      terminal.disableInput();
      setRunningState(true);
      startExecutionFeedbackWatchdog();

      runTreasureChallengeExecution(payload)
        .catch((err) => {
          terminal.writeError('\nTreasure challenge execution failed: ' + (err.message || 'Cannot reach server'));
          terminal.writeEndDivider();
          treasureBridge.postRejectionToParent(null, challengeRejectionMessage());
        })
        .finally(() => {
          setRunningState(false);
        });
      return;
    }

    if (rockPaperScissorsBridge.enabled) {
      terminal.disableInput();
      setRunningState(true);
      startExecutionFeedbackWatchdog();

      runRockPaperScissorsChallengeExecution(payload)
        .catch((err) => {
          terminal.writeError('\nRock Paper Scissors challenge execution failed: ' + (err.message || 'Cannot reach server'));
          terminal.writeEndDivider();
          rockPaperScissorsBridge.postRejectionToParent(null, challengeRejectionMessage());
        })
        .finally(() => {
          setRunningState(false);
        });
      return;
    }

    terminal.enableInput();
    setRunningState(true);
    startExecutionFeedbackWatchdog();

    execution.run(payload.language, payload.files, payload.entryFile).catch((err) => {
      terminal.writeError('\nConnection failed: ' + (err.message || 'Cannot reach server'));
      terminal.writeSystem('\nMake sure the backend is running: cd backend && node server.js');
      setRunningState(false);
    });
  }

  function stopExecution() {
    if (snakeBridge.enabled || labyrinthBridge.enabled || treasureBridge.enabled || rockPaperScissorsBridge.enabled) {
      const challengeName = snakeBridge.enabled
        ? 'Snake'
        : (labyrinthBridge.enabled ? 'Labyrinth' : (treasureBridge.enabled ? 'Treasure' : 'Rock Paper Scissors'));
      terminal.writeSystem(`${challengeName} challenge run sent via HTTP cannot be cancelled mid-request.\n`, 'warning');
      setRunningState(false);
      return;
    }
    execution.kill();
    setRunningState(false);
  }

  function setRunningState(running) {
    isRunning = running;
    runLabel.textContent = running
      ? t('common.stop', 'Stop')
      : t('common.run', 'Run');
    runBtn.classList.toggle('is-running', running);
    if (running) {
      runIcon.innerHTML = '<span class="spinner-sm"></span>';
      execLastActivityAt = Date.now();
      execIdleHintShown = false;
      // Start execution timer
      execStartTime = Date.now();
      if (statusTimer) statusTimer.textContent = '0.0s';
      if (statusTimer) { statusTimer.classList.add('visible'); statusTimer.classList.remove('long-running'); }
      execTimerInterval = setInterval(() => {
        const elapsedMs = Date.now() - execStartTime;
        const elapsed = (elapsedMs / 1000).toFixed(1);
        if (statusTimer) statusTimer.textContent = `${elapsed}s`;
        // Pulse when running for more than 5s
        if (elapsedMs > 5000 && statusTimer && !statusTimer.classList.contains('long-running')) {
          statusTimer.classList.add('long-running');
        }
      }, 100);
    } else {
      runIcon.innerHTML = '<i class="icon icon-play icon-sm"></i>';
      clearExecutionFeedbackWatchdog();
      // Stop execution timer â€” keep last value visible briefly
      clearInterval(execTimerInterval);
      execTimerInterval = null;
      setTimeout(() => {
        if (!isRunning && statusTimer) {
          statusTimer.classList.remove('visible');
          statusTimer.classList.remove('long-running');
        }
      }, 3000);
    }
  }

  function markExecutionActivity() {
    execLastActivityAt = Date.now();
  }

  function startExecutionFeedbackWatchdog() {
    clearExecutionFeedbackWatchdog();
    execLastActivityAt = Date.now();
    execIdleHintShown = false;

    execIdleHintInterval = setInterval(() => {
      if (!isRunning || execIdleHintShown) return;
      const idleMs = Date.now() - execLastActivityAt;
      if (idleMs >= 7000) {
        execIdleHintShown = true;
        terminal.writeSystem('\nStill runningâ€¦ if your program is waiting for input, type in terminal and press Enter.\n', 'warning');
      }
    }, 1000);
  }

  function clearExecutionFeedbackWatchdog() {
    clearInterval(execIdleHintInterval);
    execIdleHintInterval = null;
    execIdleHintShown = false;
  }

  runBtn.addEventListener('click', () => {
    if (isRunning) stopExecution();
    else runExecution();
  });

  /* â”€â”€â”€ Language switch â”€â”€â”€ */
  langSelect.addEventListener('change', () => {
    const newLang = langSelect.value;
    if (newLang === currentLanguage) return;
    syncCurrentWorkspaceToProject();
    applyWorkspace(newLang);
    autoSave();
  });

  /* â”€â”€â”€ Status bar helpers â”€â”€â”€ */
  function updateStatusLanguage() {
    const langNames = {
      python: 'Python',
      java: 'Java',
      c: 'C',
      cpp: 'C++',
      csharp: 'C#',
      php: 'PHP',
      javascript: 'JavaScript',
      typescript: 'TypeScript',
      go: 'Go',
      ruby: 'Ruby',
    };
    // Show language based on active file extension, fallback to selection
    const activeFile = files.getActiveFile();
    const fileLang = activeFile ? langFromFilename(activeFile) : null;
    const displayLang = fileLang || currentLanguage;
    statusLanguage.textContent = langNames[displayLang] || displayLang;
  }

  /* Track cursor position from Monaco */
  editor.onCursorChange = (line, col) => {
    statusLineCol.textContent = `Ln ${line}, Col ${col}`;
  };

  /* â”€â”€â”€ Auto-save (debounced) â”€â”€â”€ */
  const autoSave = debounce(() => {
    const project = buildCurrentProject();
    projects.saveCurrent(project);
  }, 800);

  function buildCurrentProject() {
    return syncCurrentWorkspaceToProject();
  }

  /* â”€â”€â”€ Project management â”€â”€â”€ */
  function loadProject(project) {
    currentProject = normalizeProject(project);
    projectNameInput.value = currentProject.name;
    applyWorkspace(currentProject.language);
  }

  function newProject(lang, initialFiles) {
    const language = lang || 'python';
    const workspace = createWorkspace(language, initialFiles);
    const project = normalizeProject({
      name: t('playground.project.untitled', 'Untitled Project'),
      language,
      workspaces: {
        [language]: workspace,
      },
    });

    const id = projects.createNew(project);
    const created = projects.switchTo(id);
    loadProject(created || project);
    ui.showToast(t('playground.toast.new_project', 'New project created'), 'success');
  }

  projectNameInput?.addEventListener('change', () => autoSave());

  window.addEventListener('arena:languagechange', () => {
    runLabel.textContent = isRunning
      ? t('common.stop', 'Stop')
      : t('common.run', 'Run');

    if (!projectNameInput?.value || projectNameInput.value.trim() === '' || projectNameInput.value === 'Untitled Project') {
      projectNameInput.value = t('playground.project.untitled', 'Untitled Project');
    }
  });

  /* â”€â”€â”€ UI callbacks â”€â”€â”€ */
  ui.onLayoutChange = () => {
    syncExplorerToggleState();
    editor.layout();
    terminal.fit();
  };

  ui.onThemeChange = (themeName) => {
    editor.setTheme(themeName);
    terminal.setTheme(themeName);
  };

  // Keep Monaco/xterm synced when the global header theme toggle is used.
  window.addEventListener('arenacode:themechange', (event) => {
    const globalTheme = event?.detail?.theme === 'light' ? 'light' : 'dark';
    const mappedTheme = globalTheme === 'light' ? 'daylight' : 'midnight';
    if (ui.theme === mappedTheme) return;
    ui.setTheme(mappedTheme);
  });

  /* Button wiring â€” Activity Bar */
  document.querySelectorAll('.activity-btn[data-panel]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.dataset.panel === 'explorer') toggleSidebarAndRefresh();
    });
  });
  explorerToggleBtn?.addEventListener('click', () => {
    toggleSidebarAndRefresh();
  });
  document.querySelector('.activity-btn[data-action="projects"]')?.addEventListener('click', () => {
    ui.showProjectsModal(projects, buildCurrentProject, loadProject, newProject, templates);
  });
  document.querySelector('.activity-btn[data-action="templates"]')?.addEventListener('click', () => {
    ui.showTemplatesModal(templates, (tmpl) => {
      currentLanguage = tmpl.language;
      langSelect.value = currentLanguage;
      newProject(tmpl.language, tmpl.files);
    });
  });
  document.querySelector('.activity-btn[data-action="theme"]')?.addEventListener('click', () => ui.showThemePicker());
  document.querySelector('.activity-btn[data-action="settings"]')?.addEventListener('click', () => ui.showSettingsModal(editor));

  $('#zen-btn')?.addEventListener('click', () => ui.toggleZenMode());
  $('#clear-terminal')?.addEventListener('click', () => terminal.clear());
  $('#toggle-terminal')?.addEventListener('click', () => {
    ui.togglePanel();
    terminal.fit();
  });
  $('#maximize-panel')?.addEventListener('click', () => {
    ui.togglePanelMaximize();
    terminal.fit();
  });

  /* New file button */
  $('#new-file-btn')?.addEventListener('click', () => {
    const name = files.generateNewFileName(currentLanguage);
    files.addFile(name, '');
    files.selectFile(name);
  });

  /* â”€â”€â”€ Keyboard Shortcuts â”€â”€â”€ */
  ui.initKeyboardShortcuts({
    run: () => { if (isRunning) stopExecution(); else runExecution(); },
    save: () => { autoSave(); ui.showToast(t('playground.toast.project_saved', 'Project saved'), 'info'); },
    newFile: () => {
      const name = files.generateNewFileName(currentLanguage);
      files.addFile(name, '');
      files.selectFile(name);
    },
    toggleSidebar: () => toggleSidebarAndRefresh(),
    toggleTerminal: () => { ui.togglePanel(); terminal.fit(); },
    zenMode: () => ui.toggleZenMode(),
    commandPalette: () => ui.showCommandPalette(commandPaletteActions),
    shortcutsOverlay: () => ui.showShortcutsOverlay(),
  });

  /* â”€â”€â”€ Command Palette Actions â”€â”€â”€ */
  const commandPaletteActions = [
    { label: 'Run Code',           icon: 'play',     shortcut: `${MOD}+Enter`, action: () => { if (isRunning) stopExecution(); else runExecution(); } },
    { label: 'Save Project',       icon: 'download',  shortcut: `${MOD}+S`,     action: () => { autoSave(); ui.showToast(t('playground.toast.project_saved', 'Project saved'), 'info'); } },
    { label: 'New File',           icon: 'plus',     shortcut: `${MOD}+N`,     action: () => { const n = files.generateNewFileName(currentLanguage); files.addFile(n, ''); files.selectFile(n); } },
    { label: 'Toggle Sidebar',     icon: 'files',    shortcut: `${MOD}+B`,     action: () => toggleSidebarAndRefresh() },
    { label: 'Toggle Terminal',    icon: 'terminal', shortcut: `${MOD}+\``,    action: () => { ui.togglePanel(); terminal.fit(); } },
    { label: 'Clear Terminal',     icon: 'eraser',   shortcut: '',              action: () => terminal.clear() },
    { label: 'Zen Mode',           icon: 'maximize', shortcut: `${MOD}+Shift+Z`, action: () => ui.toggleZenMode() },
    { label: 'Change Theme',       icon: 'palette',  shortcut: '',              action: () => ui.showThemePicker() },
    { label: 'Editor Settings',    icon: 'settings', shortcut: '',              action: () => ui.showSettingsModal(editor) },
    { label: 'Open Projects',      icon: 'folder',   shortcut: '',              action: () => ui.showProjectsModal(projects, buildCurrentProject, loadProject, newProject, templates) },
    { label: 'New from Template',  icon: 'layout-template', shortcut: '',       action: () => ui.showTemplatesModal(templates, (tmpl) => { currentLanguage = tmpl.language; langSelect.value = currentLanguage; newProject(tmpl.language, tmpl.files); }) },
    { label: 'Keyboard Shortcuts', icon: 'info',     shortcut: `${MOD}+/`,     action: () => ui.showShortcutsOverlay() },
  ];

  /* â”€â”€â”€ Resize handles â”€â”€â”€ */
  ui.initTerminalResize($('#terminal-resize'), $('#panel-area'), () => {
    editor.layout();
    terminal.fit();
  });

  /* â”€â”€â”€ Window resize â”€â”€â”€ */
  window.addEventListener('resize', debounce(() => {
    editor.layout();
    terminal.fit();
  }, 100));

  /* â”€â”€â”€ Load last session or create default â”€â”€â”€ */
  /* Check for shared project in URL first */
  const sharedData = ProjectManager.parseShareURL();
  if (sharedData) {
    const id = projects.createNew(sharedData);
    const imported = projects.switchTo(id);
    loadProject(imported);
    history.replaceState(null, '', location.pathname);
    ui.showToast(t('playground.toast.shared_loaded', 'Shared project loaded!'), 'success');
  } else {
    const lastProject = projects.loadCurrent();
    if (lastProject && ((lastProject.files && lastProject.files.length > 0) || (lastProject.workspaces && Object.keys(lastProject.workspaces).length > 0))) {
      loadProject(lastProject);
    } else {
      newProject('python');
    }
  }

  /* â”€â”€â”€ Remove loading screen â”€â”€â”€ */
  const loading = document.getElementById('loading-screen');
  if (loading) {
    loading.classList.add('fade-out');
    setTimeout(() => loading.remove(), 500);
  }

  /* â”€â”€â”€ Context menu for file tree â”€â”€ */
  files.onContextMenu = (e, fileName) => {
    ui.showContextMenu(e, [
      { label: 'Rename', icon: '<i class="icon icon-edit icon-sm"></i>', action: () => files.startRename(fileName) },
      { label: 'Duplicate', icon: '<i class="icon icon-copy icon-sm"></i>', action: () => files.duplicateFile(fileName) },
      { label: 'Set as entry', icon: '<i class="icon icon-star icon-sm"></i>', action: () => { files.setEntryFile(fileName); autoSave(); } },
      { type: 'sep' },
      { label: 'Delete', icon: '<i class="icon icon-trash icon-sm"></i>', className: 'danger', action: () => {
        files.deleteFile(fileName);
        autoSave();
      }},
    ]);
  };
}


