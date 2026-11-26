const cacheName = 'japan-trip-public-' + __PUBLIC_REVISION__;
const shell = new Set(__PUBLIC_SHELL__);
const publicData = /^\/(?:data\/areas\/(?:\d{2}|guides|places|index|tourism)\.json|images\/[a-z0-9/-]+\.(?:svg|webp))$/;

self.addEventListener('install', event => {
  event.waitUntil(caches.open(cacheName).then(cache => cache.addAll([...shell].map(url => new Request(url,{cache:'reload'})))));
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key =>
    key.startsWith('japan-trip-public-') && key!==cacheName).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});

async function staticResponse(key, request) {
  const cache = await caches.open(cacheName);
  const existing = await cache.match(key);
  if(existing)return existing;
  const response = await fetch(request);
  if(response.ok && response.type==='basic' && !response.redirected){
    try { await cache.put(key,response.clone()); } catch { /* Online access works when cache storage is full. */ }
  }
  return response;
}

self.addEventListener('fetch', event => {
  const {request}=event;
  const url=new URL(request.url);
  if(request.method!=='GET'||url.origin!==self.location.origin||request.headers.has('authorization'))return;
  const local=['localhost','127.0.0.1'].includes(url.hostname);
  if(request.mode==='navigate'&&['/','/index.html'].includes(url.pathname)&&(!url.search||local&&url.search==='?pwa-test=1')){
    event.respondWith(staticResponse('/',request));
    return;
  }
  const key=url.pathname+url.search;
  if(shell.has(key)||(!url.search&&publicData.test(url.pathname)))event.respondWith(staticResponse(key,request));
});
