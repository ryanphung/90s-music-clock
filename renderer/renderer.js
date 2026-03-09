'use strict';

const chime = document.getElementById('chime');

let currentVolume = 0.5;

window.clockAPI.onSetVolume((volume) => {
  currentVolume = volume;
  chime.volume = volume;
});

window.clockAPI.onPlayChime((volume, soundPath) => {
  currentVolume = volume;
  chime.volume = volume;
  chime.src = `file://${soundPath}`;
  chime.currentTime = 0;
  chime.play().catch((err) => {
    console.error('Failed to play chime:', err);
  });
});

// Notify main process that the renderer is ready
window.clockAPI.rendererReady();
