export function viewBox(zoom, [x,y]) {
  const width=680/zoom, height=540/zoom;
  return [x-width/2,y-height/2,width,height].join(' ');
}

export function setupMapGestures(main, selection, redraw, onMove) {
  const points=new Map();
  let svg, moved=false, suppressClick=false;
  const clamp=(value,min,max)=>Math.min(max,Math.max(min,value));
  const point=event=>({x:event.clientX,y:event.clientY});
  const center=items=>items.reduce((sum,p)=>({x:sum.x+p.x/items.length,y:sum.y+p.y/items.length}),{x:0,y:0});
  const distance=([a,b])=>b?Math.hypot(a.x-b.x,a.y-b.y):0;
  const world=p=>new DOMPoint(p.x,p.y).matrixTransform(svg.getScreenCTM().inverse());

  main.addEventListener('pointerdown',event=>{
    if(event.pointerType!=='touch')return;
    const map=event.target.closest('.map-shell svg');
    if(!map)return;
    if(svg!==map||!points.size){svg=map;points.clear();moved=false;suppressClick=false;}
    if(points.size>=2)return;
    points.set(event.pointerId,point(event));
  });
  main.addEventListener('pointermove',event=>{
    if(!points.has(event.pointerId)||!svg?.isConnected||!svg.getScreenCTM())return;
    const previous=points.get(event.pointerId);
    const next=point(event);
    if(!moved&&points.size===1&&Math.hypot(next.x-previous.x,next.y-previous.y)<6)return;
    if(!moved){
      moved=true;
      onMove();
      for(const id of points.keys()){
        try { svg.setPointerCapture(id); } catch { /* An ended pointer needs no capture. */ }
      }
    }
    const before=[...points.values()];
    const anchor=world(center(before));
    points.set(event.pointerId,next);
    const after=[...points.values()];
    const ratio=distance(before)>0?distance(after)/distance(before):1;
    selection.zoom=clamp(selection.zoom*ratio,1,4);
    svg.setAttribute('viewBox',viewBox(selection.zoom,selection.center));
    const placed=world(center(after));
    selection.center=[clamp(selection.center[0]+anchor.x-placed.x,0,680),clamp(selection.center[1]+anchor.y-placed.y,0,540)];
    svg.setAttribute('viewBox',viewBox(selection.zoom,selection.center));
  });
  const stop=event=>{
    if(!points.delete(event.pointerId)||points.size||!moved)return;
    suppressClick=true;
    if(svg?.isConnected)redraw();
    svg=null;
  };
  main.addEventListener('pointerup',stop);
  main.addEventListener('pointercancel',stop);
  main.addEventListener('click',event=>{
    if(!suppressClick||event.detail===0||!event.target.closest('.map-shell'))return;
    suppressClick=false;
    event.preventDefault();
    event.stopImmediatePropagation();
  },true);
}
