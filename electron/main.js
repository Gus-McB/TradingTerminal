const { app, BrowserWindow, ipcMain, session } = require('electron');
const path = require('node:path');

const isDev = !app.isPackaged;

let mainWin;

function createWindow() {
  mainWin = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    frame: false,
    titleBarStyle: 'hidden',
    backgroundColor: '#0a0a0f',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          isDev
            ? "default-src 'self' 'unsafe-inline' 'unsafe-eval'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; connect-src 'self' ws://localhost:* http://localhost:*; img-src 'self' data:;"
            : "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self' ws://localhost:*;"
        ],
      },
    });
  });

  if (isDev) {
    mainWin.loadURL('http://localhost:5173');
    mainWin.webContents.openDevTools();
  } else {
    mainWin.loadFile(path.join(__dirname, '../ui/dist/index.html'));
  }
}

ipcMain.on('window-minimize', () => mainWin?.minimize());
ipcMain.on('window-maximize', () => {
  if (mainWin?.isMaximized()) {
    mainWin.unmaximize();
  } else {
    mainWin?.maximize();
  }
});
ipcMain.on('window-close', () => mainWin?.close());

ipcMain.on('open-widget', (event, { type, symbol }) => {
  const widgetWin = new BrowserWindow({
    width: 400,
    height: 500,
    frame: false,
    backgroundColor: '#0a0a0f',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  const url = isDev
    ? `http://localhost:5173/widget/${type}?symbol=${symbol}`
    : `file://${path.join(__dirname, '../ui/dist/index.html')}#/widget/${type}?symbol=${symbol}`;

  widgetWin.loadURL(url);
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

const workspaceWindows = new Map();

ipcMain.on('open-workspace', (event, workspaceId) => {
  const workspaceWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    frame: false,
    backgroundColor: '#0a0a0f',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  workspaceWindows.set(workspaceId, workspaceWindow);
  
  workspaceWindow.on('closed', () => {
    workspaceWindows.delete(workspaceId);
  });

  const url = isDev
    ? `http://localhost:5173/workspace/${workspaceId}`
    : `file://${path.join(__dirname, '../ui/dist/index.html')}#/workspace/${workspaceId}`;

  workspaceWindow.loadURL(url);
});

ipcMain.on('transfer-widget', (event, { widget, targetWorkspaceId }) => {
  const targetWindow = workspaceWindows.get(targetWorkspaceId) || mainWin;
  if (targetWindow) {
    targetWindow.webContents.send('widget-received', widget);
  }
});