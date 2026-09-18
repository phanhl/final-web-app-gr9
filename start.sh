#!/usr/bin/env bash
# Script khoi chay FinTrack Pro va cac duong truyen co dinh cho dien thoai
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR"

# Dung tien trinh cu
PORT_PID=$(lsof -ti:3000 2>/dev/null)
if [ -n "$PORT_PID" ]; then
  kill -9 $PORT_PID 2>/dev/null
fi

pkill -f "ngrok http" 2>/dev/null
pkill -f "cloudflared tunnel" 2>/dev/null

# 1. Khoi chay Next.js ngam doc lap
python3 -c "import subprocess, os; subprocess.Popen(['npm', 'run', 'dev'], cwd='$DIR', start_new_session=True, stdout=open('logs_dev.log', 'a'), stderr=subprocess.STDOUT)"

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
