import { daylightSource, eventDates, pendingWinterEvents, winterChecked, winterEvents, winterPlans, winterRestrictions } from './data/winter.js';
import { koreanPrefectureName, setupGeography } from './geography.js';
import { tripImages } from './data/trip-images.js';
import { setupCloudUI } from './cloud-ui.js';
import { calculate, parseImport, freshState, move, matches, formatMoney, numbers, budgetDefaults, durationLabel, durationControl, travelDates, travelSettings, tripDays, maxTripDays, dateAfter } from './logic.js';

const main = document.querySelector('#main');
const dialog = document.querySelector('#dialog');
const dialogBody = document.querySelector('#dialog-body');
const status = document.querySelector('#status');
const navigation = document.querySelector('nav');
const menu = document.querySelector('#menu');
const key = 'japan-trip-2027-v1';
let storageAvailable = true;
function guestState() {
  try {
    const saved = localStorage.getItem(key);
    return saved ? parseImport(saved) : freshState();
  } catch { storageAvailable = false;return freshState(); }
}
let state = guestState();

const types = ['놀이공원','액티비티','애니메이션·게임','쇼핑','맛집','겨울 설경','온천','자연','바다','일본 전통문화','야경','가성비','소도시 여행'];
const labels = ['놀거리','먹거리','쇼핑','가성비','사진 명소','겨울 여행','대중교통','친구 여행'];
const templateDays = [3,4];
const regionsColors = ['#96adc9','#9ebac9','#bac5a2','#b4c4dc','#e4b29f','#d6c293','#b4bbcf','#dfc39e'];
const sourceLinks = {
  climate:'https://www.data.jma.go.jp/stats/data/en/normal/normal.html',
  snow:'https://www.snowfes.com/news/948.html',
  calendar:'https://www.kasa.go.kr/bbs/BBSMSTR_000000000018/view.do?nttId=B000000003234Li6nD2',
  age:'https://www.gov-online.go.jp/assets/moj_minpo_seinen_nenrei_kaisei.pdf',
  visa:'https://www.mofa.go.jp/j_info/visit/visa/short/novisa.html',
  visit:'https://www.digital.go.jp/en/policies/visit_japan_web',
  japan:'https://www.japan.travel/en/',
  cjj:'https://www.airport.co.kr/cheongju/',
  icn:'https://www.airport.kr/',
  whales:'https://visitokinawajapan.com/travel-inspiration/whale-watching-in-okinawa-/'
};
let data, paths, prefectureNames, destinations, byId, prefById;
let filters = { q:'', region:'', pref:'', budget:'', custom:'', type:'', sort:'rank' };
let selection = { planId:state.budget.id, mapPref:0, mapId:'osaka', zoom:1, center:[340,270] };
let toastTimer;
const esc = (value = '') => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const option = (value, label, current) => `<option value="${esc(value)}"${String(value)===String(current)?' selected':''}>${esc(label)}</option>`;
const btn = (label, action, attrs = '', style = '') => `<button type="button" class="btn ${style}" data-action="${action}" ${attrs}>${label}</button>`;
const link = (label, url) => `<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(label)} ↗</a>`;
const mapLink = (name, context = '') => 'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent([name,context,'일본'].filter(Boolean).join(' '));
const detailHref = id => '#trip/'+id;
const moneyRange = range => range ? `${range[0]/10000}~${range[1]/10000}만 원` : '별도 산정';
const priceCell = (d, days=state.budget.days) => moneyRange(d.price?.[days-3]);
const weather = d => d.weather.length ? `1월 ${d.weather[0]}°C · 2월 ${d.weather[1]}°C` : '해당 지역 평년값 미수록';
const tags = (items) => `<div class="tags">${items.map(t=>`<span>${esc(t)}</span>`).join('')}</div>`;
const page = (code, title, intro, content) => `<div class="wrap page"><header class="page-title"><div class="eyebrow">${code}</div><h1>${title}</h1><p>${intro}</p></header>${content}</div>`;
const select = (label, name, items, current) => `<label>${label}<select name="${name}">${items.map(([v,l])=>option(v,l,current)).join('')}</select></label>`;
const personalDuration = () => durationControl(state.budget.days,esc,'data-personal-duration');
const budgetOptions = [['','모든 예산'],['0-400000','40만 원 이하'],['400000-600000','40~60만 원'],['600000-800000','60~80만 원'],['800000-1000000','80~100만 원'],['1000000-','100만 원 이상'],['custom','직접 입력']];
const typeOptions = [['','모든 유형'],...types.map(t=>[t,t])];
const exploreTypes=[...types.filter(type=>type!=='액티비티'),'체험','역사','친구들과 여행하기 좋은 곳'];
const geo=setupGeography({main,esc,select,page,link,fetchJSON:getJSON,getData:()=>data,getPrefectureNames:()=>prefectureNames,refresh:()=>{
  if(location.hash.startsWith('#explore')||location.hash.startsWith('#map')||location.hash.startsWith('#trip/')||location.hash.startsWith('#place/')||location.hash==='#saved'){
    const search=document.activeElement?.matches('[data-area-search]');
    const caret=search?document.activeElement.selectionStart:null;
    render();
    if(search){
      const input=main.querySelector('[data-area-search]');
      input?.focus({preventScroll:true});
      if(caret!==null)input?.setSelectionRange(caret,caret);
    }
  }
},detailHref,winterPlaceNotice:(id,title)=>{
  const event=winterEvents.find(event=>event.name===title);
  return (event?eventCard(event):'')+winterRestrictionList(restriction=>restriction.places?.includes(id)||restriction.name===title||title==='자오 수빙'&&restriction.name==='자오 로프웨이');
}});
const eventCard = event => `<article class="winter"><h3>${esc(event.name)}</h3><p><b>${esc(eventDates(event))}</b> · ${esc(event.kind)} · ${esc(prefById.get(event.pref).name)}</p><p>${esc(event.note)} ${link('공식 안내',event.source)}</p></article>`;
function winterRestrictionList(matchesRestriction) {
  const restrictions=winterRestrictions.filter(matchesRestriction);
  return restrictions.length?`<div class="stack links">${restrictions.map(item=>`<article class="notice"><strong>${esc(item.name)} · ${esc(item.kind)}</strong><p>${esc(item.note)} ${link('공식 운영 안내',item.source)}</p></article>`).join('')}</div>`:'';
}
function winterPlanNote(d) {
  const note=winterPlans[d.id];
  return note?`<div class="notice links"><strong>2027년 1~2월 일정 안내</strong><p>${esc(note)}</p><p>야외 일정과 막차는 방문일 현지 시각으로 확인하세요. ${link('일본 국립천문대 일몰 시각',daylightSource)}</p></div>`:'';
}
function guideWinterEvents(d) {
  const events=winterEvents.filter(event=>event.pref===d.pref||(d.relatedPrefs||[]).includes(event.pref));
  return events.length?`<section class="panel stack links"><h2>여행 날짜가 맞으면 들를 겨울 행사</h2>${events.map(eventCard).join('')}</section>`:'';
}
const destinationOptions = () => destinations.map(d=>[d.id,d.name]);
const allDestinationOptions = () => [...destinations,...data.cities].map(d=>[d.id,d.name]);
const photo = (d, cls = '') => {
  const {file, subject, ai} = tripImages[d.id];
  return `<img class="${cls}" src="images/${esc(file)}" alt="${esc(subject)} ${ai?'AI 삽화':'사진'}" loading="lazy" decoding="async" width="500" height="330" data-fallback>`;
};
const art = d => tripImages[d.id].ai ? '<span class="art-label">AI 삽화</span>' : '';
const savedButton = d => `<button type="button" class="icon heart ${state.saved.includes(d.id)?'on':''}" data-action="save" data-id="${d.id}" aria-pressed="${state.saved.includes(d.id)}" aria-label="${esc(d.name)} 찜하기">${state.saved.includes(d.id)?'♥':'♡'}</button>`;
const compareButton = d => btn(state.compare.includes(d.id)?'비교에서 제거':'＋ 비교 담기','compare',`data-id="${d.id}" aria-pressed="${state.compare.includes(d.id)}"`);
function card(d) {
  return `<article class="card"><div class="card-media"><a href="${detailHref(d.id)}" aria-label="${esc(d.name)} 상세 보기">${photo(d)}${art(d)}${d.rank?`<span class="rank">추천 ${String(d.rank).padStart(2,'0')}</span>`:''}</a>${savedButton(d)}</div><div class="card-info"><div class="eyebrow">${esc(d.region)}</div><h3><a href="${detailHref(d.id)}">${esc(d.name)}</a></h3><p>${esc(d.description)}</p>${tags(d.tags.slice(0,3))}<div class="card-foot"><div><small>${durationLabel(state.budget.days)} · 1인 예상</small><b>${priceCell(d)}</b></div><button class="text-btn" data-action="compare" data-id="${d.id}" aria-pressed="${state.compare.includes(d.id)}">${state.compare.includes(d.id)?'✓ 비교 담김':'＋ 비교 담기'}</button></div></div></article>`;
}
function home() {
  return `<section class="hero"><div class="wrap"><div class="eyebrow">2027 WINTER TRAVEL</div><h1>우리의 첫 졸업여행,<br><em>일본</em></h1><p>2027년 겨울, 친구들과 함께 떠나는 특별한 여행.</p><div class="facts"><span>▣ 2027년 1–2월</span><span>◷ ${durationLabel(state.budget.days)}</span><span>✈ 청주 우선 · 인천 대안</span></div></div><a class="image-credit" href="#sources">후지산 · AI 생성 삽화</a></section>
  <form class="wrap quick" id="quick">${personalDuration()}${select('1인당 예산','budget',budgetOptions.filter(([v])=>v!=='custom'),'')}${select('여행 유형','type',typeOptions,'')}<button class="btn primary">여행지 찾기 →</button></form>
  <section class="wrap section"><div class="section-top"><div><div class="eyebrow">DESTINATIONS</div><h2>추천 여행지</h2><p>친구들과 떠나기 좋은 겨울 여행지예요. 순위는 편집 추천이며 가격은 계획용 추정치입니다.</p></div><a href="#explore" class="btn">전체 여행지 보기 →</a></div><div class="card-grid">${destinations.slice(0,6).map(card).join('')}</div></section>
  <section class="wrap split-call"><div><h2>1월과 2월, 어디가 좋을까?</h2><p>삿포로 눈축제와 연휴, 지역별 겨울 기온을 확인하고 날짜를 골라 보세요.</p></div><a class="btn primary" href="#winter">겨울 여행 정보 →</a></section>`;
}
function explore() {
  const prefs = data.prefectures.filter(p=>!filters.region||p.region===filters.region);
  return page('EXPLORE','전국 여행지','8개 권역의 추천 코스와 도시를 둘러보세요.',`<div class="stack">
    ${geo.explorePanel()}<form class="panel fields" id="filters">
    <label>여행지·관광지 검색<input name="q" type="search" value="${esc(filters.q)}" placeholder="예: 도쿄, 온천, 도톤보리"></label>
    ${select('권역','region',[['','전체 권역'],...data.regions.map(r=>[r,r])],filters.region)}
    ${select('도도부현','pref',[['','전체 도도부현'],...prefs.map(p=>[p.id,p.name])],filters.pref)}
    ${personalDuration()}
    ${select('1인당 예산','budget',budgetOptions,filters.budget)}
    <label id="custom-budget" ${filters.budget==='custom'?'':'hidden'}>예산 상한 (원)<input name="custom" type="number" min="0" step="10000" value="${esc(filters.custom)}"></label>
    <fieldset class="area-type-filters"><legend>여행 유형 · 모두 충족</legend>${exploreTypes.map(type=>`<label><input type="checkbox" name="types" value="${esc(type)}" ${(filters.types||[]).includes(type)?'checked':''}> ${esc(type)}</label>`).join('')}</fieldset>
    ${select('정렬','sort',[['rank','종합 추천순'],['price','예상 비용 낮은 순'],['0','놀거리 많은 순'],['5','겨울 여행 적합순'],['4','사진 명소 추천순'],['6','이동 편의성순']],filters.sort)}
    </form><p class="notice">예산 범위와 겹치는 추천 코스를 표시합니다. 비용이 미산정된 코스와 기본 도시 정보는 예산 필터에서 제외합니다.</p>
    <div id="explore-results">${exploreResults()}</div></div>`);
}
function exploreResults() {
  const rows = destinations.filter(d=>matches(d,{...filters,days:state.budget.days}));
  if (filters.sort==='price') rows.sort((a,b)=>(a.price[state.budget.days-3]?.[0]??Infinity)-(b.price[state.budget.days-3]?.[0]??Infinity));
  else if(filters.sort!=='rank') rows.sort((a,b)=>b.scores[filters.sort]-a.scores[filters.sort]);
  const cities = filters.budget ? [] : data.cities.filter(d=>matches(d,{...filters,days:state.budget.days}));
  return `<div class="stack"><h2>추천 코스 <small>${rows.length}곳</small></h2><div class="${rows.length?'card-grid':'panel empty'}">${rows.length?rows.map(card).join(''):'조건에 맞는 추천 코스가 없습니다.'}</div>
    ${cities.length?`<h2>도시와 지역 <small>${cities.length}곳</small></h2><div class="city-grid city-image-grid">${cities.map(c=>`<a class="city-image-card" href="${detailHref(c.id)}">${photo(c,'city-thumb')}<span><b>${esc(c.name)}</b><small>${esc(c.region)} · ${esc(c.attractions.join(', '))}</small>${tripImages[c.id].ai?'<small class="city-art-label">AI 삽화</small>':''}</span></a>`).join('')}</div>`:''}</div>`;
}
function detail(d) {
  if (!d) return page('DESTINATION','여행지를 찾을 수 없습니다','다른 여행지를 찾아보세요.','<a class="btn" href="#explore">전국 여행지</a>');
  const full = Boolean(d.itineraries);
  const context = prefById.get(d.pref).name;
  return page(esc(d.region),esc(d.name),esc(d.description||`${context}에서 둘러볼 여행지`),`<div class="stack">
    <button class="cover-button" type="button" data-action="zoom-photo" data-id="${d.id}" aria-label="대표 이미지 확대">${photo(d,'detail-cover')}</button>
    <small>${esc(tripImages[d.id].subject)} · ${tripImages[d.id].ai?'AI 삽화':`<span class="links">${link(tripImages[d.id].artist,tripImages[d.id].source)} · ${tripImages[d.id].licenseUrl?link(tripImages[d.id].license,tripImages[d.id].licenseUrl):esc(tripImages[d.id].license)} · WebP 변환</span>`} · 눌러서 확대</small>
    <div class="actions">${btn(state.saved.includes(d.id)?'♥ 찜한 여행지':'♡ 여행지 찜하기','save',`data-id="${d.id}" aria-pressed="${state.saved.includes(d.id)}"`)}
    ${full?compareButton(d)+btn('일정 편집','open-plan',`data-id="${d.id}"`,'primary')+btn('예산 계산','open-budget',`data-id="${d.id}"`):''}
    <a class="btn" href="#map/${d.pref}">도도부현 지도</a>${geo.guideLink(d)}</div>
    ${full?`<div class="two"><section class="panel stack"><h2>여행 정보</h2>${tags(d.tags)}
    <p><b>추천 기간 및 1인 비용</b><br>${durationLabel(state.budget.days)} · ${priceCell(d)}</p>
    <p class="links"><b>겨울 기온</b><br>${weather(d)} ${d.weather.length?link('일본 기상청 평년값',sourceLinks.climate):''}</p>
    <p><b>추천 음식</b><br>${esc(d.food||'미확인')}</p><p><b>추천 숙소</b><br>${esc(d.stay||'미확인')}</p>
    <p><b>공항에서 시내</b><br>${esc(d.airport)} · ${esc(d.access)}</p><p><b>현지 이동</b><br>${esc(d.transport||'미확인')}</p>
    <p><b>여행 장점과 주의점</b><br>${esc(d.description)}<br>${esc(d.caution)}</p></section>
    <section class="panel"><h2>졸업여행 적합도</h2><p class="muted">편집 평가 · 1점은 선택지가 적거나 이동에 제약이 많음, 5점은 선택지가 풍부하거나 이용이 쉬움.</p>
    ${labels.map((s,i)=>`<div class="rating"><span>${s}</span><div class="bar"><i style="width:${d.scores[i]*20}%"></i></div><b>${d.scores[i]}/5</b></div>`).join('')}</section></div>`:''}
    ${winterRestrictionList(item=>item.guides?.includes(d.id))}
    <section class="panel stack"><h2>관광 명소</h2><div class="attraction-grid">${d.attractions.map((a,i)=>{
      const saved = state.attractions.includes(d.id+':'+i);
      const info = data.attractionInfo[a];
      const event=winterEvents.find(event=>event.name===a);
      return `<article class="attraction stack"><h3><a href="#place/${d.id}/${i}">${esc(a)} →</a></h3>${info?.description?`<p>${esc(info.description)}</p>`: ''}<p class="links">${link('구글 지도',mapLink(a,context))}${data.official[a]?' · '+link('공식 안내',data.official[a]):''}</p><small>${event?esc(eventDates(event)):info?.practical?esc(info.practical):'운영시간·요금은 방문 전 확인'}</small>${info?.practicalUrl?`<p class="links">${link(info.practicalLabel,info.practicalUrl)}</p>`:''}<button class="text-btn" data-action="attraction" data-id="${d.id}" data-index="${i}" aria-pressed="${saved}">${saved?'♥ 저장됨':'♡ 관광지 저장'}</button></article>`;
    }).join('')}</div></section>
    ${guideWinterEvents(d)}
    <section class="panel stack"><h2>여행 기간과 일정</h2>${personalDuration()}${winterPlanNote(d)}${templatePicker(d)}
    ${btn('내 일정 편집','open-plan',`data-id="${d.id}"`,'primary')}</section></div>`);
}
function placePage() {
  const [,id,index]=location.hash.slice(1).split('/');
  const d=byId.get(id);
  const i=Number(index);
  const data=geo.curated(id,d?.id,i);
  const title=data?.name||d?.attractions[i];
  if(!title)return geo.detail(id,d?.id,i,'','');
  const owner=data?.links?.[0]||[d?.id||'poi',d?i:Number(id)];
  const saved=state.attractions.includes(owner.join(':'));
  const picture=data?.image?byId.get(data.image):null;
  const credit=picture&&tripImages[picture.id];
  const safeImage=picture?`<div class="card-media">${photo(picture,'detail-cover')}${art(picture)}</div>
    ${!credit.ai?`<small class="links">${link(credit.artist,credit.source)} · ${credit.licenseUrl?link(credit.license,credit.licenseUrl):esc(credit.license)} · WebP 변환</small>`:''}`:'';
  const locked=cloud.locked()?' disabled':'';
  const controls=`<div class="row">${btn(saved?'♥ 저장됨':'♡ 관광지 저장','attraction',`data-id="${esc(owner[0])}" data-index="${owner[1]}" aria-pressed="${saved}"${locked}`)}</div>
    <form id="add-place-plan" class="fields" data-title="${esc(title)}">
    ${select('추가할 여행지','plan',allDestinationOptions(),data?.plan||((d?.itineraries&&d.id)||selection.planId))}
    ${select('일차','day',Array.from({length:state.budget.days},(_,i)=>[i+1,`${i+1}일차`]),1)}
    <button type="submit" class="btn primary"${locked}>여행 일정에 추가</button></form>`;
  return geo.detail(id,d?.id,i,controls,safeImage);
}
function templatePicker(d) {
  if(!d.itineraries)return '';
  return `<form class="row" data-plan-template data-id="${d.id}">${select('일정 템플릿','template',[['','선택하세요'],...templateDays.map((days,i)=>[i,durationLabel(days)])],'')}
    <button class="btn" type="submit"${cloud.locked()?' disabled':''}>템플릿 불러오기</button></form>`;
}
function project([lon,lat]) {
  return lat>=29 ? [(lon-127)*27+45,(46-lat)*29+22] : [(lon-122)*24+30,(29-lat)*14+445];
}
function mapPage() {
  const recommended=geo.recommendations(selection.mapPref);
  const d = recommended.find(guide=>guide.id===selection.mapId);
  const w = 680/selection.zoom;
  const h = 540/selection.zoom;
  const locationPoint=geo.coordinate();
  const [x,y] = selection.center;
  const polygons = data.prefectures.map(p=>`<path class="pref ${p.id===selection.mapPref?'active':''}" d="${paths[p.id]}" fill="${regionsColors[data.regions.indexOf(p.region)]}" tabindex="0" role="button" aria-label="${esc(koreanPrefectureName(p))} · ${esc(prefectureNames[String(p.id).padStart(2,'0')])} · ${esc(p.region)}" data-action="map-pref" data-index="${p.id}"></path>`).join('');
  const pins = recommended.map(d=>{
    const [cx,cy]=project(d.xy);
    return `<circle class="map-marker" cx="${cx}" cy="${cy}" r="${d.id===selection.mapId?5.5:3.5}" tabindex="0" role="button" aria-label="${esc(d.name)}" data-action="map-pin" data-id="${d.id}"><title>${esc(d.name)}</title></circle>`;
  }).join('');
  const selectedPin=locationPoint?(()=>{const [cx,cy]=project(locationPoint);return `<circle cx="${cx}" cy="${cy}" r="6" fill="#bd322d" stroke="#fff" stroke-width="2"><title>선택한 위치</title></circle>`;})():'';
  return page('MAP','일본 지도','지도의 도도부현이나 도시를 선택해 위치와 여행 경비를 확인하세요.',`<div class="two">
  <section class="panel stack"><div class="row"><button class="icon" data-action="map-zoom" data-index="1" aria-label="지도 확대">+</button><button class="icon" data-action="map-zoom" data-index="-1" aria-label="지도 축소">−</button>${btn('전체 보기','map-reset')} ${selection.zoom>1?['←','→','↑','↓'].map((a,i)=>`<button class="icon" data-action="map-pan" data-index="${i}" aria-label="지도 ${['왼쪽','오른쪽','위','아래'][i]} 이동">${a}</button>`).join(''):''}</div>
  <div class="map-shell"><svg viewBox="${x-w/2} ${y-h/2} ${w} ${h}" aria-label="일본 47개 도도부현 지도"><path d="M25 427H196V523H25Z" fill="none" stroke="#8aa5bb" stroke-dasharray="3 3"/><text x="30" y="440" fill="#617d93" font-size="9">오키나와 (삽입도)</text>${polygons}${pins}${selectedPin}</svg><div id="map-tooltip" class="map-tooltip" role="tooltip" hidden></div></div>
  <div class="tags">${data.regions.map((r,i)=>`<span style="background:${regionsColors[i]}">${r}</span>`).join('')}</div>
  <small>출처 · 일본 국토지리원 지구지도 일본, Data of Japan. 오키나와는 삽입도입니다.</small></section>
  <aside class="stack">${geo.mapPanel()}<div class="panel stack">
  <form id="marker-choice">${select('추천 도시 선택','city',[['','선택하세요'],...recommended.map(g=>[g.id,g.name])],selection.mapId)}</form>
  ${d?`<a class="card-media" href="${detailHref(d.id)}">${photo(d)}${art(d)}</a><h2>${esc(d.name)}</h2><p>${durationLabel(state.budget.days)} · ${priceCell(d)}</p><p><b>일본 도착 공항</b> ${esc(d.airport)}</p><a class="btn primary" href="${detailHref(d.id)}">상세 보기 →</a>`:''}</div>
  <div class="panel links"><h3>한국 출발 공항</h3><p>${link('청주 CJJ',sourceLinks.cjj)} · ${link('인천 ICN',sourceLinks.icn)}</p><small>도착 공항은 접근 기준입니다. 직항 및 2027년 운항 여부는 항공사에서 날짜별로 확인하세요.</small></div></aside></div>`);
}
const prefecturePath='[data-action="map-pref"]';
let mapTooltip;

function clearMapTooltip() {
  if(!mapTooltip)return;
  main.querySelector('.pref.is-pointed')?.classList.remove('is-pointed');
  const tip=main.querySelector('#map-tooltip');
  if(tip)tip.hidden=true;
  mapTooltip=null;
}

function showMapTooltip(path,x,y,mode) {
  const shell=path.closest('.map-shell');
  const tip=shell.querySelector('#map-tooltip');
  const bounds=shell.getBoundingClientRect();
  const id=Number(path.dataset.index);
  if(tip.hidden||mapTooltip?.id!==id){
    shell.querySelector('.pref.is-pointed')?.classList.remove('is-pointed');
    const pref=prefById.get(id);
    const japanese=prefectureNames[String(id).padStart(2,'0')];
    tip.innerHTML=`<strong>${esc(koreanPrefectureName(pref))}</strong> <span lang="ja">${esc(japanese)}</span><small>${esc(pref.region)}</small>`;
    path.classList.add('is-pointed');
    tip.hidden=false;
  }
  const left=x-bounds.left;
  const top=y-bounds.top;
  const gap=12, margin=4;
  const right=bounds.width-tip.offsetWidth-margin;
  const bottom=bounds.height-tip.offsetHeight-margin;
  const nextLeft=left+gap<=right?left+gap:left-tip.offsetWidth-gap;
  const nextTop=top+gap<=bottom?top+gap:top-tip.offsetHeight-gap;
  tip.style.transform=`translate(${Math.max(margin,Math.min(right,nextLeft))}px,${Math.max(margin,Math.min(bottom,nextTop))}px)`;
  mapTooltip={id,mode,x,y,relativeX:left/bounds.width,relativeY:top/bounds.height};
}

function restoreMapTooltip() {
  if(!mapTooltip)return;
  const {id,mode,x,y,relativeX,relativeY}=mapTooltip;
  if(mode==='pointer'){
    const path=document.elementFromPoint(x,y)?.closest(prefecturePath);
    if(path&&main.contains(path))showMapTooltip(path,x,y,mode);
    else clearMapTooltip();
  }else if(mode==='touch'&&id===selection.mapPref){
    const path=main.querySelector(`${prefecturePath}[data-index="${id}"]`);
    if(!path){clearMapTooltip();return;}
    const bounds=path.closest('.map-shell').getBoundingClientRect();
    showMapTooltip(path,bounds.left+relativeX*bounds.width,bounds.top+relativeY*bounds.height,mode);
  }else clearMapTooltip();
}

function trackMapPointer(event) {
  if(event.pointerType==='touch')return;
  const path=event.target.closest(prefecturePath);
  if(path)showMapTooltip(path,event.clientX,event.clientY,'pointer');
}
main.addEventListener('pointerover',trackMapPointer);
main.addEventListener('pointermove',trackMapPointer);
main.addEventListener('pointerout',event=>{
  if(event.pointerType!=='touch'&&mapTooltip?.mode==='pointer'&&
    event.target.closest(prefecturePath)!==event.relatedTarget?.closest?.(prefecturePath))clearMapTooltip();
});
main.addEventListener('pointerup',event=>{
  if(event.pointerType!=='touch')return;
  const path=event.target.closest(prefecturePath);
  if(path)showMapTooltip(path,event.clientX,event.clientY,'touch');
});
document.addEventListener?.('pointerdown',event=>{
  if(mapTooltip?.mode==='touch'&&!event.target.closest(prefecturePath))clearMapTooltip();
});
window.addEventListener('resize',restoreMapTooltip);

function comparePage() {
  const chosen = state.compare.map(id=>byId.get(id)).filter(d=>d?.itineraries);
  const fields = [
    [durationLabel(state.budget.days),d=>priceCell(d)],
    ['항공권 · 숙박비 · 식비 · 교통비',()=> '항목별 미산정 · 예산 계산기에서 입력'],
    ['주요 놀거리',d=>d.tags.slice(0,2).join(' · ')],['대표 명소',d=>d.attractions.slice(0,3).join(' · ')],
    ['쇼핑',d=>d.scores[2]+'/5'],['겨울 기온',weather],['겨울 적합성',d=>d.scores[5]+'/5'],
    ['추천 유형',d=>d.tags.join(' · ')],['여행 난이도',d=>d.scores[6]>=4?'대중교통 이용이 비교적 쉬움':'시간표와 환승 사전 확인 권장'],
    ['장점',d=>d.description],['주의점',d=>d.caution]
  ];
  return page('COMPARE','여행지 비교','최대 네 곳을 담아 비용과 여행 스타일을 비교하세요.',`<div class="stack"><form id="compare-choice" class="panel row"><div class="tools-select">${select('여행지 추가','city',[['','여행지 선택'],...destinationOptions().filter(([id])=>!state.compare.includes(id))],'')}</div><button class="btn primary">비교에 추가</button><span class="pill">${chosen.length}/4</span></form>
  ${chosen.length?`<div class="table-scroll"><table class="compare-table"><thead><tr><th scope="col">비교 항목</th>${chosen.map(d=>`<th scope="col"><a class="card-media" href="${detailHref(d.id)}">${photo(d)}${art(d)}</a><a href="${detailHref(d.id)}">${esc(d.name)}</a> <button class="text-btn" data-action="compare" data-id="${d.id}" aria-label="${esc(d.name)} 비교에서 제거">× 제거</button></th>`).join('')}</tr></thead><tbody>${fields.map(([l,f])=>`<tr><th scope="row">${l}</th>${chosen.map(d=>`<td>${esc(f(d))}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`:'<p class="panel empty">비교할 여행지를 추가해 주세요.</p>'}
  <p class="notice">예약 전 계획용 비용입니다. 항공·숙박·식사·교통·기본 관광을 포함하며 개인 쇼핑과 고가 체험은 별도로 계산하세요.</p></div>`);
}
const emptyDay = () => ({stops:[],memo:''});
const hasDay = day => Boolean(day?.stops.length||day?.memo.trim());
function legacyPlan(id, count) {
  return state.plans[id+'-'+(count===4?1:0)]||state.plans[id+'-'+(count===4?0:1)]||[];
}
function planFor(id=selection.planId,count=state.budget.days) {
  const legacy=Object.hasOwn(state.plans,id+'-custom')?[]:legacyPlan(id,count);
  return Array.from({length:count},(_,i)=>state.plans[id+'-day-'+(i+1)]?.[0]||legacy[i]||emptyDay());
}
function writePlan(days,id) {
  if(!Object.hasOwn(state.plans,id+'-custom')){
    legacyPlan(id,state.budget.days).forEach((day,i)=>{if(hasDay(day))state.plans[id+'-day-'+(i+1)]=[day];});
    state.plans[id+'-custom']=[];
  }
  days.forEach((day,i)=>{
    const key=id+'-day-'+(i+1);
    if(hasDay(day))state.plans[key]=[day];
    else delete state.plans[key];
  });
}
function setPlan(days,id=selection.planId) {
  writePlan(days,id);save();
}
function savePersonalTravel(values,persist=true) {
  if(cloud.locked())return false;
  const previous=state.budget;
  const next=travelSettings(values);
  if(!next){announce('출국일, 귀국일과 여행 일수를 확인해 주세요.');return false;}
  if(next.days!==previous.days){
    const pending=[...new Set(Object.keys(state.plans).map(key=>key.replace(/-(?:custom|day-\d+|[01])$/,'')))];
    if(next.days<previous.days&&pending.some(id=>planFor(id).slice(next.days).some(hasDay))&&
      !confirm('기간 밖 일정이 현재 일정표에서 숨겨집니다. 기간을 늘리면 다시 표시됩니다. 기간을 줄일까요?'))return false;
    for(const id of pending){
      if(Object.hasOwn(state.plans,id+'-custom'))continue;
      const old=legacyPlan(id,previous.days);
      if(old.length)writePlan(old,id);
    }
  }
  Object.assign(state.budget,next);
  if(persist)save();
  return true;
}
function dayBlocks(d, day, i, length) {
  const first = i===0, last = i===length-1;
  const split = Math.ceil(day.stops.length/2);
  const food = (d.food||'식사 장소 선택').split(',').map(name=>name.trim());
  return [
    ['오전',first?'공항 도착과 시내 이동':day.stops.slice(0,split).join(' → ')||'여유 시간'],
    ['점심',food[0]],
    ['오후',(first?day.stops:day.stops.slice(split)).join(' → ')||(last?'공항 이동':'현지 상황에 따라 오전 일정 이어서')],
    ['저녁',last?'항공편에 맞춰 식사':food[1]||food[0]],
    ['야간',last?'귀국편 시간 확보':'숙소 주변 산책 또는 휴식']
  ];
}
function planPage() {
  const d = byId.get(selection.planId)||byId.get(budgetDefaults.id);
  const days = planFor(d.id);
  const encoded = s => encodeURIComponent(s||'');
  return page('ITINERARY','여행 일정','여행 기간을 정하고 일차별 방문 순서와 메모를 편집하세요.',`<div class="stack">
  <div class="panel row noprint"><form id="plan-choice" class="tools-select">${select('여행지','city',allDestinationOptions(),d.id)}</form>${templatePicker(d)}</div>
  <div class="panel stack form-grid" data-personal-dates>${personalDuration()}${travelDates(state.budget,esc)}</div>
  ${winterPlanNote(d)}
  ${Object.keys(state.plans).some(key=>key.startsWith(d.id+'-day-')&&Number(key.slice((d.id+'-day-').length))>state.budget.days)?'<p class="notice">기간 밖 일정은 보관 중이며 기간을 늘리면 다시 표시됩니다.</p>':''}
  <p class="notice">편집 내용은 자동 저장됩니다. 첫날과 마지막 날은 항공편 시간에 맞추세요. 시간대는 이동 순서를 고려해 조정하세요. 실제 경로와 티켓 가격이 정해지면 메모에 기록할 수 있습니다.</p>
  <section class="two"><div><h2>${esc(d.name)} · ${durationLabel(state.budget.days)}</h2><div class="timeline" style="margin-top:12px">${days.map((day,i)=>`<article class="day">
    <div class="day-head"><h3>${i+1}일차 ${state.budget.departure?`<small>${dateAfter(state.budget.departure,i)}</small>`:''}</h3><span class="row noprint"><button class="icon" data-action="move-day" data-day="${i}" data-index="-1" aria-label="앞 날짜로 이동" ${i===0?'disabled':''}>↑</button><button class="icon" data-action="move-day" data-day="${i}" data-index="1" aria-label="뒤 날짜로 이동" ${i===days.length-1?'disabled':''}>↓</button></span></div>
    <dl class="day-blocks">${dayBlocks(d,day,i,days.length).map(([label,value])=>`<dt>${label}</dt><dd>${esc(value)}</dd>`).join('')}</dl>
    <ol class="stops">${day.stops.map((s,j)=>`<li><a href="${mapLink(s,d.name)}" target="_blank" rel="noopener noreferrer">${esc(s)} ↗</a><span class="row noprint">${[['↑','앞으로',-1,j===0],['↓','뒤로',1,j===day.stops.length-1],['×','삭제',0,false]].map(([ch,l,delta,disable])=>`<button class="icon" data-action="move-stop" data-day="${i}" data-stop="${j}" data-index="${delta}" aria-label="${esc(s+' '+l)}" ${disable?'disabled':''}>${ch}</button>`).join('')}</span></li>`).join('')}</ol>
    <form data-add-stop="${i}" class="noprint"><input name="stop" maxlength="160" required aria-label="${i+1}일차 장소 추가" placeholder="관광지나 식당 추가" list="plan-places"><button class="btn">추가</button></form>
    <label>메모<textarea rows="2" maxlength="2000" data-memo="${i}">${esc(day.memo)}</textarea></label>
    </article>`).join('')}</div></div>
    <aside class="panel stack"><h2>일정 공유</h2><div class="card-media">${photo(d)}${art(d)}</div>
    <p><b>숙소 기준</b><br>${esc(d.stay||'미확인')}</p><p><b>현지 이동</b><br>${esc(d.transport||'미확인')}</p><p><b>음식 후보</b><br>${esc(d.food||'미확인')}</p>
    <p class="links">${link('공항부터 숙소까지 경로 보기','https://www.google.com/maps/dir/?api=1&origin='+encoded(d.airport)+'&destination='+encoded(d.stay+' '+d.name)+'&travelmode=transit')}</p>
    <div class="actions noprint">${btn('일정 복사','copy-plan','','primary')}${btn('인쇄','print')}${btn('현재 일정 비우기','reset-plan')}</div></aside></section>
    <datalist id="plan-places">${d.attractions.map(a=>option(a,a,'')).join('')}</datalist></div>`);
}
const moneyInput=(name,label,value,attrs='')=>`<label>${label}<input name="${name}" type="number" min="${['rooms','people'].includes(name)?1:0}" step="1" inputmode="numeric" value="${Number(value)||0}" ${attrs}></label>`;
function budgetPage() {
  const b=state.budget;
  return page('BUDGET','예산 계산기','친구 인원과 실제 견적을 입력하면 숙박비를 나누고 전체 비용을 계산합니다.',`<div class="two">
  <form id="budget-form" class="panel stack">
    <h2>여행 조건</h2><div class="form-grid">${select('여행 지역','id',allDestinationOptions(),b.id)}${personalDuration()}${travelDates(b,esc)}${moneyInput('people','인원',b.people,'max="100" required')}${select('출발 공항','airport',[['CJJ','청주 CJJ'],['ICN','인천 ICN']],b.airport)}</div>
    <h2>금액 입력 (원)</h2><div class="form-grid">${Object.entries(numbers).map(([k,l])=>moneyInput(k,l,b[k],k==='rooms'?'max="100" required':'max="100000000"')).join('')}</div>
    <div class="form-grid">${moneyInput('limit','1인 목표 예산 (원)',b.limit)}<label>엔화 환산 (1엔당 원)<input name="rate" type="number" min="0" max="100" step="0.01" value="${b.rate||''}" placeholder="직접 입력"></label></div>
    <button class="btn primary">예산 저장</button>
  </form><aside class="panel results stack" id="budget-results">${budgetResult(b)}</aside></div>`);
}
function budgetResult(values) {
  const {b,roomTotal,individual,total,perPerson,roomShare}=calculate(values);
  const d=byId.get(b.id);
  const jpy = amount => b.rate ? ` · ¥${formatMoney(amount/b.rate)}` : '';
  const items=Object.entries(numbers).filter(([k])=>!['rooms','roomPrice'].includes(k)).map(([k,l])=>[l,b[k]*b.people*(['food','transitDaily'].includes(k)?b.days:1)]);
  items.splice(1,0,['숙박비 (공동)',roomTotal]);
  return `<h2>예상 비용</h2><p class="muted">1인당 총비용</p><p class="total">₩${formatMoney(perPerson)}</p>${b.rate?`<small>¥${formatMoney(perPerson/b.rate)}</small>`:''}
    <p>${b.limit ? perPerson>b.limit?`목표보다 ${formatMoney(perPerson-b.limit)}원 초과`:`목표까지 ${formatMoney(b.limit-perPerson)}원 여유`:'목표 예산을 입력하면 초과 여부를 표시합니다.'}</p>
    <dl><dt>전원 총 비용</dt><dd>₩${formatMoney(total)}${jpy(total)}</dd><dt>공동 경비 (숙박)</dt><dd>₩${formatMoney(roomTotal)}</dd><dt>1인당 숙박 부담액</dt><dd>₩${formatMoney(roomShare)}</dd><dt>1인 개인 경비</dt><dd>₩${formatMoney(individual)}</dd></dl>
    <p class="notice">${esc(d?.name||'선택한 여행지')} · ${durationLabel(b.days)} 편집 추정치 ${d?priceCell(d,b.days):'별도 산정'}. 위 계산 결과는 입력 금액을 기준으로 합니다.</p>
    <h3>항목별 비중</h3>${items.map(([label,amount])=>`<div class="rating"><span>${label.split(' (')[0]}</span><div class="bar"><i style="width:${total?(amount/total*100):0}%"></i></div><b>${total?Math.round(amount/total*100):0}%</b></div>`).join('')}`;
}
const checkGroups = [
  ['출국 전',['여권 발급','항공권 예약','숙소 예약','숙소 연령 제한 확인','여행자보험 가입','환전','해외 결제 카드 준비','유심 또는 eSIM 구매','Visit Japan Web 이용 여부 확인','관광지 입장권 예약','공항 이동 방법 확인']],
  ['챙길 물건',['여권','휴대전화','충전기','보조배터리','일본 콘센트용 변환 어댑터','겨울 외투','장갑','방한용품','상비약','세면도구','현금','카드']]
];
function prepPage() {
  return page('CHECKLIST','여행 준비물','체크한 내용은 '+cloud.storageText(),`<div class="stack"><p class="notice" id="check-progress">${checkProgress()}</p>
  <div class="two">${checkGroups.map(([name,items],i)=>`<section class="panel checklist"><h2>${name}</h2>${items.map((l,j)=>`<label><input type="checkbox" data-check="${i}-${j}" ${state.checks.includes(i+'-'+j)?'checked':''}>${l}</label>`).join('')}</section>`).join('')}</div>
  <section class="panel stack links"><h2>현지 주의사항</h2><p>일본 민법상 성년은 만 18세이며 음주 및 흡연은 만 20세부터 가능합니다. 미성년자와 고등학생의 숙박 가능 여부 및 보호자 동의서 양식은 예약 전에 숙소에 확인하세요. ${link('일본 정부 안내',sourceLinks.age)}</p>
  <p>일본 외무성은 한국을 단기 체류 사증 면제 대상에 포함합니다. 출국 전에 체류 목적과 본인의 여권 조건을 확인하세요. ${link('외무성 단기 체류 안내',sourceLinks.visa)} · ${link('Visit Japan Web',sourceLinks.visit)}</p>
  <p>폭설과 강풍에 대비해 귀국일 이동 시간을 확보하세요. 출발 전 공동 경비 담당자와 정산 방식을 정해 두세요.</p><small>공식 자료 확인일은 출처 페이지에 기록했습니다.</small></section></div>`);
}
const checkProgress=()=>`${checkGroups.flatMap(([,a],i)=>a.map((_,j)=>i+'-'+j)).filter(k=>state.checks.includes(k)).length} / 23개 완료`;
function winterPage() {
  return page('WINTER','2027 겨울 여행','평년 기온과 공식 행사 일정을 참고해 여행 날짜를 고르세요.',`<div class="stack"><section class="panel stack links"><h2>지역별 1월·2월 기온</h2>
  <div class="table-scroll"><table><thead><tr><th>대표 지역</th><th>1월 평균</th><th>2월 평균</th><th>복장과 적설</th></tr></thead>
  <tbody>${destinations.filter(d=>d.weather.length).map(d=>`<tr><th>${esc(d.name)}</th><td>${d.weather[0]}°C</td><td>${d.weather[1]}°C</td><td>${d.id==='sapporo'?'적설·결빙. 방수 신발과 장갑':d.id==='kanazawa'?'비와 눈에 대비해 방수 외투':d.id==='okinawa'?'해안 바람에 대비해 바람막이':'아침저녁에 입을 외투와 겹옷'}</td></tr>`).join('')}</tbody></table></div>
  <small>1991~2020년 대표 관측소 평년값. 산간이나 해안은 시내와 다를 수 있습니다. ${link('일본 기상청',sourceLinks.climate)}</small></section>
  <section class="panel stack links"><h2>2027년 1~2월 확정 행사</h2>
  <small>공식 발표 확인일 ${esc(winterChecked)} · 예매 전 최신 공지와 귀가편을 확인하세요.</small>
  ${winterEvents.map(eventCard).join('')}</section>
  <section class="panel stack links"><h2>개최 일정 미확정</h2>
  <p>2027년 공식 날짜가 발표되면 방문일과 교통편을 확인하세요.</p>${pendingWinterEvents.map(eventCard).join('')}</section>
  <section class="panel stack"><h2>겨울철 운영·출입 제한</h2>${winterRestrictionList(()=>true)}</section>
  <section class="panel stack links"><h2>겨울 여행 날짜와 이동</h2>
  <p>일본 신년 전후에는 시설 휴무와 대중교통 시간표를 확인하세요. 한국 설 연휴는 2월 6~9일이며 설날은 2월 7일입니다. ${link('우주항공청 2027년 월력요항',sourceLinks.calendar)}</p>
  <p>야외 관광은 해 지기 전에 둘러보고 장거리 이동은 오전에 출발하세요. 출발일 일몰과 공식 교통편을 확인하세요. ${link('일본 국립천문대 일몰 시각',daylightSource)}</p>
  <p>오키나와 고래 관찰은 겨울에도 운영사와 해상 상황에 따라 출항 여부가 달라집니다. ${link('오키나와 공식 관광 안내',sourceLinks.whales)}</p></section></div>`);
}
function savedPage() {
  const chosen = state.saved.map(id=>byId.get(id)).filter(Boolean);
  const ownPlaces=state.attractions.filter(key=>key.startsWith('poi:')).map(key=>key.split(':')[1]);
  if(ownPlaces.length)geo.loadPlaces();
  const extra=ownPlaces.map(id=>[id,geo.curated(id)]).filter(([,p])=>p);
  const places=state.attractions.map(k=>{const [id,i]=k.split(':');return [byId.get(id),Number(i)];}).filter(([d,i])=>d?.attractions[i]);
  const storedPlans=Object.keys(state.plans).flatMap(key=>{
    const match=key.match(/^(.+)-(custom|[01])$/);
    return match&&byId.has(match[1])?[[byId.get(match[1]),match[2]]]:[];
  });
  return page('SHORTLIST','나의 여행 후보','찜, 메모, 예산과 일정은 '+cloud.storageText()+' 텍스트나 JSON 파일로 친구에게 공유할 수 있습니다.',`<div class="stack"><div class="panel stack">
  <div class="actions">${btn('후보·투표 문구 복사','copy-saved','','primary')}${btn('JSON 내보내기','export')}${btn('JSON 불러오기','import')}<input id="file-import" type="file" accept=".json,application/json" hidden><a class="btn" href="#compare">비교 보기 →</a></div><small>투표 문구는 친구들이 각자 번호를 답장할 수 있도록 생성합니다.</small></div>
  ${chosen.length?`<div class="attraction-grid">${chosen.map(d=>`<article class="attraction stack"><h2><a href="${detailHref(d.id)}">${esc(d.name)} →</a></h2><label>개인 메모<textarea data-note="${d.id}" rows="3" maxlength="2000">${esc(state.notes[d.id]||'')}</textarea></label><div class="row">${d.itineraries?compareButton(d):''}${btn('찜 해제','save',`data-id="${d.id}"`)}</div></article>`).join('')}</div>`:'<p class="panel empty">여행지의 하트 버튼을 눌러 후보를 추가하세요.</p>'}
  <section class="panel stack"><h2>저장한 관광지</h2>${extra.map(([id,p])=>`<div class="row links"><a href="#place/${esc(id)}">${esc(p.name)}</a>${btn('삭제','attraction',`data-id="poi" data-index="${esc(id)}"`)}</div>`).join('')}${places.length?places.map(([d,i])=>`<div class="row links">${link(d.attractions[i],mapLink(d.attractions[i],prefById.get(d.pref).name))}<small>${esc(d.name)}</small>${btn('삭제','attraction',`data-id="${d.id}" data-index="${i}"`)}</div>`).join(''):ownPlaces.length?'':'<p class="muted">저장한 관광지가 없습니다.</p>'}</section>
  <section class="panel stack"><h2>저장한 일정과 예산</h2>
  ${storedPlans.map(([d,i])=>btn(esc(d.name)+(i==='custom'?'':' · 이전 '+durationLabel(Number(i)+3)),'open-plan',`data-id="${d.id}" data-legacy="${i}"`)).join(' ')}
  <p>저장된 예산 · 1인 ₩${formatMoney(calculate(state.budget).perPerson)} <a class="text-btn" href="#budget">편집 →</a></p></section></div>`);
}
function sourcesPage() {
  return page('SOURCES','정보 및 이미지 출처','2026년 11월 25일 기준 자료와 제작 시각 자료를 구분해 기록했습니다.',`<div class="panel stack links"><h2>여행 자료</h2>
  <p>${link('삿포로 눈축제 공식 공지',sourceLinks.snow)} · ${link('일본 기상청 1991~2020 평년값',sourceLinks.climate)} · ${link('우주항공청 2027년 월력요항',sourceLinks.calendar)}</p>
  <p>${link('일본 정부 연령 안내',sourceLinks.age)} · ${link('일본 외무성 사증 면제 안내',sourceLinks.visa)} · ${link('Visit Japan Web',sourceLinks.visit)} · ${link('일본정부관광국',sourceLinks.japan)}</p>
  <p>여행 순위와 비용 범위는 제공된 명세서의 계획용 편집값입니다. 항공 운항, 운영시간 및 가격은 이용 날짜에 공식 판매처에서 확인하세요. 상세 페이지에서 제공하는 개별 업체 링크 중 일부는 응답 상태가 미검증입니다.</p>
  <h2>지도</h2><p>출처 · 일본 국토지리원 지구지도 일본. Data of Japan이 변환한 자료를 사용해 웹 표시용으로 간략화했습니다. ${link('Data of Japan / land','https://github.com/dataofjapan/land')}</p>
  ${location.hostname?.endsWith('.chatgpt.site')?'<h2>프로젝트 파일</h2><p><a href="japan-graduation-trip-2027.zip" download>소스코드 및 정적 사이트 ZIP 다운로드</a></p>':''}<h2>이미지</h2><p>여행지 이미지는 각 상세 페이지에 유형과 출처를 표시합니다. AI 삽화 표시는 OpenAI ImageGen으로 제작한 시각 자료를 뜻합니다. Wikimedia Commons 사진은 상세 페이지에서 저작자와 라이선스를 확인할 수 있습니다. 모든 이미지는 프로젝트에 WebP로 저장했습니다.</p></div>`);
}
function save() {
  if(cloud.savePersonal(state)){count();return;}
  try {localStorage.setItem(key,JSON.stringify(state));storageAvailable=true;}
  catch {storageAvailable=false;announce('이 브라우저에 저장할 수 없습니다. JSON 내보내기로 보관하세요.');}
  count();
}
function announce(message) {
  status.textContent=message;
  clearTimeout(toastTimer);
  toastTimer=setTimeout(()=>{status.textContent='';},3500);
}
function count() { document.querySelector('#saved-count').textContent=state.saved.filter(id=>!byId||byId.has(id)).length; }
function render() {
  if (!data) return;
  const [route='',arg]=location.hash.slice(1).split('/');
  const active=route||'home';
  const views={home,explore,map:mapPage,trip:()=>detail(byId.get(arg)),place:placePage,compare:comparePage,plan:planPage,budget:budgetPage,prep:prepPage,winter:winterPage,saved:savedPage,sources:sourcesPage};
  main.innerHTML=cloud.hasRoute(active)?cloud.cloudPage(active,arg||''):(Object.hasOwn(views,active)?views[active]:home)();
  restoreMapTooltip();
  if(cloud.locked()&&!cloud.hasRoute(active)) {
    for(const element of main.querySelectorAll('[data-action="save"],[data-action="attraction"],[data-action="compare"],[data-action="reset-plan"],[data-action="move-day"],[data-action="move-stop"],[data-action="import"],[data-note],[data-memo],[data-check],[data-add-stop] input,[data-add-stop] button,#compare-choice button,#budget-form button')){
      element.disabled=true;
    }
  }
  for(const a of document.querySelectorAll('nav a,.saved-link')){
    const current=a.hash==='#'+(['trip','place'].includes(active)?'explore':active);
    a.classList.toggle('active',current);
    if(current) a.setAttribute('aria-current','page'); else a.removeAttribute('aria-current');
  }
  count();
}
function go(route) {
  if(location.hash==='#'+route) render(); else location.hash=route;
}
function routeChanged() {
  const [route,arg]=location.hash.slice(1).split('/');
  cloud.routeChanged(route,arg);
  if(route==='map'){setMapPref(prefById.has(Number(arg))?Number(arg):0);selection.mapId=selection.pendingMapId||'';selection.pendingMapId='';}
  navigation.classList.remove('open');menu.setAttribute('aria-expanded','false');
  render();
  window.scrollTo(0,0);
  main.focus({preventScroll:true});
}
function toggleList(list,value) {
  const i=list.indexOf(value);
  if(i<0){list.push(value);return true;}
  list.splice(i,1);return false;
}
function toggleCompare(id) {
  if(!byId.get(id)?.itineraries) {announce('비교할 여행지를 선택하세요.');return;}
  if(state.compare.length>=4&&!state.compare.includes(id)){announce('최대 네 곳까지 비교할 수 있습니다.');return;}
  const added=toggleList(state.compare,id);
  save();render();
  if(storageAvailable) announce(added?'비교에 담았습니다.':'비교에서 제거했습니다.');
}
function setMapPref(pref) {
  selection.mapPref=pref;
  selection.mapId=''; selection.zoom=1;selection.center=[340,270];
}
async function copy(text) {
  try {await navigator.clipboard.writeText(text);announce('텍스트를 복사했습니다.');}
  catch {
    dialogBody.innerHTML='<label>복사할 텍스트<textarea readonly></textarea></label>';
    const area=dialogBody.querySelector('textarea');
    area.value=text;dialog.showModal();area.select();
  }
}
function itineraryText() {
  const d=byId.get(selection.planId);
  return [`일본 졸업여행 · ${d.name} · ${durationLabel(state.budget.days)}`,...planFor().map((day,i)=>`${i+1}일차: ${day.stops.join(' → ')}${day.memo?'\n메모: '+day.memo:''}`)].join('\n');
}
const cloud=setupCloudUI({
  main,page,esc,render,refresh:()=>{if(data)render();},go,notify:announce,copy,getState:()=>state,guestState,
  sessionChanged:next=>{state=next;if(byId&&!byId.has(state.budget.id))state.budget.id=budgetDefaults.id;selection.planId=state.budget.id;count();},
  catalogue:()=>[...(destinations||[]),...(data?.cities||[])]
});

menu.addEventListener('click',()=>{
  const open=navigation.classList.toggle('open');
  menu.setAttribute('aria-expanded',String(open));menu.setAttribute('aria-label',open?'메뉴 닫기':'메뉴 열기');
});
document.querySelector('#close-dialog').addEventListener('click',()=>dialog.close());
function fallbackImage(e){
  if(e.target instanceof HTMLImageElement&&e.target.hasAttribute('data-fallback')){
    e.target.removeAttribute('data-fallback');
    e.target.src='images/fallback.svg';
    e.target.alt='이미지를 불러오지 못했습니다.';
  }
}
main.addEventListener('error',fallbackImage,true);
dialog.addEventListener('error',fallbackImage,true);
main.addEventListener('click',event=>{
  if(cloud.onClick(event))return;
  const el=event.target.closest('[data-action]');
  if(!el) return;
  const {action,id}=el.dataset;
  if(cloud.locked()&&['save','attraction','compare','open-plan','open-budget','move-day','move-stop','reset-plan','import','export'].includes(action)){announce('계정 데이터를 불러온 뒤 다시 시도해 주세요.');return;}
  const i=Number(el.dataset.index), j=Number(el.dataset.day);
  switch(action){
    case 'save': if(byId.has(id)){toggleList(state.saved,id);save();render();} break;
    case 'attraction': if(byId.get(id)?.attractions[i] || id==='poi'&&geo.curated(String(i))){toggleList(state.attractions,id+':'+i);save();render();} break;
    case 'compare': toggleCompare(id);break;
    case 'open-plan': if(byId.has(id)){
      const legacy=el.dataset.legacy;
      if(legacy==='0'||legacy==='1'){
        if(!confirm('이전 일정을 현재 편집 일정으로 불러올까요?'))break;
        const days=Number(legacy)+3;
        if(!savePersonalTravel({...state.budget,days},false))break;
        setPlan(state.plans[id+'-'+legacy],id);
      }
      selection.planId=id;state.budget.id=id;save();go('plan');
    } break;
    case 'open-budget': selection.planId=state.budget.id=id;save();go('budget');break;
    case 'zoom-photo': dialogBody.innerHTML=photo(byId.get(id))+(tripImages[id].ai?'<p class="muted">AI 삽화</p>':'');dialog.showModal();break;
    case 'map-pin': {const pref=byId.get(id).pref;if(pref!==selection.mapPref){selection.pendingMapId=id;go('map/'+pref);}else{selection.mapId=id;render();}break;}
    case 'map-pref': go('map/'+i);break;
    case 'map-reset': selection.zoom=1;selection.center=[340,270];render();break;
    case 'map-zoom': {
      if(i>0&&selection.zoom===1){const point=geo.coordinate()||byId.get(selection.mapId)?.xy;if(point)selection.center=project(point);}
      selection.zoom=Math.max(1,Math.min(4,selection.zoom*(i>0?1.35:1/1.35)));
      if(selection.zoom===1) selection.center=[340,270];
      render();break;
    }
    case 'map-pan': {
      const [x,y]=selection.center;
      const step=85/selection.zoom;
      selection.center=[Math.max(0,Math.min(680,x+(i===0?-step:i===1?step:0))),Math.max(0,Math.min(540,y+(i===2?-step:i===3?step:0)))];
      render();break;
    }
    case 'move-day': {const days=planFor();if(move(days,j,i)){setPlan(days);render();}break;}
    case 'move-stop': {
      const days=planFor(),k=Number(el.dataset.stop);
      if(i===0) days[j].stops.splice(k,1); else move(days[j].stops,k,i);
      setPlan(days);render();break;
    }
    case 'reset-plan':
      if(confirm('이 코스에서 편집한 일정과 메모를 초기화할까요?')){
        setPlan(planFor().map(emptyDay));render();
      }break;
    case 'copy-plan': copy(itineraryText());break;
    case 'print': window.print();break;
    case 'copy-saved': {
      const rows=state.saved.map(id=>byId.get(id)).filter(Boolean);
      if(!rows.length){announce('공유할 여행지를 찜해 주세요.');break;}
      copy(['2027 일본 졸업여행 후보 투표','가고 싶은 여행지 번호를 답장해 주세요.',...rows.map((d,n)=>`${n+1}. ${d.name}${d.price?' · '+durationLabel(state.budget.days)+' '+priceCell(d):''}`)].join('\n'));
      break;
    }
    case 'export': {
      const href=URL.createObjectURL(new Blob([JSON.stringify(state,null,2)],{type:'application/json'}));
      const a=document.createElement('a');a.href=href;a.download='japan-trip-2027.json';a.click();
      setTimeout(()=>URL.revokeObjectURL(href),1000);break;
    }
    case 'import': main.querySelector('#file-import').click();break;
  }
});
main.addEventListener('keydown',e=>{
  if(e.target.matches('[data-action="map-pin"],[data-action="map-pref"]')&&['Enter',' '].includes(e.key)){
    e.preventDefault();e.target.dispatchEvent(new MouseEvent('click',{bubbles:true}));
  }
});
main.addEventListener('submit',e=>{
  if(cloud.onSubmit(e))return;
  const form=e.target;
  e.preventDefault();
  if(cloud.locked()&&(['compare-choice','budget-form'].includes(form.id)||form.hasAttribute('data-add-stop')))return;
  const values=Object.fromEntries(new FormData(form));
  if(form.hasAttribute('data-plan-template')){
    if(cloud.locked()||values.template==='')return;
    const trip=byId.get(form.dataset.id), template=trip?.itineraries?.[Number(values.template)];
    if(!template)return;
    if(planFor(trip.id).some(hasDay)&&!confirm('현재 표시된 일정이 템플릿으로 바뀝니다. 불러올까요?'))return;
    if(!savePersonalTravel({...state.budget,days:template.length},false))return;
    selection.planId=state.budget.id=trip.id;
    setPlan(template.map(line=>({stops:line.split('→').map(stop=>stop.trim()),memo:''})),trip.id);
    go('plan');return;
  }
  if(form.id==='add-place-plan'){
    if(cloud.locked())return;
    const {title}=form.dataset;
    const trip=byId.get(values.plan);
    if(!trip||!title)return;
    const days=planFor(trip.id);
    const day=days[Number(values.day)-1];
    if(!day){announce('선택한 여행 기간의 일차를 확인하세요.');return;}
    if(day.stops.includes(title)){announce('이미 같은 일정에 담겨 있습니다.');return;}
    if(day.stops.length>=30){announce('하루에 최대 30곳을 추가할 수 있습니다.');return;}
    day.stops.push(title);selection.planId=state.budget.id=trip.id;setPlan(days);go('plan');announce('관광지를 일정에 추가했습니다.');return;
  }
  if(form.id==='quick'){if(!savePersonalTravel({...state.budget,days:values.days}))return;filters={q:'',region:'',pref:'',custom:'',sort:'rank',budget:values.budget,type:values.type};go('explore');}
  if(form.id==='compare-choice') toggleCompare(values.city);
  if(form.id==='budget-form'){
    if(!savePersonalTravel(values,false))return;
    state.budget=calculate({...values,days:state.budget.days,departure:state.budget.departure}).b;
    selection.planId=state.budget.id;save();
    if(storageAvailable) announce('예산을 저장했습니다.');
  }
  if(form.hasAttribute('data-add-stop')){
    const days=planFor(), stops=days[Number(form.dataset.addStop)].stops, stop=values.stop.trim();
    if(!stop)return;
    if(stops.length>=30){announce('하루에 최대 30곳을 추가할 수 있습니다.');return;}
    stops.push(stop);setPlan(days);render();
  }
});
main.addEventListener('input',e=>{
  geo.input(e);
  const el=e.target,form=el.form;
  if(form?.id==='filters'&&['q','custom'].includes(el.name)){
    filters[el.name]=el.value;
    main.querySelector('#explore-results').innerHTML=exploreResults();
  }
  if(form?.id==='budget-form') main.querySelector('#budget-results').innerHTML=budgetResult(Object.fromEntries(new FormData(form)));
  if(!cloud.locked()&&el.hasAttribute('data-memo')){const days=planFor();days[Number(el.dataset.memo)].memo=el.value;setPlan(days);}
  if(!cloud.locked()&&el.hasAttribute('data-note')){state.notes[el.dataset.note]=el.value;save();}
});
function changePersonalTravel(container,field,value) {
  const form=container.closest('#budget-form');
  const dates=form||container.closest('[data-personal-dates]');
  const values={...state.budget,[field]:value};
  if(field==='returnDate'&&dates)values.departure=dates.querySelector('[name=departure]').value;
  const changed=savePersonalTravel(values);
  if(form){
    form.querySelector('[name=days]').value=state.budget.days;
    form.querySelector('[name=departure]').value=state.budget.departure;
    form.querySelector('[name=returnDate]').value=dateAfter(state.budget.departure,state.budget.days-1);
    form.querySelector('output').textContent=durationLabel(state.budget.days);
    form.querySelector('[data-duration-step="-1"]').disabled=state.budget.days<=1;
    form.querySelector('[data-duration-step="1"]').disabled=state.budget.days>=maxTripDays;
    main.querySelector('#budget-results').innerHTML=budgetResult(Object.fromEntries(new FormData(form)));
  }else if(changed||container.matches('input'))render();
}
main.addEventListener('click',e=>{
  const step=e.target.closest('[data-personal-duration] [data-duration-step]');
  if(step)changePersonalTravel(step,'days',state.budget.days+Number(step.dataset.durationStep));
});
main.addEventListener('change',async e=>{
  if(geo.change(e))return;
  const el=e.target,form=el.form;
  if(el.matches('[data-personal-duration] [name=days], [data-personal-dates] input[type=date], #budget-form input[type=date]')){
    changePersonalTravel(el,el.name,el.value);return;
  }
  if(form?.id==='filters'&&el.name==='types'){
    filters.type='';filters.types=[...form.querySelectorAll('input[name="types"]:checked')].map(input=>input.value);
    main.querySelector('#explore-results').innerHTML=exploreResults();
  }
  if(form?.id==='filters'&&el.tagName==='SELECT'){
    const name=el.name;
    filters[name]=el.value;
    if(name==='region') filters.pref='';
    render();
    main.querySelector(`#filters select[name="${name}"]`).focus();
  }
  if(form?.id==='plan-choice'&&!cloud.locked()){selection.planId=state.budget.id=el.value;save();render();}
  if(form?.id==='marker-choice'){const pref=byId.get(el.value)?.pref;if(pref&&pref!==selection.mapPref){selection.pendingMapId=el.value;go('map/'+pref);}else{selection.mapId=el.value;render();}}
  if(!cloud.locked()&&el.hasAttribute('data-check')){
    toggleList(state.checks,el.dataset.check);save();
    main.querySelector('#check-progress').textContent=checkProgress();
  }
  if(!cloud.locked()&&el.id==='file-import'&&el.files[0]){
    try {
      const identity=cloud.identity();
      const imported=parseImport(await el.files[0].text());
      if(cloud.identity()!==identity||cloud.locked())return;
      if(!byId.has(imported.budget.id)) imported.budget.id=budgetDefaults.id;
      if(confirm('현재 저장한 여행 데이터를 가져온 파일로 교체할까요?')){
        state=imported;selection.planId=state.budget.id;save();render();if(storageAvailable) announce('여행 데이터를 불러왔습니다.');
      }
    } catch {announce('여행 데이터 JSON 파일을 확인해 주세요.');}
    el.value='';
  }
});
async function getJSON(name) {
  const response=await fetch(name,{signal:AbortSignal.timeout(10000)});
  if(!response.ok) throw new Error(name);
  return response.json();
}
async function start() {
  main.innerHTML='<p class="wrap loading" role="status">여행 데이터를 불러오는 중입니다.</p>';
  try {
    [data,paths,prefectureNames]=await Promise.all([
      getJSON('data/trips.json'),getJSON('maps/prefectures.json'),getJSON('data/areas/prefectures.json')
    ]);
    destinations=data.destinations;
    byId=new Map([...destinations,...data.cities].map(d=>[d.id,d]));
    prefById=new Map(data.prefectures.map(p=>[p.id,p]));
    if(!byId.has(selection.planId))selection.planId=state.budget.id=budgetDefaults.id;
  }catch{
    main.innerHTML='<section class="wrap loading stack"><p role="alert">여행 데이터를 불러오지 못했습니다. 연결을 확인해 주세요.</p><button type="button" class="btn" data-retry-start>다시 불러오기</button></section>';
    return;
  }
  window.addEventListener('hashchange',routeChanged);
  routeChanged();
  void cloud.init();
  if(!storageAvailable) announce('브라우저 저장 데이터를 불러올 수 없습니다.');
}
main.addEventListener('click',event=>{
  if(event.target.closest('[data-retry-start]'))void start();
});
await start();
