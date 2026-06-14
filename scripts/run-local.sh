#!/usr/bin/env bash
# One-command local launch for "A Space for Us".
# Starts MongoDB + Redis + API + Worker + Web, all wired together.
# Usage:  bash scripts/run-local.sh
# Stop:   bash scripts/stop-local.sh
set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
LOGS="$ROOT/.local-logs"
mkdir -p "$LOGS" "$ROOT/.local-mongo"

# --- Host mode: localhost (default) or LAN (so a 2nd device on the same WiFi can join) ---
MODE="${1:-localhost}"
LAN_IP=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || echo "")
if [ "$MODE" = "--lan" ] || [ "$MODE" = "lan" ]; then
  if [ -z "$LAN_IP" ]; then echo "Could not detect LAN IP. Falling back to localhost."; HOST="localhost"; else HOST="$LAN_IP"; fi
else
  HOST="localhost"
fi
API_ORIGIN="http://$HOST:4005"
WEB_ORIGIN="http://$HOST:3005"
echo "▶ Host mode: $HOST"

# Point the web client at the chosen host (CSP + CORS derive from these).
cat > "$ROOT/apps/web/.env.local" <<EOF
NEXT_PUBLIC_API_URL=$API_ORIGIN/api/v1
NEXT_PUBLIC_SOCKET_URL=$API_ORIGIN
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=duq485wsm
NEXT_PUBLIC_AI_PUBLIC_KEY=$(grep '^AI_PUBLIC_KEY=' "$ROOT/.env" | cut -d= -f2)
EOF
# Allow both localhost and the LAN web origin through API CORS.
export CLIENT_URL="http://localhost:3005,$WEB_ORIGIN"

echo "▶ Using local MongoDB (no-auth) + Redis on default ports."
# Override DB/Redis so it 'just works' regardless of the cloud creds in .env.
export MONGODB_URI="mongodb://127.0.0.1:27017/couple-chat"
export REDIS_URL="redis://localhost:6379"
export PORT=4005
export NODE_ENV=development

# 1. Redis
if ! redis-cli ping >/dev/null 2>&1; then
  echo "▶ Starting Redis…"
  redis-server --port 6379 --daemonize yes --save "" --appendonly no >"$LOGS/redis.log" 2>&1
  sleep 1
fi
redis-cli ping >/dev/null 2>&1 && echo "  ✓ Redis up"

# 2. MongoDB
if ! (mongosh --quiet --port 27017 --eval 'db.runCommand({ping:1})' >/dev/null 2>&1); then
  echo "▶ Starting MongoDB…"
  mongod --dbpath "$ROOT/.local-mongo" --port 27017 --bind_ip 127.0.0.1 --nounixsocket >"$LOGS/mongo.log" 2>&1 &
  for i in $(seq 1 20); do
    sleep 1
    mongosh --quiet --port 27017 --eval 'db.runCommand({ping:1})' >/dev/null 2>&1 && break
  done
fi
mongosh --quiet --port 27017 --eval 'db.runCommand({ping:1})' >/dev/null 2>&1 && echo "  ✓ MongoDB up"

# 3. API
echo "▶ Starting API on :4005…"
( cd "$ROOT/apps/api" && MONGODB_URI="$MONGODB_URI" REDIS_URL="$REDIS_URL" PORT=4005 \
    nohup npx tsx src/index.ts >"$LOGS/api.log" 2>&1 & echo $! >"$LOGS/api.pid" )
sleep 6
curl -sf http://localhost:4005/health >/dev/null 2>&1 && echo "  ✓ API healthy" || { echo "  ✗ API failed — see $LOGS/api.log"; tail -15 "$LOGS/api.log"; }

# 4. Worker (optional — only needed for AI mood insights)
echo "▶ Starting Worker…"
( cd "$ROOT/apps/worker" && MONGODB_URI="$MONGODB_URI" REDIS_URL="$REDIS_URL" \
    nohup npx tsx src/index.ts >"$LOGS/worker.log" 2>&1 & echo $! >"$LOGS/worker.pid" )

# 5. Web (bind to all interfaces in LAN mode so other devices can reach it)
echo "▶ Starting Web on :3005…"
WEB_HOST_FLAG=""
[ "$HOST" != "localhost" ] && WEB_HOST_FLAG="-H 0.0.0.0"
( cd "$ROOT/apps/web" && nohup npx next dev -p 3005 $WEB_HOST_FLAG >"$LOGS/web.log" 2>&1 & echo $! >"$LOGS/web.pid" )
echo "  …waiting for Next to compile (first load can take ~20s)…"
for i in $(seq 1 40); do
  sleep 1
  curl -sf http://localhost:3005 >/dev/null 2>&1 && break
done
curl -sf http://localhost:3005 >/dev/null 2>&1 && echo "  ✓ Web up" || echo "  … Web still compiling — give it a few more seconds"

echo ""
echo "──────────────────────────────────────────────"
echo "  You open:        $WEB_ORIGIN"
if [ "$HOST" != "localhost" ]; then
  echo "  Your GF opens:   $WEB_ORIGIN   (same WiFi, on her phone/laptop)"
else
  echo "  Two on one Mac:  open a 2nd browser profile / incognito window"
  echo "  For her device:  re-run as  bash scripts/run-local.sh --lan"
fi
echo "  Logs:            $LOGS/{api,worker,web}.log"
echo "  Stop everything: bash scripts/stop-local.sh"
echo "──────────────────────────────────────────────"
