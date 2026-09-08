#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FRONTEND_DIR="$SCRIPT_DIR/frontend"
FRONTEND_PORT="${FRONTEND_PORT:-8141}"
HOST="${HOST:-0.0.0.0}"

cd "$FRONTEND_DIR"

if ! command -v npm >/dev/null 2>&1; then
  if [[ -d "dist" ]]; then
    echo "[start_frontend] npm was not found, but frontend/dist already exists."
    echo "[start_frontend] The backend can serve the prebuilt frontend directly on port 8140."
    exit 0
  fi
  echo "[start_frontend] npm was not found. Build the frontend locally first, then upload frontend/dist to the server."
  exit 1
fi

if [[ ! -f ".env.production" ]]; then
  echo "[start_frontend] Missing frontend/.env.production."
  exit 1
fi

if [[ ! -d "node_modules" ]]; then
  echo "[start_frontend] node_modules not found. Running npm install first..."
  npm install
fi

echo "[start_frontend] Building frontend with VITE_API_BASE_URL from .env.production"
npm run build

echo "[start_frontend] Starting Vite preview on ${HOST}:${FRONTEND_PORT}"
exec npm run preview -- --host "$HOST" --port "$FRONTEND_PORT"
