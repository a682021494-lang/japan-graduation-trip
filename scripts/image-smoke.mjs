import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import { tripImages } from '../dist/data/trip-images.js';
import { attractionPhotos } from '../dist/data/attraction-photos.js';

const {destinations,cities}=JSON.parse(await readFile(new URL('../dist/data/trips.json',import.meta.url)));
const entries=[...destinations,...cities];
const places=JSON.parse(await readFile(new URL('../dist/data/areas/places.json',import.meta.url)));
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
    for(const {id,attractions} of entries){
      await page.evaluate(id=>{location.hash='trip/'+id;},id);
      const credit=tripImages[id];
      const cover=page.locator('.detail-cover[src="images/'+credit.file+'"]');
      await cover.waitFor();
      const alt=await cover.getAttribute('alt');
      assert.equal(alt.includes('AI 삽화'),credit.ai,id);
      assert(await cover.evaluate(img=>img.decode().then(()=>img.naturalWidth>0)));
      const photoCards=page.locator('.attraction');
      assert.equal(await photoCards.count(),attractions.length,id);
      const expected=attractions.flatMap(name=>attractionPhotos(name).slice(0,1).map(photo=>'images/'+photo.file));
      const loaded=await photoCards.locator('[data-attraction-image]').evaluateAll(async images=>Promise.all(images.map(async img=>{
        img.loading='eager';
        await img.decode();
        if(!img.naturalWidth)throw Error(img.src);
        return img.getAttribute('src');
      })));
      assert.deepEqual(loaded,expected,id);
      assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),id);
    }
    for(const [id,place] of Object.entries(places)){
      await page.goto(new URL('#place/'+id,base).href);
      await page.getByRole('heading',{name:place.name,exact:true}).waitFor();
      const photos=attractionPhotos(place.name);
      assert.equal(await page.locator('.attraction-photo-section [data-attraction-image]').count(),photos.length,id);
    }
    if(width===1440){
      const files=[...new Set(entries.flatMap(entry=>entry.attractions).concat(Object.values(places).map(place=>place.name))
        .flatMap(name=>attractionPhotos(name).map(photo=>photo.file)))];
      for(let offset=0;offset<files.length;offset+=8){
        await page.evaluate(async group=>Promise.all(group.map(async file=>{
          const response=await fetch('/images/'+file);
          if(!response.ok||!response.headers.get('content-type')?.includes('image/webp'))throw Error(file);
          const bitmap=await createImageBitmap(await response.blob());
          bitmap.close();
        })),files.slice(offset,offset+8));
      }
      console.log(`명소 사진 ${files.length}장 HTTP 및 WebP 디코딩 검증 통과`);
    }
    assert.deepEqual(imageErrors,[]);
    console.log(`${width}px: 84개 목록 이미지와 상세 이미지 검증 통과`);
    await page.close();
  }
}finally{await browser.close();}
