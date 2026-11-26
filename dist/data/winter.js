export const winterWindow = {start:'2027-01-01',end:'2027-02-28'};
export const winterChecked = '2026-11-26';
export const daylightSource = 'https://eco.mtk.nao.ac.jp/cgi-bin/koyomi/koyomiy.cgi';
export const winterEvents = [
  {name:'나바나노사토 일루미네이션',pref:24,kind:'일루미네이션',start:'2027-01-01',end:'2027-02-28',note:'전체 개최 기간 중 여행 기간에 해당하는 날짜입니다. 1월 6·7일은 휴장합니다. 점등 시각과 돌아오는 버스를 확인하세요.',source:'https://www.nagashima-onsen.co.jp/nabana/illumination/index.html'},
  {name:'시라카와고 라이트업',pref:21,kind:'일루미네이션',dates:['2027-01-11','2027-01-17','2027-01-24','2027-01-31'],note:'사전 예약제입니다. 입장 방법과 귀가 버스를 먼저 확인하세요.',source:'https://shirakawa-go.gr.jp/events/460/'},
  {name:'가와구치코 겨울 불꽃놀이',pref:19,kind:'불꽃놀이',dates:['2027-01-23','2027-01-24','2027-01-30','2027-01-31','2027-02-06','2027-02-07','2027-02-13','2027-02-14','2027-02-20','2027-02-21','2027-02-23'],note:'공표된 주말과 후지산의 날에만 열립니다. 기상에 따른 변경과 야간 귀가편을 확인하세요.',source:'https://www.fujilake.co.jp/news/221/'},
  {name:'지토세·시코쓰호 얼음축제',pref:1,kind:'축제',start:'2027-01-30',end:'2027-02-23',note:'시코쓰호 온천에서 열립니다. 야간 관람 후 버스나 숙소 복귀편을 미리 확인하세요.',source:'https://www.sapporo.travel/event/event-list/lake-shikotsu-ice-festival/'},
  {name:'삿포로 눈축제',pref:1,kind:'축제',start:'2027-02-04',end:'2027-02-11',note:'오도리·쓰도무·스스키노 회장. 행사장 사이 이동은 지하철을 우선하세요.',source:'https://www.snowfes.com/news/948.html'},
  {name:'나가사키 랜턴 페스티벌',pref:42,kind:'축제·일루미네이션',start:'2027-02-05',end:'2027-02-21',note:'신치 차이나타운 등 도심 여러 곳에서 열립니다. 회장별 운영시간을 확인하세요.',source:'https://www.at-nagasaki.jp/lantern-festival/news/1283'},
  {name:'오타루 눈빛거리',pref:1,kind:'일루미네이션',start:'2027-02-06',end:'2027-02-13',note:'오타루 운하 등에서 열립니다. 결빙에 대비하고 JR 막차 전에 돌아오세요.',source:'https://www.visit-hokkaido.jp/event/detail_11004.html'},
  {name:'아사히카와 겨울축제',pref:1,kind:'축제',start:'2027-02-06',end:'2027-02-11',note:'세부 프로그램과 교통편은 실행위원회 공지를 확인하세요.',source:'https://asahikawa-winterfes.jp/'},
  {name:'도카마치 눈축제',pref:15,kind:'축제',start:'2027-02-19',end:'2027-02-21',note:'폭설에 대비해 철도 운행과 회장별 이동편을 확인하세요.',source:'https://www.tokamachishikankou.jp/event/tokamachiyukimatsuri/'}
];
export const pendingWinterEvents = [
  {name:'오우치주쿠 눈축제',pref:7,kind:'축제',note:'2027년 공식 날짜가 확인되면 일정에 반영하세요.',source:'https://www.town.shimogo.fukushima.jp/organization/sougouseisaku/1/2/588.html'}
];

export const winterRestrictions = [
  {name:'가미코치',kind:'겨울철 일반 관광 제한',guides:['nagano'],note:'2026년 11월 16일~2027년 4월 16일 겨울 폐쇄 기간입니다. 관광용 교통·숙박·식당 운영이 없고, 겨울 입산에는 별도 규칙이 적용됩니다.',source:'https://www.kamikochi.or.jp/news/9307/'},
  {name:'다테야마 구로베 알펜루트',kind:'겨울철 운행 휴지',guides:['city-34'],note:'1~2월은 알펜루트 통과 관광 운영 기간 밖입니다.',source:'https://www.alpen-route.com/information/faq.html'},
  {name:'히로사키성 천수',kind:'내부 관람 중지',places:['11'],note:'천수 내부 관람은 2025년 11월 23일을 마지막으로 일시 중지되었습니다. 공원과 천수 외관 관람은 방문일 안내를 확인하세요.',source:'https://www.hirosakipark.jp/21498.html'},
  {name:'긴잔온천',kind:'겨울철 교통 제한',guides:['sendai','city-9'],places:['4'],note:'겨울 당일 방문 시 차량 진입 조건과 셔틀 승차권을 확인하세요. 숙박객은 숙소에 송영편을 확인하세요.',source:'https://www.ginzanonsen.jp/blog/'},
  {name:'자오 로프웨이',kind:'기상에 따른 운행 제한',guides:['sendai','city-10'],note:'산 정상 구간은 당일 운행 상황과 왕복 시간을 확인한 뒤 출발하세요.',source:'https://zaomountainresort.com/ropeway-lift-information/'},
  {name:'다카치호 협곡 대여 보트',kind:'기상·수위에 따른 운항 제한',places:['14'],note:'대여 보트 운항과 협곡 산책로 개방 여부를 각각 확인하세요.',source:'https://www.takachiho-kanko.info/boat/det/'}
];

// 2박 3일과 3박 4일 일정에 공통으로 적용하는 지역별 이동·대체 계획입니다.
export const winterPlans = {
  osaka:'교토와 USJ는 오전부터 둘러보세요. 비나 강풍이면 실내 어트랙션이나 난바 지하상가로 전환하고 귀국일에는 난카이 공항선 운행을 확인하세요.',
  tokyo:'아사쿠사와 우에노 야외 관람은 해 지기 전에, 시부야·신주쿠는 저녁에 배치하세요. 추위나 비가 심하면 실내 쇼핑이나 박물관으로 바꾸고 디즈니씨 귀가편을 확인하세요.',
  sapporo:'오타루와 비에이는 오전에 출발하고 폭설 예보 시 삿포로 시내 실내 일정으로 바꾸세요. JR 공항·오타루 방면 운행을 확인하고 귀국일 이동 시간을 넉넉히 잡으세요.',
  fukuoka:'다자이후와 모모치는 낮에 둘러보고, 바닷바람이 강하면 캐널시티나 하카타역으로 바꾸세요. 유후인 왕복편은 버스·철도 운행을 확인한 뒤 결정하세요.',
  okinawa:'해안은 낮에 방문하세요. 북부 버스투어와 고래 관찰은 운영사 확인 후 진행하고, 강풍으로 취소되면 수족관이나 나하 시내 실내 일정으로 바꾸세요.',
  fuji:'후지산 전망은 오전에, 호수와 오시노핫카이는 해 지기 전에 둘러보세요. 결빙이나 강풍으로 혼잡·운휴가 예상되면 숙소 근처 실내 일정이나 온천으로 바꾸고 버스 막차를 확인하세요.',
  nagoya:'나고야성은 낮에 둘러보고 비나 추위가 심하면 도요타 산업기술기념관을 우선하세요. 지브리파크는 방문일 휴원 여부와 예약 시간에 맞춰 이동하세요.',
  kanazawa:'시라카와고는 아침 왕복버스를 예약하고 해 지기 전에 돌아오는 편을 우선하세요. 폭설로 버스가 취소되면 오미초시장과 가나자와 시내 실내 관람으로 바꾸세요.',
  beppu:'긴린코와 지옥온천은 낮에 둘러보세요. 산간 결빙이나 교통 지연 시 유후인·벳푸 간 이동을 줄이고 숙소 주변 온천과 역 상가를 이용하세요.',
  hiroshima:'미야지마는 낮에 방문하고 강풍이나 페리 운휴 시 평화기념자료관과 혼도리로 바꾸세요. 오노미치와 미야지마의 복귀편을 미리 확인하세요.',
  sendai:'긴잔온천과 자오는 일찍 출발하고 예약·복귀편을 확인하세요. 폭설이나 로프웨이 운휴 때는 센다이역 주변 실내 일정으로 바꾸고 귀국 당일에는 산간 이동을 피하세요.',
  nagano:'지고쿠다니 산책로와 성 관람은 낮에 배치하고 결빙 시 젠코지 인근 실내 일정으로 바꾸세요. 하쿠바 리프트와 버스 운행, 귀국일 도쿄 방면 열차를 확인하세요.',
  nagasaki:'데지마는 낮에, 이나사야마는 일몰 무렵에 방문하세요. 강풍이나 시야 불량으로 전망이 어렵다면 도심 실내 일정으로 바꾸고 하우스텐보스 복귀편을 확인하세요.',
  hakodate:'모토마치의 언덕과 고료카쿠는 해 지기 전에 둘러보세요. 바람이나 눈으로 전망대 이동이 어려우면 붉은 벽돌 창고로 바꾸고 노면전차 운행을 확인하세요.',
  takamatsu:'리쓰린공원은 낮에 보고, 나오시마는 페리와 미술관 예약 시간을 맞추세요. 강풍으로 결항하면 다카마쓰 상점가와 우동 일정으로 전환하세요.',
  matsuyama:'성곽과 우치코는 해 지기 전에 둘러보고 도고온천은 늦은 오후에 배치하세요. 비나 강풍으로 입장이나 이동이 어렵다면 오카이도 상점가로 바꾸세요.',
  kitakyushu:'고쿠라성과 모지코는 낮에 둘러보고 사라쿠라산은 일몰과 케이블카 막차를 함께 확인하세요. 강풍이나 시야 불량 때는 고쿠라역 실내 일정으로 전환하세요.',
  kumamoto:'아소는 낮에 방문하고 화산 출입 규제와 겨울 도로 상태를 확인하세요. 이동이 어렵다면 구마모토성 주변이나 구마몬 스퀘어로 바꾸세요.'
};

export function eventDates(event) {
  const format = iso => {
    const [,month,day] = iso.split('-');
    return Number(month)+'월 '+Number(day)+'일';
  };
  if(event.dates) return event.dates.map(format).join(' · ');
  if(event.start) return format(event.start)+(event.end&&event.end!==event.start?' ~ '+format(event.end):'');
  return '개최 일정 미확정';
}
