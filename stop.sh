#!/usr/bin/env bash
# Script dung may chu FinTrack Pro va Cloudflare Tunnel
PORT_PID=$(lsof -ti:3000 2>/dev/null)
if [ -n "$PORT_PID" ]; then
  kill -9 $PORT_PID 2>/dev/null
  echo "Da dung tien trinh tren cong 3000."
fi

pkill -f "cloudflared tunnel" 2>/dev/null
echo "Da tat may chu va duong truyen thanh cong."
