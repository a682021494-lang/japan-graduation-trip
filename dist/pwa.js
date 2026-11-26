export function setupPwa(){
  if(!('serviceWorker' in navigator))return;
  const local=['localhost','127.0.0.1'].includes(location.hostname);
  if(local&&new URLSearchParams(location.search).get('pwa-test')!=='1')return;
  const install=document.querySelector('[data-pwa-install]');
  const promptButton=document.querySelector('[data-install-prompt]');
  let prompt;
  window.addEventListener('beforeinstallprompt',event=>{
    event.preventDefault();
    prompt=event;
    promptButton.hidden=false;
  });
  promptButton.addEventListener('click',async()=>{
    if(!prompt)return;
    const event=prompt;
    prompt=null;
    promptButton.hidden=true;
    try {await event.prompt();} catch { /* The manual installation instructions remain available. */ }
  });
  if(window.matchMedia('(display-mode: standalone)').matches||navigator.standalone)install.hidden=true;
  if(!navigator.serviceWorker.controller)navigator.serviceWorker.addEventListener('controllerchange',()=>{
    for(const entry of performance.getEntriesByType('resource')){
      const url=new URL(entry.name);
      if(url.origin===location.origin&&!url.search&&/^\/(?:data\/areas\/|images\/)/.test(url.pathname)){
        void fetch(url,{cache:'force-cache'}).catch(()=>{});
      }
    }
  },{once:true});
  navigator.serviceWorker.register('/sw.js',{updateViaCache:'none'}).catch(()=>{});
}

export function fitMobileViewport(){
  const viewport=window.visualViewport;
  if(!viewport)return;
  const sync=()=>{
    const keyboard=viewport.scale<=1.05&&window.innerHeight-viewport.height>130&&document.activeElement?.matches('input, textarea, select');
    document.documentElement.classList.toggle('keyboard-open',Boolean(keyboard));
    if(!keyboard)return;
    const field=document.activeElement;
    const bounds=field.getBoundingClientRect();
    if(bounds.bottom>viewport.offsetTop+viewport.height-16||bounds.top<viewport.offsetTop)field.scrollIntoView({block:'center',behavior:'instant'});
  };
  viewport.addEventListener('resize',sync);
  document.addEventListener('focusin',sync);
  document.addEventListener('focusout',()=>requestAnimationFrame(sync));
}
