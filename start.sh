#!/bin/bash
# 주차 스터디 모각코 트래커 - 실행 스크립트
# 처음이면 클론, 이미 있으면 최신으로 풀받고 실행

REPO="git@github.com:socar-bird/parking-study-coding.git"
DIR="parking-study-coding"

if [ -d "$DIR/.git" ]; then
  echo "📦 최신 버전으로 업데이트 중..."
  cd "$DIR"
  git pull origin main
else
  echo "📥 프로젝트 클론 중..."
  git clone "$REPO" "$DIR"
  cd "$DIR"
fi

echo "🚀 실행!"
open index.html
