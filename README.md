# JAPAN GRADUATION TRIP 2027

2027년 1~2월 일본 졸업여행을 계획하는 한국어 웹앱입니다. 18개 추천 코스, 66개 도시·지역, 47개 도도부현 지도, 기존 여행 정보와 이미지를 포함합니다. 여행지 탐색, 일정 편집, 예산 계산은 계정 없이 이용할 수 있습니다.

## 실행

- 여행 정보를 로컬에서 보려면 Python 3을 설치한 뒤 Windows에서 `run.bat`를 두 번 클릭합니다. macOS/Linux에서는 `python3 -m http.server 8000 --bind 127.0.0.1 --directory dist`를 실행하고 [로컬 사이트](http://127.0.0.1:8000/)를 엽니다.
- 로그인·그룹을 시험하려면 Node.js 22 이상과 Firebase CLI가 지원하는 Java를 설치하고 다음 명령을 실행하세요. 로컬 에뮬레이터의 테스트 계정과 데이터는 운영 서비스와 분리됩니다.

  ```sh
  npm ci
  npm run dev:firebase
  ```

  [Firebase 로컬 테스트 사이트](http://127.0.0.1:15500/?emulator=1)를 여세요. 인증 팝업을 열려면 Google 인증용 스크립트에 접속할 수 있고 팝업이 허용된 브라우저가 필요합니다. 공식 Firestore 에뮬레이터는 첫 실행 시 다운로드됩니다.

## 기존 Firebase 프로젝트에 배포

이 소스의 배포 대상은 `japan-graduation-trip-2027`입니다. 프로젝트 ID는 `.firebaserc`에 설정했습니다. 콘솔에서 이미 사용 설정한 Google 로그인, 승인된 도메인 두 개와 생성한 기본 Firestore 데이터베이스를 사용합니다.

빌드가 포함된 배포 ZIP을 받았다면 압축을 푼 프로젝트 폴더에서 아래 명령을 실행하세요. Windows에서는 `deploy-firebase.cmd`를 더블 클릭해 같은 작업을 할 수 있습니다. Node.js 22 이상이 필요합니다. 로그인 창에서 해당 Firebase 프로젝트에 접근 가능한 Google 계정을 선택합니다.

```sh
npx --yes firebase-tools@14.27.0 login
npx --yes firebase-tools@14.27.0 deploy --only firestore:rules,firestore:indexes,hosting --project japan-graduation-trip-2027
```

소스 변경 후 배포할 때는 위 명령 전에 `npm ci`와 `npm run build`를 실행하세요. 프로젝트 설정 파일이 이미 있으므로 `firebase init` 단계는 건너뜁니다. 배포 명령은 해당 프로젝트의 Hosting 파일과 기본 Firestore 규칙·인덱스를 업데이트합니다. Firebase CLI 인증은 본인의 브라우저에서 완료하고 인증 코드를 다른 사람에게 공유하지 마세요.

배포 출력의 **Hosting URL**을 브라우저 시크릿 창에서 열어 여행 정보와 이미지가 비로그인으로 보이는지 확인합니다. 이후 데스크톱·모바일에서 실제 Google 계정으로 로그인하고, 두 계정으로 초대·투표를 시험하세요. 기존 사이트의 브라우저 데이터는 아래 방법으로 옮길 수 있습니다.

## 여행 데이터와 그룹

- 여행지 카드에서 하트나 비교 버튼을 누른 뒤 ‘나의 여행 후보’ 또는 ‘여행지 비교’에서 확인합니다. 일정과 메모는 자동 저장되고, 예산은 ‘예산 저장’을 누르면 저장됩니다.
- 로그인 전 데이터는 브라우저에 보관됩니다. 동일 주소의 게스트 데이터는 **설정 → 이 주소의 게스트 데이터 가져오기**에서 병합할 수 있습니다. 다른 주소의 데이터는 기존 사이트의 **나의 여행 후보 → JSON 내보내기**, 새 사이트 로그인 후 **나의 여행 후보 → JSON 불러오기**로 옮깁니다. JSON 불러오기는 현재 저장 데이터를 교체하므로 필요한 데이터를 먼저 내보내세요.
- **프로필 메뉴 → 친구들과 여행**에서 그룹을 만든 뒤 초대 링크 또는 코드를 전달합니다. 여행지 선호도, 기간, 출발 날짜는 각각 한 표를 투표하고 바꿀 수 있습니다. 후보별 찬반도 표시할 수 있습니다. 개인 여행 계획은 그룹 일정·예산·체크리스트와 별도로 저장됩니다. 그룹의 **공동 관광지와 맛집**에 장소를 저장하면 공동 일정의 장소 후보로도 사용할 수 있습니다. 그룹 구성원은 자신의 의견을 작성하고 수정할 수 있습니다. 그룹 화면을 열고 있는 동안 변경 사항을 실시간으로 받습니다.
- 공동 경비에는 각 구성원이 낸 금액을 입력합니다. 전체 금액을 현재 인원으로 균등 분담하여 원 단위로 정산합니다. 공유 예산에는 구성원별 예상 부담금도 표시됩니다. 소유자는 관리자 권한을 부여하거나 소유권을 이전할 수 있습니다. 관리자는 그룹 이름을 변경하거나 후보를 삭제하고 초대 코드를 갱신할 수 있습니다. 구성원이 나가면 본인의 투표, 의견 및 경비를 정리합니다.
- 탈퇴하려면 **설정 → 회원 탈퇴 및 데이터 삭제**에서 Google 재인증을 진행합니다. 다른 구성원이 있는 그룹의 소유자는 먼저 소유권을 이전해야 합니다. 탈퇴 시 개인 여행 데이터와 그룹 소속·본인 투표·본인 경비가 제거됩니다. 다른 구성원이 있는 그룹의 공동 일정, 후보 및 예산은 그룹에 남을 수 있습니다. 실패 시 설정에서 다시 진행할 수 있습니다.

## 무료 사용량과 운영

- Spark의 Firestore 무료 기본량은 읽기 5만 건/일, 쓰기·삭제 각 2만 건/일, 저장 1 GiB입니다. 실시간 듣기는 초기 문서 로드와 변경, 재연결 등에 따라 읽기 사용량이 늘어날 수 있습니다. 그룹 화면을 닫으면 공동 데이터 리스너가 해제됩니다. 그룹당 최대 30명, 각 구성원당 공동 경비 최대 30건입니다. [Firestore 한도](https://firebase.google.com/docs/firestore/quotas)
- Firebase Hosting은 저장·전송량 한도가 있습니다. **Hosting → 사용량**과 **Firestore Database → 사용량**을 확인하세요. 무료 한도 도달 시 일부 서비스가 일시 제한될 수 있습니다. 이 구성에는 Cloud Functions, Blaze 전환, 결제수단 등록이 필요하지 않습니다. [Hosting 한도](https://firebase.google.com/docs/hosting/usage-quotas-pricing)
- Firebase 콘솔의 **Authentication → 사용자**는 계정 상태를 확인하는 용도로 사용하세요. 개인 데이터를 함께 지우려면 사이트의 탈퇴 기능으로 진행합니다. 인증 계정만 콘솔에서 지우면 연결된 Firestore 레코드가 자동으로 정리되지 않습니다.
- 로그인 문제는 Google 제공자 상태, 승인된 도메인, 브라우저 팝업 설정을 확인합니다. 데이터 접근 문제는 배포 대상 프로젝트와 Firestore Rules를 확인합니다. [Google 인증 설정](https://firebase.google.com/docs/auth/web/google-signin) · [Firebase Hosting 배포](https://firebase.google.com/docs/hosting/quickstart)
- Firebase Hosting 없이 정적 공개 호스팅으로 배포할 때는 `dist/`를 제공합니다. 해당 주소에서는 게스트 여행 기능을 사용할 수 있습니다.

## 파일 구조와 검수

- `dist/index.html`, `app.js`, `logic.js`, `style.css` — 기존 정적 웹앱
- `dist/cloud*.js`, `src/cloud-sdk.js` — 계정 UI, Firestore 데이터, SDK 번들 진입점. SDK 번들은 `npm run build`에서 생성
- `firebase.json`, `firestore.rules`, `firestore.indexes.json` — 배포 설정과 데이터베이스 접근 규칙
- `dist/data/trips.json`, `dist/maps/`, `dist/images/`, `dist/fonts/` — 여행 자료와 정적 자산
- `npm test`, `npm run test:cloud`, `npm run test:rules`, `node scripts/render-check.mjs` — 데이터, 계산, 접근 권한 및 렌더링 테스트
- 브라우저 테스트는 `npx playwright install chromium`을 실행하고 로컬 에뮬레이터가 켜진 상태에서 `npm run test:browser`로 재현할 수 있습니다. 테스트 계정은 공식 Auth 에뮬레이터에서만 작동합니다.
- `SOURCES.md`, `QA.md` — 출처 및 검수 결과

`trips.json`의 `destinations`에서 지역과 좌표, 경비 범위, 태그, 5점 평가 및 일정을 편집합니다. 비용 미산정 값은 `null`입니다. 명소 설명과 공식 링크는 `attractionInfo`, `official`에 기록합니다.
