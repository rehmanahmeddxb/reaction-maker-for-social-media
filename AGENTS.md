# AI Agent Policy & Instructions

This document defines the operating rules, mandatory procedures, and architectural constraints for AI agents (and contributors) working on the `reaction-maker-for-social-media` codebase.

---

## 🚨 MANDATORY POLICY: Read Documentation First

> ### **Core Policy Rule**
> **On EVERY user request, prompt, or task, the AI Agent MUST FIRST read all markdown documentation files (`README.md`, `TERMUX.md`, `AGENTS.md`, and any other `.md` files in the repository) BEFORE taking any action, planning, modifying code, or running build/deployment processes.**

### Why This Policy Is Enforced

1. **Android / Termux Compatibility**:
   - Android has very low `inotify` file-watching limits. Without reading `TERMUX.md`, an agent might re-enable standard file watchers and crash the app with `ENOSPC`.
   - Android battery optimization and background process management require specific server settings (`DISABLE_HMR=true`, `VITE_USE_POLLING=true`, `ALLOW_ALL_HOSTS=true`).
   - Port conflicts (`EADDRINUSE: port 3000` / Vite WebSocket port 24678) must be handled automatically so `termux.sh` can restart seamlessly.

2. **Browser Media & Secure Context Constraints**:
   - This is a live camera and microphone recording application.
   - Modern browsers (especially Chrome on Android) **strictly block** `navigator.mediaDevices.getUserMedia` on non-secure origins.
   - The app only has camera/mic access when served over `localhost`, real HTTPS (e.g. Cloudflare tunnel), or `adb reverse`. Plain LAN IP (`http://192.168.x.x:3000`) will load the UI but fail camera/mic access unless Chrome flags are set.

3. **Single-Command Update Integrity**:
   - `termux.sh` performs hard resets to `origin/main` to keep Termux installs synced and lightweight.
   - Any tracked files modified locally will be reset, while `.env.local` and `node_modules` are preserved.
   - Scripts and configuration must remain compatible with this flow.

4. **Zero-Regression Principle**:
   - Reading the documentation first ensures the agent understands all past bug fixes, architectural choices, and platform quirks before making modifications.

---

## Standard Agent Workflow

When executing any prompt or task in this repository, follow these 4 steps in order:

```
┌────────────────────────────────────────────────────────┐
│ 1. READ ALL .MD FILES                                 │
│    Read README.md, TERMUX.md, AGENTS.md, POLICY.md     │
├────────────────────────────────────────────────────────┤
│ 2. ANALYZE & PLAN IN CONTEXT                           │
│    Verify constraints (Termux, WebRTC, Vite, Gemini)   │
├────────────────────────────────────────────────────────┤
│ 3. IMPLEMENT & VERIFY                                  │
│    Apply changes, test build (`npm run build`),        │
│    verify scripts (`bash -n termux.sh`)                │
├────────────────────────────────────────────────────────┤
│ 4. SYNC DOCUMENTATION                                  │
│    Update .md files if new options/features are added  │
└────────────────────────────────────────────────────────┘
```

---

## Repository Architecture & Guidelines

### 1. Technology Stack

- **Frontend**: React 18, Vite 6, Tailwind CSS, Lucide Icons.
  - Video recording via HTML5 Canvas compositor (`CanvasCaptureMediaStreamTrack` / `MediaRecorder`).
  - Audio mixing via Web Audio API (`AudioContext`, gain nodes, synthesized sound effects).
- **Backend**: Express server (`server.ts`) with Vite dev middleware (in development) and static file serving (in production).
  - `@google/genai` SDK for real-time translation and viral hook generation (with robust fallbacks if `GEMINI_API_KEY` is not provided).
  - CORS video proxy endpoint (`/api/proxy-video`) to prevent canvas tainting on remote media.
- **Mobile/Termux Runner**: `termux.sh` for one-command updates, dependency checking, port clearing, and launching.

### 2. Environment Variables

| Variable | Default | Purpose |
| --- | --- | --- |
| `PORT` | `3000` | HTTP port for the Express/Vite server |
| `HOST` | `0.0.0.0` | Bind host (must remain `0.0.0.0` for container/preview/LAN access) |
| `ALLOW_ALL_HOSTS` | `false` (set `true` in `termux.sh`) | Bypasses Vite 6 host validation for mobile/tunnel access |
| `ALLOWED_HOSTS` | `""` | Comma-separated list of permitted hostnames/domains |
| `VITE_USE_POLLING` | `false` (set `true` in `termux.sh`) | Enables polling file watcher to avoid Android `ENOSPC` inotify limits |
| `DISABLE_HMR` | `false` (set `true` in `termux.sh`) | Disables Vite HMR WebSocket server to save CPU/battery and avoid port 24678 collisions |
| `GEMINI_API_KEY` | `""` | Optional Google Gemini API key for AI subtitles and viral hooks |

### 3. Key Server & Process Rules

- **Do NOT open standalone HMR WebSockets without checking `DISABLE_HMR`**:
  - In `server.ts`, Vite's HMR is bound to the main HTTP server (`hmr: isHmrDisabled ? false : { server }`). When `DISABLE_HMR=true`, HMR is completely disabled so no rogue port 24678 is opened.
- **Port Collision Prevention**:
  - `termux.sh` automatically checks for and terminates stale server processes on port 3000 / 24678 before starting.
  - `server.ts` handles `server.on('error')` for `EADDRINUSE` with clear instructions instead of uncaught crashes.
  - Graceful exit listeners (`SIGINT`, `SIGTERM`) ensure ports are released immediately.

---

## Checklist for AI Agents Before Finalizing Changes

- [ ] Read all `.md` files at the start of the turn.
- [ ] Preserved mobile/Termux compatibility (no new unhandled native dependencies, inotify watchers, or hardcoded localhost URLs).
- [ ] Confirmed `npm run build` compiles cleanly with no TypeScript or Vite errors.
- [ ] Confirmed shell scripts (`termux.sh`) pass syntax checks (`bash -n termux.sh`).
- [ ] Updated `README.md` / `TERMUX.md` / `AGENTS.md` if user-facing behavior or environment variables changed.
