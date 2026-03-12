#!/bin/bash
# 주차 스터디 모각코 트래커 - 배포 스크립트

cd "$(dirname "$0")"

if [ ! -d ".git" ]; then
  echo "📦 Git 초기화 중..."
  git init
  git remote add origin git@github.com:socar-bird/parking-study-coding.git
  git branch -M main
fi

echo "📝 변경사항 확인..."
git add index.html style.css app.js start.sh deploy.sh
git status --short

read -p "커밋 메시지 (Enter시 기본값): " MSG
MSG="${MSG:-업데이트}"

git commit -m "$MSG"
git push -u origin main

echo "✅ 배포 완료!"
