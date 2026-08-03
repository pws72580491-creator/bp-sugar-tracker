# 혈압·혈당 트래커 Pro

혈압과 혈당 수치를 기록하고, 추세를 분석하고, 인쇄 가능한 보고서로 정리하는 한국어 PWA입니다.

## 실행 방법

정적 파일이라 별도 빌드 과정이 없습니다. 아무 정적 서버로 폴더를 서빙하면 됩니다.

```bash
cd bp-sugar-tracker
python3 -m http.server 8080
# 브라우저에서 http://localhost:8080 접속
```

또는 이 폴더를 그대로 Firebase Hosting, Netlify, GitHub Pages 등에 업로드해도 동작합니다.

휴대폰 브라우저에서 "홈 화면에 추가"를 하면 앱처럼 아이콘이 생기고, 서비스 워커가 정적 자산을 캐시해 오프라인에서도 열립니다.

## 폴더 구조

```
bp-sugar-tracker/
├── index.html          앱 셸 (모든 화면의 정적 마크업)
├── manifest.json        PWA 매니페스트
├── sw.js                 서비스 워커 (오프라인 캐시)
├── css/style.css         디자인 시스템 + 전체 스타일
├── js/
│   ├── storage.js        localStorage 기반 데이터 저장 계층
│   ├── converter.js       단위 변환 (mg/dL↔mmol/L, mmHg↔kPa)
│   ├── insights.js        범위 판정 + 맞춤 인사이트 로직
│   ├── charts.js          캔버스 기반 추세 차트 (외부 라이브러리 없음)
│   ├── reports.js         인쇄용 보고서 렌더링
│   ├── articles.js        건강 정보 아티클 콘텐츠
│   └── app.js             화면 전환, 폼, 이벤트 바인딩 등 메인 로직
└── icons/                 앱 아이콘 (일반 + 마스커블)
```

## 데이터 저장

현재는 기기의 `localStorage`에만 저장됩니다 (서버로 전송되지 않음). 여러 기기 간 동기화나 백업이 필요하시면 `js/storage.js`의 `getAll/add/update/remove` 함수만 Firebase Realtime Database 호출로 교체하면 되며, 나머지 코드(`app.js` 등)는 이 인터페이스만 바라보도록 설계했습니다.

## 참고 범위에 대한 안내

혈압/혈당 판정 배지(정상·상승·고혈압 1단계 등)는 일반적으로 통용되는 참고 기준을 코드로 옮긴 것이며, 개인별 진단이 아닙니다. 정확한 해석과 목표 수치는 의료진과 상담하시길 권장합니다.
