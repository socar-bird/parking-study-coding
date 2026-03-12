#!/bin/bash
# 주차 스터디 모각코 트래커 - 서버 실행
cd "$(dirname "$0")"

echo "🚀 서버 시작 → http://$(hostname -I 2>/dev/null | awk '{print $1}' || echo 'localhost'):3333"
python3 server.py
