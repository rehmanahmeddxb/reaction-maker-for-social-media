# Running Reaction Video Maker on Termux (Android)

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
pkg update && pkg install nodejs git -y   # install git + node only (skip full upgrade)
termux-setup-storage                       # optional: lets you grab videos from /sdcard

cd ~
git clone https://github.com/rehmanahmeddxb/reaction-maker-for-social-media.git
cd reaction-maker-for-social-media

# optional: Gemini key for AI subtitles / viral titles (app runs without it, with fallbacks)
cp .env.example .env.local && nano .env.local

# one command for EVERY update & run — pulls latest code, installs deps only
# when needed, then starts the server light on CPU/battery:
bash termux.sh
```

> `termux.sh` is the whole point of this guide: after the first clone you never have to
> re-clone or run `npm install` every time. See **§ 2b. The one-command update** below
> for exactly how it works and the really short command.

Then open **Chrome on the same phone → `http://localhost:3000`** and allow camera + mic.

---

## 1. One-time Termux setup

```bash
pkg update && pkg install nodejs git -y   # skip `pkg upgrade` — it's slow and not needed
node -v     # needs v18+; Termux ships v20/v22 → fine
npm -v
```

> Only run a full `pkg upgrade` if you want to update ALL installed packages (it can take
> a while and use a lot of data). For this app, `pkg update` + installing `nodejs git`
> is enough and is much lighter.

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

## 2b. The one-command update (use this every time)

After the first clone, you never need to `git clone` again or run `npm install` by hand.
The repo ships a small script, **`termux.sh`**, that does everything:

```bash
bash termux.sh
```

(Or, once, `chmod +x termux.sh` so you can just type `./termux.sh`.)

What it does, in this order:

1. **Clones the repo once** if it's not there yet (first run only).
2. **Pulls the latest code from GitHub** fast — a clean `git reset --hard` to the default
   branch, so it always looks like a fresh clone. Your `node_modules` and `.env.local`
   are kept (they're untracked files), so they're **not** re-downloaded.
3. **Runs `npm install` only when `package.json` changed** (or `node_modules` is
   missing/corrupt). It stores a fingerprint (`package.json` + a small `.deps-hash`
   marker); if the dependency list is the same, it skips the slow install step
   entirely, so most updates just swap in the new code. **If an install fails**
   (e.g. after an interrupted install), it repairs the npm cache, removes the broken
   `node_modules`/`package-lock.json`, and retries once automatically.
4. **Starts the server** with the phone-friendly defaults already set:
   `ALLOW_ALL_HOSTS=true`, `DISABLE_HMR=true` (no hot-reload → less CPU/battery), and
   `VITE_USE_POLLING=true` (avoids the Android `ENOSPC` file-watcher crash).

Optional overrides (set them *before* running):

```bash
HMR=true POLLING=false PORT=3001 bash termux.sh   # hot-reload on / polling off / other port
```

> ⚠️ One thing to know: `git reset --hard` means the folder always matches the GitHub
> repo exactly. Any **tracked** file you edited by hand (e.g. `src/App.tsx`) will be
> reset to the GitHub version. Your **untracked** files (`node_modules`, `.env.local`)
> are safe and kept. So if you customize code locally, keep it in `.env.local` via an env
> var, or skip the script and use a plain `git pull` (see § 3) so your tweaks aren't wiped.

The very first time `termux.sh` will still install dependencies (that's unavoidable), but
you only pay that cost **once**. After that, every update is a fast `git pull` + reload,
and `npm install` only re-runs when `package.json` changed.

**Want an even faster install?** The repo ships a `bun.lock`, so `bun install` is much
faster than `npm install` on a phone. Optional (adds one extra package):

```bash
pkg install bun -y          # one-time, optional
# then make termux.sh use bun for the install line
```

---

## 3. Install dependencies

Normally you never run this by hand — `termux.sh` does it only when needed:

```bash
npm install
```

(`bun.lock` is in the repo, so `bun install` works too if you have bun.)

### If `npm install` fails with `ERESOLVE` / `Found: vite@undefined`

That error almost always means a **previous install was interrupted** (screen off,
low storage, Termux killed mid-install, ...) and left a damaged `node_modules` or
npm cache. The `package.json` versions in this repo are compatible — this is not a
real dependency conflict, so **don't** use `--force` or `--legacy-peer-deps`.

Fix it with a clean install:

```bash
npm cache verify                  # repair the npm cache (fast, local)
rm -rf node_modules package-lock.json
npm install                       # fresh install
bash termux.sh                    # start as usual
```

`termux.sh` now does exactly this automatically: if `npm install` fails once, it
repairs the cache, removes the broken `node_modules`/`package-lock.json` and retries
— so in most cases you can just run `bash termux.sh` again and it heals itself.
If it still fails, use the stronger cache wipe (re-downloads everything, slower):

```bash
npm cache clean --force
rm -rf node_modules package-lock.json
bash termux.sh
```

**Manual update (no script):** if you'd rather not use `termux.sh`, a plain
`git pull` is the fastest way to get new code without re-cloning:

```bash
git pull
# if package.json changed, run: npm install
ALLOW_ALL_HOSTS=true npm run dev
```

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
| `npm install` slow / interrupted, or `ERESOLVE` with `Found: vite@undefined` | `npm cache verify && rm -rf node_modules package-lock.json && bash termux.sh` (use `npm cache clean --force` if the verify isn't enough) |

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
