# music-clock

A macOS menu-bar clock app built with Electron that plays a chime sound every hour.

## Features

- Lives entirely in the macOS top menu bar (no Dock icon, no window)
- Plays a chime sound at the top of every hour
- Volume control via the tray menu (Off / 25% / 50% / 75% / 100%)
- **Per-hour sound selection** — assign a different audio file to each of the 24 hours
- "Play chime now" option for testing
- All settings (volume and per-hour sounds) are persisted across restarts

## Setup

```bash
npm install
npm start
```

## Adding your own sounds

### Default sound
Replace `sounds/hourly.wav` with your own audio file (WAV or MP3) to change
the fallback sound used for any hour that has no custom assignment.

### Per-hour sounds
Click the tray icon → **Sounds by hour** → pick any hour → **Choose sound file…**
to assign an individual audio file (WAV, MP3, OGG, M4A, FLAC) to that hour.

To revert a custom assignment back to the default, choose **Reset to default** in
the same submenu.

## Project structure

```
main.js          – Electron main process: tray icon, hourly timer, per-hour sounds, config
preload.js       – Context bridge exposing safe IPC to renderer
renderer/
  index.html     – Hidden BrowserWindow for audio playback
  renderer.js    – HTML5 Audio playback & volume/sound handling
assets/
  tray-iconTemplate.png  – macOS menu-bar icon (template image)
sounds/
  hourly.wav     – Default chime sound (replace with your own MP3/WAV)
```

## Config file

Settings are saved automatically to `~/Library/Application Support/music-clock/config.json`
(macOS) in the following format:

```json
{
  "volume": 50,
  "hourSounds": {
    "9":  "/Users/you/sounds/morning.mp3",
    "12": "/Users/you/sounds/noon.wav",
    "18": "/Users/you/sounds/evening.mp3"
  }
}
```
