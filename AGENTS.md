# AI Agent Policy & Instructions

This document defines the operating rules, mandatory procedures, and architectural constraints for AI agents working on the `reaction-maker-for-social-media` codebase.

## 🚨 MANDATORY POLICY: Read Documentation First

### Core Policy Rule
**On EVERY request or task, the AI Agent MUST FIRST read all markdown documentation files (`README.md`, `TERMUX.md`, `AGENTS.md`, `POLICY.md`) BEFORE taking any action, planning, modifying code, or running build/deployment processes.**

### Why This Policy Is Enforced

1. **Android / Termux Compatibility**:
   - Android has very low `inotify` file-watching limits. Without reading `TERMUX.md`, an agent might re-enable standard file watchers and crash the app with `ENOSPC`.
   - Android battery optimization and background process management require specific server settings (`DISABLE_HMR=true`, `VITE_USE_POLLING=true`, `ALLOW_ALL_HOSTS=true`).
   - Port conflicts (`EADDRINUSE: port 3000` / Vite WebSocket port 24678) must be handled automatically so the app can restart seamlessly.

2. **Browser Media & Secure Context Constraints**:
   - This is a live camera and microphone recording application.
   - Modern browsers (especially Chrome on Android) **strictly block** `navigator.mediaDevices.getUserMedia` on non-secure origins.
   - The app only has camera/mic access when served over `localhost`, real HTTPS (e.g. Cloudflare tunnel), or `adb reverse`. Plain LAN IP (`http://192.168.x.x:3000`) will load the UI but fail camera/mic access unless Chrome flags are set.

3. **Single-Command Update Integrity**:
   - The `termux.sh` script performs operations to keep Termux installs synced and lightweight.
   - Tracked files modified locally will be reset; `.env.local` and `node_modules` are preserved.
   - Scripts and configuration must remain compatible with this flow.

4. **Zero-Regression Principle**:
   - Reading the documentation first ensures the agent understands all past bug fixes, architectural choices, and platform quirks before making modifications.

## Standard Agent Workflow

When executing any prompt or task in this repository, follow these 4 steps in order:

```
1. READ ALL .MD FILES
   Read README.md, TERMUX.md, AGENTS.md, POLICY.md

2. ANALYZE & PLAN IN CONTEXT
   Verify constraints (Termux, WebRTC, Vite, Gemini)

3. IMPLEMENT & VERIFY
   Apply changes, test build (`npm run build`), verify scripts (`bash -n termux.sh`)

4. SYNC DOCUMENTATION
   Update .md files if new options/features are added
```

## Repository Architecture & Guidelines

### 1. Technology Stack

- **Frontend**: React 18, Vite 5, vanilla CSS (no Tailwind required for minimal setup)
- **Video recording**: HTML5 Canvas `captureStream` + `MediaRecorder`
- **Audio**: Web Audio API for mic level visualization and mixing
- **Backend**: Simple Express server (`server.ts`) with Vite dev middleware (in development) and static file serving (in production)
- **Optional AI**: `@google/genai` SDK for real-time translation and viral hook generation (with robust fallbacks if `GEMINI_API_KEY` is not provided)

### 2. Key Rules for Agents

- **Do NOT open standalone HMR WebSockets without checking `DISABLE_HMR`**: In `server.ts`, Vite's HMR is bound to the main HTTP server. When `DISABLE_HMR=true`, HMR is completely disabled so no rogue port 24678 is opened.

- **Port Collision Prevention**:
  - The app auto-detects and terminates stale server processes on port 3000 / 24678 before starting.
  - `server.ts` handles `server.on('error')` for `EADDRINUSE` with clear instructions instead of uncaught crashes.
  - Graceful exit listeners (`SIGINT`, `SIGTERM`) ensure ports are released immediately.

- **Secure Context Preservation**:
  - Any new URL host allowlisting must respect the secure context requirements for `getUserMedia`.
  - Do not add new hardcoded localhost URLs that break Termux compatibility.
  - If adding new environment variables, ensure they have sensible defaults for Termux use.

- **File Watcher Limits**:
  - Android's inotify limit is typically 512–8192. Use `VITE_USE_POLLING=true` and `DISABLE_HMR=true` for Termux deployments.
  - Do not add file watchers or polling patterns that exceed Android's limits.

- **Media Recording Flow**:
  - Ensure source video is properly played and decodable before canvas recording starts.
  - Handle canvas tainting gracefully — if `captureStream` throws, surface a clear error message instead of recording a black video.
  - Always test recording flow on both desktop and mobile before committing changes.

## Checklist for AI Agents Before Finalizing Changes

- [ ] Read all `.md` files at the start of the turn.
- [ ] Preserved mobile/Termux compatibility (no new unhandled native dependencies, inotify watchers, or hardcoded localhost URLs).
- [ ] Confirmed `npm run build` compiles cleanly with no TypeScript or Vite errors.
- [ ] Confirmed shell scripts (`termux.sh`) pass syntax checks (`bash -n termux.sh`).
- [ ] Updated `README.md` / `TERMUX.md` / `AGENTS.md` if user-facing behavior or environment variables changed.