const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('clockAPI', {
  onSetVolume: (callback) => ipcRenderer.on('set-volume', (_event, volume) => callback(volume)),
  onPlayChime: (callback) => ipcRenderer.on('play-chime', (_event, volume, soundPath) => callback(volume, soundPath)),
  onPlayQuarterChime: (callback) => ipcRenderer.on('play-quarter-chime', (_event, volume, count) => callback(volume, count)),
  rendererReady: () => ipcRenderer.send('renderer-ready'),
});
