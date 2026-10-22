const { app, BrowserWindow, globalShortcut, screen, ipcMain } = require('electron');
const path = require('path');
const { pathToFileURL } = require('node:url');
const { autoUpdater } = require('electron-updater');
const log = require('electron-log');
const { createUpdateManager } = require('./update-manager');

// --- CONFIGURE LOGGING ---
// electron-log stores logs in the current user's platform-specific app folder.
log.transports.file.level = 'info';
autoUpdater.logger = log;

// --- FIX AUTOPLAY POLICY ---
// This switch forces Chrome to allow autoplay without any user interaction.
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');

function createWindow() {
  // --- DISPLAY SELECTION LOGIC ---
  const displays = screen.getAllDisplays();
  
  // Default to the primary display (Index 0)
  let targetDisplay = displays[0];

  // IF there is more than 1 display, use the second one (Index 1)
  if (displays.length > 1) {
      targetDisplay = displays[1];
      log.info(`Multiple displays detected. Opening on Display 2: ${targetDisplay.bounds.x}, ${targetDisplay.bounds.y}`);
  } else {
      log.info('Single display detected. Opening on Primary.');
  }

  // Create the browser window.
  const win = new BrowserWindow({
    x: targetDisplay.bounds.x,
    y: targetDisplay.bounds.y,
    width: targetDisplay.bounds.width,
    height: targetDisplay.bounds.height,
    kiosk: true, 
    icon: path.join(__dirname, 'assets', '256.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      mediaPlaybackRequiresUserGesture: false,
      nodeIntegration: false, 
      contextIsolation: true  
    }
  });

  win.removeMenu();
  win.loadFile('index.html');

  // --- HIDE THE CURSOR ---
  win.webContents.on('did-finish-load', () => {
    win.webContents.insertCSS('html, body { cursor: none !important; }');
  });

  win.webContents.on('render-process-gone', (event, detailed) => {
    log.error("Render process gone:", detailed);
  });
}

// --- AUTO UPDATE LOGIC ---
function setupAutoUpdater() {
  log.info('Initializing Auto Updater...');
  const updates = createUpdateManager({ app, autoUpdater, log });
  const dashboardURL = pathToFileURL(path.join(__dirname, 'index.html')).href;
  ipcMain.handle('dashboard:check-for-updates', (event, request) => {
    // Embedded slides and remote pages must not have access to the native updater.
    if (!event.senderFrame || event.senderFrame !== event.sender.mainFrame || event.senderFrame.url !== dashboardURL) {
      throw new Error('Update requests must come from the dashboard main page.');
    }
    return updates.handleRemoteRequest(request);
  });

  setTimeout(() => {
      updates.checkForUpdates().catch(err => { log.error("Failed to check for updates:", err); });
  }, 3000);
  
  setInterval(() => {
      updates.checkForUpdates().catch(err => { log.error("Failed to check for updates:", err); });
  }, 60 * 60 * 1000);
}

// --- SINGLE INSTANCE LOCK ---
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    const windows = BrowserWindow.getAllWindows();
    if (windows.length) {
      if (windows[0].isMinimized()) windows[0].restore();
      windows[0].focus();
    }
  });

  app.whenReady().then(() => {
    app.setAppUserModelId('615.pleasanttownship.dashboard');

    createWindow();
    setupAutoUpdater();

    // --- ADD KEYBIND TO CLOSE ---
    globalShortcut.register('Control+Shift+Q', () => {
      app.quit();
    });
  });

  app.on('window-all-closed', () => {
    app.quit();
  });

  app.on('will-quit', () => {
    globalShortcut.unregisterAll();
  });
}
