const controlPanel=document.querySelector('.look-panel');
const shell=document.querySelector('.crawler-shell');
const roomExplore=document.querySelector('#roomExplore');
const featureList=document.querySelector('#featureList');

function hashString(value){let h=2166136261;for(const c of String(value)){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return (h>>>0).toString(36)}
function uiScope(){
  const params=new URLSearchParams(window.location.search);
  const room=params.get('room')||'local';
  const play=params.get('play')||'gm';
  let client='browser';
  try{
    const key='maze-ui-client-v1';
    client=localStorage.getItem(key)||'';
    if(!client){client=globalThis.crypto?.randomUUID?.()||`${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;localStorage.setItem(key,client)}
  }catch{}
  return hashString(`${room}|${play}|${client}`);
}
const SCOPE=uiScope();
const CONTROL_STORE=`maze-control-panel-v2:${SCOPE}`;
const DETAIL_STORE=`maze-detail-panel-v2:${SCOPE}`;

function readStore(key){try{return JSON.parse(localStorage.getItem(key)||'{}')||{}}catch{return {}}}
function saveStore(key,value){try{localStorage.setItem(key,JSON.stringify(value))}catch{}}
function clamp(v,min,max){return Math.max(min,Math.min(max,v))}

if(controlPanel&&shell&&featureList){
  /* Remove the former tabbed header if a cached DOM snapshot ever contains it. */
  controlPanel.querySelector('.exploration-panel-bar')?.remove();
  controlPanel.classList.remove('panel-tab-controls','panel-tab-details','exploration-panel-enhanced');
  controlPanel.classList.add('personal-control-panel');

  const controlHead=document.createElement('div');
  controlHead.className='floating-panel-head control-panel-head';
  controlHead.innerHTML=`<span class="floating-drag-handle" role="button" tabindex="0" aria-label="Steuerfenster verschieben" title="Ziehen: Steuerfenster verschieben">⋮⋮</span><strong>Steuern</strong>`;
  controlPanel.prepend(controlHead);

  const detailPanel=document.createElement('aside');
  detailPanel.id='explorationDetailsPanel';
  detailPanel.className='exploration-details-panel';
  detailPanel.innerHTML=`
    <div class="floating-panel-head detail-panel-head">
      <span class="floating-drag-handle" role="button" tabindex="0" aria-label="Detailfenster verschieben" title="Ziehen: Detailfenster verschieben">⋮⋮</span>
      <strong>Funde &amp; Details <span class="panel-detail-count">0</span></strong>
      <div class="detail-size-buttons" aria-label="Detailfenstergröße">
        <button type="button" data-detail-size="compact" title="Klein">▁</button>
        <button type="button" data-detail-size="normal" title="Normal">▣</button>
        <button type="button" data-detail-size="large" title="Groß">□</button>
      </div>
      <button type="button" class="detail-collapse" aria-label="Details einklappen" title="Details ein-/ausklappen">−</button>
    </div>
    <div class="exploration-details-body">
      <button type="button" class="details-search-proxy">⌕ Gründlich suchen</button>
    </div>`;
  shell.append(detailPanel);
  const detailBody=detailPanel.querySelector('.exploration-details-body');
  detailBody.append(featureList);

  const count=detailPanel.querySelector('.panel-detail-count');
  const searchProxy=detailPanel.querySelector('.details-search-proxy');
  const collapse=detailPanel.querySelector('.detail-collapse');
  let controlDragging=null,detailDragging=null;
  let controlSaveTimer=null,detailSaveTimer=null;
  let detailCollapsed=false;

  function shellVisible(){return shell.clientWidth>=100&&shell.clientHeight>=100}
  function positionInside(panel){
    if(!shellVisible()||panel.hidden)return;
    const w=panel.offsetWidth,h=panel.offsetHeight;
    const x=clamp(parseFloat(panel.style.left)||4,4,Math.max(4,shell.clientWidth-w-4));
    const y=clamp(parseFloat(panel.style.top)||4,4,Math.max(4,shell.clientHeight-h-4));
    panel.style.left=`${x}px`;panel.style.top=`${y}px`;panel.style.right='auto';panel.style.bottom='auto';
  }
  function snapshot(panel,extra={}){if(!shellVisible()||panel.hidden)return null;return {x:parseFloat(panel.style.left)||0,y:parseFloat(panel.style.top)||0,w:panel.offsetWidth,h:panel.offsetHeight,...extra}}
  function scheduleControlSave(){clearTimeout(controlSaveTimer);controlSaveTimer=setTimeout(()=>{const state=snapshot(controlPanel);if(state)saveStore(CONTROL_STORE,state)},90)}
  function scheduleDetailSave(){clearTimeout(detailSaveTimer);detailSaveTimer=setTimeout(()=>{const state=snapshot(detailPanel,{collapsed:detailCollapsed});if(state)saveStore(DETAIL_STORE,state)},90)}

  function installDrag(panel,handle,kind){
    let drag=null;
    handle.addEventListener('pointerdown',event=>{
      if(event.button!==0||!shellVisible())return;
      const r=panel.getBoundingClientRect(),s=shell.getBoundingClientRect();
      drag={id:event.pointerId,dx:event.clientX-r.left,dy:event.clientY-r.top,shell:s};
      handle.setPointerCapture?.(event.pointerId);event.preventDefault();
    });
    handle.addEventListener('pointermove',event=>{
      if(!drag||drag.id!==event.pointerId||!shellVisible())return;
      const x=clamp(event.clientX-drag.shell.left-drag.dx,4,Math.max(4,shell.clientWidth-panel.offsetWidth-4));
      const y=clamp(event.clientY-drag.shell.top-drag.dy,4,Math.max(4,shell.clientHeight-panel.offsetHeight-4));
      panel.style.left=`${x}px`;panel.style.top=`${y}px`;panel.style.right='auto';panel.style.bottom='auto';
      if(kind==='control')scheduleControlSave();else scheduleDetailSave();
    });
    const end=event=>{if(drag&&(!event||event.pointerId===drag.id)){drag=null;if(kind==='control')scheduleControlSave();else scheduleDetailSave()}};
    handle.addEventListener('pointerup',end);handle.addEventListener('pointercancel',end);
  }

  function connectSearch(){
    const original=roomExplore?.querySelector('#roomSearch');
    if(!original){searchProxy.disabled=true;searchProxy.title='Suche ist an diesem Ort nicht verfügbar.';return}
    original.classList.add('details-search-origin');
    original.hidden=true;
    searchProxy.disabled=false;
    searchProxy.textContent=original.textContent||'⌕ Gründlich suchen';
    searchProxy.title=original.title||'';
    if(searchProxy.dataset.bound!=='1'){
      searchProxy.dataset.bound='1';
      searchProxy.addEventListener('click',()=>roomExplore?.querySelector('#roomSearch')?.click());
    }
  }
  function syncVisibility(){
    const roomEnabled=roomExplore&&!roomExplore.hidden;
    detailPanel.hidden=!roomEnabled;
    if(roomEnabled){connectSearch();positionInside(detailPanel)}
  }
  function updateCount(){
    const items=[...featureList.querySelectorAll('.feature-item')];
    for(const item of items){const title=item.querySelector('b');if(title?.textContent)title.title=title.textContent.trim()}
    count.textContent=String(items.length);
    count.title=items.length===1?'1 sichtbarer Fund/Suchpunkt':`${items.length} sichtbare Funde/Suchpunkte`;
  }
  function setCollapsed(next){
    detailCollapsed=Boolean(next);
    detailPanel.classList.toggle('is-collapsed',detailCollapsed);
    collapse.textContent=detailCollapsed?'＋':'−';
    collapse.setAttribute('aria-label',detailCollapsed?'Details ausklappen':'Details einklappen');
    positionInside(detailPanel);scheduleDetailSave();
  }
  function applyDetailSize(kind){
    setCollapsed(false);
    if(kind==='compact'){detailPanel.style.width='300px';detailPanel.style.height='235px'}
    else if(kind==='large'){detailPanel.style.width='520px';detailPanel.style.height='500px'}
    else{detailPanel.style.width='390px';detailPanel.style.height='360px'}
    positionInside(detailPanel);scheduleDetailSave();
  }

  installDrag(controlPanel,controlHead.querySelector('.floating-drag-handle'),'control');
  installDrag(detailPanel,detailPanel.querySelector('.floating-drag-handle'),'detail');
  collapse.addEventListener('click',()=>setCollapsed(!detailCollapsed));
  for(const button of detailPanel.querySelectorAll('[data-detail-size]'))button.addEventListener('click',()=>applyDetailSize(button.dataset.detailSize));

  new MutationObserver(()=>{connectSearch();syncVisibility()}).observe(roomExplore||controlPanel,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden']});
  new MutationObserver(updateCount).observe(featureList,{childList:true,subtree:true});
  if('ResizeObserver'in window){
    new ResizeObserver(()=>{positionInside(controlPanel);scheduleControlSave()}).observe(controlPanel);
    new ResizeObserver(()=>{positionInside(detailPanel);scheduleDetailSave()}).observe(detailPanel);
  }
  window.addEventListener('resize',()=>{positionInside(controlPanel);positionInside(detailPanel);scheduleControlSave();scheduleDetailSave()});

  requestAnimationFrame(()=>{
    const shellRect=shell.getBoundingClientRect(),controlRect=controlPanel.getBoundingClientRect();
    const c=readStore(CONTROL_STORE),d=readStore(DETAIL_STORE);
    controlPanel.style.right='auto';controlPanel.style.bottom='auto';
    controlPanel.style.left=`${Number.isFinite(c.x)?c.x:Math.max(4,controlRect.left-shellRect.left)}px`;
    controlPanel.style.top=`${Number.isFinite(c.y)?c.y:Math.max(4,controlRect.top-shellRect.top)}px`;
    if(Number.isFinite(c.w))controlPanel.style.width=`${clamp(c.w,220,340)}px`;

    detailPanel.style.left=`${Number.isFinite(d.x)?d.x:Math.min(Math.max(300,shell.clientWidth-430),Math.max(4,shell.clientWidth-394))}px`;
    detailPanel.style.top=`${Number.isFinite(d.y)?d.y:Math.max(4,shell.clientHeight-378)}px`;
    if(Number.isFinite(d.w))detailPanel.style.width=`${clamp(d.w,280,560)}px`;
    if(Number.isFinite(d.h))detailPanel.style.height=`${clamp(d.h,180,Math.max(180,shell.clientHeight-8))}px`;
    detailCollapsed=Boolean(d.collapsed);detailPanel.classList.toggle('is-collapsed',detailCollapsed);collapse.textContent=detailCollapsed?'＋':'−';
    updateCount();connectSearch();syncVisibility();positionInside(controlPanel);positionInside(detailPanel);scheduleControlSave();scheduleDetailSave();
  });
}
