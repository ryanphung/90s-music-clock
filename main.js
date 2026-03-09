'use strict';

const { app, Tray, Menu, BrowserWindow, ipcMain, nativeImage, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

// Prevent the app from showing in the Dock on macOS
app.dock && app.dock.hide();

const MS_PER_SECOND = 1000;
const MS_PER_MINUTE = 60 * MS_PER_SECOND;
const MS_PER_HOUR = 60 * MS_PER_MINUTE;

const DEFAULT_SOUND = path.join(__dirname, 'sounds', 'hourly.wav');

let tray = null;
let audioWindow = null;
let currentVolume = 50; // Default volume (0–100)
let hourlyTimer = null;

// Per-hour sound map: { [hour: number]: string (absolute file path) }
// Hours not present fall back to DEFAULT_SOUND.
let hourSoundMap = {};

// ---------------------------------------------------------------------------
// Config persistence
// ---------------------------------------------------------------------------

function getConfigPath() {
  return path.join(app.getPath('userData'), 'config.json');
}

function loadConfig() {
  try {
    const raw = fs.readFileSync(getConfigPath(), 'utf8');
    const data = JSON.parse(raw);
    if (data && typeof data.hourSounds === 'object') {
      // Coerce keys to numbers
      for (const [k, v] of Object.entries(data.hourSounds)) {
        const hour = parseInt(k, 10);
        if (hour >= 0 && hour <= 23 && typeof v === 'string') {
          hourSoundMap[hour] = v;
        }
      }
    }
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
  const data = { volume: currentVolume, hourSounds: hourSoundMap };
  try {
    fs.writeFileSync(getConfigPath(), JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to save config:', err);
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function hourLabel(h) {
  if (h === 0) return '12:00 AM (Midnight)';
  if (h === 12) return '12:00 PM (Noon)';
  if (h < 12) return `${h}:00 AM`;
  return `${h - 12}:00 PM`;
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

function buildSoundsSubmenu() {
  return Array.from({ length: 24 }, (_, h) => {
    const assigned = hourSoundMap[h];
    const soundLabel = assigned ? path.basename(assigned) : 'Default';
    return {
      label: `${hourLabel(h)}  —  ${soundLabel}`,
      submenu: [
        {
          label: 'Choose sound file…',
          click: async () => {
            const { canceled, filePaths } = await dialog.showOpenDialog({
              title: `Choose sound for ${hourLabel(h)}`,
              filters: [{ name: 'Audio files', extensions: ['wav', 'mp3', 'ogg', 'm4a', 'flac'] }],
              properties: ['openFile'],
            });
            if (!canceled && filePaths.length > 0) {
              hourSoundMap[h] = filePaths[0];
              saveConfig();
              tray.setContextMenu(buildTrayMenu());
            }
          },
        },
        {
          label: 'Reset to default',
          enabled: !!assigned,
          click: () => {
            delete hourSoundMap[h];
            saveConfig();
            tray.setContextMenu(buildTrayMenu());
          },
        },
      ],
    };
  });
}

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

  return Menu.buildFromTemplate([
    { label: 'Music Clock', enabled: false },
    { type: 'separator' },
    {
      label: 'Volume',
      submenu: volumeItems,
    },
    {
      label: 'Sounds by hour',
      submenu: buildSoundsSubmenu(),
    },
    { type: 'separator' },
    {
      label: 'Play chime now',
      click: () => {
        playHourlyChime();
      },
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
  if (!audioWindow) return;       // window not yet ready
  if (currentVolume === 0) return; // user has muted
  const hour = new Date().getHours();
  const soundPath = hourSoundMap[hour] || DEFAULT_SOUND;
  audioWindow.webContents.send('play-chime', currentVolume / 100, soundPath);
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
