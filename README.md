# music-clock

A macOS menu-bar clock app built with Electron that plays a chime sound every hour.

## Features

- Lives entirely in the macOS top menu bar (no Dock icon, no window)
- Plays a chime sound at the top of every hour
- Volume control via the tray menu (Off / 25% / 50% / 75% / 100%)
- "Play chime now" option for testing

## Setup

```bash
npm install
npm start
```

## Adding your own sounds

Replace `sounds/hourly.wav` with your own audio file (WAV or MP3), and update
the `chime.src` path in `renderer/renderer.js` accordingly.

## Project structure

```
main.js          – Electron main process: tray icon, hourly timer, IPC
preload.js       – Context bridge exposing safe IPC to renderer
renderer/
  index.html     – Hidden BrowserWindow for audio playback
  renderer.js    – HTML5 Audio playback & volume handling
assets/
  tray-iconTemplate.png  – macOS menu-bar icon (template image)
sounds/
  hourly.wav     – Dummy chime sound (replace with your own MP3/WAV)
```
