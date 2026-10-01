#!/usr/bin/env bash
# Script dung may chu FinTrack Pro va cac duong truyen
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR"
PORT="${PORT:-3000}"

for f in .server.pid .ngrok.pid .cloudflared.pid; do
  if [ -f "$f" ]; then
    PID=$(cat "$f")
    # setsid -> PID cung la process group id, kill ca nhom de dung ca tien trinh con (node)
    kill -- "-$PID" 2>/dev/null || kill "$PID" 2>/dev/null
    rm -f "$f"
  fi
done

PORT_PID=$(lsof -ti:"$PORT" 2>/dev/null)
if [ -n "$PORT_PID" ]; then
  kill -9 $PORT_PID 2>/dev/null
fi
fuser -k "$PORT/tcp" 2>/dev/null || true
echo "Da tat may chu va cac duong truyen."
