#!/usr/bin/env bash
# Runs the frontend↔backend e2e suite against a fresh backend harness.
#   BACKEND_DIR=/path/to/dezenmart-backend npm run test:e2e:full
set -euo pipefail
BACKEND_DIR="${BACKEND_DIR:-$(cd "$(dirname "$0")/../../personal/dezenmart-backend" 2>/dev/null && pwd || true)}"
[ -d "${BACKEND_DIR:-}" ] || { echo "Set BACKEND_DIR to the dezenmart-backend checkout"; exit 1; }

OUT="$(mktemp /tmp/dezenfoods-e2e-XXXXXX.json)"
LOG="$(mktemp /tmp/dezenfoods-e2e-log-XXXXXX)"
rm -f "$OUT"

# Own process group so everything the harness spawns is cleaned up.
setsid bash -c "cd '$BACKEND_DIR' && E2E_OUT='$OUT' exec npx ts-node --transpile-only scripts/e2e/harness.ts" >"$LOG" 2>&1 &
HARNESS=$!
cleanup() { kill -- -"$HARNESS" 2>/dev/null || true; rm -f "$OUT"; }
trap cleanup EXIT

for _ in $(seq 1 90); do
  grep -q E2E_READY "$LOG" 2>/dev/null && break
  kill -0 "$HARNESS" 2>/dev/null || { echo "Harness exited:"; cat "$LOG"; exit 1; }
  sleep 1
done
grep -q E2E_READY "$LOG" || { echo "Harness did not become ready:"; cat "$LOG"; exit 1; }

E2E_FILE="$OUT" npm run test:e2e
