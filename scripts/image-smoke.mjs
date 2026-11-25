import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import { tripImages } from '../dist/data/trip-images.js';

const {destinations,cities}=JSON.parse(await readFile(new URL('../dist/data/trips.json',import.meta.url)));
const entries=[...destinations,...cities];
const base=process.env.TRIP_IMAGE_TEST_URL||'http://127.0.0.1:15500/';
assert.equal(entries.length,84);
assert.deepEqual(Object.keys(tripImages).sort(),entries.map(d=>d.id).sort());

const browser=await chromium.launch({executablePath:process.env.TRIP_CHROMIUM_EXECUTABLE_PATH});
try{
  for(const width of [1440,390]){
    const page=await browser.newPage({viewport:{width,height:850}});
    const imageErrors=[];
    page.on('response',res=>{if(res.request().resourceType()==='image'&&!res.ok())imageErrors.push(res.url());});
    page.on('requestfailed',req=>{if(req.resourceType()==='image')imageErrors.push(req.url());});
    await page.goto(new URL('#explore',base).href);
    const gallery=page.locator('.card-grid img, .city-image-grid img');
    await gallery.last().waitFor({state:'attached'});
    assert.equal(await gallery.count(),84);
    await gallery.evaluateAll(images=>Promise.all(images.map(async img=>{
      img.loading='eager';
      await img.decode();
      if(!img.naturalWidth||!img.hasAttribute('data-fallback'))throw Error(img.src);
    })));
    for(const {id} of entries){
      await page.evaluate(id=>{location.hash='trip/'+id;},id);
      const credit=tripImages[id];
      const cover=page.locator('.detail-cover[src="images/'+credit.file+'"]');
      await cover.waitFor();
      const alt=await cover.getAttribute('alt');
      assert.equal(alt.includes('AI 삽화'),credit.ai,id);
      assert(await cover.evaluate(img=>img.decode().then(()=>img.naturalWidth>0)));
      assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),id);
    }
    assert.deepEqual(imageErrors,[]);
    console.log(`${width}px: 84개 목록 이미지와 상세 이미지 검증 통과`);
    await page.close();
  }
}finally{await browser.close();}
