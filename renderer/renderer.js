'use strict';

const chime = document.getElementById('chime');

// Set the chime audio source relative to this HTML file's location
chime.src = '../sounds/hourly.wav';

let currentVolume = 0.5;

window.clockAPI.onSetVolume((volume) => {
  currentVolume = volume;
  chime.volume = volume;
});

window.clockAPI.onPlayChime((volume) => {
  currentVolume = volume;
  chime.volume = volume;
  chime.currentTime = 0;
  chime.play().catch((err) => {
    console.error('Failed to play chime:', err);
  });
});

// Notify main process that the renderer is ready
window.clockAPI.rendererReady();
