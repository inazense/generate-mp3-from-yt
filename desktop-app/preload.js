const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  downloadAudio: (url) => ipcRenderer.invoke('download-audio', url),
  onStatusUpdate: (callback) =>
    ipcRenderer.on('status-update', (_, data) => callback(data)),
});
