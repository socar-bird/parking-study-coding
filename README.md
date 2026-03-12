# 주차 스터디 모각코 트래커

모여서 각자 코딩하는 스터디의 출석 관리 웹앱.

## 실행

```bash
git clone git@github.com:socar-bird/parking-study-coding.git
cd parking-study-coding
./start.sh
```

브라우저에서 `http://서버IP:3333` 접속.

## 기능

- **오늘** — 체크인(목표 입력) / 체크아웃(회고)
- **캘린더** — 월별 달력, 날짜별 세션 기록 조회
- **멤버** — 개인별 출석률, 연속 출석, 공부시간, 만족도
- **통계** — 전체 출석 현황, 멤버 비교, 트렌드
- **설정** — 그룹명, 모각코 요일, 멤버 관리, 데이터 내보내기/가져오기

## 재배포

```bash
./deploy.sh
```

서버에서 `git pull` 후 재시작.

## 기술 스택

- HTML + Tailwind CSS CDN + Vanilla JS
- Python3 내장 서버 (의존성 없음)
- 데이터: `data.json` (서버 파일)
