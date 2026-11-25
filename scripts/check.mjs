import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import test from 'node:test';
import { calculate, freshState, matches, move, parseImport } from '../dist/logic.js';

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
  assert(!matches(get('osaka'),{...filters,days:'1',budget:'custom',custom:'500000'}));
  assert(matches(get('fukuoka'),{...filters,days:'0',budget:'0-400000'}));
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
