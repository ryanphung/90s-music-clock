'use strict';

const { app, Tray, Menu, BrowserWindow, ipcMain, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');

// Handle Squirrel events on Windows (installer/uninstaller lifecycle).
// This must return early so the rest of the app does not run during install/uninstall.
if (require('electron-squirrel-startup')) app.quit();

// Prevent the app from showing in the Dock on macOS
app.dock && app.dock.hide();

const MS_PER_SECOND = 1000;
const MS_PER_MINUTE = 60 * MS_PER_SECOND;
const MS_PER_HOUR = 60 * MS_PER_MINUTE;

let tray = null;
let audioWindow = null;
let currentVolume = 50; // Default volume (0–100)
let nightStart = 21;    // Default night window start hour (9 pm), 0–23
let nightEnd = 6;       // Default night window end hour (6 am), 0–23
let nightVolume = 25;   // Default night volume (0–100)
let hourlyTimer = null;

// ---------------------------------------------------------------------------
// Config persistence (volume only)
// ---------------------------------------------------------------------------

function getConfigPath() {
  return path.join(app.getPath('userData'), 'config.json');
}

function loadConfig() {
  try {
    const raw = fs.readFileSync(getConfigPath(), 'utf8');
    const data = JSON.parse(raw);
    if (typeof data.volume === 'number') {
      currentVolume = data.volume;
    }
    if (typeof data.nightStart === 'number') {
      nightStart = data.nightStart;
    }
    if (typeof data.nightEnd === 'number') {
      nightEnd = data.nightEnd;
    }
    if (typeof data.nightVolume === 'number') {
      nightVolume = data.nightVolume;
    }
  } catch (err) {
    // ENOENT is expected on first run; log any other error to aid troubleshooting
    if (err.code !== 'ENOENT') {
      console.error('Failed to load config:', err);
    }
  }
}

function saveConfig() {
  try {
    fs.writeFileSync(
      getConfigPath(),
      JSON.stringify({ volume: currentVolume, nightStart, nightEnd, nightVolume }, null, 2),
      'utf8'
    );
  } catch (err) {
    console.error('Failed to save config:', err);
  }
}

// ---------------------------------------------------------------------------
// Sound resolution
// ---------------------------------------------------------------------------

// Map a 0–23 hour to a clock-face hour (1–12) and return its sound file path.
function soundPathForHour(hour) {
  const h = Number.isInteger(hour) && hour >= 0 && hour <= 23 ? hour : new Date().getHours();
  const clockHour = h % 12 || 12;
  return path.join(__dirname, 'sounds', `${clockHour}.mp3`);
}

// Return true if the given hour (0–23) falls within the night window.
// The window can span midnight (e.g. 21–6).
function isNightTime(hour) {
  if (nightStart < nightEnd) {
    // Simple (non-wrapping) range, e.g. nightStart=8, nightEnd=17 → 8 am to 5 pm
    return hour >= nightStart && hour < nightEnd;
  }
  // Wraps midnight, e.g. nightStart=21, nightEnd=6 → 21,22,23,0,1,2,3,4,5
  return hour >= nightStart || hour < nightEnd;
}

// Return the volume (0–100) to use right now, respecting the night window.
function effectiveVolume() {
  const hour = new Date().getHours();
  return isNightTime(hour) ? nightVolume : currentVolume;
}

function createAudioWindow() {
  audioWindow = new BrowserWindow({
    width: 0,
    height: 0,
    show: false,
    skipTaskbar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });
  audioWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  audioWindow.on('closed', () => {
    audioWindow = null;
  });
}

// ---------------------------------------------------------------------------
// Tray menu
// ---------------------------------------------------------------------------

function buildTrayMenu() {
  const volumeItems = [0, 25, 50, 75, 100].map((level) => ({
    label: level === 0 ? 'Off (0%)' : `${level}%`,
    type: 'radio',
    checked: currentVolume === level,
    click: () => {
      currentVolume = level;
      if (audioWindow) {
        audioWindow.webContents.send('set-volume', currentVolume / 100);
      }
      saveConfig();
      tray.setContextMenu(buildTrayMenu());
    },
  }));

  // Night window start hours: every hour 0–23, labelled in 12-hour format
  const hourLabel = (h) => {
    if (h === 0) return '12 am (midnight)';
    if (h === 12) return '12 pm (noon)';
    return h < 12 ? `${h} am` : `${h - 12} pm`;
  };

  const nightStartItems = Array.from({ length: 24 }, (_, h) => ({
    label: hourLabel(h),
    type: 'radio',
    checked: nightStart === h,
    click: () => {
      nightStart = h;
      saveConfig();
      tray.setContextMenu(buildTrayMenu());
    },
  }));

  const nightEndItems = Array.from({ length: 24 }, (_, h) => ({
    label: hourLabel(h),
    type: 'radio',
    checked: nightEnd === h,
    click: () => {
      nightEnd = h;
      saveConfig();
      tray.setContextMenu(buildTrayMenu());
    },
  }));

  const nightVolumeItems = [0, 25, 50, 75, 100].map((level) => ({
    label: level === 0 ? 'Off (0%)' : `${level}%`,
    type: 'radio',
    checked: nightVolume === level,
    click: () => {
      nightVolume = level;
      saveConfig();
      tray.setContextMenu(buildTrayMenu());
    },
  }));

  const hourItems = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((h) => ({
    label: `${h} o'clock`,
    click: () => {
      if (!audioWindow || currentVolume === 0) return;
      audioWindow.webContents.send('play-chime', currentVolume / 100, soundPathForHour(h));
    },
  }));

  return Menu.buildFromTemplate([
    { label: 'Music Clock', enabled: false },
    { type: 'separator' },
    {
      label: 'Volume',
      submenu: volumeItems,
    },
    {
      label: 'Night Mode',
      submenu: [
        { label: 'Start (quiet from)', submenu: nightStartItems },
        { label: 'End (quiet until)', submenu: nightEndItems },
        { label: 'Night Volume', submenu: nightVolumeItems },
      ],
    },
    { type: 'separator' },
    {
      label: 'Play chime now',
      submenu: [
        {
          label: 'Current hour',
          click: () => playHourlyChime(),
        },
        { type: 'separator' },
        ...hourItems,
      ],
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        app.quit();
      },
    },
  ]);
}

// ---------------------------------------------------------------------------
// Chime playback
// ---------------------------------------------------------------------------

function playHourlyChime() {
  if (!audioWindow) return;        // window not yet ready
  const vol = effectiveVolume();
  if (vol === 0) return;           // muted (day or night)
  const hour = new Date().getHours();
  audioWindow.webContents.send('play-chime', vol / 100, soundPathForHour(hour));
}

function scheduleHourlyChime() {
  if (hourlyTimer) {
    clearTimeout(hourlyTimer);
  }

  const now = new Date();
  // Calculate milliseconds until the next top of the hour
  const msUntilNextHour =
    (60 - now.getMinutes()) * MS_PER_MINUTE -
    now.getSeconds() * MS_PER_SECOND -
    now.getMilliseconds();

  hourlyTimer = setTimeout(() => {
    playHourlyChime();
    // After the first chime, repeat every hour
    hourlyTimer = setInterval(() => {
      playHourlyChime();
    }, MS_PER_HOUR);
  }, msUntilNextHour);
}

app.whenReady().then(() => {
  loadConfig();

  const iconPath = path.join(__dirname, 'assets', 'tray-icon.png');
  const icon = nativeImage.createFromPath(iconPath);

  tray = new Tray(icon);
  tray.setToolTip('Music Clock');
  tray.setContextMenu(buildTrayMenu());

  createAudioWindow();
  scheduleHourlyChime();
});

app.on('window-all-closed', () => {
  // Do not quit the app when all windows are closed — the tray icon keeps it running.
  // On macOS this is the default behaviour; on other platforms we explicitly do nothing.
});

// Handle IPC messages from the renderer (if needed)
ipcMain.on('renderer-ready', () => {
  if (audioWindow) {
    audioWindow.webContents.send('set-volume', currentVolume / 100);
  }
});
