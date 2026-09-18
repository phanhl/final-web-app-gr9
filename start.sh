#!/usr/bin/env bash
# Script khoi chay FinTrack Pro va cac duong truyen co dinh cho dien thoai
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR"

# Dung tien trinh cu
fuser -k 3000/tcp 2>/dev/null
pkill -9 -f "next" 2>/dev/null
pkill -9 -f "ngrok" 2>/dev/null
pkill -9 -f "cloudflared" 2>/dev/null
sleep 1

# Kiem tra ban build production
if [ ! -d ".next" ] || [ ! -f ".next/BUILD_ID" ]; then
  echo "Dang build ung dung..."
  npm run build
fi

# 1. Khoi chay Next.js Production Server ngam doc lap
python3 -c "import subprocess, os; subprocess.Popen(['npx', 'next', 'start', '-H', '0.0.0.0', '-p', '3000'], cwd='$DIR', start_new_session=True, stdout=open('logs_prod.log', 'w'), stderr=subprocess.STDOUT)"

# 2. Khoi chay Ngrok voi Domain co dinh vinh vien
if [ -x "/home/hlp0609/.local/bin/ngrok" ]; then
  python3 -c "import subprocess, os; subprocess.Popen(['/home/hlp0609/.local/bin/ngrok', 'http', '3000', '--log=stdout'], cwd='$DIR', start_new_session=True, stdout=open('ngrok.log', 'w'), stderr=subprocess.STDOUT)"
fi

# 3. Khoi chay Cloudflare lam du phong
if [ -x "/home/hlp0609/.local/bin/cloudflared" ]; then
  python3 -c "import subprocess, os; subprocess.Popen(['/home/hlp0609/.local/bin/cloudflared', 'tunnel', '--url', 'http://localhost:3000'], cwd='$DIR', start_new_session=True, stdout=open('tunnel.log', 'w'), stderr=subprocess.STDOUT)"
fi

sleep 2
NGROK_URL=$(curl -s http://127.0.0.1:4040/api/tunnels 2>/dev/null | grep -o 'https://[^"]*ngrok[^"]*')
if [ -z "$NGROK_URL" ]; then
  NGROK_URL="https://tightly-sensation-uncle.ngrok-free.dev"
fi

echo "=================================================================="
echo "FinTrack Pro da duoc khoi chay thanh cong!"
echo "1. May tinh:                     http://localhost:3000"
echo "2. Link CO DINH cho dien thoai: $NGROK_URL"
echo "=================================================================="
