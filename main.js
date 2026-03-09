'use strict';

const { app, Tray, Menu, BrowserWindow, ipcMain, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');

// Prevent the app from showing in the Dock on macOS
app.dock && app.dock.hide();

const MS_PER_SECOND = 1000;
const MS_PER_MINUTE = 60 * MS_PER_SECOND;
const MS_PER_HOUR = 60 * MS_PER_MINUTE;

let tray = null;
let audioWindow = null;
let settingsWindow = null;
let currentVolume = 50; // Default volume (0–100)
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
  } catch (err) {
    // ENOENT is expected on first run; log any other error to aid troubleshooting
    if (err.code !== 'ENOENT') {
      console.error('Failed to load config:', err);
    }
  }
}

function saveConfig() {
  try {
    fs.writeFileSync(getConfigPath(), JSON.stringify({ volume: currentVolume }, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to save config:', err);
  }
}

// ---------------------------------------------------------------------------
// Sound resolution
// ---------------------------------------------------------------------------

function clampVolume(volume) {
  return Math.max(0, Math.min(100, Math.round(Number(volume))));
}

// Map a 0–23 hour to a clock-face hour (1–12) and return its sound file path.
function soundPathForHour(hour) {
  const h = Number.isInteger(hour) && hour >= 0 && hour <= 23 ? hour : new Date().getHours();
  const clockHour = h % 12 || 12;
  return path.join(__dirname, 'sounds', `${clockHour}.mp3`);
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

function openSettingsWindow() {
  if (settingsWindow) {
    settingsWindow.focus();
    return;
  }
  settingsWindow = new BrowserWindow({
    width: 300,
    height: 80,
    resizable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    title: 'Music Clock – Settings',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });
  settingsWindow.setMenu(null);
  settingsWindow.loadFile(path.join(__dirname, 'renderer', 'settings.html'));
  settingsWindow.on('closed', () => {
    settingsWindow = null;
  });
}

// ---------------------------------------------------------------------------
// Tray menu
// ---------------------------------------------------------------------------

function buildTrayMenu() {
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
      label: 'Volume...',
      click: () => openSettingsWindow(),
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
  if (currentVolume === 0) return; // user has muted
  const hour = new Date().getHours();
  audioWindow.webContents.send('play-chime', currentVolume / 100, soundPathForHour(hour));
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

  const iconPath = path.join(__dirname, 'assets', 'tray-iconTemplate.png');
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

// Settings window IPC
ipcMain.handle('get-volume', () => currentVolume);

ipcMain.on('set-volume-from-settings', (_event, volume) => {
  currentVolume = clampVolume(volume);
  if (audioWindow) {
    audioWindow.webContents.send('set-volume', currentVolume / 100);
  }
  saveConfig();
});
