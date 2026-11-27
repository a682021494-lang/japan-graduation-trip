# 출처 및 확인 기록

확인일은 2026년 11월 25일(한국시간)입니다. 공식 발표는 여행일에 다시 확인하세요.

| 항목 | 공식 자료 | 검수 |
|---|---|---|
| 삿포로 눈축제 | [2027년 주최 측 발표](https://www.snowfes.com/news/948.html) | 2월 4~11일 |
| 한국 설 연휴 | [우주항공청 월력요항](https://www.kasa.go.kr/bbs/BBSMSTR_000000000018/B000000003234Li6nD2.do) | 2월 6~9일, 설날 7일 |
| 1·2월 평년 기온 | [일본 기상청 1991~2020](https://www.data.jma.go.jp/stats/data/en/normal/normal.html) | 기재한 주요 관측소의 대표 평년값, 일부 지역 생략 |
| 일본 성년 및 음주·흡연 연령 | [일본 정부 안내 PDF](https://www.gov-online.go.jp/assets/moj_minpo_seinen_nenrei_kaisei.pdf) | 18세 / 20세 |
| 단기 체류 사증 면제 | [일본 외무성](https://www.mofa.go.jp/j_info/visit/visa/short/novisa.html) | 한국 포함, 개별 여권 및 방문 목적 확인 필요 |
| 입국 절차 | [일본 디지털청](https://www.digital.go.jp/en/policies/visit_japan_web) | 공식 안내 주소 확인 |
| 오키나와 고래 | [오키나와 관광 공식 가이드](https://visitokinawajapan.com/travel-inspiration/whale-watching-in-okinawa-/) | 통상 1~3월, 개별 운영 일자는 미확정 |
| 관광지별 공지 | [USJ](https://www.usj.co.jp/web/ko/kr), [도쿄 디즈니 공식 운영 달력](https://www.tokyodisneyresort.jp/en/tdr/calendar/), [지브리파크 티켓](https://ghibli-park.jp/en/ticket/), [기요미즈데라 FAQ](https://www.kiyomizudera.or.jp/en/faq/), [츄라우미 운영시간](https://www.churaumi.okinawa/sp/en/guide/hour/), [오사카 정보 도톤보리](https://www.osaka-info.jp/en/spot/dotonbori/) | 공식 안내의 존재를 확인. 요금·운영은 방문일 기준 |
| 나머지 개별 명소 및 공항 URL | `trips.json`과 사이트 출처 | 전수 HTTP 검사 미완료 |

추천 순위와 최초 비용 범위는 사용자 명세서에서 가져왔습니다. 추가 코스의 비용이 없는 경우 별도 산정으로 표시합니다. 이동법과 일정은 가이드용이며 개별 항공편이나 교통편의 운항을 보장하지 않습니다.

## 지도

출처 · 일본 국토지리원 지구지도 일본. [Data of Japan](https://github.com/dataofjapan/land)의 변환 자료로부터 경계를 단순화하고 오키나와 삽입도를 구성했습니다. 재사용 시 [원본 고지](https://github.com/dataofjapan/land/blob/master/README.md)의 상업적 이용 조건을 확인하세요.

## 이미지

| 로컬 파일 | 대상 | 작성자 및 유형 |
|---|---|---|
| `hero.webp` | 가와구치코에서 본 후지산 | OpenAI ImageGen으로 이 프로젝트를 위해 제작한 AI 삽화 |
| `osaka.webp` | 도톤보리 | OpenAI ImageGen · AI 삽화 |
| `tokyo.webp` | 시부야 | OpenAI ImageGen · AI 삽화 |
| `sapporo.webp` | 오타루 운하 | OpenAI ImageGen · AI 삽화 |
| `fukuoka.webp` | 나카스 | OpenAI ImageGen · AI 삽화 |
| `okinawa.webp` | 오키나와 해안 | OpenAI ImageGen · AI 삽화 |
| `fuji.webp` | 후지산 | OpenAI ImageGen · AI 삽화 |
| `fallback.svg` | 단색 풍경 그림 | 이 프로젝트에서 직접 작성한 SVG |

실제 촬영 사진은 포함되지 않았습니다. 웹 화면에 AI 생성물임을 표시했습니다. [OpenAI 이용약관](https://openai.com/policies/terms-of-use/)

## 글꼴

Noto Sans KR을 일부 문자로 축소해 로컬에 포함했습니다. [Google Fonts 원본](https://github.com/google/fonts/tree/main/ofl/notosanskr) 및 `dist/fonts/OFL.txt`의 SIL Open Font License를 참고하세요.

## 여행지 대표 이미지

추천 여행지 18곳과 세부 도시·지역 66곳의 대표 이미지 목록은 `dist/data/trip-images.js`에 있습니다. 총 84개 항목 중 81개는 Wikimedia Commons의 라이선스가 확인된 실제 관광 사진을 사용합니다. 사진은 크기를 조정해 WebP로 변환했습니다. 각 상세 페이지에서 원본 사진, 저작자, 라이선스를 확인할 수 있습니다. 변환 사진에는 해당 원본의 라이선스가 적용됩니다.

기타큐슈 추천 코스, 기타큐슈 세부 항목, 나오시마 세부 항목에는 각각 모지코 레트로와 지추미술관을 소재로 한 OpenAI ImageGen 삽화를 사용합니다. 사이트에 AI 삽화로 표시합니다.

## 전국 행정구역 탐색

- 행정구역 이름·코드는 일본 e-Stat의 표준 지역 코드에 근거한 2025년 3월 정리본의 사실정보를 사용했습니다. 정령지정도시의 행정구와 도쿄의 특별구를 구분했습니다. 군은 정·촌을 묶는 탐색용 분류이며, 홋카이도의 일부 군 식별자는 내부 분류용입니다. [e-Stat](https://www.e-stat.go.jp/municipalities/cities) · [정리본](https://github.com/OtterSou/japan-municipalities)
- 지자체 홈페이지와 청사 위치는 CC0로 공개된 localgovjp에서 가져왔습니다. 하마마쓰 개편 구역의 표시는 이전 청사 위치 참조입니다. 일본 정부의 통상 집계 범위인 1,741개 시정촌·특별구와 정령지정도시의 행정구 171개를 수록했습니다. [localgovjp](https://github.com/code4fukui/localgovjp)
- 2026년 11월 27일에 기존 시·특별구·행정구·군·정·촌 2,283개의 일본어 읽기를 행정구역 코드와 원문으로 연결하고 일본우편의 전국 주소 가나 자료와 대조했습니다. 일본우편에서는 스에정의 한자를 `須惠町`으로 쓰고 미즈마군을 `みずまぐん`으로 적습니다. 사이트의 일본어 원문과 읽기 자료의 표기는 각각 `須恵町`, `みづまぐん`입니다. 두 표기 차이는 한글 이름에 영향을 주지 않습니다. [읽기 자료](https://github.com/OtterSou/japan-municipalities/blob/a7852b8670c0a99e93710f3d550509f1b69f7f00/0-all.tsv) · [일본우편 전국 데이터](https://www.post.japanpost.jp/service/search/zipcode/download/utf-zip.html)
- 한글 이름은 실제 일본어 읽기에 국립국어원의 일본어 표기 원칙을 적용했습니다. 합성 지명의 모음은 경계를 확인해 기타아키타시, 미노오시, 세토우치시처럼 표기했습니다. `dist/data/areas/NN.json`에는 한글과 일본어 읽기를, 전국 검색 목록에는 일본어 원문·읽기·한글·기존 영문을 수록합니다. [외래어 표기법](https://www.korean.go.kr/kornorms/regltn/regltnView.do?regltn_code=0003) · [미노오시 생활 가이드](https://portal.mafga.or.jp/ko/living-guide) · [밀양시 세토우치시 안내](https://www.miryang.go.kr/web/index.do?mnNo=40402010000)
- 신규 상세 관광지 10개는 해당 공식 시설·관광기관 URL과 확인 날짜를 함께 표시합니다. 지도 점은 탐색용 근삿값이며, 미확인 필드는 미확인으로 표시합니다. 다른 지역의 상세 관광 정보는 기존 가이드 범위에서만 제공합니다.

- 47개 도도부현의 JNTO 관광 가이드 링크를 권역별로 열어 확인했습니다. 확인일과 주소는 `dist/data/areas/tourism.json`에 기록합니다. 사이트의 8개 권역 분류를 사용하며, JNTO는 주부와 규슈·오키나와를 세분화합니다.
- 2026년 11월 26일에 JNTO의 [히로사키성](https://www.japan.travel/en/spot/1836/), [돗토리 사구](https://www.japan.travel/en/spot/949/), [이야 가즈라바시](https://www.japan.travel/en/spot/851/), [다카치호 협곡](https://www.japan.travel/en/spot/615/) 안내를 확인해 개별 관광지 4곳을 추가했습니다. 지도에는 근사 위치를 표시하며 구글 지도 검색에는 관광지 이름과 주소를 사용합니다. 돗토리 사구에는 기존 라이선스 확인 사진을 사용합니다.

## 2027년 1~2월 행사와 겨울철 운영

`dist/data/winter.js`에 행사별 공식 안내, 확인일, 겨울 운영 제한, 18개 코스의 겨울 동선을 기록했습니다. 확정 행사 날짜는 여행 기간과 겹치는 날만 표기합니다. 나바나노사토의 1월 6~7일 휴장은 별도 표시하며, 시라카와고와 가와구치코는 실제 행사일만 나열합니다. 오우치주쿠 눈축제는 확인일 기준 2027년 공식 날짜를 확인하지 못해 미확정 목록에만 표시합니다. 일몰 조회는 일본 국립천문대의 역 계산을 사용합니다.

## 개별 관광 명소 사진

첫 사진 배포에서 가이드 84개와 전국 지도 상세 정보에 연결된 고유 명소·체험 항목은 161곳입니다. 같은 장소의 이름 표기는 `dist/data/attraction-photos.js`에서 통합합니다. 실제 장소와 일치하고 라이선스를 확인한 사진 237장을 151곳에 연결했습니다. 36곳에 사진이 3장 이상 있습니다. 사진을 확보하지 못한 10곳은 당시 ‘대표 사진 미확보’로 표시했습니다.

기존 사진의 출처는 `dist/data/trip-images.js`에, 새 사진의 원본 링크·저작자·라이선스·확인일은 `dist/data/reviewed-attraction-photos.js`에 기록합니다. 새 사진은 크기를 줄여 WebP로 변환했으며 원본 라이선스를 따릅니다. 목록과 상세 화면에서 지연 로딩하고, PWA에 새 명소 사진을 최대 48장까지 저장합니다.

### 미확보 10곳 추가 조사

2026년 11월 27일 기준 161곳 모두 이미지가 있습니다. 기존 사진 237장에 실제 사진 23장과 AI 일러스트 1장을 추가했습니다. 실제 사진은 160곳에 260장이고, 42곳에 3장 이상 있습니다. 사진별 저작자, 원본, 이용 조건, 확인일은 `dist/data/reviewed-attraction-photos.js`에서 확인할 수 있습니다.

| 등록 명칭 | 일본어 · 영어 검색 명칭 | 추가한 이미지 |
| --- | --- | --- |
| 팀랩 플래닛 | チームラボプラネッツ · teamLab Planets TOKYO | 도요스 전시장 외관 1장. 전시장 내부 촬영 조건은 [공식 안내](https://prd-art.team-lab.cn/en/e/planets/) 참고 |
| 스키장 및 스노보드 체험 | スキー・スノーボード体験、札幌国際スキー場 · Skiing and snowboarding, Sapporo Kokusai Ski Resort | 삿포로 국제 스키장 3장. 봄 촬영 사진은 캡션에 표시 |
| 노보리베츠 온천 | 登別温泉 · Noboribetsu Onsen | 노천 족욕과 온천 거리 3장 |
| 라라포트 후쿠오카 | ららぽーと福岡 · LaLaport Fukuoka | 플라워파크 출입구 1장 |
| 고래 관찰 투어 | 慶良間・座間味ホエールウォッチング · Kerama / Zamami whale watching | 일본 환경성의 [게라마 제도 고래 관찰 코스](https://www.env.go.jp/nature/nationalparks/list/kerama-shoto/course/07/) 사진 3장. [공공데이터 이용약관 1.0과 사이트별 조건](https://www.env.go.jp/nature/nationalparks/terms/)에 따라 출처, 이용일, 변환 주체를 표시 |
| 유후인 료칸 | 由布院の旅館 · Yufuin ryokan | 유후인 료칸과 노천탕 2장 |
| 미야지마 | 宮島、厳島 · Miyajima, Itsukushima | 섬, 해안과 상점가 4장 |
| 사누키 우동 | 讃岐うどん · Sanuki udon | 사누키 우동 음식 사진 3장 |
| 구마몬 스퀘어 | くまモンスクエア · Kumamon Square | [구마모토시 관광 가이드](https://kumamoto-guide.jp/spots/detail/367)의 360도 무대와 카페 안내를 참고한 AI 일러스트 1장. 사진 및 캐릭터 이용 조건을 함께 확인해 캐릭터 도안은 사용하지 않았습니다. [구마몬랜드 이용 안내](https://kumamon-land.jp/mypage/file/riyou_tebiki.pdf) |
| 시로가네 공원 | 白銀公園、白銀の滝 · Shirogane Park, Shirogane Falls | [야마가타현 관광 안내](https://yamagatakanko.com/attractions/detail_11484.html)에서 공원 입구에 위치한 것으로 확인한 폭포 3장 |
