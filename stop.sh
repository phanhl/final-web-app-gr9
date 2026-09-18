#!/usr/bin/env bash
# Script dung may chu FinTrack Pro va cac duong truyen
PORT_PID=$(lsof -ti:3000 2>/dev/null)
if [ -n "$PORT_PID" ]; then
  kill -9 $PORT_PID 2>/dev/null
  echo "Da dung tien trinh tren cong 3000."
fi

pkill -f "ngrok http" 2>/dev/null
pkill -f "cloudflared tunnel" 2>/dev/null
echo "Da tat toan bo may chu va cac duong truyen thanh cong."
