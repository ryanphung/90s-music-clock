const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('clockAPI', {
  onSetVolume: (callback) => ipcRenderer.on('set-volume', (_event, volume) => callback(volume)),
  onPlayChime: (callback) => ipcRenderer.on('play-chime', (_event, volume, soundPath) => callback(volume, soundPath)),
  rendererReady: () => ipcRenderer.send('renderer-ready'),
  // Settings window
  getVolume: () => ipcRenderer.invoke('get-volume'),
  setVolume: (volume) => ipcRenderer.send('set-volume-from-settings', volume),
});
