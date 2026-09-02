# Running Remix Reaction Video Maker on Termux (Android)

This app is a **Vite + React frontend served by a small Express server on port 3000**
(`npm run dev` → `tsx server.ts`). It works fine on Android/Termux: Termux runs the
server, and the Android browser (Chrome) is the "screen" where you open it.

> ⚠️ **Important:** this app is a *camera + microphone* app. Browsers only grant camera
> and mic access on a **secure context**, which means `https://…` **or** `localhost`.
> So the only setups where recording actually works are:
> **open `http://localhost:3000` in the phone's own browser**, or reach the phone over a
> **real HTTPS tunnel** (`*.trycloudflare.com`), or use `adb reverse` from a PC.
> Opening `http://192.168.x.x:3000` from a laptop will load the UI but **camera/mic will
> be blocked** unless you add an insecure-origin exception in Chrome.

---

## 0. TL;DR (copy–paste)

```bash
pkg update && pkg upgrade -y
pkg install nodejs git -y          # Node 20/22 (check: node -v)
termux-setup-storage               # optional: lets you grab videos from /sdcard

cd ~
git clone https://github.com/rehmanahmeddxb/reaction-maker-for-social-media.git
cd reaction-maker-for-social-media

npm install                        # ~190 MB, a few minutes

# optional: Gemini key for AI subtitles / viral titles (app runs without it, with fallbacks)
cp .env.example .env.local && nano .env.local

ALLOW_ALL_HOSTS=true npm run dev   # or just: npm run dev
```

Then open **Chrome on the same phone → `http://localhost:3000`** and allow camera + mic.

---

## 1. One-time Termux setup

```bash
pkg update && pkg upgrade -y
pkg install nodejs git -y
node -v     # needs v18+; Termux ships v20/v22 → fine
npm -v
```

Useful extras:

```bash
pkg install termux-api tmux -y     # termux-wake-lock (keep server alive), tmux sessions
```

* Install **Termux from F-Droid** — the Play Store build is old and breaks packages.
* If `npm install` ever tries to compile a native module:
  `pkg install build-essential python binutils -y` and retry.
  (This project's deps are prebuilt for `linux-arm64`, so this is normally not needed.)

---

## 2. Clone into `$HOME` — never into `/sdcard`

```bash
cd ~
git clone https://github.com/rehmanahmeddxb/reaction-maker-for-social-media.git
cd reaction-maker-for-social-media
```

Do **not** put the project in `/sdcard`, `/storage/emulated/0`, or any shared folder:
that filesystem is mounted `noexec` and has no symlinks/permissions, so `npm install`,
`node_modules/.bin`, and Vite all break there. Keep the repo in `~/` and only *copy*
media in/out if needed.

---

## 3. Install dependencies

```bash
npm install
```

(`bun.lock` is in the repo, so `bun install` works too if you have bun.)

---

## 4. Gemini API key (optional)

The app boots and records without a key — the AI features fall back to canned text.
To enable real translation and viral-title generation:

```bash
cp .env.example .env.local
nano .env.local          # set GEMINI_API_KEY="AIza..."
```

or export it in the shell before starting:

```bash
export GEMINI_API_KEY="AIza..."
```

`server.ts` now loads `.env.local` (wins) and `.env` automatically, so no export needed
once the file exists.

---

## 5. Start the server

```bash
npm run dev
# → "Reaction Studio server running on http://0.0.0.0:3000"
```

Keep it alive while you use it:

```bash
termux-wake-lock                 # or: tmux new -s studio   (Ctrl-b d to detach)
```
Also turn off battery optimization for Termux in Android settings, and leave the
Termux notification visible — Android will otherwise kill the process when the screen
is off or the app is backgrounded.

Change the port if 3000 is taken:

```bash
PORT=3001 npm run dev
```

---

## 6. Open it in the browser — 4 options

### ✅ Option A — On the same phone (recommended, camera/mic works)

Open **Chrome** (or Firefox) on the phone and go to:

```
http://localhost:3000
```

`localhost` counts as a secure context, so Chrome will offer the camera/mic permission
prompt and recording/export works. This is the setup you want for actually making
reaction videos.

### ⚠️ Option B — Another device on the same Wi-Fi (UI only by default)

```bash
ip -4 addr show wlan0 | grep inet     # e.g. 192.168.1.20
ALLOWED_HOSTS="192.168.1.20" npm run dev     # or ALLOW_ALL_HOSTS=true
```

Then on the laptop/tablet: `http://192.168.1.20:3000`.

Two caveats:

1. **Vite blocks unknown hostnames** with `Blocked request. This host is not allowed.`
   That's why you pass `ALLOWED_HOSTS` / `ALLOW_ALL_HOSTS` (see "Why that env var" below).
2. **Camera/mic will be blocked** (plain HTTP ≠ secure context). To force it in Chrome:
   `chrome://flags/#unsafely-treat-insecure-origin-as-secure` → add
   `http://192.168.1.20:3000` → Relaunch → restart Chrome.

### ✅ Option C — Public HTTPS tunnel (camera works from anywhere)

```bash
pkg install cloudflared -y
cloudflared tunnel --url http://localhost:3000
```

Cloudflare prints an `https://xxxx.trycloudflare.com` URL. Start the app with the tunnel
hostname allowed:

```bash
ALLOWED_HOSTS="xxxx.trycloudflare.com" npm run dev     # or ALLOW_ALL_HOSTS=true
```

Because it's real HTTPS, camera/mic prompts work on any device.
If `cloudflared` fails to resolve hosts in Termux, run it under
`pkg install proot resolv-conf && termux-chroot` first.

### ✅ Option D — PC over USB (`adb reverse`, camera works)

On a computer with the phone plugged in (USB debugging on):

```bash
adb reverse tcp:3000 tcp:3000
```

Then open `http://localhost:3000` in the *computer's* browser — it's localhost there too,
so it's a secure context and camera/mic (the phone's) are available.

---

## Why the `ALLOW_ALL_HOSTS` / `ALLOWED_HOSTS` env var?

Vite 6 rejects requests whose `Host` header isn't localhost (a security fix). Localhost
works out of the box; anything else — LAN IP, tunnel hostname, preview domain — needs to
be whitelisted. `vite.config.ts` now reads:

| Env var | Effect |
| --- | --- |
| `ALLOWED_HOSTS="a.com,192.168.1.20"` | allow exactly those hostnames |
| `ALLOW_ALL_HOSTS=true` | allow any hostname (easiest for local tinkering) |
| `VITE_USE_POLLING=true` | file watching via polling instead of inotify |
| `DISABLE_HMR=true` | no HMR, no file watcher (saves battery/CPU) |
| `PORT=3001` | use a different port |

---

## 7. Termux-specific gotchas & fixes

| Symptom | Fix |
| --- | --- |
| `ENOSPC: System limit for number of file watchers reached` | `VITE_USE_POLLING=true npm run dev` or `DISABLE_HMR=true npm run dev` (Android's inotify limit is tiny) |
| `Blocked request. This host is not allowed.` | Start with `ALLOW_ALL_HOSTS=true` or `ALLOWED_HOSTS="<your-host>"` |
| `EADDRINUSE: port 3000` | `PORT=3001 npm run dev` |
| Server dies when you switch apps / screen off | `termux-wake-lock`, disable battery optimization, or run inside `tmux` |
| Camera/mic prompt never appears, or "Permission denied" | You're on plain HTTP from a non-localhost host → use Option A, C, or D (or Chrome's insecure-origin flag) |
| Blank page / fonts look wrong | Needs internet on first load (Google Fonts in `index.html`) |
| Sluggish recording | Phone CPU: use shorter clips and smaller canvas presets; close other apps |
| `npm install` slow / interrupted | `npm cache clean --force && rm -rf node_modules && npm install` |

---

## 8. Production mode (lighter on the phone)

Once, to build:

```bash
npm run build          # vite build → dist/  +  esbuild → dist/server.cjs
```

Then run without Vite's dev-time transforms and file watcher:

```bash
GEMINI_API_KEY="AIza..." NODE_ENV=production PORT=3000 npm start
# → http://localhost:3000
```

Production mode serves prebuilt static files, so it uses less CPU/RAM and there is no
host allowlist or file-watcher problem at all. Re-run `npm run build` after pulling code
changes.

---

## Quick sanity checks

```bash
curl http://localhost:3000/api/health     # → {"status":"ok","serverTime":"..."}
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/   # → 200
```

If both return as shown, the server is healthy and any problem is browser-side
(permissions / hostname), not the app.
