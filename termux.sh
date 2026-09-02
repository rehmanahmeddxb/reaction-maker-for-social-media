#!/usr/bin/env bash
#
# reaction-maker-for-social-media — Termux one-command update & run
#
# ▶ What it does (in order):
#    1. Clones the repo ONE time if it isn't there yet.
#    2. Pulls the LATEST code from GitHub (fast — no full re-clone).
#       It does a clean reset, so it always matches the repo exactly
#       (a brand-new "fresh clone" feel). Your .env.local and node_modules
#       are kept, because they are untracked files.
#    3. Runs `npm install` ONLY when package.json changed — so on most
#       updates it skips the slow install step entirely and just reloads.
#       If an install fails (e.g. after an interrupted install left a damaged
#       node_modules / npm cache), it repairs the state and retries once
#       automatically.
#    4. Starts the dev server with the friendly Termux defaults:
#       ALLOW_ALL_HOSTS=true + no HMR (saves CPU & battery, avoids the
#       Android inotify "ENOSPC" crash).
#
# ▶ One-time setup (Termux):
#      pkg update && pkg install nodejs git -y
#      cd ~ && git clone https://github.com/rehmanahmeddxb/reaction-maker-for-social-media.git
#      cd reaction-maker-for-social-media
#
# ▶ Every time after that (this is the "simple command"):
#      bash termux.sh        # or: ./termux.sh   (after: chmod +x termux.sh)
#
# Optional env overrides (export before running): HMR=true PORT=3001
#
set -euo pipefail

REPO_DIR="${HOME}/reaction-maker-for-social-media"
REPO_URL="https://github.com/rehmanahmeddxb/reaction-maker-for-social-media.git"
HASH_FILE="${REPO_DIR}/.deps-hash"

# ---- configurable defaults (override with export before running) ----
HMR="${HMR:-false}"                       # true -> keep HMR/file-watch (more CPU)
POLLING="${POLLING:-true}"                # true -> polling watcher (no inotify crash)
ALLOW_ALL="${ALLOW_ALL:-true}"

# ---------- 0. Check node/git are installed ----------
if ! command -v node >/dev/null 2>&1 || ! command -v git >/dev/null 2>&1; then
  echo "!! node and/or git are missing. Run this first:"
  echo "   pkg update && pkg install nodejs git -y"
  exit 1
fi

# ---------- 1. Clone once ----------
if [ ! -d "${REPO_DIR}" ]; then
  echo "==> First run: cloning repository..."
  cd "${HOME}"
  git clone "${REPO_URL}"
fi

cd "${REPO_DIR}"

# ---------- 2. Update code (clean, fast) ----------
echo "==> Fetching latest code from GitHub..."
git fetch --all --prune

# figure out the remote's default branch (normally "main").
# Guarded with `|| true` so it can NEVER abort the script, even when
# origin/HEAD isn't set yet (fresh clones) — `set -e` + `pipefail` would
# otherwise kill a healthy run.
DEFAULT_BRANCH="$(git symbolic-ref refs/remotes/origin/HEAD 2>/dev/null | sed 's#refs/remotes/origin/##' || true)"
if [ -z "${DEFAULT_BRANCH}" ]; then
  # fallback: take the first remote branch we can see
  DEFAULT_BRANCH="$(git branch -r 2>/dev/null | head -1 | sed 's#.*origin/##;s#^ *##' || true)"
fi
if [ -z "${DEFAULT_BRANCH}" ]; then DEFAULT_BRANCH="main"; fi

echo "==> Updating to origin/${DEFAULT_BRANCH} ..."
# reset --hard = clean checkout like a fresh clone, but keeps untracked files
# (node_modules, .env.local). That way we never re-download everything.
git reset --hard "origin/${DEFAULT_BRANCH}"

# ---------- 3. Reinstall deps ONLY if package.json changed ----------
deps_hash="$(sha256sum package.json | cut -d' ' -f1)"
old_hash="$(cat "${HASH_FILE}" 2>/dev/null || true)"

# A damaged node_modules tree can make npm 11+ fail with a confusing
# ERESOLVE error like "Found: vite@undefined" — even though the versions in
# package.json are compatible. It usually means a previous install was
# interrupted (screen off, low storage, ...), so we detect it and repair.
install_deps() {
  npm install --no-audit --no-fund --loglevel=error
}

needs_install=false
if [ ! -d node_modules ]; then
  needs_install=true
elif [ "${deps_hash}" != "${old_hash}" ]; then
  needs_install=true
elif [ ! -s node_modules/vite/package.json ] || \
     ! node -e "const p=require('./node_modules/vite/package.json'); if(!p.version) process.exit(1)" >/dev/null 2>&1; then
  # package.json says deps are unchanged, but vite's own package.json is
  # missing/empty (corrupt install) — reinstall instead of crashing at boot.
  needs_install=true
fi

if [ "${needs_install}" = "true" ]; then
  echo "==> package.json changed (or node_modules missing/corrupt) — installing deps…"
  echo "    (this is the one slow step; it only runs when needed)"
  if ! install_deps; then
    echo ""
    echo "==> npm install failed — repairing and retrying with a clean install…"
    echo "    (a previous install was probably interrupted; this clears the damaged"
    echo "     state and re-downloads the dependencies — usually fixes it)"
    npm cache verify >/dev/null 2>&1 || true
    rm -rf node_modules package-lock.json
    if ! install_deps; then
      echo ""
      echo "!! npm install failed twice. Use the stronger cache wipe:"
      echo "   npm cache clean --force && rm -rf node_modules package-lock.json"
      echo "   bash termux.sh"
      echo "   (details in the Troubleshooting section of TERMUX.md)"
      exit 1
    fi
  fi
  echo "${deps_hash}" > "${HASH_FILE}"
else
  echo "==> Dependencies unchanged — skipping npm install ✅ (fast!)"
fi

# ---------- 4. Free port & stop stale server instances ----------
TARGET_PORT="${PORT:-3000}"

# Stop any previous server instance that may still be running in the background
pkill -f "tsx server.ts" 2>/dev/null || true
pkill -f "node.*server.ts" 2>/dev/null || true
pkill -f "vite" 2>/dev/null || true

# Helper to check if a port is in use
check_port_in_use() {
  local p="$1"
  node -e "
    const net = require('net');
    const s = net.createServer();
    s.once('error', (err) => { process.exit(err.code === 'EADDRINUSE' ? 10 : 0); });
    s.once('listening', () => { s.close(); process.exit(0); });
    s.listen(Number(${p}), '0.0.0.0');
  " 2>/dev/null || return $?
  return 0
}

port_status=0
check_port_in_use "${TARGET_PORT}" || port_status=$?

if [ "${port_status}" -eq 10 ]; then
  echo "==> Port ${TARGET_PORT} is in use — stopping previous process..."
  if command -v fuser >/dev/null 2>&1; then
    fuser -k "${TARGET_PORT}/tcp" 2>/dev/null || true
    fuser -k "24678/tcp" 2>/dev/null || true
  fi
  if command -v lsof >/dev/null 2>&1; then
    lsof -ti ":${TARGET_PORT}" 2>/dev/null | xargs kill -9 2>/dev/null || true
    lsof -ti :24678 2>/dev/null | xargs kill -9 2>/dev/null || true
  fi
  if command -v ss >/dev/null 2>&1; then
    stale_pid="$(ss -lptn "sport = :${TARGET_PORT}" 2>/dev/null | grep -o 'pid=[0-9]*' | cut -d= -f2 || true)"
    if [ -n "${stale_pid}" ]; then
      kill -9 ${stale_pid} 2>/dev/null || true
    fi
  fi
  sleep 1
fi

# ---------- 5. Run ----------
echo "==> Starting Reaction Studio on http://localhost:${TARGET_PORT}"
echo "    Keep this running. Use: termux-wake-lock   (or tmux) so it stays alive."
run_args=( "ALLOW_ALL_HOSTS=${ALLOW_ALL}" )
if [ "${POLLING}" = "true" ]; then run_args+=( "VITE_USE_POLLING=true" ); fi
if [ "${HMR}" != "true" ]; then run_args+=( "DISABLE_HMR=true" ); fi
if [ -n "${PORT:-}" ]; then run_args+=( "PORT=${PORT}" ); fi

env "${run_args[@]}" npm run dev
