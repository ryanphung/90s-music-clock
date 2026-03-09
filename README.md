# music-clock

A macOS menu-bar clock app built with Electron that plays a chime sound every hour.

## Features

- Lives entirely in the macOS top menu bar (no Dock icon, no window)
- Plays a different chime sound for each clock-hour (1–12)
- Volume control via the tray menu (Off / 25% / 50% / 75% / 100%)
- "Play chime now" option for testing
- Volume setting is persisted across restarts

## Setup

```bash
npm install
npm start
```

## Sound files

The `sounds/` directory contains one WAV file per clock-hour:

```
sounds/
  1.wav    ← played at 1:00 AM and 1:00 PM
  2.wav    ← played at 2:00 AM and 2:00 PM
  …
  12.wav   ← played at 12:00 AM (midnight) and 12:00 PM (noon)
```

Replace any of these files with your own audio to customise the chime for
that hour. The app always uses the file matching the current clock-face hour
(`hour % 12`, where 0 maps to 12).

## Project structure

```
main.js          – Electron main process: tray icon, hourly timer, sound routing
preload.js       – Context bridge exposing safe IPC to renderer
renderer/
  index.html     – Hidden BrowserWindow for audio playback
  renderer.js    – HTML5 Audio playback & volume handling
assets/
  tray-iconTemplate.png  – macOS menu-bar icon (template image)
sounds/
  1.wav – 12.wav – one chime file per clock-hour
```

## Config file

Volume is saved automatically to
`~/Library/Application Support/music-clock/config.json` (macOS):

```json
{ "volume": 50 }
```
