const folder='data/areas/';
const labels={city:'시',special:'특별구',ward:'행정구',county:'군',town:'정',village:'촌'};
const norm=value=>String(value).normalize('NFKC').normalize('NFD').replace(/\p{Diacritic}|[\s·-]/gu,'').toLowerCase();
const prefKey=value=>String(Number(value)||0).padStart(2,'0');
const safeCode=value=>/^\d{5}$/.test(value||'')?value:'';
const noValue='미확인';
const areaSource='https://www.e-stat.go.jp/municipalities/cities';
const officeSource='https://github.com/code4fukui/localgovjp';

export function setupGeography({main,esc,select,page,link,getData,refresh,detailHref}){
  const entries=new Map(), pending=new Map(), failures=new Set();
  let searchText='';
  function load(name,done=refresh){
    if(entries.has(name)||pending.has(name)||failures.has(name))return;
    pending.set(name,fetch(folder+name+'.json').then(response=>{
      if(!response.ok)throw Error(name);
      return response.json();
    }).then(value=>entries.set(name,value)).catch(()=>failures.add(name)).finally(()=>{pending.delete(name);done();}));
  }
  function metadata(){
    for(const name of ['prefectures','guides','places'])load(name);
  }
  const db=()=>entries.get('places')||{};
  const guideCodes=()=>entries.get('guides')||{};
  const placeHref=id=>'#place/'+id;
  function href(pref,code='',id=''){
    return '#map/'+Number(pref)+(code?'/'+code+(id?'/'+id:''):'');
  }
  function current(){
    const [,prefix,rawCode,id]=location.hash.slice(1).split('/');
    const pref=prefKey(prefix);
    const rows=entries.get(pref)||[];
    const code=safeCode(rawCode);
    const row=rows.find(r=>r[0]===code);
    const place=db()[id]?.area===code?db()[id]:null;
    return {pref,rows,row,place,code};
  }
  const name=r=>r[3]?r[3]+' · '+r[1]:r[1]+' · '+r[2];
  const short=r=>r[3]||r[1];
  const maps=query=>'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(query);
  const https=url=>typeof url==='string'&&/^https:\/\//i.test(url);
  const searchForm=()=>`<label>지역·관광지 검색 <input data-area-search type="search" placeholder="예: 시부야, 草津, Otaru" value="${esc(searchText)}"></label><div class="area-results" data-area-results>${searchResults()}</div>`;
  function searchResults(){
    const q=norm(searchText.trim());
    if(!q)return '';
    const d=getData();
    const matches=values=>values.some(v=>v&&norm(v).includes(q));
    const prefectures=d.prefectures.filter(p=>matches([p.name,entries.get('prefectures')?.[prefKey(p.id)]]))
      .slice(0,8).map(p=>[href(p.id),p.region+' · '+p.name]);
    const places=Object.entries(db()).filter(([,p])=>matches([p.name,p.ja,p.local]))
      .slice(0,10).map(([id,p])=>[placeHref(id),p.name+' · '+p.ja]);
    const legacy=[...d.destinations,...d.cities].flatMap(g=>g.attractions.map((name,i)=>[g,i,name]))
      .filter(([, ,name])=>matches([name])).slice(0,8)
      .map(([g,i,name])=>[placeHref(g.id+'/'+i),name+' · '+g.name]);
    const index=entries.get('index');
    const municipalities=index?index.filter(r=>matches(r.slice(1))).slice(0,18).map(r=>{
      const pref=d.prefectures.find(p=>p.id===Number(r[0].slice(0,2)));
      return [href(pref.id,r[0]),[pref.name,r[3]||r[1],r[2]].join(' · ')];
    }):[];
    const results=[...prefectures,...places,...legacy,...municipalities];
    return results.length?`<ul>${results.map(([url,label])=>`<li><a href="${url}">${esc(label)}</a></li>`).join('')}</ul>`
      :failures.has('index')?'<p>전국 검색 목록을 불러오지 못했습니다.</p>':index?'<p>검색 결과가 없습니다.</p>':'<p>전국 검색 목록을 불러오는 중입니다.</p>';
  }
  function updateSearch(){
    const node=main.querySelector('[data-area-results]');
    if(node)node.innerHTML=searchResults();
  }
  function explorePanel(){
    metadata();
    return `<section class="panel stack"><h2>전국 행정구역과 관광지</h2>${searchForm()}<a class="btn" href="#map">지도에서 지역 탐색</a></section>`;
  }
  function mapPanel(){
    metadata();
    const d=getData();
    const {pref,rows,row,place,code}=current();
    const p=d.prefectures.find(p=>p.id===Number(pref));
    if(p)load(pref);
    const top=rows.filter(r=>!r[5]);
    const parent=row?.[5]?rows.find(r=>r[0]===row[5]):row;
    const children=parent?rows.filter(r=>r[5]===parent[0]):[];
    const topValue=parent?.[0]||'';
    const childValue=row?.[5]?row[0]:'';
    const local=[...d.destinations,...d.cities].filter(g=>g.pref===Number(pref)&&(!row||
      guideCodes()[g.id]===row[0]||rows.some(r=>r[0]===guideCodes()[g.id]&&r[5]===row[0])));
    const sites=Object.entries(db()).filter(([,pp])=>pp.area.startsWith(pref)&&(!row||pp.area===row[0]||
      rows.some(r=>r[0]===pp.area&&r[5]===row[0])));
    const trail=[p?.region,p&&(p.name+' · '+(entries.get('prefectures')?.[pref]||'')),parent&&short(parent),
      childValue&&short(row),place?.local,place?.name].filter(Boolean);
    return `<div class="panel stack area-panel"><h2>행정구역 탐색</h2>${searchForm()}
      <form data-area-filters class="stack">
      ${select('도도부현','pref',[['0','선택하세요'],...d.prefectures.map(p=>[p.id,p.name])],Number(pref))}
      ${p&&top.length?select('시·특별구·군·정·촌','area',[['','전체'],...top.map(r=>[r[0],name(r)+' ('+labels[r[4]]+')'])],topValue):''}
      ${children.length?select(parent[4]==='county'?'소속 정·촌':'행정구','child',[['','전체'],...children.map(r=>[r[0],name(r)])],childValue):''}
      ${sites.length?select('관광지 위치','place',[['','선택하세요'],...sites.map(([id,s])=>[id,s.name])],location.hash.split('/')[3]||''):''}
      </form>
      ${trail.length?`<p class="notice" aria-label="탐색 경로">${trail.map(esc).join(' → ')}</p>`:''}
      ${p&&!rows.length?`<p>${failures.has(pref)?'행정구역 데이터를 불러오지 못했습니다.':'행정구역을 불러오는 중입니다.'}</p>`:''}
      ${row?.[6]?`<small class="links">지도 점은 청사 위치를 기준으로 합니다. ${link('청사 지도',maps(row[6].slice().reverse().join(',')))} ${https(row[7])?link('지자체 홈페이지',row[7]):''}</small>`:''}
      ${sites.length?`<h3>출처가 확인된 관광지</h3><div class="row">${sites.map(([id,s])=>`<a class="btn" href="${placeHref(id)}">${esc(s.name)}</a>`).join('')}</div>`:''}
      ${p?`<h3>등록된 여행 가이드</h3>${local.length?`<div class="row">${local.map(g=>`<a class="btn" href="${detailHref(g.id)}">${esc(g.name)}</a>`).join('')}</div>`:'<small>현재 선택에 연결된 가이드는 아직 없습니다.</small>'}`:''}
      <small class="links">${link('e-Stat 행정구역 코드',areaSource)} · ${link('청사 좌표·홈페이지',officeSource)}</small></div>`;
  }
  function coordinate(){
    const {row,place}=current();
    return place?.xy||row?.[6];
  }
  function guideLink(d){
    metadata();
    const code=guideCodes()[d.id];
    if(!code)return '';
    load(code.slice(0,2));
    const row=entries.get(code.slice(0,2))?.find(r=>r[0]===code);
    return `<a class="btn" href="${href(code.slice(0,2),code)}">${row?esc(short(row))+' · '+esc(row[1])+' 지도':'행정구역 지도'}</a>`;
  }
  function curated(id,g,n){
    return db()[id]||Object.values(db()).find(p=>p.links?.some(([guide,i])=>guide===g&&i===n));
  }
  function detail(id,g,n,controls,photo){
    metadata();
    const d=getData(), guide=[...d.destinations,...d.cities].find(x=>x.id===g);
    const item=curated(id,g,n);
    const title=item?.name||guide?.attractions[n];
    if(!title)return page('PLACE','관광지','관광 정보를 확인하세요.',`<p class="notice">${pending.has('places')?'관광 정보를 불러오는 중입니다.':'등록된 관광지를 찾지 못했습니다.'}</p>`);
    const info=d.attractionInfo[title]||{};
    const credits=item?.source||d.official[title];
    const rows=[
      ['주소',item?.address],['입장료',item?.fee],['운영시간·휴무',item?.hours],['가까운 역과 교통편',item?.access],
      ['권장 체류 시간',item?.duration],['주변 맛집·관광지',item?.nearby],['겨울철 방문 시 주의사항',item?.winter]
    ];
    const google=maps(item?.address||item?.ja||title+' '+(guide?.name||'일본'));
    return page('PLACE',esc(title),esc(item?.ja||guide?.name||''),`<section class="panel stack">
      ${photo||''}<p>${esc(item?.description||info.description||'소개 자료를 확인 중입니다.')}</p>
      <dl class="area-facts">${rows.map(([label,value])=>`<dt>${label}</dt><dd>${esc(value||noValue)}</dd>`).join('')}</dl>
      <p class="notice">2027년 방문 전 최신 운영시간, 요금 및 휴무를 공식 안내에서 확인하세요.</p>
      <p class="links">${link('구글 지도',google)} ${credits?' · '+link('공식 관광 안내',credits):''}
      ${item?.area?` · <a href="${href(item.area.slice(0,2),item.area,id&&db()[id]?id:Object.keys(db()).find(key=>db()[key]===item))}">일본 지도에서 보기</a>`:''}</p>
      ${item?.xy?`<small>지도 표시 좌표(약간의 오차가 있을 수 있음) · ${item.xy[1]}, ${item.xy[0]}</small>`:''}
      ${credits?`<small>출처 확인 · ${item?.checked||'기존 가이드'}</small>`:''}
      ${controls}</section>`);
  }
  function change(event){
    const el=event.target;
    if(!el.form?.matches?.('[data-area-filters]'))return false;
    const {pref,code,rows}=current();
    if(el.name==='pref')location.hash=el.value==='0'?'map':href(el.value);
    if(el.name==='area')location.hash=href(pref,el.value);
    if(el.name==='child')location.hash=href(pref,el.value||rows.find(r=>r[0]===code)?.[5]);
    if(el.name==='place'){
      const selected=db()[el.value];
      location.hash=href(pref,selected?.area||code,el.value);
    }
    return true;
  }
  function input(event){
    if(!event.target.matches?.('[data-area-search]'))return;
    searchText=event.target.value;
    if(searchText.trim())load('index',updateSearch);
    updateSearch();
  }
  return {mapPanel,explorePanel,guideLink,change,input,coordinate,detail,curated,loadPlaces:()=>load('places')};
}
