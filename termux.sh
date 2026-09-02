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

if [ ! -d node_modules ] || [ "${deps_hash}" != "${old_hash}" ]; then
  echo "==> package.json changed (or node_modules missing) — installing deps…"
  echo "    (this is the one slow step; it only runs when needed)"
  npm install --no-audit --no-fund --loglevel=error
  echo "${deps_hash}" > "${HASH_FILE}"
else
  echo "==> Dependencies unchanged — skipping npm install ✅ (fast!)"
fi

# ---------- 4. Run ----------
echo "==> Starting Reaction Studio on http://localhost:3000"
echo "    Keep this running. Use: termux-wake-lock   (or tmux) so it stays alive."
run_args=( "ALLOW_ALL_HOSTS=${ALLOW_ALL}" )
if [ "${POLLING}" = "true" ]; then run_args+=( "VITE_USE_POLLING=true" ); fi
if [ "${HMR}" != "true" ]; then run_args+=( "DISABLE_HMR=true" ); fi

env "${run_args[@]}" npm run dev
