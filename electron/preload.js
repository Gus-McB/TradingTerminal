const { contextBridge, ipcRenderer } = require('electron');

/** Wrap a listener so the renderer never sees the raw IpcRendererEvent. */
function on(channel, callback) {
  const handler = (_event, payload) => callback(payload);
  ipcRenderer.on(channel, handler);
  return () => ipcRenderer.removeListener(channel, handler);
}

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,

  // ── Window chrome (applies to the calling window) ──────────────────────────
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close:    () => ipcRenderer.send('window-close'),

  // ── Multi-display pop-outs ────────────────────────────────────────────────
  listDisplays: () => ipcRenderer.invoke('windows:list-displays'),
  /** @param {{type: string, symbol?: string, displayIndex?: number, linkGroup?: string}} opts */
  openWidgetWindow: (opts) => ipcRenderer.invoke('windows:open-widget', opts),
  /** @param {{workspaceId: string, displayIndex?: number}} opts */
  openWorkspaceWindow: (opts) => ipcRenderer.invoke('windows:open-workspace', opts),
  listWindows: () => ipcRenderer.invoke('windows:list'),
  closeWindow: (key) => ipcRenderer.send('windows:close', key),

  onDisplaysChanged: (cb) => on('displays:changed', cb),
  onWindowsChanged:  (cb) => on('windows:changed', cb),

  // ── Cross-window terminal state ───────────────────────────────────────────
  publishTerminalState: (patch) => ipcRenderer.send('terminal:publish', patch),
  onTerminalState: (cb) => on('terminal:state', cb),
  getTerminalSnapshot: () => ipcRenderer.invoke('terminal:snapshot'),

  // ── Credential vault (masked summaries only — never raw secrets) ──────────
  credentials: {
    isAvailable: () => ipcRenderer.invoke('credentials:available'),
    list:   () => ipcRenderer.invoke('credentials:list'),
    save:   (input) => ipcRenderer.invoke('credentials:save', input),
    remove: (id) => ipcRenderer.invoke('credentials:delete', id),
    test:   (id) => ipcRenderer.invoke('credentials:test', id),
    setActive: (id, active) => ipcRenderer.invoke('credentials:set-active', { id, active }),
  },

  // ── Market data source ────────────────────────────────────────────────────
  providers: {
    status:     () => ipcRenderer.invoke('providers:status'),
    activate:   (opts) => ipcRenderer.invoke('providers:activate', opts),
    deactivate: () => ipcRenderer.invoke('providers:deactivate'),
  },

  // ── Legacy (pre-window-manager callers) ───────────────────────────────────
  openWidget:    (type, symbol) => ipcRenderer.send('open-widget', { type, symbol }),
  openWorkspace: (workspaceId) => ipcRenderer.send('open-workspace', workspaceId),
  notifyWorkspaceUpdated: (workspaceId) => ipcRenderer.send('workspace-updated', workspaceId),
  onWorkspaceRefresh: (cb) => on('workspace-refresh', cb),
});
