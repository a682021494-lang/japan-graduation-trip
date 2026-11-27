import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import test from 'node:test';
import { calculate, freshState, matches, move, parseImport, travelSettings, dateAfter, durationLabel } from '../dist/logic.js';

const dist = new URL('../dist/', import.meta.url);
const read = p => readFile(new URL(p, dist), 'utf8');
const trips = JSON.parse(await read('data/trips.json'));
const prefectures = JSON.parse(await read('maps/prefectures.json'));
const ids = [...trips.destinations,...trips.cities].map(d=>d.id);
const get = id => trips.destinations.find(d=>d.id===id);
const filters = {q:'',region:'',pref:'',days:'',budget:'',custom:'',type:''};

test('8개 권역, 47개 지도 경계, 전체 도시와 추천 코스 구조', () => {
  assert.equal(trips.regions.length,8);
  assert.equal(trips.prefectures.length,47);
  assert.equal(Object.keys(prefectures).length,47);
  assert.equal(trips.destinations.length,18);
  assert.equal(trips.cities.length,66);
  assert.equal(new Set(ids).size,ids.length);
  for(const p of trips.prefectures) {
    assert.match(prefectures[p.id],/^M[-0-9.,LMZ]+$/);
    assert(trips.cities.some(c=>c.pref===p.id));
  }
  for(const d of trips.destinations){
    assert.deepEqual(d.itineraries.map(i=>i.length),[3,4]);
    assert.equal(d.scores.length,8);
    assert(d.attractions.length>=3);
    assert(d.relatedPrefs.includes(d.pref));
    for(const r of d.price.filter(Boolean)) assert(r[0]>0&&r[0]<=r[1]);
  }
});

test('검색, 예산, 유형, 도도부현 조건 동시 적용', () => {
  assert(matches(get('osaka'),{...filters,q:'도톤보리',pref:'26',type:'놀이공원',budget:'custom',custom:'500000'}));
  assert(!matches(get('osaka'),{...filters,days:'4',budget:'custom',custom:'500000'}));
  assert(matches(get('fukuoka'),{...filters,days:'3',budget:'0-400000'}));
  assert(!matches(get('kumamoto'),{...filters,budget:'1000000-'}));
});

test('인원별 숙박 분담, 식비 일수, 그룹 비용', () => {
  const { roomTotal, roomShare, perPerson, total } = calculate({...freshState().budget,flight:200000,rooms:2,roomPrice:100000,food:30000,days:4});
  assert.deepEqual([roomTotal,roomShare,perPerson,total],[600000,150000,470000,1880000]);
  assert.equal(calculate({people:0,rooms:0}).b.people,1);
});

test('일정 순서 변경과 경계 검사', () => {
  const stops=['난바','도톤보리'];
  assert(move(stops,0,1));
  assert.deepEqual(stops,['도톤보리','난바']);
  assert.equal(move(stops,0,-1),false);
});

test('공유 데이터 왕복과 비정상 입력의 제한', () => {
  const s=freshState();s.saved=['osaka'];s.notes.osaka='공동 메모';s.plans['osaka-0']=[{stops:['난바'],memo:'공항 10시'}];
  assert.deepEqual(parseImport(JSON.stringify(s)),s);
  const imported=parseImport('{"saved":[],"notes":{"__proto__":"bad","constructor":"bad"},"compare":["a","b","c","d","e"]}');
  assert.deepEqual(imported.notes,{});
  assert.equal(imported.compare.length,4);
  assert.throws(()=>parseImport('{"foo":[]}'));
});

test('정적 진입점 및 로컬 그림·폰트 파일 확인', async () => {
  const html = await read('index.html');
  const app = await read('app.js');
  const css = await read('style.css');
  for(const match of html.matchAll(/(?:src|href)="([^"#]+\.(?:css|js))"/g)) await read(match[1]);
  for(const p of ['hero','osaka','tokyo','sapporo','fukuoka','okinawa','fuji']){
    const image = await readFile(new URL('images/'+p+'.webp',dist));
    assert.equal(image.subarray(8,12).toString(),'WEBP');
  }
  assert.match(await read('images/fallback.svg'),/<svg/);
  for(const p of [...css.matchAll(/url\(([^)]+)\)/g)].map(m=>m[1].replace(/['"]/g,''))) await readFile(new URL(p,dist));
  for(const p of await readdir(new URL('fonts/',dist))) assert((await readFile(new URL('fonts/'+p,dist))).length>0);
  assert.match(app,/localStorage\.setItem/);
});

test('84개 여행지는 로컬 WebP와 이미지 출처 정보를 제공한다',async()=>{
  const {tripImages}=await import('../dist/data/trip-images.js');
  assert.deepEqual(Object.keys(tripImages).sort(),[...ids].sort());
  for(const [id,image] of Object.entries(tripImages)){
    assert.match(image.file,/^(trips\/)?[a-z0-9-]+\.webp$/,id);
    assert(image.subject,id);
    assert.equal(typeof image.ai,'boolean');
    if(!image.ai){
      assert(image.artist&&image.license,id);
      assert.equal(new URL(image.source).hostname,'commons.wikimedia.org',id);
    }
    const bytes=await readFile(new URL('images/'+image.file,dist));
    assert.equal(bytes.subarray(0,4).toString(),'RIFF',id);
    assert.equal(bytes.subarray(8,12).toString(),'WEBP',id);
  }
});

test('47개 행정구역 파일의 상·하위 코드와 관광지 참조가 유효하다',async()=>{
  const keys=Object.keys(JSON.parse(await read('data/areas/prefectures.json')));
  assert.equal(keys.length,47);
  const tourism=JSON.parse(await read('data/areas/tourism.json'));
  assert.deepEqual(Object.keys(tourism.urls).sort(),keys.sort());
  assert.match(tourism.checked,/^\d{4}-\d{2}-\d{2}$/);
  assert.equal(new Set(Object.values(tourism.urls)).size,47);
  for(const url of Object.values(tourism.urls)){
    assert.match(url,/^https:\/\/www\.japan\.travel\/en\/destinations\/[a-z-]+\/[a-z-]+\/$/);
  }
  const groups=await Promise.all(keys.map(async key=>JSON.parse(await read('data/areas/'+key+'.json'))));
  const index=new Map(groups.flat().map(row=>[row[0],row]));
  assert.equal(index.size,2283);
  for(const [code,row] of index){
    if(row[5])assert.equal(index.get(row[5])?.[0].slice(0,2),code.slice(0,2));
  }
  const places=JSON.parse(await read('data/areas/places.json'));
  const guides=JSON.parse(await read('data/areas/guides.json'));
  assert.deepEqual(Object.keys(guides).sort(),[...ids].sort());
  for(const code of Object.values(guides))assert(index.has(code),code);
  for(const place of Object.values(places)){
    assert(index.has(place.area),place.name);
    assert.match(place.source,/^https:\/\//);
  }
});

test('겨울 행사 날짜와 18개 코스의 겨울 안내', async () => {
  const {eventDates,pendingWinterEvents,winterEvents,winterPlans,winterRestrictions,winterWindow}=await import('../dist/data/winter.js');
  assert.deepEqual(Object.keys(winterPlans).sort(),trips.destinations.map(d=>d.id).sort());
  const validDate = date => /^2027-0[12]-\d{2}$/.test(date)
    && date>=winterWindow.start&&date<=winterWindow.end
    && new Date(date).toISOString().slice(0,10)===date;
  for(const event of winterEvents){
    const dates=event.dates||[event.start,event.end];
    assert(dates.length&&dates.every(validDate),event.name);
    assert.deepEqual([...new Set(dates)].sort(),dates);
    assert.match(event.source,/^https:\/\//);
    assert(trips.prefectures.some(p=>p.id===event.pref));
  }
  for(const event of pendingWinterEvents){
    assert.equal(eventDates(event),'개최 일정 미확정');
    assert.equal(event.end,undefined);
    assert.match(event.source,/^https:\/\//);
  }
  const places=JSON.parse(await read('data/areas/places.json'));
  for(const item of winterRestrictions){
    assert.match(item.source,/^https:\/\//);
    assert((item.guides||[]).every(id=>ids.includes(id)));
    assert((item.places||[]).every(id=>places[id]));
  }
});

test('당일치기와 장기 일정 날짜 및 일별 비용을 함께 계산한다', () => {
  assert.equal(durationLabel(1),'당일치기');
  assert.equal(dateAfter('2027-01-30',4),'2027-02-03');
  assert.deepEqual(travelSettings({days:3,departure:'2027-01-30',returnDate:'2027-02-03'}),{days:5,departure:'2027-01-30'});
  assert.deepEqual(travelSettings({days:3,returnDate:'2027-02-03'}),{days:3,departure:'2027-02-01'});
  assert.equal(travelSettings({days:3,departure:'2027-02-03',returnDate:'2027-02-01'}),null);
  const budget={...freshState().budget,rooms:1,roomPrice:100000,people:2,transit:10000,transitDaily:3000,food:20000};
  assert.equal(calculate({...budget,days:1}).total,66000);
  assert.equal(calculate({...budget,days:8}).total,1088000);
  const state=freshState();
  state.budget={...state.budget,days:365,departure:'2027-01-01'};
  state.plans['osaka-day-365']=[{stops:['도착'],memo:'마지막 날'}];
  assert.deepEqual(parseImport(JSON.stringify(state)),state);
});


test('all registered attractions have licensed photos or labeled AI illustrations',async()=>{
  const {canonicalAttraction,attractionPhotos}=await import('../dist/data/attraction-photos.js');
  const {reviewedPhotos}=await import('../dist/data/reviewed-attraction-photos.js');
  const places=JSON.parse(await read('data/areas/places.json'));
  const names=new Set([...trips.destinations,...trips.cities].flatMap(guide=>guide.attractions)
    .concat(Object.values(places).map(place=>place.name)).map(canonicalAttraction));
  const sources=new Map();
  const checksums=new Set();
  const stored=new Set();
  let photographed=0, illustrated=0, illustrations=0, galleries=0;
  for(const name of names){
    const photos=attractionPhotos(name);
    assert(photos.length>=1&&photos.length<=5,name);
    const actual=photos.filter(photo=>!photo.ai).length;
    if(actual)photographed++;
    else illustrated++;
    if(actual>=3)galleries++;
    for(const photo of photos){
      assert(photo.artist&&photo.license,name);
      assert.equal(new URL(photo.source).protocol,'https:');
      if(photo.ai){
        assert.equal(photo.artist,'OpenAI ImageGen',name);
        assert.equal(new URL(photo.licenseUrl).hostname,'openai.com',name);
        assert(photo.caption&&photo.file.endsWith('-illustration.webp'),name);
        illustrations++;
      }else{
        const host=new URL(photo.source).hostname;
        if(host==='www.env.go.jp'){
          assert.equal(new URL(photo.original).hostname,host);
          assert.equal(new URL(photo.licenseUrl).hostname,host);
          assert(photo.editedBy&&photo.caption,name);
        }else{
          assert.equal(host,'commons.wikimedia.org');
        }
        const source=decodeURIComponent(photo.original||photo.source).replaceAll(' ','_');
        assert(!sources.has(source),`Repeated source for ${name} and ${sources.get(source)}`);
        sources.set(source,name);
      }
      assert.match(photo.file,/^(?:trips|attractions)\/[a-z0-9-]+\.webp$/);
      const bytes=await readFile(new URL('images/'+photo.file,dist));
      assert.equal(bytes.subarray(8,12).toString(),'WEBP');
      const hash=createHash('sha256').update(bytes).digest('hex');
      assert(!checksums.has(hash),`Repeated image bytes for ${name}`);
      checksums.add(hash);
      if(photo.file.startsWith('attractions/')){
        assert(bytes.length<=250_000,`Oversized attraction WebP: ${photo.file}`);
        assert.match(photo.checkedOn,/^\d{4}-\d{2}-\d{2}$/);
        stored.add(photo.file.slice('attractions/'.length));
      }
    }
  }
  for(const name of Object.keys(reviewedPhotos))assert(names.has(name),name);
  assert.deepEqual(new Set(await readdir(new URL('images/attractions/',dist))),stored);
  assert(sources.size>=237);
  console.log(`명소 ${names.size}곳 · 실제 사진 ${photographed}곳 / ${sources.size}장 · AI 대체 ${illustrated}곳 / ${illustrations}장 · 실제 사진 3장 이상 ${galleries}곳`);
});
