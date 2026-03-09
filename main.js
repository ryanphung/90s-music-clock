'use strict';

const { app, Tray, Menu, BrowserWindow, ipcMain, nativeImage } = require('electron');
const path = require('path');

// Prevent the app from showing in the Dock on macOS
app.dock && app.dock.hide();

const MS_PER_SECOND = 1000;
const MS_PER_MINUTE = 60 * MS_PER_SECOND;
const MS_PER_HOUR = 60 * MS_PER_MINUTE;

let tray = null;
let audioWindow = null;
let currentVolume = 50; // Default volume (0–100)
let hourlyTimer = null;

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

function playHourlyChime() {
  if (audioWindow && currentVolume > 0) {
    audioWindow.webContents.send('play-chime', currentVolume / 100);
  }
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
