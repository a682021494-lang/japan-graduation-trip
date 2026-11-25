import { calculate, parseImport, freshState, move, matches, formatMoney, numbers, budgetDefaults } from './logic.js';

const main = document.querySelector('#main');
const dialog = document.querySelector('#dialog');
const dialogBody = document.querySelector('#dialog-body');
const status = document.querySelector('#status');
const navigation = document.querySelector('nav');
const menu = document.querySelector('#menu');
const key = 'japan-trip-2027-v1';
let state = freshState();
let storageAvailable = true;
try {
  const saved = localStorage.getItem(key);
  if (saved) state = parseImport(saved);
} catch { storageAvailable = false; }

const types = ['놀이공원','액티비티','애니메이션·게임','쇼핑','맛집','겨울 설경','온천','자연','바다','일본 전통문화','야경','가성비','소도시 여행'];
const labels = ['놀거리','먹거리','쇼핑','가성비','사진 명소','겨울 여행','대중교통','친구 여행'];
const months = ['2박 3일','3박 4일'];
const assets = new Set(['osaka','tokyo','sapporo','fukuoka','okinawa','fuji']);
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
let data, paths, destinations, byId, prefById;
let filters = { q:'', region:'', pref:'', days:'', budget:'', custom:'', type:'', sort:'rank' };
let selection = { detailDays:0, planId:'osaka', planDays:0, mapPref:0, mapId:'osaka', zoom:1, center:[340,270] };
let toastTimer;
const esc = (value = '') => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const option = (value, label, current) => `<option value="${esc(value)}"${String(value)===String(current)?' selected':''}>${esc(label)}</option>`;
const btn = (label, action, attrs = '', style = '') => `<button type="button" class="btn ${style}" data-action="${action}" ${attrs}>${label}</button>`;
const link = (label, url) => `<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(label)} ↗</a>`;
const mapLink = (name, context = '') => 'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent([name,context,'일본'].filter(Boolean).join(' '));
const detailHref = id => '#trip/'+id;
const moneyRange = range => range ? `${range[0]/10000}~${range[1]/10000}만 원` : '별도 산정';
const priceCell = (d, i) => moneyRange(d.price[i]);
const weather = d => d.weather.length ? `1월 ${d.weather[0]}°C · 2월 ${d.weather[1]}°C` : '해당 지역 평년값 미수록';
const tags = (items) => `<div class="tags">${items.map(t=>`<span>${esc(t)}</span>`).join('')}</div>`;
const page = (code, title, intro, content) => `<div class="wrap page"><header class="page-title"><div class="eyebrow">${code}</div><h1>${title}</h1><p>${intro}</p></header>${content}</div>`;
const select = (label, name, items, current) => `<label>${label}<select name="${name}">${items.map(([v,l])=>option(v,l,current)).join('')}</select></label>`;
const durationOptions = [['','전체 기간'],['0','2박 3일'],['1','3박 4일']];
const budgetOptions = [['','모든 예산'],['0-400000','40만 원 이하'],['400000-600000','40~60만 원'],['600000-800000','60~80만 원'],['800000-1000000','80~100만 원'],['1000000-','100만 원 이상'],['custom','직접 입력']];
const typeOptions = [['','모든 유형'],...types.map(t=>[t,t])];
const destinationOptions = () => destinations.map(d=>[d.id,d.name]);
const photo = (d, cls = '') => assets.has(d.id)
  ? `<img class="${cls}" src="images/${d.id}.webp" alt="${esc(d.name)}의 AI 생성 여행 삽화" loading="lazy" width="500" height="330" data-fallback>`
  : `<div class="card-visual ${cls}" aria-label="${esc(d.region)}">${esc(d.region)}</div>`;
const art = d => assets.has(d.id) ? '<span class="art-label">AI 삽화</span>' : '';
const savedButton = d => `<button type="button" class="icon heart ${state.saved.includes(d.id)?'on':''}" data-action="save" data-id="${d.id}" aria-pressed="${state.saved.includes(d.id)}" aria-label="${esc(d.name)} 찜하기">${state.saved.includes(d.id)?'♥':'♡'}</button>`;
const compareButton = d => btn(state.compare.includes(d.id)?'비교에서 제거':'＋ 비교 담기','compare',`data-id="${d.id}" aria-pressed="${state.compare.includes(d.id)}"`);
function card(d) {
  const i = filters.days === '1' ? 1 : 0;
  return `<article class="card"><div class="card-media"><a href="${detailHref(d.id)}" aria-label="${esc(d.name)} 상세 보기">${photo(d)}${art(d)}${d.rank?`<span class="rank">추천 ${String(d.rank).padStart(2,'0')}</span>`:''}</a>${savedButton(d)}</div><div class="card-info"><div class="eyebrow">${esc(d.region)}</div><h3><a href="${detailHref(d.id)}">${esc(d.name)}</a></h3><p>${esc(d.description)}</p>${tags(d.tags.slice(0,3))}<div class="card-foot"><div><small>${months[i]} · 1인 예상</small><b>${priceCell(d,i)}</b></div><button class="text-btn" data-action="compare" data-id="${d.id}" aria-pressed="${state.compare.includes(d.id)}">${state.compare.includes(d.id)?'✓ 비교 담김':'＋ 비교 담기'}</button></div></div></article>`;
}
function home() {
  return `<section class="hero"><div class="wrap"><div class="eyebrow">2027 WINTER TRAVEL</div><h1>우리의 첫 졸업여행,<br><em>일본</em></h1><p>2027년 겨울, 친구들과 함께 떠나는 특별한 여행.</p><div class="facts"><span>▣ 2027년 1–2월</span><span>◷ 2박 3일 · 3박 4일</span><span>✈ 청주 우선 · 인천 대안</span></div></div><a class="image-credit" href="#sources">후지산 · AI 생성 삽화</a></section>
  <form class="wrap quick" id="quick">${select('여행 기간','days',durationOptions,'')}${select('1인당 예산','budget',budgetOptions.filter(([v])=>v!=='custom'),'')}${select('여행 유형','type',typeOptions,'')}<button class="btn primary">여행지 찾기 →</button></form>
  <section class="wrap section"><div class="section-top"><div><div class="eyebrow">DESTINATIONS</div><h2>추천 여행지</h2><p>친구들과 떠나기 좋은 겨울 여행지예요. 순위는 편집 추천이며 가격은 계획용 추정치입니다.</p></div><a href="#explore" class="btn">전체 여행지 보기 →</a></div><div class="card-grid">${destinations.slice(0,6).map(card).join('')}</div></section>
  <section class="wrap split-call"><div><h2>1월과 2월, 어디가 좋을까?</h2><p>삿포로 눈축제와 연휴, 지역별 겨울 기온을 확인하고 날짜를 골라 보세요.</p></div><a class="btn primary" href="#winter">겨울 여행 정보 →</a></section>`;
}
function explore() {
  const prefs = data.prefectures.filter(p=>!filters.region||p.region===filters.region);
  return page('EXPLORE','전국 여행지','8개 권역의 추천 코스와 도시를 둘러보세요.',`<div class="stack">
    <form class="panel fields" id="filters">
    <label>여행지·관광지 검색<input name="q" type="search" value="${esc(filters.q)}" placeholder="예: 도쿄, 온천, 도톤보리"></label>
    ${select('권역','region',[['','전체 권역'],...data.regions.map(r=>[r,r])],filters.region)}
    ${select('도도부현','pref',[['','전체 도도부현'],...prefs.map(p=>[p.id,p.name])],filters.pref)}
    ${select('기간','days',durationOptions,filters.days)}
    ${select('1인당 예산','budget',budgetOptions,filters.budget)}
    <label id="custom-budget" ${filters.budget==='custom'?'':'hidden'}>예산 상한 (원)<input name="custom" type="number" min="0" step="10000" value="${esc(filters.custom)}"></label>
    ${select('여행 유형','type',typeOptions,filters.type)}
    ${select('정렬','sort',[['rank','종합 추천순'],['price','예상 비용 낮은 순'],['0','놀거리 많은 순'],['5','겨울 여행 적합순'],['4','사진 명소 추천순'],['6','이동 편의성순']],filters.sort)}
    </form><p class="notice">예산 범위와 겹치는 추천 코스를 표시합니다. 비용이 미산정된 코스와 기본 도시 정보는 예산 필터에서 제외합니다.</p>
    <div id="explore-results">${exploreResults()}</div></div>`);
}
function exploreResults() {
  const rows = destinations.filter(d=>matches(d,filters));
  if (filters.sort==='price') rows.sort((a,b)=>(a.price[+filters.days||0]?.[0]??Infinity)-(b.price[+filters.days||0]?.[0]??Infinity));
  else if(filters.sort!=='rank') rows.sort((a,b)=>b.scores[filters.sort]-a.scores[filters.sort]);
  const cities = (filters.budget||filters.type||filters.days) ? [] : data.cities.filter(d=>matches(d,filters));
  return `<div class="stack"><h2>추천 코스 <small>${rows.length}곳</small></h2><div class="${rows.length?'card-grid':'panel empty'}">${rows.length?rows.map(card).join(''):'조건에 맞는 추천 코스가 없습니다.'}</div>
    ${cities.length?`<h2>도시와 지역 <small>${cities.length}곳</small></h2><div class="city-grid">${cities.map(c=>`<a href="${detailHref(c.id)}"><b>${esc(c.name)}</b><small>${esc(c.region)} · ${esc(c.attractions.join(', '))}</small></a>`).join('')}</div>`:''}</div>`;
}
function detail(d) {
  if (!d) return page('DESTINATION','여행지를 찾을 수 없습니다','다른 여행지를 찾아보세요.','<a class="btn" href="#explore">전국 여행지</a>');
  const full = Boolean(d.itineraries);
  const context = prefById.get(d.pref).name;
  return page(esc(d.region),esc(d.name),esc(d.description||`${context}에서 둘러볼 여행지`),`<div class="stack">
    ${assets.has(d.id)?`<button class="cover-button" type="button" data-action="zoom-photo" data-id="${d.id}" aria-label="삽화 확대">${photo(d,'detail-cover')}</button><small>AI 생성 삽화 · 눌러서 확대</small>`:''}
    <div class="actions">${btn(state.saved.includes(d.id)?'♥ 찜한 여행지':'♡ 여행지 찜하기','save',`data-id="${d.id}" aria-pressed="${state.saved.includes(d.id)}"`)}
    ${full?compareButton(d)+btn('일정 편집','open-plan',`data-id="${d.id}"`,'primary')+btn('예산 계산','open-budget',`data-id="${d.id}"`):''}
    <a class="btn" href="#map/${d.pref}">지도에서 보기</a></div>
    ${full?`<div class="two"><section class="panel stack"><h2>여행 정보</h2>${tags(d.tags)}
    <p><b>추천 기간 및 1인 비용</b><br>2박 3일 ${priceCell(d,0)} · 3박 4일 ${priceCell(d,1)}</p>
    <p class="links"><b>겨울 기온</b><br>${weather(d)} ${d.weather.length?link('일본 기상청 평년값',sourceLinks.climate):''}</p>
    <p><b>추천 음식</b><br>${esc(d.food)}</p><p><b>추천 숙소</b><br>${esc(d.stay)}</p>
    <p><b>공항에서 시내</b><br>${esc(d.airport)} · ${esc(d.access)}</p><p><b>현지 이동</b><br>${esc(d.transport)}</p>
    <p><b>여행 장점과 주의점</b><br>${esc(d.description)}<br>${esc(d.caution)}</p></section>
    <section class="panel"><h2>졸업여행 적합도</h2><p class="muted">편집 평가 · 1점은 선택지가 적거나 이동에 제약이 많음, 5점은 선택지가 풍부하거나 이용이 쉬움.</p>
    ${labels.map((s,i)=>`<div class="rating"><span>${s}</span><div class="bar"><i style="width:${d.scores[i]*20}%"></i></div><b>${d.scores[i]}/5</b></div>`).join('')}</section></div>`:''}
    <section class="panel stack"><h2>관광 명소</h2><div class="attraction-grid">${d.attractions.map((a,i)=>{
      const saved = state.attractions.includes(d.id+':'+i);
      const info = data.attractionInfo[a];
      return `<article class="attraction stack"><h3>${esc(a)}</h3>${info?.description?`<p>${esc(info.description)}</p>`: ''}<p class="links">${link('구글 지도',mapLink(a,context))}${data.official[a]?' · '+link('공식 안내',data.official[a]):''}</p><small>${info?.practical?esc(info.practical):'운영시간·요금은 방문 전 확인'}</small>${info?.practicalUrl?`<p class="links">${link(info.practicalLabel,info.practicalUrl)}</p>`:''}<button class="text-btn" data-action="attraction" data-id="${d.id}" data-index="${i}" aria-pressed="${saved}">${saved?'♥ 저장됨':'♡ 관광지 저장'}</button></article>`;
    }).join('')}</div></section>
    ${full?`<section class="panel stack"><h2>추천 일정</h2>${tabs('detail-days',selection.detailDays)}<div class="timeline">${d.itineraries[selection.detailDays].map((s,i)=>`<div class="day"><b>${i+1}일차</b><p>${esc(s)}</p></div>`).join('')}</div><small>첫날과 마지막 날은 항공편 시간에 맞춰 조정하세요.</small></section>`:''}</div>`);
}
function tabs(action, active) {
  return `<div class="tabs noprint">${months.map((s,i)=>btn(s,action,`data-index="${i}" aria-pressed="${i===active}"`,i===active?'active':'')).join('')}</div>`;
}
function project([lon,lat]) {
  return lat>=29 ? [(lon-127)*27+45,(46-lat)*29+22] : [(lon-122)*24+30,(29-lat)*14+445];
}
function mapPage() {
  const d = byId.get(selection.mapId);
  const p = prefById.get(selection.mapPref);
  const w = 680/selection.zoom;
  const h = 540/selection.zoom;
  const [x,y] = selection.center;
  const polygons = data.prefectures.map(p=>`<path class="pref ${p.id===selection.mapPref?'active':''}" d="${paths[p.id]}" fill="${regionsColors[data.regions.indexOf(p.region)]}" data-action="map-pref" data-index="${p.id}"><title>${esc(p.name)}</title></path>`).join('');
  const pins = destinations.map(d=>{
    const [cx,cy]=project(d.xy);
    return `<circle class="map-marker" cx="${cx}" cy="${cy}" r="${d.id===selection.mapId?5.5:3.5}" tabindex="0" role="button" aria-label="${esc(d.name)}" data-action="map-pin" data-id="${d.id}"><title>${esc(d.name)}</title></circle>`;
  }).join('');
  return page('MAP','일본 지도','지도의 도도부현이나 도시를 선택해 위치와 여행 경비를 확인하세요.',`<div class="two">
  <section class="panel stack"><div class="row"><button class="icon" data-action="map-zoom" data-index="1" aria-label="지도 확대">+</button><button class="icon" data-action="map-zoom" data-index="-1" aria-label="지도 축소">−</button>${btn('전체 보기','map-reset')} ${selection.zoom>1?['←','→','↑','↓'].map((a,i)=>`<button class="icon" data-action="map-pan" data-index="${i}" aria-label="지도 ${['왼쪽','오른쪽','위','아래'][i]} 이동">${a}</button>`).join(''):''}</div>
  <div class="map-shell"><svg viewBox="${x-w/2} ${y-h/2} ${w} ${h}" aria-label="일본 47개 도도부현 지도"><path d="M25 427H196V523H25Z" fill="none" stroke="#8aa5bb" stroke-dasharray="3 3"/><text x="30" y="440" fill="#617d93" font-size="9">오키나와 (삽입도)</text>${polygons}${pins}</svg></div>
  <div class="tags">${data.regions.map((r,i)=>`<span style="background:${regionsColors[i]}">${r}</span>`).join('')}</div>
  <small>출처 · 일본 국토지리원 지구지도 일본, Data of Japan. 오키나와는 삽입도입니다.</small></section>
  <aside class="stack"><div class="panel stack"><form id="pref-choice">${select('도도부현 선택','pref',[['0','선택하세요'],...data.prefectures.map(p=>[p.id,p.name])],selection.mapPref)}</form>
  ${p?`<h3>${esc(p.name)}</h3><div class="row">${data.cities.filter(c=>c.pref===p.id).map(c=>`<a class="btn" href="${detailHref(c.id)}">${esc(c.name)}</a>`).join('')}</div>`:''}
  <form id="marker-choice">${select('추천 도시 선택','city',[['','선택하세요'],...destinationOptions()],selection.mapId)}</form>
  ${d?`<a class="card-media" href="${detailHref(d.id)}">${photo(d)}${art(d)}</a><h2>${esc(d.name)}</h2><p>${months.map((m,i)=>`${m} ${priceCell(d,i)}`).join(' · ')}</p><p><b>일본 도착 공항</b> ${esc(d.airport)}</p><a class="btn primary" href="${detailHref(d.id)}">상세 보기 →</a>`:''}</div>
  <div class="panel links"><h3>한국 출발 공항</h3><p>${link('청주 CJJ',sourceLinks.cjj)} · ${link('인천 ICN',sourceLinks.icn)}</p><small>도착 공항은 접근 기준입니다. 직항 및 2027년 운항 여부는 항공사에서 날짜별로 확인하세요.</small></div></aside></div>`);
}
function comparePage() {
  const chosen = state.compare.map(id=>byId.get(id)).filter(d=>d?.itineraries);
  const fields = [
    ['2박 3일',d=>priceCell(d,0)],['3박 4일',d=>priceCell(d,1)],
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
function planFor(id=selection.planId, index=selection.planDays) {
  const d=byId.get(id);
  const custom=state.plans[id+'-'+index];
  return custom?.length===d.itineraries[index].length ? custom : d.itineraries[index].map(line=>({stops:line.split('→'),memo:''}));
}
function setPlan(days) { state.plans[selection.planId+'-'+selection.planDays]=days; save(); }
function dayBlocks(d, day, i, length) {
  const first = i===0, last = i===length-1;
  const split = Math.ceil(day.stops.length/2);
  const food = d.food.split(',').map(name=>name.trim());
  return [
    ['오전',first?'공항 도착과 시내 이동':day.stops.slice(0,split).join(' → ')||'여유 시간'],
    ['점심',food[0]],
    ['오후',(first?day.stops:day.stops.slice(split)).join(' → ')||(last?'공항 이동':'현지 상황에 따라 오전 일정 이어서')],
    ['저녁',last?'항공편에 맞춰 식사':food[1]||food[0]],
    ['야간',last?'귀국편 시간 확보':'숙소 주변 산책 또는 휴식']
  ];
}
function planPage() {
  const d = byId.get(selection.planId);
  const days = planFor();
  const encoded = s => encodeURIComponent(s);
  return page('ITINERARY','여행 일정','추천 코스를 바탕으로 방문 순서와 메모를 편집하세요.',`<div class="stack">
  <div class="panel row noprint"><form id="plan-choice" class="tools-select">${select('여행지','city',destinationOptions(),d.id)}</form>${tabs('plan-days',selection.planDays)}</div>
  <p class="notice">편집 내용은 자동 저장됩니다. 첫날과 마지막 날은 항공편 시간에 맞추세요. 시간대는 이동 순서를 고려해 조정하세요. 실제 경로와 티켓 가격이 정해지면 메모에 기록할 수 있습니다.</p>
  <section class="two"><div><h2>${esc(d.name)} · ${months[selection.planDays]}</h2><div class="timeline" style="margin-top:12px">${days.map((day,i)=>`<article class="day">
    <div class="day-head"><h3>${i+1}일차</h3><span class="row noprint"><button class="icon" data-action="move-day" data-day="${i}" data-index="-1" aria-label="앞 날짜로 이동" ${i===0?'disabled':''}>↑</button><button class="icon" data-action="move-day" data-day="${i}" data-index="1" aria-label="뒤 날짜로 이동" ${i===days.length-1?'disabled':''}>↓</button></span></div>
    <dl class="day-blocks">${dayBlocks(d,day,i,days.length).map(([label,value])=>`<dt>${label}</dt><dd>${esc(value)}</dd>`).join('')}</dl>
    <ol class="stops">${day.stops.map((s,j)=>`<li><a href="${mapLink(s,d.name)}" target="_blank" rel="noopener noreferrer">${esc(s)} ↗</a><span class="row noprint">${[['↑','앞으로',-1,j===0],['↓','뒤로',1,j===day.stops.length-1],['×','삭제',0,false]].map(([ch,l,delta,disable])=>`<button class="icon" data-action="move-stop" data-day="${i}" data-stop="${j}" data-index="${delta}" aria-label="${esc(s+' '+l)}" ${disable?'disabled':''}>${ch}</button>`).join('')}</span></li>`).join('')}</ol>
    <form data-add-stop="${i}" class="noprint"><input name="stop" maxlength="160" required aria-label="${i+1}일차 장소 추가" placeholder="관광지나 식당 추가" list="plan-places"><button class="btn">추가</button></form>
    <label>메모<textarea rows="2" maxlength="2000" data-memo="${i}">${esc(day.memo)}</textarea></label>
    </article>`).join('')}</div></div>
    <aside class="panel stack"><h2>일정 공유</h2>${assets.has(d.id)?`<div class="card-media">${photo(d)}${art(d)}</div>`:''}
    <p><b>숙소 기준</b><br>${esc(d.stay)}</p><p><b>현지 이동</b><br>${esc(d.transport)}</p><p><b>음식 후보</b><br>${esc(d.food)}</p>
    <p class="links">${link('공항부터 숙소까지 경로 보기','https://www.google.com/maps/dir/?api=1&origin='+encoded(d.airport)+'&destination='+encoded(d.stay+' '+d.name)+'&travelmode=transit')}</p>
    <div class="actions noprint">${btn('일정 복사','copy-plan','','primary')}${btn('인쇄','print')}${btn('추천 일정으로 초기화','reset-plan')}</div></aside></section>
    <datalist id="plan-places">${d.attractions.map(a=>option(a,a,'')).join('')}</datalist></div>`);
}
const moneyInput=(name,label,value,attrs='')=>`<label>${label}<input name="${name}" type="number" min="0" step="1" inputmode="decimal" value="${Number(value)||0}" ${attrs}></label>`;
function budgetPage() {
  const b=state.budget;
  return page('BUDGET','예산 계산기','친구 인원과 실제 견적을 입력하면 숙박비를 나누고 전체 비용을 계산합니다.',`<div class="two">
  <form id="budget-form" class="panel stack">
    <h2>여행 조건</h2><div class="form-grid">${select('여행 지역','id',destinationOptions(),b.id)}${select('기간','days',[[3,months[0]],[4,months[1]]],b.days)}${moneyInput('people','인원',b.people,'max="100" required')}${select('출발 공항','airport',[['CJJ','청주 CJJ'],['ICN','인천 ICN']],b.airport)}</div>
    <h2>금액 입력 (원)</h2><div class="form-grid">${Object.entries(numbers).map(([k,l])=>moneyInput(k,l,b[k],k==='rooms'?'max="100" required':'max="100000000"')).join('')}</div>
    <div class="form-grid">${moneyInput('limit','1인 목표 예산 (원)',b.limit)}<label>엔화 환산 (1엔당 원)<input name="rate" type="number" min="0" max="100" step="0.01" value="${b.rate||''}" placeholder="직접 입력"></label></div>
    <button class="btn primary">예산 저장</button>
  </form><aside class="panel results stack" id="budget-results">${budgetResult(b)}</aside></div>`);
}
function budgetResult(values) {
  const {b,roomTotal,individual,total,perPerson,roomShare}=calculate(values);
  const d=byId.get(b.id);
  const jpy = amount => b.rate ? ` · ¥${formatMoney(amount/b.rate)}` : '';
  const items=Object.entries(numbers).filter(([k])=>!['rooms','roomPrice'].includes(k)).map(([k,l])=>[l,b[k]*b.people*(k==='food'?b.days:1)]);
  items.splice(1,0,['숙박비 (공동)',roomTotal]);
  return `<h2>예상 비용</h2><p class="muted">1인당 총비용</p><p class="total">₩${formatMoney(perPerson)}</p>${b.rate?`<small>¥${formatMoney(perPerson/b.rate)}</small>`:''}
    <p>${b.limit ? perPerson>b.limit?`목표보다 ${formatMoney(perPerson-b.limit)}원 초과`:`목표까지 ${formatMoney(b.limit-perPerson)}원 여유`:'목표 예산을 입력하면 초과 여부를 표시합니다.'}</p>
    <dl><dt>전원 총 비용</dt><dd>₩${formatMoney(total)}${jpy(total)}</dd><dt>공동 경비 (숙박)</dt><dd>₩${formatMoney(roomTotal)}</dd><dt>1인당 숙박 부담액</dt><dd>₩${formatMoney(roomShare)}</dd><dt>1인 개인 경비</dt><dd>₩${formatMoney(individual)}</dd></dl>
    <p class="notice">${esc(d?.name||'선택한 여행지')} · ${months[b.days-3]} 편집 추정치 ${d?priceCell(d,b.days-3):'별도 산정'}. 위 계산 결과는 입력 금액을 기준으로 합니다.</p>
    <h3>항목별 비중</h3>${items.map(([label,amount])=>`<div class="rating"><span>${label.split(' (')[0]}</span><div class="bar"><i style="width:${total?(amount/total*100):0}%"></i></div><b>${total?Math.round(amount/total*100):0}%</b></div>`).join('')}`;
}
const checkGroups = [
  ['출국 전',['여권 발급','항공권 예약','숙소 예약','숙소 연령 제한 확인','여행자보험 가입','환전','해외 결제 카드 준비','유심 또는 eSIM 구매','Visit Japan Web 이용 여부 확인','관광지 입장권 예약','공항 이동 방법 확인']],
  ['챙길 물건',['여권','휴대전화','충전기','보조배터리','일본 콘센트용 변환 어댑터','겨울 외투','장갑','방한용품','상비약','세면도구','현금','카드']]
];
function prepPage() {
  return page('CHECKLIST','여행 준비물','체크한 내용은 이 브라우저에 저장됩니다.',`<div class="stack"><p class="notice" id="check-progress">${checkProgress()}</p>
  <div class="two">${checkGroups.map(([name,items],i)=>`<section class="panel checklist"><h2>${name}</h2>${items.map((l,j)=>`<label><input type="checkbox" data-check="${i}-${j}" ${state.checks.includes(i+'-'+j)?'checked':''}>${l}</label>`).join('')}</section>`).join('')}</div>
  <section class="panel stack links"><h2>현지 주의사항</h2><p>일본 민법상 성년은 만 18세이며 음주 및 흡연은 만 20세부터 가능합니다. 미성년자와 고등학생의 숙박 가능 여부 및 보호자 동의서 양식은 예약 전에 숙소에 확인하세요. ${link('일본 정부 안내',sourceLinks.age)}</p>
  <p>일본 외무성은 한국을 단기 체류 사증 면제 대상에 포함합니다. 출국 전에 체류 목적과 본인의 여권 조건을 확인하세요. ${link('외무성 단기 체류 안내',sourceLinks.visa)} · ${link('Visit Japan Web',sourceLinks.visit)}</p>
  <p>폭설과 강풍에 대비해 귀국일 이동 시간을 확보하세요. 출발 전 공동 경비 담당자와 정산 방식을 정해 두세요.</p><small>공식 자료 확인일은 출처 페이지에 기록했습니다.</small></section></div>`);
}
const checkProgress=()=>`${checkGroups.flatMap(([,a],i)=>a.map((_,j)=>i+'-'+j)).filter(k=>state.checks.includes(k)).length} / 23개 완료`;
function winterPage() {
  const events = [
    ['일본 신년','1월 1일 전후','시설별 휴무를 확인하세요. 신사와 철도는 혼잡할 수 있습니다.'],
    ['한국 설 연휴','2월 6~9일','설날은 2월 7일입니다. 앞뒤 항공권과 숙박 견적을 비교하세요.',sourceLinks.calendar],
    ['삿포로 눈축제','2월 4~11일 · 공식 발표','오도리·쓰도무·스스키노. 날짜가 겹치는 설 연휴에는 숙박을 일찍 비교하세요.',sourceLinks.snow],
    ['오키나와 고래 관찰','겨울 시즌','출항과 관찰 여부는 기상 및 운영사에 따라 달라집니다.',sourceLinks.whales],
    ['겨울 스포츠와 설경','1~2월 · 시설별 일정','홋카이도·나가노·자오에서는 적설에 따라 리프트와 버스 운행이 달라질 수 있습니다.']
  ];
  return page('WINTER','2027 겨울 여행','평년 기온과 공식 행사 일정을 참고해 여행 날짜를 고르세요.',`<div class="stack"><section class="panel stack links"><h2>지역별 1월·2월 기온</h2>
  <div class="table-scroll"><table><thead><tr><th>대표 지역</th><th>1월 평균</th><th>2월 평균</th><th>복장과 적설</th></tr></thead>
  <tbody>${destinations.filter(d=>d.weather.length).map(d=>`<tr><th>${esc(d.name)}</th><td>${d.weather[0]}°C</td><td>${d.weather[1]}°C</td><td>${d.id==='sapporo'?'적설·결빙. 방수 신발과 장갑':d.id==='kanazawa'?'비와 눈에 대비해 방수 외투':d.id==='okinawa'?'해안 바람에 대비해 바람막이':'아침저녁에 입을 외투와 겹옷'}</td></tr>`).join('')}</tbody></table></div>
  <small>1991~2020년 대표 관측소 평년값. 산간이나 해안은 시내와 다를 수 있습니다. ${link('일본 기상청',sourceLinks.climate)}</small></section>
  <section class="panel stack links"><h2>연휴와 겨울 행사</h2>${events.map(([n,date,desc,url])=>`<article class="winter"><h3>${n} · ${date}</h3><p>${desc} ${url?link('공식 안내',url):''}</p></article>`).join('')}
  <p class="notice">신년·설 연휴와 눈축제 기간에는 항공과 숙박 가격이 오를 수 있습니다. 날짜 조정이 가능하면 평일 견적도 함께 비교하세요. 별도 공지가 필요한 지역 행사 일정은 미확정입니다.</p></section></div>`);
}
function savedPage() {
  const chosen = state.saved.map(id=>byId.get(id)).filter(Boolean);
  const places=state.attractions.map(k=>{const [id,i]=k.split(':');return [byId.get(id),Number(i)];}).filter(([d,i])=>d?.attractions[i]);
  const storedPlans=Object.keys(state.plans).flatMap(k=>{
    const m=k.match(/^(.+)-([01])$/);
    return m && byId.get(m[1])?.itineraries ? [[byId.get(m[1]),Number(m[2])]] : [];
  });
  return page('SHORTLIST','나의 여행 후보','찜, 메모, 예산과 일정은 이 브라우저에 저장됩니다. 친구에게는 텍스트나 JSON 파일로 공유하세요.',`<div class="stack"><div class="panel stack">
  <div class="actions">${btn('후보·투표 문구 복사','copy-saved','','primary')}${btn('JSON 내보내기','export')}${btn('JSON 불러오기','import')}<input id="file-import" type="file" accept=".json,application/json" hidden><a class="btn" href="#compare">비교 보기 →</a></div><small>투표 문구는 친구들이 각자 번호를 답장할 수 있도록 생성합니다.</small></div>
  ${chosen.length?`<div class="attraction-grid">${chosen.map(d=>`<article class="attraction stack"><h2><a href="${detailHref(d.id)}">${esc(d.name)} →</a></h2><label>개인 메모<textarea data-note="${d.id}" rows="3" maxlength="2000">${esc(state.notes[d.id]||'')}</textarea></label><div class="row">${d.itineraries?compareButton(d):''}${btn('찜 해제','save',`data-id="${d.id}"`)}</div></article>`).join('')}</div>`:'<p class="panel empty">여행지의 하트 버튼을 눌러 후보를 추가하세요.</p>'}
  <section class="panel stack"><h2>저장한 관광지</h2>${places.length?places.map(([d,i])=>`<div class="row links">${link(d.attractions[i],mapLink(d.attractions[i],prefById.get(d.pref).name))}<small>${esc(d.name)}</small>${btn('삭제','attraction',`data-id="${d.id}" data-index="${i}"`)}</div>`).join(''):'<p class="muted">저장한 관광지가 없습니다.</p>'}</section>
  <section class="panel stack"><h2>저장한 일정과 예산</h2>
  ${storedPlans.map(([d,i])=>btn(esc(d.name)+' · '+months[i],'open-plan',`data-id="${d.id}" data-index="${i}"`)).join(' ')}
  <p>저장된 예산 · 1인 ₩${formatMoney(calculate(state.budget).perPerson)} <a class="text-btn" href="#budget">편집 →</a></p></section></div>`);
}
function sourcesPage() {
  return page('SOURCES','정보 및 이미지 출처','2026년 11월 25일 기준 자료와 제작 시각 자료를 구분해 기록했습니다.',`<div class="panel stack links"><h2>여행 자료</h2>
  <p>${link('삿포로 눈축제 공식 공지',sourceLinks.snow)} · ${link('일본 기상청 1991~2020 평년값',sourceLinks.climate)} · ${link('우주항공청 2027년 월력요항',sourceLinks.calendar)}</p>
  <p>${link('일본 정부 연령 안내',sourceLinks.age)} · ${link('일본 외무성 사증 면제 안내',sourceLinks.visa)} · ${link('Visit Japan Web',sourceLinks.visit)} · ${link('일본정부관광국',sourceLinks.japan)}</p>
  <p>여행 순위와 비용 범위는 제공된 명세서의 계획용 편집값입니다. 항공 운항, 운영시간 및 가격은 이용 날짜에 공식 판매처에서 확인하세요. 상세 페이지에서 제공하는 개별 업체 링크 중 일부는 응답 상태가 미검증입니다.</p>
  <h2>지도</h2><p>출처 · 일본 국토지리원 지구지도 일본. Data of Japan이 변환한 자료를 사용해 웹 표시용으로 간략화했습니다. ${link('Data of Japan / land','https://github.com/dataofjapan/land')}</p>
  ${location.hostname?.endsWith('.chatgpt.site')?'<h2>프로젝트 파일</h2><p><a href="japan-graduation-trip-2027.zip" download>소스코드 및 정적 사이트 ZIP 다운로드</a></p>':''}<h2>이미지</h2><p>후지산 홈 배너와 오사카, 도쿄, 오타루, 후쿠오카, 오키나와, 후지산 카드의 시각 자료는 OpenAI ImageGen으로 제작한 AI 삽화입니다. 모두 프로젝트에 WebP 파일로 저장했습니다.</p></div>`);
}
function save() {
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
  const views={home,explore,map:mapPage,trip:()=>detail(byId.get(arg)),compare:comparePage,plan:planPage,budget:budgetPage,prep:prepPage,winter:winterPage,saved:savedPage,sources:sourcesPage};
  main.innerHTML=(Object.hasOwn(views,active)?views[active]:home)();
  for(const a of document.querySelectorAll('nav a,.saved-link')){
    const current=a.hash==='#'+(active==='trip'?'explore':active);
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
  if(route==='trip') selection.detailDays=0;
  if(route==='map'&&prefById.has(Number(arg))) setMapPref(Number(arg));
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
  selection.mapId=(destinations.find(d=>d.pref===pref)||destinations.find(d=>d.relatedPrefs.includes(pref)))?.id||'';
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
  return [`일본 졸업여행 · ${d.name} · ${months[selection.planDays]}`,...planFor().map((day,i)=>`${i+1}일차: ${day.stops.join(' → ')}${day.memo?'\n메모: '+day.memo:''}`)].join('\n');
}
menu.addEventListener('click',()=>{
  const open=navigation.classList.toggle('open');
  menu.setAttribute('aria-expanded',String(open));menu.setAttribute('aria-label',open?'메뉴 닫기':'메뉴 열기');
});
document.querySelector('#close-dialog').addEventListener('click',()=>dialog.close());
main.addEventListener('error',e=>{
  if(e.target instanceof HTMLImageElement&&e.target.hasAttribute('data-fallback')){
    e.target.removeAttribute('data-fallback');
    e.target.src='images/fallback.svg';
    e.target.alt='이미지를 불러오지 못했습니다.';
  }
},true);
main.addEventListener('click',event=>{
  const el=event.target.closest('[data-action]');
  if(!el) return;
  const {action,id}=el.dataset;
  const i=Number(el.dataset.index), j=Number(el.dataset.day);
  switch(action){
    case 'save': if(byId.has(id)){toggleList(state.saved,id);save();render();} break;
    case 'attraction': if(byId.get(id)?.attractions[i]){toggleList(state.attractions,id+':'+i);save();render();} break;
    case 'compare': toggleCompare(id);break;
    case 'open-plan': if(byId.get(id)?.itineraries){selection.planId=id;selection.planDays=Number.isInteger(i)?i:selection.detailDays;go('plan');} break;
    case 'open-budget': state.budget.id=id;state.budget.days=selection.detailDays+3;save();go('budget');break;
    case 'detail-days': selection.detailDays=i;render();break;
    case 'plan-days': selection.planDays=i;render();break;
    case 'zoom-photo': dialogBody.innerHTML=photo(byId.get(id));dialog.showModal();break;
    case 'map-pin': selection.mapId=id;selection.mapPref=byId.get(id).pref;render();break;
    case 'map-pref': setMapPref(i);render();break;
    case 'map-reset': selection.zoom=1;selection.center=[340,270];render();break;
    case 'map-zoom': {
      if(i>0 && selection.zoom===1 && selection.mapPref && selection.mapId) selection.center=project(byId.get(selection.mapId).xy);
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
        delete state.plans[selection.planId+'-'+selection.planDays];save();render();
      }break;
    case 'copy-plan': copy(itineraryText());break;
    case 'print': window.print();break;
    case 'copy-saved': {
      const rows=state.saved.map(id=>byId.get(id)).filter(Boolean);
      if(!rows.length){announce('공유할 여행지를 찜해 주세요.');break;}
      copy(['2027 일본 졸업여행 후보 투표','가고 싶은 여행지 번호를 답장해 주세요.',...rows.map((d,n)=>`${n+1}. ${d.name}${d.price?' · 2박 3일 '+priceCell(d,0):''}`)].join('\n'));
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
  if(e.target.matches('circle[data-action]')&&['Enter',' '].includes(e.key)){
    e.preventDefault();e.target.dispatchEvent(new MouseEvent('click',{bubbles:true}));
  }
});
main.addEventListener('submit',e=>{
  const form=e.target;
  e.preventDefault();
  const values=Object.fromEntries(new FormData(form));
  if(form.id==='quick'){filters={q:'',region:'',pref:'',custom:'',sort:'rank',...values};go('explore');}
  if(form.id==='compare-choice') toggleCompare(values.city);
  if(form.id==='budget-form'){
    state.budget=calculate(values).b;save();
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
  const el=e.target,form=el.form;
  if(form?.id==='filters'&&['q','custom'].includes(el.name)){
    filters[el.name]=el.value;
    main.querySelector('#explore-results').innerHTML=exploreResults();
  }
  if(form?.id==='budget-form') main.querySelector('#budget-results').innerHTML=budgetResult(Object.fromEntries(new FormData(form)));
  if(el.hasAttribute('data-memo')){const days=planFor();days[Number(el.dataset.memo)].memo=el.value;setPlan(days);}
  if(el.hasAttribute('data-note')){state.notes[el.dataset.note]=el.value;save();}
});
main.addEventListener('change',async e=>{
  const el=e.target,form=el.form;
  if(form?.id==='filters'&&el.tagName==='SELECT'){
    const name=el.name;
    filters[name]=el.value;
    if(name==='region') filters.pref='';
    render();
    main.querySelector(`#filters select[name="${name}"]`).focus();
  }
  if(form?.id==='plan-choice'){selection.planId=el.value;render();}
  if(form?.id==='pref-choice'){setMapPref(Number(el.value));render();}
  if(form?.id==='marker-choice'){selection.mapId=el.value;selection.mapPref=byId.get(el.value)?.pref||0;render();}
  if(el.hasAttribute('data-check')){
    toggleList(state.checks,el.dataset.check);save();
    main.querySelector('#check-progress').textContent=checkProgress();
  }
  if(el.id==='file-import'&&el.files[0]){
    try {
      const imported=parseImport(await el.files[0].text());
      if(!byId.get(imported.budget.id)?.itineraries) imported.budget.id=budgetDefaults.id;
      if(confirm('이 브라우저의 여행 데이터를 가져온 파일로 교체할까요?')){
        state=imported;save();render();if(storageAvailable) announce('여행 데이터를 불러왔습니다.');
      }
    } catch {announce('여행 데이터 JSON 파일을 확인해 주세요.');}
    el.value='';
  }
});
async function getJSON(name) {
  const response=await fetch(name);
  if(!response.ok) throw new Error(name);
  return response.json();
}
try {
  [data,paths]=await Promise.all([getJSON('data/trips.json'),getJSON('maps/prefectures.json')]);
  destinations=data.destinations;
  byId=new Map([...destinations,...data.cities].map(d=>[d.id,d]));
  prefById=new Map(data.prefectures.map(p=>[p.id,p]));
  window.addEventListener('hashchange',routeChanged);
  routeChanged();
  if(!storageAvailable) announce('브라우저 저장 데이터를 불러올 수 없습니다.');
} catch {
  main.innerHTML='<p class="wrap loading">여행 데이터를 불러오지 못했습니다. README의 로컬 서버 실행 방법을 확인한 뒤 다시 열어 주세요.</p>';
}
