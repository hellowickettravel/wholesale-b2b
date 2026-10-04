#!/usr/bin/env bash
# Restart the production server on :3000 by PID (never pkill -f: it matches your own shell).
for pid in $(ps -eo pid,args | grep -E "next-server|next start" | grep -v grep | awk '{print $1}'); do kill "$pid"; done
sleep 1
nohup npm run start -- -p 3000 > /tmp/next-server.log 2>&1 &
for _ in $(seq 1 30); do curl -sf -o /dev/null http://localhost:3000/login && echo "server up" && exit 0; sleep 1; done
echo "server failed to start"; tail -20 /tmp/next-server.log; exit 1
