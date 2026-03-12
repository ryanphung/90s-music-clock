'use strict';

const chime = document.getElementById('chime');

let currentVolume = 0.5;

// Single shared AudioContext for synthetic chime tones
const audioCtx = new AudioContext();

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

// Play a synthetic bell chime using the Web Audio API.
// count is the number of chimes to play in sequence (1, 2, or 3).
window.clockAPI.onPlayQuarterChime((volume, count) => {
  const chimeDuration = 1.8; // seconds per chime tone
  const chimeGap = 0.4;      // seconds of silence between chimes

  for (let i = 0; i < count; i++) {
    const startTime = audioCtx.currentTime + i * (chimeDuration + chimeGap);

    // Fundamental tone
    const osc1 = audioCtx.createOscillator();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(830, startTime);

    // Overtone for a richer bell timbre
    const osc2 = audioCtx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1245, startTime);

    const gainNode = audioCtx.createGain();
    gainNode.gain.setValueAtTime(volume, startTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + chimeDuration);

    const gainOvertone = audioCtx.createGain();
    gainOvertone.gain.setValueAtTime(volume * 0.3, startTime);
    gainOvertone.gain.exponentialRampToValueAtTime(0.001, startTime + chimeDuration * 0.6);

    osc1.connect(gainNode);
    osc2.connect(gainOvertone);
    gainNode.connect(audioCtx.destination);
    gainOvertone.connect(audioCtx.destination);

    osc1.start(startTime);
    osc1.stop(startTime + chimeDuration);
    osc2.start(startTime);
    osc2.stop(startTime + chimeDuration * 0.6);
  }
});

// Notify main process that the renderer is ready
window.clockAPI.rendererReady();
