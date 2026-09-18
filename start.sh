#!/usr/bin/env bash
# Script khoi chay FinTrack Pro chay ngam doc lap, lang nghe tren 0.0.0.0:3000
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR"

# Dung tien trinh cu neu co tren cong 3000
PORT_PID=$(lsof -ti:3000 2>/dev/null)
if [ -n "$PORT_PID" ]; then
  kill -9 $PORT_PID 2>/dev/null
fi

# Chay ngam doc lap qua python setsid (khong bi tat khi dong terminal)
python3 -c "import subprocess, os; subprocess.Popen(['npm', 'run', 'dev'], cwd='$DIR', start_new_session=True, stdout=open('logs_dev.log', 'a'), stderr=subprocess.STDOUT)"

IP_LAN=$(hostname -I | awk '{print $1}')
echo "=================================================="
echo "FinTrack Pro da duoc khoi chay thanh cong!"
echo "Truy cap tren may tinh:  http://localhost:3000"
echo "Truy cap tren dien thoai: http://${IP_LAN}:3000"
echo "=================================================="
