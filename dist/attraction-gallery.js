import { attractionPhotos } from './data/attraction-photos.js';

export function setupAttractionGallery({esc,link,dialog,body,main}){
  let photos=[], selected=0, name='', start;
  function preview(photo,title){
    return `<img src="images/${esc(photo.file)}" width="640" height="360" loading="lazy" decoding="async" data-attraction-image alt="${esc(title)} 사진">`;
  }
  function cover(title,index=0){
    const photo=attractionPhotos(title)[index];
    if(!photo)return '<p class="attraction-photo-empty">대표 사진 미확보</p>';
    return `<button type="button" class="attraction-photo" data-photo-title="${esc(title)}" data-photo-index="${index}" aria-label="${esc(title)} ${index?index+1+'번째 ':''}사진 확대">${preview(photo,title)}</button>`;
  }
  function attribution(photo){
    return `${link(photo.artist,photo.source)} · ${photo.licenseUrl?link(photo.license,photo.licenseUrl):esc(photo.license)} · WebP 변환`;
  }
  function detail(title){
    const items=attractionPhotos(title);
    if(!items.length)return cover(title);
    return `<section class="stack attraction-photo-section"><h2>관광지 사진</h2>
      ${cover(title)}<small class="links">${attribution(items[0])}</small>
      ${items.length>1?`<div class="attraction-thumbnails">${items.slice(1).map((_,i)=>cover(title,i+1)).join('')}</div>`:''}
      </section>`;
  }
  function show(){
    const photo=photos[selected];
    body.querySelector('[data-gallery-error]').hidden=true;
    body.querySelector('img').src='images/'+photo.file;
    body.querySelector('[data-photo-credit]').innerHTML=attribution(photo);
    body.querySelector('[data-photo-position]').textContent=(selected+1)+' / '+photos.length;
  }
  function advance(direction){
    if(photos.length<2)return;
    selected=(selected+direction+photos.length)%photos.length;
    show();
  }
  main.addEventListener('click',event=>{
    const button=event.target.closest('[data-photo-title]');
    if(!button)return;
    start=null;
    name=button.dataset.photoTitle;
    photos=attractionPhotos(name);
    selected=Number(button.dataset.photoIndex);
    if(!photos[selected])return;
    const controls=photos.length>1?`<button type="button" class="icon" data-photo-step="-1" aria-label="이전 사진">←</button>`:'';
    const next=photos.length>1?`<button type="button" class="icon" data-photo-step="1" aria-label="다음 사진">→</button>`:'';
    body.innerHTML=`<div class="stack" data-attraction-gallery><h2>${esc(name)} 사진</h2>
      <img class="attraction-gallery-image" alt="${esc(name)} 사진" width="960" height="540">
      <p data-gallery-error role="status" hidden>사진을 불러오지 못했습니다.</p>
      <div class="row gallery-controls">${controls}<span data-photo-position aria-live="polite"></span>${next}</div>
      <small class="links" data-photo-credit></small></div>`;
    show();
    dialog.showModal();
  });
  body.addEventListener('click',event=>{
    const step=event.target.closest('[data-photo-step]');
    if(step)advance(Number(step.dataset.photoStep));
  });
  dialog.addEventListener('keydown',event=>{
    if(!body.querySelector('[data-attraction-gallery]')||!['ArrowLeft','ArrowRight'].includes(event.key))return;
    event.preventDefault();
    advance(event.key==='ArrowLeft'?-1:1);
  });
  body.addEventListener('touchstart',event=>{
    start=null;
    if(event.target.matches('.attraction-gallery-image')&&event.touches.length===1){
      const touch=event.touches[0];start={x:touch.clientX,y:touch.clientY};
    }
  },{passive:true});
  body.addEventListener('touchend',event=>{
    if(!start)return;
    const touch=event.changedTouches[0],dx=touch.clientX-start.x,dy=touch.clientY-start.y;
    start=null;
    if(Math.abs(dx)>45&&Math.abs(dx)>Math.abs(dy))advance(dx<0?1:-1);
  },{passive:true});
  body.addEventListener('touchcancel',()=>{start=null;},{passive:true});
  body.addEventListener('error',event=>{
    if(event.target.matches?.('.attraction-gallery-image'))body.querySelector('[data-gallery-error]').hidden=false;
  },true);
  main.addEventListener('error',event=>{
    const image=event.target;
    if(!image.matches?.('[data-attraction-image]'))return;
    const text=document.createElement('p');
    text.className='attraction-photo-empty';
    text.textContent='사진을 불러오지 못했습니다.';
    image.closest('button').replaceWith(text);
  },true);
  return {cover,detail};
}
