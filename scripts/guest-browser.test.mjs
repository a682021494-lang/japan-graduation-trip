import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { chromium, devices, webkit } from 'playwright';

const engine=process.env.TRIP_QA_ENGINE==='webkit'?webkit:chromium;
const base=process.env.TRIP_QA_URL||'http://127.0.0.1:15500/';
let browser;
before(async()=>{browser=await engine.launch({executablePath:engine===chromium?process.env.TRIP_CHROMIUM_EXECUTABLE_PATH:undefined});});
after(async()=>{await browser?.close();});

async function inPage(options, check) {
  const context=await browser.newContext(options);
  const page=await context.newPage();
  page.setDefaultTimeout(8000);
  const errors=[];
  await page.route('**/__/firebase/init.json',route=>route.fulfill({json:{}}));
  page.on('pageerror',err=>errors.push(err.message));
  try {await check(page);assert.deepEqual(errors,[]);}
  finally {await context.close();}
}
const visit=(page,hash='')=>page.goto(new URL(hash?'#'+hash:'',base).href);
const step=(page,change)=>page.locator(`[data-personal-duration] [data-duration-step="${change}"]`);
const dayInput=page=>page.getByRole('spinbutton',{name:'여행 일수'});
const paths=page=>page.locator('path[data-action="map-pref"]');
const routes=['home','explore','map','trip/tokyo','place/11','compare','plan','budget','prep','winter','saved','sources','profile','settings','groups','join/ABCDEF0123456789ABCDEF0123456789','privacy'];
const profiles={
  desktop:{viewport:{width:1440,height:900}},
  android:devices['Pixel 7'],
  iphone:devices['iPhone 13'],
  tablet:devices['iPad Mini']
};
for(const [name,options] of Object.entries(profiles)){
  if(engine===webkit&&name==='android')continue;
  test(`${name}: 17개 경로, 반응형, 메뉴 뒤로 가기와 새로고침`,async()=>inPage(options,async page=>{
    const httpFailures=[];
    page.on('response',response=>{if(response.url().startsWith(base)&&response.status()>=400)httpFailures.push(response.url());});
    for(const route of routes){
      await visit(page,route);
      await page.locator('main h1').first().waitFor();
      assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),route);
      assert.equal(await page.locator('main a[href^="javascript:"]').count(),0);
    }
    await visit(page,'home');
    await page.locator('main a[href="#winter"]').click();
    await page.waitForURL('**/#winter');
    await page.goBack();
    await page.waitForURL('**/#home');
    await page.reload();
    await page.getByRole('heading',{name:/우리의 첫 졸업여행/}).waitFor();
    assert.deepEqual(httpFailures,[]);
  }));
}

test('기간·연말 날짜·기존 일정·보관 및 복원·순서 변경·템플릿',async()=>inPage(profiles.iphone,async page=>{
  await page.addInitScript(()=>{
    if(sessionStorage.getItem('seeded'))return;
    sessionStorage.setItem('seeded','1');
    localStorage.setItem('japan-trip-2027-v1',JSON.stringify({saved:[],plans:{'osaka-0':[
      {stops:['첫 방문지'],memo:''},{stops:[],memo:''},{stops:['기존 일정'],memo:''}
    ]}}));
  });
  await visit(page,'plan');
  await page.getByRole('link',{name:'기존 일정 ↗'}).waitFor();
  let accept=false;
  page.on('dialog',dialog=>accept?dialog.accept():dialog.dismiss());
  await step(page,-1).click();
  assert.equal(await dayInput(page).inputValue(),'3');
  accept=true;
  await step(page,-1).click();
  await page.getByText(/기간 밖 일정은 보관 중/).waitFor();
  await step(page,1).click();
  await page.getByRole('link',{name:'기존 일정 ↗'}).waitFor();
  await page.getByLabel('출국일').fill('2026-12-31');
  await page.getByLabel('출국일').press('Tab');
  assert.equal(await page.getByLabel('귀국일').inputValue(),'2027-01-02');
  for(const bad of ['-1','1.5','999999']){
    await dayInput(page).fill(bad);
    await dayInput(page).press('Tab');
    assert.equal(await dayInput(page).inputValue(),'3');
  }
  await dayInput(page).fill('20');
  await dayInput(page).press('Tab');
  await page.getByRole('heading',{name:'20일차 2027-01-19',exact:true}).waitFor();
  await page.getByLabel('20일차 장소 추가').fill('<b>문자열 그대로</b>');
  await page.locator('[data-add-stop="19"] button').click();
  await page.getByRole('link',{name:'<b>문자열 그대로</b> ↗'}).waitFor();
  await page.locator('[data-action="move-day"][data-day="19"][data-index="-1"]').click();
  assert.equal(await page.locator('.timeline .day').nth(18).getByText('<b>문자열 그대로</b>',{exact:false}).count()>0,true);
  await page.locator('[data-action="move-stop"][data-day="18"][data-index="0"]').click();
  await page.getByRole('link',{name:'<b>문자열 그대로</b> ↗'}).waitFor({state:'hidden'});
  await dayInput(page).fill('1');
  await dayInput(page).press('Tab');
  await page.getByRole('heading',{name:/오사카.*당일치기/}).waitFor();
  await page.getByLabel('일정 템플릿').selectOption('1');
  await page.getByRole('button',{name:'템플릿 불러오기'}).click();
  await page.getByRole('heading',{name:'4일차 2027-01-03',exact:true}).waitFor();
  await page.reload();
  assert.equal(await dayInput(page).inputValue(),'4');
}));

test('예산·기간 재계산과 비정상 비용 입력',async()=>inPage(profiles.desktop,async page=>{
  await visit(page,'budget');
  await page.getByLabel('인원',{exact:true}).fill('3');
  await page.getByLabel('객실 수').fill('1');
  await page.getByLabel('객실 1박 비용').fill('100001');
  await page.getByLabel('1일 식비 (1인)').fill('10000');
  await page.getByLabel('1일 교통비 (1인)').fill('1000');
  await step(page,1).click();
  await page.locator('#budget-results').getByText('₩432,003',{exact:true}).waitFor();
  await page.getByLabel('객실 수').fill('0');
  assert.equal(await page.locator('#budget-form').evaluate(f=>f.checkValidity()),false);
  await page.getByLabel('객실 수').fill('1');
  await page.getByLabel('1일 식비 (1인)').fill('-1');
  assert.equal(await page.locator('#budget-form').evaluate(f=>f.checkValidity()),false);
  await page.getByLabel('1일 식비 (1인)').fill('');
  assert.equal(await page.locator('#budget-form').evaluate(f=>f.checkValidity()),true);
  await page.getByRole('button',{name:'예산 저장'}).click();
  await page.reload();
  assert.equal(await dayInput(page).inputValue(),'4');
  assert.equal(await page.getByLabel('1일 식비 (1인)').inputValue(),'0');
}));

test('전국 지도 툴팁, 확대, 하위 지역·관광지와 검색 중복 제거',async()=>inPage(profiles.desktop,async page=>{
  await visit(page,'map');
  await paths(page).first().waitFor();
  assert.equal(await paths(page).count(),47);
  const tip=page.getByRole('tooltip');
  for(const path of await paths(page).all()){
    await path.dispatchEvent('pointerover',{pointerType:'mouse',clientX:360,clientY:320});
    assert.equal((await tip.locator('strong,[lang=ja],small').allTextContents()).join(' · '),await path.getAttribute('aria-label'));
  }
  await page.getByRole('button',{name:'지도 확대',exact:true}).click();
  await page.getByRole('button',{name:'지도 축소',exact:true}).click();
  const area=name=>page.locator(`[data-area-filters] select[name="${name}"]`);
  assert.equal(await area('region').locator('option').count(),9);
  await area('region').selectOption('2');
  await page.waitForURL('**/#map/region/2');
  await area('pref').selectOption('10');
  await area('area').selectOption('10420');
  await area('child').selectOption('10426');
  await area('place').selectOption('2');
  await page.getByLabel('탐색 경로').filter({hasText:/군마현.*구사쓰/}).waitFor();
  await page.locator('svg circle').filter({hasText:'선택한 위치'}).waitFor();
  await visit(page,'explore');
  await page.locator('[data-area-search]').fill('오타루 운하');
  const results=page.locator('[data-area-results]');
  await results.locator('[href="#place/3"]').waitFor();
  assert.equal(await results.locator('[href="#place/city-2/0"],[href="#place/sapporo/3"]').count(),0);
  await page.locator('[data-place-types] input[value="자연"]').check();
  await page.locator('[data-place-types] input[value="체험"]').check();
  await page.locator('[data-place-list]').getByRole('link',{name:'다카치호 협곡'}).waitFor();
  await visit(page,'winter');
  await page.getByRole('heading',{name:'개최 일정 미확정'}).waitFor();
  await page.getByText(/히로사키성 천수 · 내부 관람 중지/).waitFor();
}));

test('초기 자료, 행정구역, 전국 검색 오류 후 재시도',async()=>inPage(profiles.desktop,async page=>{
  for(const data of ['data/trips.json','data/areas/10.json','data/areas/index.json']){
    await page.route('**/'+data,route=>route.fulfill({status:503}),{times:1});
  }
  await visit(page,'map/10');
  const retry=page.getByRole('button',{name:'다시 불러오기',exact:true});
  await retry.click();
  await page.getByText('행정구역 데이터를 불러오지 못했습니다.').waitFor();
  await retry.click();
  await page.locator('[data-area-filters] select[name=area]').waitFor();
  await page.locator('[data-area-search]').fill('구사쓰');
  await page.getByText('전국 검색 목록을 불러오지 못했습니다.').waitFor();
  await retry.click();
  await page.locator('[data-area-results] a[href="#map/10/10426"]').waitFor();
}));


test('attraction card photos, zoom, credits and unavailable state',async()=>inPage(profiles.iphone,async page=>{
  await visit(page,'trip/osaka');
  const cover=page.getByRole('button',{name:'도톤보리 사진 확대',exact:true});
  await cover.waitFor();
  const image=cover.locator('img');
  assert.equal(await image.getAttribute('loading'),'lazy');
  await page.waitForFunction(()=>{
    const cover=document.querySelector('[data-photo-title="도톤보리"]');
    if(!cover)return false;
    const {width,height}=cover.getBoundingClientRect();
    return height>0&&Math.abs(width/height-16/9)<.02;
  });
  await cover.click();
  const gallery=page.locator('dialog[open]');
  await gallery.getByRole('heading',{name:'도톤보리 사진',exact:true}).waitFor();
  await gallery.locator('img').evaluate(img=>img.decode());
  assert((await gallery.locator('[data-photo-credit] a').all()).length>=1);
  await page.getByRole('button',{name:'닫기',exact:true}).click();
  await visit(page,'place/1');
  await page.getByRole('button',{name:'메이지 신궁 사진 확대',exact:true}).click();
  const position=gallery.locator('[data-photo-position]');
  assert.equal(await position.textContent(),'1 / 3');
  await gallery.getByRole('button',{name:'다음 사진'}).click();
  assert.equal(await position.textContent(),'2 / 3');
  await page.keyboard.press('ArrowRight');
  assert.equal(await position.textContent(),'3 / 3');
  await gallery.locator('img').evaluate(img=>{
    const send=(name,x)=>{
      const event=new Event(name,{bubbles:true});
      Object.defineProperty(event,name==='touchstart'?'touches':'changedTouches',{value:[{clientX:x,clientY:100}]});
      img.dispatchEvent(event);
    };
    send('touchstart',180);
    send('touchend',65);
  });
  assert.equal(await position.textContent(),'1 / 3');
  await gallery.locator('img').evaluate(img=>img.decode());
  await page.getByRole('button',{name:'닫기',exact:true}).click();
  await visit(page,'trip/sapporo');
  const missing=page.locator('.attraction').filter({has:page.getByRole('link',{name:/스키장 및 스노보드 체험/})});
  await missing.getByText('대표 사진 미확보',{exact:true}).waitFor();
}));
