import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname } from 'node:path';
import { chromium, devices, webkit } from 'playwright';

const base=process.env.TRIP_QA_URL||'http://127.0.0.1:15500/';
const engine=process.env.TRIP_QA_ENGINE==='webkit'?webkit:chromium;
let browser;
before(async()=>{browser=await engine.launch({executablePath:engine===chromium?process.env.TRIP_CHROMIUM_EXECUTABLE_PATH:undefined});});
after(async()=>{await browser?.close();});
const pageUrl=hash=>new URL(hash,base).href;

test('small phone and landscape: fixed navigation, targets, detail panel and history',async()=>{
  const context=await browser.newContext({...devices['iPhone 13'],viewport:{width:320,height:640}});
  try {
    const page=await context.newPage();
    await page.route('**/__/firebase/init.json',route=>route.fulfill({json:{}}));
    await page.goto(pageUrl('#map/10/10426/2'));
    const sheet=page.getByRole('complementary',{name:'선택한 여행지'});
    await sheet.getByText('구사쓰 온천 유바타케',{exact:true}).waitFor();
    const nav=page.getByRole('navigation',{name:'하단 메뉴'});
    for(const item of await nav.getByRole('link').all()){
      const box=await item.boundingBox();assert(box.width>=44&&box.height>=44);
    }
    await sheet.getByRole('link',{name:'상세 보기'}).click();
    await page.waitForURL('**/#place/2');
    await page.goBack();
    await sheet.waitFor();
    await sheet.getByRole('button',{name:'닫기'}).click();
    await sheet.waitFor({state:'hidden'});
    await nav.getByRole('link',{name:'일정'}).click();
    await page.locator('.day-head .icon').first().waitFor();
    for(const item of await page.locator('.day-head .icon,#account .btn').all()){
      const box=await item.boundingBox();assert(box.width>=44&&box.height>=44);
    }
    await nav.getByRole('link',{name:'예산'}).click();
    await page.waitForURL('**/#budget');
    await page.waitForFunction(()=>{
      const input=document.querySelector('#budget-form [name=days]');
      return input&&getComputedStyle(input).fontSize==='16px';
    });
    await page.setViewportSize({width:640,height:320});
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth+1));
    assert.equal(await nav.evaluate(nav=>getComputedStyle(nav).position),'fixed');
  }finally{await context.close();}
});

test('signed-out account controls fit a 390px viewport',async()=>{
  const context=await browser.newContext({viewport:{width:390,height:850}});
  try{
    const page=await context.newPage();
    await page.route('**/__/firebase/init.json',route=>route.fulfill({
      json:{projectId:'demo-trip-2027',apiKey:'demo-api-key',authDomain:'localhost'}
    }));
    await page.goto(pageUrl('#trip/osaka'));
    await page.getByRole('button',{name:'Google 로그인'}).waitFor();
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth+1));
  }finally{await context.close();}
});

test('Android Chromium: one-finger map drag and two-finger pinch',{skip:engine!==chromium},async()=>{
  const context=await browser.newContext(devices['Pixel 7']);
  try {
    const page=await context.newPage();
    await page.route('**/__/firebase/init.json',route=>route.fulfill({json:{}}));
    await page.goto(pageUrl('#map'));
    const map=page.locator('.map-shell svg');
    await map.waitFor();
    const box=await map.boundingBox();
    const x=Math.round(box.x+box.width/2),y=Math.round(box.y+box.height/2);
    const devtools=await context.newCDPSession(page);
    const touch=(type,touchPoints)=>devtools.send('Input.dispatchTouchEvent',{type,touchPoints});
    const start=await map.getAttribute('viewBox');
    await touch('touchStart',[{x,y,id:1}]);
    await touch('touchMove',[{x:x+42,y:y-12,id:1}]);
    await touch('touchEnd',[]);
    assert.notEqual(await map.getAttribute('viewBox'),start);
    assert(page.url().endsWith('#map'));
    await touch('touchStart',[{x:x-22,y,id:1},{x:x+22,y,id:2}]);
    await touch('touchMove',[{x:x-68,y,id:1},{x:x+68,y,id:2}]);
    await touch('touchEnd',[]);
    assert(Number((await map.getAttribute('viewBox')).split(' ')[2])<680);
    assert(page.url().endsWith('#map'));
  }finally{await context.close();}
});

test('PWA manifest, offline public content and private-cache isolation',async()=>{
  let offline=false;
  const contentTypes={'.js':'text/javascript','.css':'text/css','.html':'text/html','.json':'application/json',
    '.webmanifest':'application/manifest+json','.png':'image/png','.webp':'image/webp','.woff':'font/woff'};
  // A transport failure at the origin exercises the worker without WebKit's automation network gate.
  const server=createServer(async(req,res)=>{
    if(offline){req.socket.destroy();return;}
    const path=new URL(req.url,'http://localhost').pathname;
    const file=path==='/'?'/index.html':path;
    try{
      const body=await readFile(new URL('../dist'+file,import.meta.url));
      res.writeHead(200,{'Content-Type':contentTypes[extname(file)]||'application/octet-stream','Cache-Control':'no-store'});
      res.end(body);
    }catch{res.writeHead(404);res.end();}
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const origin='http://127.0.0.1:'+server.address().port;
  const context=await browser.newContext(devices[engine===webkit?'iPhone 13':'Pixel 7']);
  try {
    const page=await context.newPage();
    await page.route('**/__/firebase/init.json',route=>route.fulfill({json:{privateTestOnly:'never cache'}}));
    await page.goto(origin+'/?pwa-test=1#explore');
    await page.waitForFunction(async()=>Boolean(await navigator.serviceWorker.getRegistration()));
    await page.waitForFunction(()=>Boolean(navigator.serviceWorker.controller));
    const manifest=await page.evaluate(()=>fetch('/manifest.webmanifest').then(response=>response.json()));
    assert.equal(manifest.display,'standalone');
    assert.deepEqual(manifest.icons.map(icon=>icon.sizes),['192x192','512x512']);
    await page.goto(origin+'/?pwa-test=1#place/2');
    await page.getByRole('heading',{name:'구사쓰 온천 유바타케'}).waitFor();
    await page.evaluate(()=>fetch('/__/firebase/init.json'));
    const entries=await page.evaluate(async()=>Promise.all((await caches.keys()).map(async key=>(await (await caches.open(key)).keys()).map(entry=>new URL(entry.url).pathname))));
    assert(entries.flat().includes('/data/areas/places.json'));
    assert(!entries.flat().some(path=>path.startsWith('/__/')||path==='/cloud-sdk.js'));
    offline=true;
    await page.goto(origin+'/index.html?pwa-test=1#place/2');
    await page.getByRole('heading',{name:'구사쓰 온천 유바타케'}).waitFor();
    offline=false;
    await page.goto(origin+'/?pwa-test=1#map/10/10426/2');
    await page.getByRole('complementary',{name:'선택한 여행지'}).waitFor();
  }finally{await context.close();await new Promise(resolve=>server.close(resolve));}
});
