#!/usr/bin/env bash
# Script khoi chay FinTrack Pro va Cloudflare Tunnel cho dien thoai
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR"

# Dung tien trinh cu
PORT_PID=$(lsof -ti:3000 2>/dev/null)
if [ -n "$PORT_PID" ]; then
  kill -9 $PORT_PID 2>/dev/null
fi

pkill -f "cloudflared tunnel" 2>/dev/null

# Khoi chay Next.js ngam doc lap
python3 -c "import subprocess, os; subprocess.Popen(['npm', 'run', 'dev'], cwd='$DIR', start_new_session=True, stdout=open('logs_dev.log', 'a'), stderr=subprocess.STDOUT)"

# Khoi chay Cloudflare Tunnel ngam doc lap (giup dien thoai vao duoc 100% ca khi dung 4G/WiFi)
if [ -x "/home/hlp0609/.local/bin/cloudflared" ]; then
  python3 -c "import subprocess, os; subprocess.Popen(['/home/hlp0609/.local/bin/cloudflared', 'tunnel', '--url', 'http://localhost:3000'], cwd='$DIR', start_new_session=True, stdout=open('tunnel.log', 'w'), stderr=subprocess.STDOUT)"
fi

sleep 2
IP_LAN=$(hostname -I | awk '{print $1}')
TUNNEL_URL=$(grep -o 'https://.*\.trycloudflare\.com' tunnel.log 2>/dev/null | tail -n 1)

echo "=================================================="
echo "FinTrack Pro da duoc khoi chay thanh cong!"
echo "1. May tinh:               http://localhost:3000"
echo "2. Dien thoai (Cung WiFi): http://${IP_LAN}:3000"
if [ -n "$TUNNEL_URL" ]; then
echo "3. Dien thoai (4G / Moi noi): $TUNNEL_URL"
fi
echo "=================================================="
