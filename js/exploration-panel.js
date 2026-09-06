const STORE='maze-exploration-panel-v1';
const panel=document.querySelector('.look-panel');
const shell=document.querySelector('.crawler-shell');
const featureList=document.querySelector('#featureList');

if(panel&&shell){
  panel.classList.add('exploration-panel-enhanced');

  const bar=document.createElement('div');
  bar.className='exploration-panel-bar';
  bar.innerHTML=`
    <span class="panel-drag-handle" role="button" tabindex="0" aria-label="Fenster verschieben" title="Ziehen: Fenster verschieben · Doppelklick: kompakt/letzte Größe">⋮⋮</span>
    <div class="exploration-panel-tabs" role="tablist" aria-label="Erkundungsfenster">
      <button type="button" data-panel-tab="controls" role="tab">Steuern</button>
      <button type="button" data-panel-tab="details" role="tab">Details <span class="panel-detail-count">0</span></button>
    </div>
    <div class="exploration-panel-size" aria-label="Fenstergröße">
      <button type="button" data-panel-size="compact" title="Kompakt">▁</button>
      <button type="button" data-panel-size="normal" title="Normal">▣</button>
      <button type="button" data-panel-size="large" title="Groß">□</button>
    </div>`;
  panel.prepend(bar);

  const handle=bar.querySelector('.panel-drag-handle');
  const tabButtons=[...bar.querySelectorAll('[data-panel-tab]')];
  const count=bar.querySelector('.panel-detail-count');
  let tab='controls';
  let dragging=null;
  let restoring=true;
  let lastExpanded=null;
  let saveTimer=null;

  function readStore(){try{return JSON.parse(localStorage.getItem(STORE)||'{}')||{}}catch{return {}}}
  function clamp(v,min,max){return Math.max(min,Math.min(max,v))}
  function bounds(){return {w:shell.clientWidth,h:shell.clientHeight}}
  function layoutVisible(){const b=bounds();return b.w>=100&&b.h>=100&&panel.offsetWidth>=100&&panel.offsetHeight>=100}
  function setTab(next,persist=true){
    tab=next==='details'?'details':'controls';
    panel.classList.toggle('panel-tab-details',tab==='details');
    panel.classList.toggle('panel-tab-controls',tab==='controls');
    for(const button of tabButtons){const active=button.dataset.panelTab===tab;button.classList.toggle('active',active);button.setAttribute('aria-selected',String(active))}
    if(persist)scheduleSave();
  }
  function positionInside(){
    if(!layoutVisible())return;
    const b=bounds(),w=panel.offsetWidth,h=panel.offsetHeight;
    const left=clamp(parseFloat(panel.style.left)||0,4,Math.max(4,b.w-w-4));
    const top=clamp(parseFloat(panel.style.top)||0,4,Math.max(4,b.h-h-4));
    panel.style.left=`${left}px`;panel.style.top=`${top}px`;panel.style.right='auto';panel.style.bottom='auto';
  }
  function snapshot(){if(!layoutVisible())return null;return {x:parseFloat(panel.style.left)||0,y:parseFloat(panel.style.top)||0,w:panel.offsetWidth,h:panel.offsetHeight,tab}}
  function scheduleSave(){if(restoring)return;clearTimeout(saveTimer);saveTimer=setTimeout(()=>{const state=snapshot();if(state)localStorage.setItem(STORE,JSON.stringify(state))},80)}
  function applySize(kind){
    if(kind==='compact'){
      if(panel.offsetHeight>180)lastExpanded={w:panel.offsetWidth,h:panel.offsetHeight,tab};
      panel.style.width='240px';panel.style.height='160px';setTab('controls',false);
    }else if(kind==='large'){
      panel.style.width='480px';panel.style.height='470px';
    }else{
      panel.style.width='320px';panel.style.height='330px';
    }
    positionInside();scheduleSave();
  }
  function toggleCompact(){
    if(panel.offsetHeight<=180&&lastExpanded){panel.style.width=`${lastExpanded.w}px`;panel.style.height=`${lastExpanded.h}px`;setTab(lastExpanded.tab,false);lastExpanded=null;positionInside();scheduleSave()}
    else applySize('compact');
  }
  function updateCount(){
    const items=[...(featureList?.querySelectorAll('.feature-item')||[])];
    for(const item of items){const title=item.querySelector('b');if(title?.textContent)title.title=title.textContent.trim()}
    if(!count)return;
    const n=items.length;
    count.textContent=String(n);
    count.title=n===1?'1 sichtbarer Fund/Suchpunkt':`${n} sichtbare Funde/Suchpunkte`;
  }

  for(const button of tabButtons)button.addEventListener('click',()=>setTab(button.dataset.panelTab));
  for(const button of bar.querySelectorAll('[data-panel-size]'))button.addEventListener('click',()=>applySize(button.dataset.panelSize));

  handle.addEventListener('dblclick',event=>{event.preventDefault();toggleCompact()});
  handle.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();toggleCompact()}});
  handle.addEventListener('pointerdown',event=>{
    if(event.button!==0||!layoutVisible())return;
    const r=panel.getBoundingClientRect(),s=shell.getBoundingClientRect();
    dragging={pointerId:event.pointerId,dx:event.clientX-r.left,dy:event.clientY-r.top,shell:s};
    handle.setPointerCapture?.(event.pointerId);event.preventDefault();
  });
  handle.addEventListener('pointermove',event=>{
    if(!dragging||dragging.pointerId!==event.pointerId||!layoutVisible())return;
    const b=bounds(),w=panel.offsetWidth,h=panel.offsetHeight;
    const x=clamp(event.clientX-dragging.shell.left-dragging.dx,4,Math.max(4,b.w-w-4));
    const y=clamp(event.clientY-dragging.shell.top-dragging.dy,4,Math.max(4,b.h-h-4));
    panel.style.left=`${x}px`;panel.style.top=`${y}px`;panel.style.right='auto';panel.style.bottom='auto';scheduleSave();
  });
  const endDrag=event=>{if(dragging&&(!event||event.pointerId===dragging.pointerId)){dragging=null;scheduleSave()}};
  handle.addEventListener('pointerup',endDrag);handle.addEventListener('pointercancel',endDrag);

  new MutationObserver(updateCount).observe(featureList||panel,{childList:true,subtree:true});
  if('ResizeObserver'in window)new ResizeObserver(()=>{positionInside();scheduleSave()}).observe(panel);
  window.addEventListener('resize',()=>{positionInside();scheduleSave()});

  requestAnimationFrame(()=>{
    const saved=readStore(),shellRect=shell.getBoundingClientRect(),panelRect=panel.getBoundingClientRect();
    panel.style.right='auto';panel.style.bottom='auto';
    panel.style.left=`${Number.isFinite(saved.x)?saved.x:Math.max(4,panelRect.left-shellRect.left)}px`;
    panel.style.top=`${Number.isFinite(saved.y)?saved.y:Math.max(4,panelRect.top-shellRect.top)}px`;
    if(Number.isFinite(saved.w))panel.style.width=`${clamp(saved.w,230,520)}px`;
    if(Number.isFinite(saved.h))panel.style.height=`${clamp(saved.h,150,Math.max(150,shell.clientHeight-8))}px`;
    setTab(saved.tab||'controls',false);positionInside();updateCount();restoring=false;scheduleSave();
  });
}
