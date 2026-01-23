const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),
  openWidget: (type, symbol) => ipcRenderer.send('open-widget', { type, symbol }),
  openWorkspace: (workspaceId) => ipcRenderer.send('open-workspace', workspaceId),
  
  // Widget transfer between windows
  transferWidget: (widget, targetWorkspaceId) => 
    ipcRenderer.send('transfer-widget', { widget, targetWorkspaceId }),
  
  onWidgetReceived: (callback) => 
    ipcRenderer.on('widget-received', (event, widget) => callback(widget)),
  
  isElectron: true,
});