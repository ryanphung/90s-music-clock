'use strict';

const chime = document.getElementById('chime');

// Default sound path (used when no per-hour sound is configured)
const DEFAULT_SOUND = '../sounds/hourly.wav';

// Set initial source to the default sound
chime.src = DEFAULT_SOUND;

let currentVolume = 0.5;

window.clockAPI.onSetVolume((volume) => {
  currentVolume = volume;
  chime.volume = volume;
});

window.clockAPI.onPlayChime((volume, soundPath) => {
  currentVolume = volume;
  chime.volume = volume;
  // Use the provided file path, or fall back to the default sound
  chime.src = soundPath ? `file://${soundPath}` : DEFAULT_SOUND;
  chime.currentTime = 0;
  chime.play().catch((err) => {
    console.error('Failed to play chime:', err);
  });
});

// Notify main process that the renderer is ready
window.clockAPI.rendererReady();
