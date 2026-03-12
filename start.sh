#!/bin/bash
# 주차 스터디 모각코 트래커 - 서버 실행
cd "$(dirname "$0")"

# 이미 실행 중이면 안내
if [ -f .pid ] && kill -0 "$(cat .pid)" 2>/dev/null; then
  echo "⚠️  이미 실행 중 (PID: $(cat .pid))"
  echo "   종료하려면: ./stop.sh"
  exit 1
fi

nohup python3 server.py > server.log 2>&1 &
echo $! > .pid

echo "🚀 서버 시작 (PID: $(cat .pid))"
echo "   접속: http://$(hostname -I 2>/dev/null | awk '{print $1}' || echo 'localhost'):3333"
echo "   로그: tail -f server.log"
echo "   종료: ./stop.sh"
