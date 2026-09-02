<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/1e424b49-696b-4258-8943-c49163cb28fe

## Agent & Contributor Policy

> **Policy Directive:** On **every request or task**, contributors and AI agents must **first read all markdown documentation files** (`README.md`, `TERMUX.md`, `AGENTS.md`, `POLICY.md`) before planning, processing, or modifying code. See **[AGENTS.md](AGENTS.md)** and **[POLICY.md](POLICY.md)** for complete specifications.

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

Open `http://localhost:3000`. Useful environment variables while developing:

| Env var | Effect |
| --- | --- |
| `PORT=3001` | use a different port (default `3000`) |
| `ALLOWED_HOSTS="a.com,192.168.1.20"` | let those hostnames load the Vite dev server (LAN / tunnel) |
| `ALLOW_ALL_HOSTS=true` | allow any hostname |
| `VITE_USE_POLLING=true` | file watching via polling (low inotify limits) |
| `DISABLE_HMR=true` | disable HMR + file watching |

## Run on Android / Termux

Full step-by-step guide (installing Node, where to clone, how to open it in the phone
browser, and how to get camera/mic access) → **[TERMUX.md](TERMUX.md)**.

**Minimal / low-battery workflow (recommended).** Install Node + Git once, clone once,
then use the included `termux.sh` for everything after — it pulls the latest code fast
and only re-runs `npm install` when the dependencies actually changed:

```bash
pkg update && pkg install nodejs git -y       # install git + node only (skip full upgrade)
cd ~ && git clone https://github.com/rehmanahmeddxb/reaction-maker-for-social-media.git
cd reaction-maker-for-social-media

bash termux.sh        # every time you want the latest code → pulls + installs-if-needed + runs
```

`termux.sh` starts the server with `ALLOW_ALL_HOSTS=true`, disables HMR, and uses polling
so it runs light on the phone and doesn't crash on Android's tiny inotify limit.

Old manual way (still works):

```bash
pkg update && pkg upgrade -y && pkg install nodejs git -y
cd ~ && git clone https://github.com/rehmanahmeddxb/reaction-maker-for-social-media.git
cd reaction-maker-for-social-media && npm install
ALLOW_ALL_HOSTS=true npm run dev
```

Then open `http://localhost:3000` in the phone's Chrome. Camera and microphone only work
over a secure context — `localhost` or real HTTPS (tunnel), not `http://LAN-IP:3000`.
