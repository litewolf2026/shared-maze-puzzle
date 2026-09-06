let library=null,last=null,initialized=false,known=new Set(),activeId=null;

async function loadLibrary(){const r=await fetch('./data/content/selem-handouts.json',{cache:'no-store'});if(!r.ok)throw new Error('Selem-Handouts konnten nicht geladen werden.');return r.json()}

function revealedAssignments(state){
  const found=[];
  for(const [nodeId,room] of Object.entries(state?.roomState||{}))for(const a of room?.content?.assignments||[]){
    const id=a?.mechanics?.handoutId;if(!id||a.state==='unresolved'||a.state==='disabled')continue;
    found.push({id,nodeId,state:a.state,assignment:a});
  }
  return found;
}

function ensureUi(){
  let button=document.querySelector('#handoutButton');
  if(!button){
    const status=document.querySelector('.status');
    button=document.createElement('button');button.id='handoutButton';button.className='handout-button';button.hidden=true;button.type='button';button.addEventListener('click',()=>openTray(activeId));
    status?.append(document.createElement('br'),button);
  }
  let overlay=document.querySelector('#handoutOverlay');
  if(!overlay){
    overlay=document.createElement('div');overlay.id='handoutOverlay';overlay.className='handout-overlay';overlay.hidden=true;
    overlay.innerHTML='<div class="handout-dialog" role="dialog" aria-modal="true" aria-labelledby="handoutTitle"><div class="handout-top"><div><b id="handoutTitle">Handouts</b><small id="handoutCounter"></small></div><button id="handoutClose" type="button" aria-label="Handouts schließen">×</button></div><div class="handout-layout"><nav id="handoutList" class="handout-list" aria-label="Aufgedeckte Handouts"></nav><article id="handoutView" class="handout-view"></article></div></div>';
    document.body.append(overlay);
    overlay.addEventListener('click',e=>{if(e.target===overlay)closeTray()});
    overlay.querySelector('#handoutClose').addEventListener('click',closeTray);
    document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!overlay.hidden)closeTray()});
  }
  return {button,overlay};
}

function definition(id){return library?.handouts?.[id]||null}
function orderedVisible(){
  const revealed=new Set(revealedAssignments(last?.state).map(x=>x.id));
  return Object.keys(library?.handouts||{}).filter(id=>revealed.has(id));
}

function renderTray(){
  const {overlay}=ensureUi(),ids=orderedVisible(),list=overlay.querySelector('#handoutList'),view=overlay.querySelector('#handoutView'),counter=overlay.querySelector('#handoutCounter');
  counter.textContent=ids.length?`${ids.length} aufgedeckt`:'keine aufgedeckt';list.innerHTML='';view.innerHTML='';
  if(!ids.length){view.innerHTML='<p class="handout-empty">Noch wurde kein Handout durch die Spielleitung freigegeben.</p>';return}
  if(!activeId||!ids.includes(activeId))activeId=ids.at(-1);
  for(const id of ids){const d=definition(id),b=document.createElement('button');b.type='button';b.className=id===activeId?'active':'';b.textContent=d?.title||id;b.addEventListener('click',()=>{activeId=id;renderTray()});list.append(b)}
  const d=definition(activeId);if(!d)return;
  const img=document.createElement('img');img.src=d.asset;img.alt=d.title;img.loading='eager';
  const h=document.createElement('h3');h.textContent=d.title;const cap=document.createElement('p');cap.textContent=d.caption||'';
  view.append(h,img,cap);
}

function openTray(id=null){const ids=orderedVisible();if(id&&ids.includes(id))activeId=id;else if(!activeId&&ids.length)activeId=ids.at(-1);const {overlay}=ensureUi();renderTray();overlay.hidden=false;document.body.classList.add('handout-open')}
function closeTray(){const overlay=document.querySelector('#handoutOverlay');if(overlay)overlay.hidden=true;document.body.classList.remove('handout-open')}

function render(){
  if(!library||!last)return;
  const {button}=ensureUi(),revealed=revealedAssignments(last.state),ids=revealed.map(x=>x.id).filter(id=>definition(id));
  button.hidden=!ids.length;button.textContent=ids.length===1?'1 Handout':`${ids.length} Handouts`;
  const current=new Set(ids);
  if(initialized){const fresh=ids.filter(id=>!known.has(id));if(fresh.length)openTray(fresh.at(-1))}
  known=current;initialized=true;
  const overlay=document.querySelector('#handoutOverlay');if(overlay&&!overlay.hidden)renderTray();
}

loadLibrary().then(data=>{library=data;render()}).catch(console.error);
window.addEventListener('maze-state',e=>{last=e.detail;render()});
