#!/bin/bash
# 주차 스터디 모각코 트래커 - 서버 종료
cd "$(dirname "$0")"

if [ -f .pid ] && kill -0 "$(cat .pid)" 2>/dev/null; then
  kill "$(cat .pid)"
  rm .pid
  echo "🛑 서버 종료"
else
  echo "⚠️  실행 중인 서버가 없습니다"
  rm -f .pid
fi
