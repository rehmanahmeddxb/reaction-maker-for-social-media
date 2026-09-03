# Reaction Video Maker

A React + Vite application for recording reaction videos with camera/microphone input, canvas compositing, and video export.

## Features

- Camera and microphone recording on Android/Termux
- Video clip compositing onto canvas with PiP (Picture-in-Picture) layout
- Real-time audio level visualization
- Auto-transcription with Gemini AI (optional)
- Viral title and hook generation (optional)
- Take history and export to webm format
- Multiple layout modes (pip-bottom-right, pip-top-left, split-screen, stacked-shorts)

## Running Locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000` in your browser. Camera/mic access will be prompted.

## Running on Android/Termux

Full step-by-step guide → **[TERMUX.md](TERMUX.md)**.

### Minimal workflow

```bash
pkg update && pkg install nodejs git -y
cd ~ && git clone https://github.com/rehmanahmeddxb/reaction-maker-for-social-media.git
cd reaction-maker-for-social-media
npm install
PORT=3000 npm run dev
# Open http://localhost:3000 in phone's Chrome. Allow camera + mic.
```

### Using the one-command update script

```bash
bash termux.sh   # after first clone — pulls latest code, installs deps if needed, then starts server
```

## Video Recording

1. Select a video clip or use the camera feed
2. Click **Start Recording** — a 3-second countdown begins
3. The app records canvas composition + microphone audio for up to 30 seconds
4. Click **Stop** to finish and export as a webm file

Camera/mic only works over a secure context: `localhost`, real HTTPS (Cloudflare tunnel), or `adb reverse`.

## Environment Variables

| Variable | Default | Purpose |
|---|---|---|
| `PORT` | `3000` | HTTP port for the Express/Vite server |
| `ALLOW_ALL_HOSTS` | `false` | Bypasses Vite host validation for mobile/tunnel access (`true` enables) |
| `VITE_USE_POLLING` | `false` | Enables polling file watcher to avoid Android `ENOSPC` inotify limits |
| `DISABLE_HMR` | `false` | Disables HMR to save CPU and avoid port 24678 collisions |
| `GEMINI_API_KEY` | `` | Optional Google Gemini API key for AI features |

## Build for Production

```bash
npm run build
```

Then serve the static files:
```bash
NODE_ENV=production PORT=3000 npm start
```