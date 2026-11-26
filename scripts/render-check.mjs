import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const eventHandlers = new Map();
const rendered = new Map();
const noOp = () => {};
const classes = {toggle:noOp,remove:noOp};
const main = {innerHTML:'',focus:noOp,addEventListener:noOp,querySelector:selector=>rendered.get(selector)};
const navigation = {classList:classes};
const inert = {addEventListener:noOp,querySelector:noOp,setAttribute:noOp};
globalThis.document = {
  querySelector: selector => selector==='#main'?main:selector==='nav'?navigation:inert,
  querySelectorAll: () => []
};
globalThis.window = {scrollTo:noOp,addEventListener:(name,callback)=>eventHandlers.set(name,callback)};
globalThis.location = {hash:'#home'};
globalThis.localStorage = {getItem:()=>null};
globalThis.fetch = async path => new Response(await readFile(new URL('../dist/'+path,import.meta.url)));
await import('../dist/app.js');
const routes = {
  home:'우리의 첫 졸업여행',
  explore:'전국 여행지',
  'map/47':'일본 47개 도도부현 지도',
  'trip/osaka':'유니버설 스튜디오 재팬',
  'trip/city-1':'관광 명소',
  compare:'비교할 여행지를 추가해 주세요.',
  plan:'난바',
  budget:'1인당 숙박 부담액',
  prep:'0 / 23개 완료',
  saved:'JSON 내보내기',
  winter:'2월 4일 ~ 2월 11일',
  sources:'OpenAI ImageGen',
  profile:'내 프로필',
  settings:'설정',
  groups:'친구들과 여행',
  'join/ABCDEF0123456789ABCDEF0123456789':'여행 그룹 초대',
  privacy:'개인정보 처리방침'
};
for(const [route,expected] of Object.entries(routes)){
  location.hash='#'+route;
  eventHandlers.get('hashchange')();
  assert(main.innerHTML.includes(expected),route);
}
console.log(`렌더링 검사 통과: ${Object.keys(routes).length}개 경로`);
