#!/usr/bin/env bash
# Script khoi chay FinTrack Pro va cac duong truyen co dinh cho dien thoai
# Bien moi truong (co the dat trong file .env, xem .env.example):
#   APP_PASSWORD: mat khau ban dau cho tai khoan host "admin" (chi dung khi database chua co mat khau admin)
#     Neu khong dat, lan dang nhap admin dau tien can MA THIET LAP in ra ben duoi (file data/.host_setup_code)
#   ALLOW_REGISTRATION=false: tat dang ky tai khoan khach
#   DATABASE_URL: ket noi MySQL (mysql://user:pass@127.0.0.1:3306/fintrack)
#   NGROK_BIN / CLOUDFLARED_BIN: duong dan tuy chinh (mac dinh tim trong PATH va ~/.local/bin)
#   NGROK_DOMAIN: domain co dinh cua ngrok (tuy chon)
#   NO_TUNNEL=1: chi chay local, khong mo tunnel
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR"
# Doc bien tu .env cho chinh script nay (Next.js tu doc .env cho ung dung); bien dat san trong shell duoc uu tien
env_from_file() {
  local name="$1" value
  [ -n "${!name:-}" ] || [ ! -f .env ] && return
  value="$(sed -n "s/^${name}=//p" .env | tail -1 | tr -d '\r')"
  value="${value%\"}"; value="${value#\"}"; value="${value%\'}"; value="${value#\'}"
  [ -n "$value" ] && export "$name=$value"
}
env_from_file PORT
env_from_file NO_TUNNEL
env_from_file NGROK_DOMAIN
env_from_file NGROK_BIN
env_from_file CLOUDFLARED_BIN
PORT="${PORT:-3000}"

find_bin() {
  local name="$1" override="$2"
  if [ -n "$override" ] && [ -x "$override" ]; then echo "$override"; return; fi
  if command -v "$name" >/dev/null 2>&1; then command -v "$name"; return; fi
  if [ -x "$HOME/.local/bin/$name" ]; then echo "$HOME/.local/bin/$name"; fi
}

# Dung tien trinh cu (chi nhung tien trinh cua app nay, khong kill bua moi process co chu "next")
"$DIR/stop.sh" >/dev/null 2>&1
sleep 1

# Build lai neu chua co ban build hoac ma nguon moi hon ban build
if [ ! -f ".next/BUILD_ID" ] || [ -n "$(find src package.json next.config.mjs -newer .next/BUILD_ID -print -quit 2>/dev/null)" ]; then
  echo "Dang build ung dung cho production..."
  npm run build || { echo "Build that bai"; exit 1; }
fi

# 0. Kiem tra MySQL (tao/cap nhat bang neu can). Chua chay MySQL: docker compose up -d db
if ! npm run --silent db:check; then
  echo "Khong ket noi duoc MySQL - xem README, muc 'Database (MySQL)'."
  exit 1
fi

# 1. Khoi chay Next.js Production Server ngam doc lap
nohup setsid npx next start -H 0.0.0.0 -p "$PORT" > logs_prod.log 2>&1 &
echo $! > .server.pid

# Cho server san sang (goi /api/auth/me cung tao ma thiet lap host neu admin chua co mat khau)
for _ in $(seq 1 30); do
  curl -fs "http://localhost:$PORT/api/auth/me" >/dev/null 2>&1 && break
  sleep 1
done
SETUP_CODE=""
[ -f data/.host_setup_code ] && SETUP_CODE="$(cat data/.host_setup_code)"

if [ "${NO_TUNNEL:-0}" = "1" ]; then
  [ -n "$SETUP_CODE" ] && echo "Ma thiet lap mat khau host (admin): $SETUP_CODE"
  echo "FinTrack Pro dang chay tai http://localhost:$PORT (khong mo tunnel)"
  exit 0
fi

NGROK="$(find_bin ngrok "$NGROK_BIN")"
CLOUDFLARED="$(find_bin cloudflared "$CLOUDFLARED_BIN")"

# 2. Khoi chay Ngrok (neu co)
if [ -n "$NGROK" ]; then
  NGROK_ARGS=(http "$PORT" --log=stdout)
  [ -n "$NGROK_DOMAIN" ] && NGROK_ARGS+=(--domain="$NGROK_DOMAIN")
  nohup setsid "$NGROK" "${NGROK_ARGS[@]}" > ngrok.log 2>&1 &
  echo $! > .ngrok.pid
fi

# 3. Khoi chay Cloudflare Tunnel cho khach truy cap tu xa
if [ -n "$CLOUDFLARED" ]; then
  nohup setsid "$CLOUDFLARED" tunnel --url "http://localhost:$PORT" > tunnel.log 2>&1 &
  echo $! > .cloudflared.pid
fi

sleep 3
NGROK_URL=$(curl -s http://127.0.0.1:4040/api/tunnels 2>/dev/null | grep -o 'https://[^"]*ngrok[^"]*' | head -1)
CF_URL=$(grep -o 'https://[a-z0-9-]*\.trycloudflare\.com' tunnel.log 2>/dev/null | head -1)
ONLINE_URL="${NGROK_URL:-$CF_URL}"

echo "=================================================================="
echo "FinTrack Pro da duoc khoi chay thanh cong voi he thong Da nguoi dung!"
echo ""
echo "👉 LINK 1 (DANH CHO HOST / BAN):"
echo "   http://localhost:$PORT"
echo "   * Dang nhap bang tai khoan: admin"
if [ -n "$SETUP_CODE" ]; then
  echo "   * Lan dau: dat mat khau tren form dang nhap kem MA THIET LAP: $SETUP_CODE"
fi
echo ""
if [ -n "$ONLINE_URL" ]; then
  echo "👉 LINK 2 (DANH CHO KHACH / TRUY CAP ONLINE):"
  echo "   $ONLINE_URL"
  echo "   * Khach vao link tren, bam 'Tao Tai Khoan Khach' de dang ky."
  echo "   * Moi khach co User ID rieng va du lieu hoan toan doc lap voi Host."
else
  echo "👉 LINK 2 (ONLINE): Dang khoi tao tunnel... (Xem tai file tunnel.log hoac ngrok.log)"
fi
echo "=================================================================="
