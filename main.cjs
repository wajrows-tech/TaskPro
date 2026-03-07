const { app, BrowserWindow, shell, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const net = require('net');
const os = require('os');

const logDir = path.join(os.tmpdir(), 'TaskPro_Debug');
const logFile = path.join(logDir, 'main.log');
if (!fs.existsSync(logDir)) {
  try {
    fs.mkdirSync(logDir, { recursive: true });
  } catch (e) {
    console.error('Failed to create log dir:', e);
  }
}

function log(...args) {
  const msg = `[${new Date().toISOString()}] ${args.join(' ')}\n`;
  try {
    fs.appendFileSync(logFile, msg);
  } catch (e) {
    console.error('Failed to write log:', e.message);
  }
  console.log(...args);
}

log('--- App context ---');
log('Process Path:', process.execPath);
log('Resources Path:', process.resourcesPath);
log('__dirname:', __dirname);

let mainWindow;
let serverProcess;
const PORT = 3005;

// ── Auto-Updater Configuration ───────────────────────────────────────────────
function setupAutoUpdater() {
  const { autoUpdater } = require('electron-updater');
  const updateDir = path.join(process.env.LOCALAPPDATA || '', 'TaskPro', 'updates');

  if (!fs.existsSync(updateDir)) {
    fs.mkdirSync(updateDir, { recursive: true });
  }

  autoUpdater.setFeedURL({
    provider: 'generic',
    url: `file://${updateDir.replace(/\\/g, '/')}`,
  });

  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('checking-for-update', () => {
    log('[updater] Checking for updates...');
  });

  autoUpdater.on('update-available', (info) => {
    log('[updater] Update available:', info.version);
    if (mainWindow) {
      mainWindow.webContents.executeJavaScript(
        `document.title = "TaskPro - Downloading update v${info.version}..."`
      ).catch(() => { });
    }
  });

  autoUpdater.on('update-not-available', () => {
    log('[updater] App is up to date.');
  });

  autoUpdater.on('download-progress', (progress) => {
    log(`[updater] Download: ${Math.round(progress.percent)}%`);
  });

  autoUpdater.on('update-downloaded', (info) => {
    log('[updater] Update downloaded:', info.version);
    dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: 'Update Ready',
      message: `TaskPro v${info.version} has been downloaded.`,
      detail: 'The update will be installed when you close the app. Restart now?',
      buttons: ['Restart Now', 'Later'],
      defaultId: 0,
    }).then((result) => {
      if (result.response === 0) {
        autoUpdater.quitAndInstall(false, true);
      }
    });
  });

  autoUpdater.on('error', (err) => {
    log('[updater] No updates found or error:', err.message);
  });

  setTimeout(() => {
    autoUpdater.checkForUpdates().catch((err) => {
      log('[updater] Update check skipped:', err.message);
    });
  }, 3000);
}

// ── Wait for the server to be ready ──────────────────────────────────────────
function waitForServer(port, timeout = 30000) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const tryConnect = () => {
      const sock = new net.Socket();
      sock.setTimeout(1000);
      sock.on('connect', () => { sock.destroy(); resolve(); });
      sock.on('error', () => {
        sock.destroy();
        if (Date.now() - start > timeout) return reject(new Error('Server timeout'));
        setTimeout(tryConnect, 500);
      });
      sock.on('timeout', () => {
        sock.destroy();
        if (Date.now() - start > timeout) return reject(new Error('Server timeout'));
        setTimeout(tryConnect, 500);
      });
      sock.connect(port, '127.0.0.1');
    };
    tryConnect();
  });
}

// ── Spawn the Express+Vite server ─────────────────────────────────────────────
function startServer() {
  const isDev = !app.isPackaged;
  let serverCmd, serverArgs, serverCwd;

  const appDir = app.isPackaged
    ? path.join(process.resourcesPath, 'app')
    : __dirname;

  if (isDev) {
    serverCwd = __dirname;
    serverCmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';
    serverArgs = ['tsx', 'server.ts'];
  } else {
    serverCwd = appDir;
    // For reliable production, always use Electron's internal Node bridge
    serverCmd = process.execPath;
    serverArgs = [path.join(appDir, 'server.js')];

    log('[main] Production resources check:');
    log('[main] appDir:', appDir);
    log('[main] appDir exists:', fs.existsSync(appDir));
    log('[main] server cmd:', serverCmd);
    log('[main] server args:', serverArgs);
    log('[main] server.js exists:', fs.existsSync(path.join(appDir, 'server.js')));
  }

  log('[main] Starting server:', serverCmd, serverArgs.join(' '));
  log('[main] CWD:', serverCwd);

  serverProcess = spawn(serverCmd, serverArgs, {
    cwd: serverCwd,
    env: {
      ...process.env,
      NODE_ENV: isDev ? 'development' : 'production',
      ELECTRON_RUN_AS_NODE: isDev ? undefined : '1'
    },
    stdio: 'pipe',
    shell: isDev && process.platform === 'win32',
  });

  serverProcess.stdout?.on('data', d => log('[server]', d.toString().trim()));
  serverProcess.stderr?.on('data', d => log('[server-err]', d.toString().trim()));
  serverProcess.on('error', (err) => log('[server] spawn error:', err.message));
  serverProcess.on('exit', (code) => log(`[server] exited with code ${code}`));
}

// ── Create the browser window ─────────────────────────────────────────────────
async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    titleBarStyle: 'default',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false,
    },
    show: false,
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.webContents.openDevTools();
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => { mainWindow = null; });
}

// ── App lifecycle ─────────────────────────────────────────────────────────────
app.whenReady().then(async () => {
  const isDev = !app.isPackaged;

  startServer();
  await createWindow();

  // Initial loading screen
  mainWindow.loadURL('data:text/html,<html><body style="background:#141414;display:flex;align-items:center;justify-content:center;height:100vh;margin:0"><p style="color:#E4E3E0;font-family:monospace;font-size:14px;opacity:0.6">Starting TaskPro...</p></body></html>');
  mainWindow.show();

  try {
    await waitForServer(PORT);
    if (isDev) {
      mainWindow.loadURL(`http://localhost:${PORT}`);
      mainWindow.webContents.openDevTools();
    } else {
      log('[main] Loading local file for UI rendering: dist/index.html');
      mainWindow.loadFile(path.join(__dirname, 'dist', 'index.html'));
      mainWindow.webContents.openDevTools();
    }
  } catch (e) {
    log('Server failed to start:', e.message);
    mainWindow.loadURL('data:text/html,<html><body style="background:#141414;display:flex;align-items:center;justify-content:center;height:100vh;margin:0"><p style="color:#ef4444;font-family:monospace;font-size:14px">Failed to start server. Please restart. Error: ' + e.message + '</p></body></html>');
  }

  if (app.isPackaged) {
    setupAutoUpdater();
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (serverProcess) { serverProcess.kill(); serverProcess = null; }
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  if (serverProcess) { serverProcess.kill(); serverProcess = null; }
});
