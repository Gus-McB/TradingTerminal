const { app, BrowserWindow, ipcMain, session, screen } = require('electron');
const path = require('node:path');
const { WindowManager, DEFAULTS } = require('./windowManager');
const { CredentialVault } = require('./credentialVault');

const isDev = !app.isPackaged;

/** Where the middleware listens (credential tests are proxied through it). */
const MIDDLEWARE_URL = process.env.MIDDLEWARE_URL ?? 'http://127.0.0.1:3000';
const PROVIDER_API_TOKEN = process.env.PROVIDER_API_TOKEN;

let vault;

const windowManager = new WindowManager({
  isDev,
  statePath: path.join(app.getPath('userData'), 'window-state.json'),
  preloadPath: path.join(__dirname, 'preload.js'),
  distIndex: path.join(__dirname, '../ui/dist/index.html'),
});

const MAIN_KEY = 'main';

function installCsp() {
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          isDev
            ? "default-src 'self' 'unsafe-inline' 'unsafe-eval'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; connect-src 'self' ws://localhost:* http://localhost:* https://*.supabase.co wss://*.supabase.co; img-src 'self' data:;"
            : "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self' ws://localhost:* http://localhost:* https://*.supabase.co wss://*.supabase.co;"
        ],
      },
    });
  });
}

function createMainWindow() {
  const win = windowManager.open(MAIN_KEY, {
    route: '/',
    size: { width: 1400, height: 900 },
    minSize: { width: 1000, height: 700 },
  });
  if (isDev) win.webContents.openDevTools();
  return win;
}

/** Reopen the pop-outs the user had open when they last quit. */
function restoreSavedWindows() {
  for (const key of windowManager.savedWindowKeys()) {
    const [kind, ...rest] = key.split(':');
    if (kind === 'widget') {
      const [type, symbol] = rest;
      openWidgetWindow({ type, symbol: symbol || undefined });
    } else if (kind === 'workspace') {
      openWorkspaceWindow({ workspaceId: rest.join(':') });
    }
  }
}

// ── Window openers ───────────────────────────────────────────────────────────

function openWidgetWindow({ type, symbol, displayIndex, linkGroup }) {
  const key = `widget:${type}:${symbol ?? ''}`;
  const params = new URLSearchParams();
  if (symbol) params.set('symbol', symbol);
  if (linkGroup) params.set('linkGroup', linkGroup);
  const query = params.toString();

  const win = windowManager.open(key, {
    route: `/widget/${type}${query ? `?${query}` : ''}`,
    size: DEFAULTS.widget,
    displayIndex,
  });
  windowManager.setReopen(key, true);
  return win;
}

function openWorkspaceWindow({ workspaceId, displayIndex }) {
  const key = `workspace:${workspaceId}`;
  const win = windowManager.open(key, {
    route: `/workspace/${workspaceId}`,
    size: DEFAULTS.workspace,
    minSize: { width: 700, height: 500 },
    displayIndex,
  });
  windowManager.setReopen(key, true);
  return win;
}

// ── App lifecycle ────────────────────────────────────────────────────────────

app.whenReady().then(() => {
  installCsp();
  vault = new CredentialVault();
  createMainWindow();
  restoreSavedWindows();

  // Displays can be plugged in / unplugged while running
  const notifyDisplays = () =>
    windowManager.broadcast('displays:changed', windowManager.listDisplays());
  screen.on('display-added', notifyDisplays);
  screen.on('display-removed', notifyDisplays);
  screen.on('display-metrics-changed', notifyDisplays);
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
});

// ── Window chrome (acts on the CALLING window, not always the main one) ──────

function senderWindow(event) {
  return BrowserWindow.fromWebContents(event.sender);
}

ipcMain.on('window-minimize', (event) => senderWindow(event)?.minimize());
ipcMain.on('window-maximize', (event) => {
  const win = senderWindow(event);
  if (!win) return;
  if (win.isMaximized()) win.unmaximize(); else win.maximize();
});
ipcMain.on('window-close', (event) => senderWindow(event)?.close());

// ── Pop-out management ───────────────────────────────────────────────────────

ipcMain.handle('windows:list-displays', () => windowManager.listDisplays());

ipcMain.handle('windows:open-widget', (_event, opts) => {
  const win = openWidgetWindow(opts ?? {});
  return win ? { ok: true } : { ok: false };
});

ipcMain.handle('windows:open-workspace', (_event, opts) => {
  const win = openWorkspaceWindow(opts ?? {});
  return win ? { ok: true } : { ok: false };
});

ipcMain.handle('windows:list', () => Array.from(windowManager.windows.keys()));

ipcMain.on('windows:close', (_event, key) => {
  windowManager.setReopen(key, false);
  windowManager.get(key)?.close();
});

/** A window closed by its own chrome should not reopen next launch. */
windowManager.onClosed((key) => {
  if (key === MAIN_KEY) return;
  windowManager.setReopen(key, false);
  windowManager.broadcast('windows:changed', Array.from(windowManager.windows.keys()));
});

// ── Cross-window terminal state broker ───────────────────────────────────────
//
// Each window is its own renderer with its own stores, so symbol channels
// would otherwise be isolated per monitor. Windows publish intent here and
// main fans it out to every OTHER window, which applies it locally.
// Main also holds the last known state so newly opened windows start in sync.

let terminalState = {
  activeSymbol: 'BTC/USD',
  linkGroups: { A: 'BTC/USD', B: 'ETH/USD', C: 'SOL/USD' },
  theme: 'dark',
};

ipcMain.on('terminal:publish', (event, patch) => {
  if (!patch || typeof patch !== 'object') return;

  // Alerts are events, not state — pass them through without storing
  const { alert, ...statePatch } = patch;
  if (Object.keys(statePatch).length > 0) {
    terminalState = {
      ...terminalState,
      ...statePatch,
      linkGroups: { ...terminalState.linkGroups, ...(statePatch.linkGroups ?? {}) },
    };
  }

  // Echo to every window except the publisher (which already applied it)
  windowManager.broadcast('terminal:state', patch, {
    exceptWebContentsId: event.sender.id,
  });
});

/** A fresh window asks for the current state on mount. */
ipcMain.handle('terminal:snapshot', () => terminalState);

// ── Credential vault ─────────────────────────────────────────────────────────
//
// Every reply here is a MASKED summary. Plaintext credentials never cross the
// IPC boundary into a renderer — they only travel from this process to the
// middleware over loopback when a connection is being tested.

ipcMain.handle('credentials:available', () => ({
  available: vault?.isAvailable() ?? false,
}));

ipcMain.handle('credentials:list', () => vault?.list() ?? []);

ipcMain.handle('credentials:save', (_event, input) => {
  try {
    return { ok: true, connection: vault.save(input) };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

ipcMain.handle('credentials:delete', (_event, id) => ({
  ok: Boolean(vault?.delete(id)),
}));

ipcMain.handle('credentials:test', async (_event, id) => {
  const secret = vault?.reveal(id);
  if (!secret) return { ok: false, message: 'Connection not found' };

  let result;
  try {
    const res = await fetch(`${MIDDLEWARE_URL}/api/providers/test`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(PROVIDER_API_TOKEN ? { 'x-provider-token': PROVIDER_API_TOKEN } : {}),
      },
      body: JSON.stringify({ providerId: secret.providerId, fields: secret.fields }),
    });
    result = await res.json();
  } catch (err) {
    result = {
      ok: false,
      message: `Middleware unreachable at ${MIDDLEWARE_URL} — start it and retry (${err.message})`,
    };
  }

  const connection = vault.recordTestResult(id, result);
  return { ...result, connection };
});

ipcMain.handle('credentials:set-active', (_event, { id, active }) => ({
  connection: vault?.setActive(id, active),
}));

/** Small helper for the loopback middleware calls below. */
async function middlewarePost(path, body) {
  const res = await fetch(`${MIDDLEWARE_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(PROVIDER_API_TOKEN ? { 'x-provider-token': PROVIDER_API_TOKEN } : {}),
    },
    body: JSON.stringify(body ?? {}),
  });
  return res.json();
}

/**
 * Point market data at a provider. When a saved connection is named, its
 * credentials are read here and passed straight to the middleware — they
 * never travel through the renderer.
 */
ipcMain.handle('providers:activate', async (_event, { providerId, connectionId }) => {
  let fields;
  if (connectionId) {
    const secret = vault?.reveal(connectionId);
    if (!secret) return { ok: false, message: 'Connection not found' };
    fields = secret.fields;
    providerId = providerId ?? secret.providerId;
  }

  try {
    const result = await middlewarePost('/api/providers/activate', { providerId, fields });
    if (result.ok && connectionId) vault.setActive(connectionId, true);
    return result;
  } catch (err) {
    return { ok: false, message: `Middleware unreachable — start it and retry (${err.message})` };
  }
});

ipcMain.handle('providers:deactivate', async () => {
  try {
    const result = await middlewarePost('/api/providers/deactivate');
    // No provider is serving data any more
    for (const c of vault?.list() ?? []) if (c.active) vault.setActive(c.id, false);
    return result;
  } catch (err) {
    return { ok: false, message: `Middleware unreachable (${err.message})` };
  }
});

ipcMain.handle('providers:status', async () => {
  try {
    const res = await fetch(`${MIDDLEWARE_URL}/api/providers/status`);
    return await res.json();
  } catch {
    return { sourceId: 'unknown', label: 'Middleware offline', live: false, symbols: [] };
  }
});

// ── Legacy channels (kept so older callers keep working) ─────────────────────

ipcMain.on('open-widget', (_event, { type, symbol }) => openWidgetWindow({ type, symbol }));
ipcMain.on('open-workspace', (_event, workspaceId) => openWorkspaceWindow({ workspaceId }));

ipcMain.on('workspace-updated', (_event, workspaceId) => {
  windowManager.get(`workspace:${workspaceId}`)?.webContents.send('workspace-refresh', workspaceId);
});

module.exports = { windowManager };
