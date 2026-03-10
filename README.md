# 90s-music-clock

A macOS menu-bar clock app built with Electron that plays a chime sound every hour. It simulates the chime sound of a music clock from the 90s, specially those that use the Quartz sound mechanism.

## Features

- Lives entirely in the macOS top menu bar (no Dock icon, no window)
- Plays a different chime sound for each clock-hour (1–12)
- Volume control via the tray menu (Off / 25% / 50% / 75% / 100%)
- **Night Mode**: automatically lowers the chime to a quieter volume during a configurable quiet window (default: 9 pm – 6 am); the start hour, end hour, and night volume are each configurable from the Night Mode submenu
- "Play chime now" submenu to test the current hour's chime or any specific hour (1–12)
- **Open at Login**: optional setting to launch the app automatically on macOS login
- All settings are persisted across restarts

## Setup

```bash
npm install
npm start
```

## Sound files

The `sounds/` directory contains one MP3 file per clock-hour:

```
sounds/
  1.mp3    ← played at 1:00 AM and 1:00 PM
  2.mp3    ← played at 2:00 AM and 2:00 PM
  …
  12.mp3   ← played at 12:00 AM (midnight) and 12:00 PM (noon)
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
  tray-icon.png  – macOS menu-bar icon
sounds/
  1.mp3 – 12.mp3 – one chime file per clock-hour
```

## Config file

All settings are saved automatically to
`~/Library/Application Support/90s-music-clock/config.json` (macOS):

```json
{
  "volume": 50,
  "nightStart": 21,
  "nightEnd": 6,
  "nightVolume": 25
}
```

| Field | Description | Default |
|-------|-------------|---------|
| `volume` | Day-time chime volume (0–100) | `50` |
| `nightStart` | Hour (0–23) at which the quiet window begins | `21` (9 pm) |
| `nightEnd` | Hour (0–23) at which the quiet window ends | `6` (6 am) |
| `nightVolume` | Chime volume (0–100) during the quiet window | `25` |
