const { app, BrowserWindow, ipcMain } = require('electron');
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