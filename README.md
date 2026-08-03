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
│   ├── firebase-config.js Firebase 프로젝트 설정 및 초기화
│   ├── storage.js        Firebase Realtime Database 기반 데이터 저장 계층
│   ├── converter.js       단위 변환 (mg/dL↔mmol/L, mmHg↔kPa)
│   ├── insights.js        범위 판정 + 맞춤 인사이트 로직
│   ├── charts.js          캔버스 기반 추세 차트 (외부 라이브러리 없음)
│   ├── reports.js         인쇄용 보고서 렌더링
│   ├── articles.js        건강 정보 아티클 콘텐츠
│   └── app.js             화면 전환, 폼, 이벤트 바인딩 등 메인 로직
└── icons/                 앱 아이콘 (일반 + 마스커블)
```

## 데이터 저장 (Firebase Realtime Database)

v1.1.0부터 기록은 Firebase Realtime Database에 저장되어, 로그인한 모든 기기에서 실시간으로 동기화됩니다.

- 프로젝트: `bp-sugar-tracker-19169`
- 경로: `readings/bp/{id}`, `readings/glucose/{id}`
- 설정 파일: `js/firebase-config.js`

### 최초 1회, Realtime Database 규칙 설정이 필요합니다
Firebase 콘솔 → Realtime Database → 규칙에서 다음을 붙여넣고 게시하세요. (규칙이 비어 있으면 기본값이 "모두 거부"라 앱에서 아무것도 안 보입니다.)

```json
{
  "rules": {
    "readings": {
      ".read": true,
      ".write": true
    }
  }
}
```

개인용으로 혼자 쓰실 거면 이 정도로 충분합니다. 나중에 URL을 다른 사람과 공유하게 되면 Firebase Authentication을 붙이고 규칙을 `auth != null`로 좁히는 걸 권장드립니다. (`apiKey`는 비밀값이 아니라 공개돼도 되는 프로젝트 식별자이니 신경 쓰지 않으셔도 됩니다 — 실제 보안은 항상 이 규칙이 담당합니다.)

### 오프라인 동작
서비스 워커가 앱 UI(HTML/CSS/JS)는 캐시해서 오프라인에서도 화면은 열립니다. 다만 실시간 데이터베이스 자체는 캐시 대상이 아니라서, 실제로 기록을 읽고 쓰려면 인터넷 연결이 필요합니다. 연결이 끊긴 상태에서 저장을 시도하면 "Firebase에 연결되지 않아 저장할 수 없습니다" 토스트가 뜨고 데이터는 유실되지 않습니다 (그냥 저장이 안 될 뿐입니다).

### 여러 기기 동기화
한 기기에서 기록을 추가/수정/삭제하면 다른 기기에서 열어둔 화면도 자동으로 갱신됩니다 (Firebase의 실시간 리스너 덕분에 새로고침이 필요 없습니다).

## 참고 범위에 대한 안내

혈압/혈당 판정 배지(정상·상승·고혈압 1단계 등)는 일반적으로 통용되는 참고 기준을 코드로 옮긴 것이며, 개인별 진단이 아닙니다. 정확한 해석과 목표 수치는 의료진과 상담하시길 권장합니다.
