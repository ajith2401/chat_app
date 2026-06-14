#!/usr/bin/env bash
# Stop the local stack started by run-local.sh
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
LOGS="$ROOT/.local-logs"

for svc in web worker api; do
  if [ -f "$LOGS/$svc.pid" ]; then
    PID=$(cat "$LOGS/$svc.pid")
    kill "$PID" 2>/dev/null && echo "stopped $svc (pid $PID)" || echo "$svc not running"
    rm -f "$LOGS/$svc.pid"
  fi
done
# Kill any stray next/tsx children
pkill -f "next dev -p 3005" 2>/dev/null || true
echo "Mongo + Redis left running (shared). To stop: redis-cli shutdown ; pkill mongod"
