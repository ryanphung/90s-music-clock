const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('clockAPI', {
  onSetVolume: (callback) => ipcRenderer.on('set-volume', (_event, volume) => callback(volume)),
  onPlayChime: (callback) => ipcRenderer.on('play-chime', (_event, volume) => callback(volume)),
  rendererReady: () => ipcRenderer.send('renderer-ready'),
});
