const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),
  openWidget: (type, symbol) => ipcRenderer.send('open-widget', { type, symbol }),
  openWorkspace: (workspaceId) => ipcRenderer.send('open-workspace', workspaceId),
  
  transferWidget: (widget, targetWorkspaceId) => 
    ipcRenderer.send('transfer-widget', { widget, targetWorkspaceId }),
  
  onWidgetReceived: (callback) => 
    ipcRenderer.on('widget-received', (event, widget) => callback(widget)),
  
  notifyWorkspaceUpdated: (workspaceId) => 
    ipcRenderer.send('workspace-updated', workspaceId),
  
  onWorkspaceRefresh: (callback) => 
    ipcRenderer.on('workspace-refresh', (event, workspaceId) => callback(workspaceId)),

  onWorkspaceClosed: (callback) => 
    ipcRenderer.on('workspace-closed', (event, workspaceId) => callback(workspaceId)),
  
  isElectron: true,
});