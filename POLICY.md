# Repository Policy

## 📋 Documentation-First Policy

> **Policy Directive:** Every request, task, or automated process performed on this repository must **first read all `.md` documentation files** (`README.md`, `TERMUX.md`, `AGENTS.md`, `POLICY.md`) before analyzing code, planning changes, executing scripts, or modifying any repository files.

### Core Objectives of This Policy

1. **Maintain Android & Termux Compatibility:**
   - Respect resource constraints on mobile devices (RAM, CPU, Android inotify limits, battery savings).
   - Ensure the app functions smoothly for clean pulls, dependency checking, and port conflict resolution.

2. **Protect Secure Context & Media Capabilities:**
   - Preserve WebRTC and Canvas recording requirements (`getUserMedia` requires secure contexts like `localhost` or HTTPS tunnels).
   - Prevent introducing changes that block camera/mic access on mobile browsers.

3. **Prevent Breaking Changes & Regressions:**
   - Prevent introducing changes that conflict with existing server configurations, port assignments, or build pipelines.

For detailed agent guidelines and architectural reference, see **[AGENTS.md](AGENTS.md)**.