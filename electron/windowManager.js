/**
 * windowManager — configurable, multi-display, persistent terminal windows.
 *
 * Replaces the old hardcoded 400x500 / 1200x800 pop-outs. Every window is
 * registered with a stable key so its bounds and display can be remembered
 * across restarts, and callers can target a specific monitor by index.
 *
 * Window keys:
 *   main                     the primary terminal window
 *   widget:<type>:<symbol>   a single widget pane
 *   workspace:<id>           a full dockable workspace
 */
const { BrowserWindow, screen } = require('electron');
const path = require('node:path');
const fs = require('node:fs');

const DEFAULTS = {
  widget:    { width: 520,  height: 620 },
  workspace: { width: 1280, height: 820 },
};

class WindowManager {
  /**
   * @param {object} opts
   * @param {boolean} opts.isDev
   * @param {string}  opts.statePath   where to persist window bounds
   * @param {string}  opts.preloadPath
   * @param {string}  opts.distIndex   packaged index.html
   */
  constructor({ isDev, statePath, preloadPath, distIndex }) {
    this.isDev = isDev;
    this.statePath = statePath;
    this.preloadPath = preloadPath;
    this.distIndex = distIndex;
    /** key -> BrowserWindow */
    this.windows = new Map();
    this.state = this._loadState();
  }

  // ── Persistence ───────────────────────────────────────────────────────────

  _loadState() {
    try {
      return JSON.parse(fs.readFileSync(this.statePath, 'utf8'));
    } catch {
      return { windows: {} };
    }
  }

  _saveState() {
    try {
      fs.mkdirSync(path.dirname(this.statePath), { recursive: true });
      fs.writeFileSync(this.statePath, JSON.stringify(this.state, null, 2));
    } catch (err) {
      console.error('[WindowManager] failed to persist state:', err.message);
    }
  }

  /** Remember a window's geometry so it reopens where the user left it. */
  _rememberBounds(key, win) {
    if (win.isDestroyed()) return;
    const bounds = win.getBounds();
    const display = screen.getDisplayMatching(bounds);
    this.state.windows[key] = {
      ...(this.state.windows[key] ?? {}),
      bounds,
      displayId: display.id,
      maximized: win.isMaximized(),
    };
    this._saveState();
  }

  // ── Display helpers ───────────────────────────────────────────────────────

  listDisplays() {
    const primaryId = screen.getPrimaryDisplay().id;
    return screen.getAllDisplays().map((d, index) => ({
      index,
      id: d.id,
      label: d.label || `Display ${index + 1}`,
      bounds: d.bounds,
      workArea: d.workArea,
      scaleFactor: d.scaleFactor,
      primary: d.id === primaryId,
    }));
  }

  /**
   * Resolve the bounds a window should open with.
   * Priority: explicit bounds > remembered geometry > centred on the
   * requested display > centred on primary.
   */
  _resolveBounds(key, { displayIndex, bounds, size } = {}) {
    const displays = screen.getAllDisplays();
    const remembered = this.state.windows[key];

    if (bounds) return { bounds, maximized: false };

    // Explicit monitor request wins over remembered position
    if (typeof displayIndex === 'number' && displays[displayIndex]) {
      return { bounds: this._centreOn(displays[displayIndex], size), maximized: false };
    }

    if (remembered?.bounds) {
      // Only reuse the saved position if that display is still attached
      const stillAttached = displays.some(d => d.id === remembered.displayId);
      const visible = displays.some(d => this._intersects(d.workArea, remembered.bounds));
      if (stillAttached && visible) {
        return { bounds: remembered.bounds, maximized: Boolean(remembered.maximized) };
      }
    }

    return { bounds: this._centreOn(screen.getPrimaryDisplay(), size), maximized: false };
  }

  _centreOn(display, size) {
    const { width, height } = { ...DEFAULTS.workspace, ...size };
    const area = display.workArea;
    return {
      width:  Math.min(width, area.width),
      height: Math.min(height, area.height),
      x: Math.round(area.x + (area.width - Math.min(width, area.width)) / 2),
      y: Math.round(area.y + (area.height - Math.min(height, area.height)) / 2),
    };
  }

  _intersects(a, b) {
    return a.x < b.x + b.width && a.x + a.width > b.x &&
           a.y < b.y + b.height && a.y + a.height > b.y;
  }

  // ── Window lifecycle ──────────────────────────────────────────────────────

  get(key) {
    const win = this.windows.get(key);
    return win && !win.isDestroyed() ? win : undefined;
  }

  /** Focus an existing window, or create it. Returns the window. */
  open(key, { route, size, displayIndex, bounds, frame = false, minSize } = {}) {
    const existing = this.get(key);
    if (existing) {
      if (typeof displayIndex === 'number') {
        const displays = screen.getAllDisplays();
        if (displays[displayIndex]) existing.setBounds(this._centreOn(displays[displayIndex], size));
      }
      if (existing.isMinimized()) existing.restore();
      existing.focus();
      return existing;
    }

    const resolved = this._resolveBounds(key, { displayIndex, bounds, size });

    const win = new BrowserWindow({
      ...resolved.bounds,
      ...(minSize ? { minWidth: minSize.width, minHeight: minSize.height } : {}),
      frame,
      backgroundColor: '#0a0a0f',
      show: false,
      webPreferences: {
        preload: this.preloadPath,
        contextIsolation: true,
        nodeIntegration: false,
      },
    });

    if (resolved.maximized) win.maximize();
    win.once('ready-to-show', () => win.show());

    this.windows.set(key, win);

    // Persist geometry as the user moves/resizes (debounced by Electron's
    // own event cadence; cheap enough to write directly)
    const remember = () => this._rememberBounds(key, win);
    win.on('moved', remember);
    win.on('resized', remember);
    win.on('maximize', remember);
    win.on('unmaximize', remember);

    win.on('closed', () => {
      this.windows.delete(key);
      this._onClosed?.(key);
    });

    win.loadURL(this._url(route));
    return win;
  }

  _url(route) {
    // HashRouter: the path always lives after '#'
    const hash = route ? `#${route}` : '';
    return this.isDev
      ? `http://localhost:5173/${hash}`
      : `file://${this.distIndex}${hash}`;
  }

  /** Broadcast an IPC message to every live terminal window. */
  broadcast(channel, payload, { exceptWebContentsId } = {}) {
    for (const win of this.windows.values()) {
      if (win.isDestroyed()) continue;
      if (exceptWebContentsId && win.webContents.id === exceptWebContentsId) continue;
      win.webContents.send(channel, payload);
    }
  }

  onClosed(handler) {
    this._onClosed = handler;
  }

  /** Windows the user had open last session (for restore-on-launch). */
  savedWindowKeys() {
    return Object.entries(this.state.windows)
      .filter(([key, v]) => key !== 'main' && v.reopen)
      .map(([key]) => key);
  }

  setReopen(key, reopen) {
    this.state.windows[key] = { ...(this.state.windows[key] ?? {}), reopen };
    this._saveState();
  }
}

module.exports = { WindowManager, DEFAULTS };
