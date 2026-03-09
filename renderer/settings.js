'use strict';

const slider = document.getElementById('volume-slider');
const display = document.getElementById('volume-display');

// Load the current volume from the main process
window.clockAPI.getVolume().then((volume) => {
  slider.value = volume;
  display.textContent = `${volume}%`;
}).catch((err) => {
  console.error('Failed to get volume:', err);
});

slider.addEventListener('input', () => {
  const value = Number(slider.value);
  display.textContent = `${value}%`;
  window.clockAPI.setVolume(value);
});
