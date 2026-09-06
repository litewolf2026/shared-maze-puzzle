let last=null;
let activeKey=null;

const NS='http://www.w3.org/2000/svg';

function currentNodeId(){return last?.state?.transit?.from||last?.state?.node||null}
function roomAssignments(){const id=currentNodeId();return id?last?.state?.roomState?.[id]?.content?.assignments||[]:[]}
function lootKey(nodeId,assignment){return `${nodeId}:${assignment.slotId}`}
function visibleLabel(label){return String(label||'').slice(0,26)}
function eligibleLoot(){return roomAssignments().filter(a=>a.type==='loot'&&a.state==='discovered')}

function ensureCard(){
  let card=document.querySelector('#sceneLootCard');
  if(card)return card;
  const host=document.querySelector('.crawler-shell');
  if(!host)return null;
  card=document.createElement('aside');
  card.id='sceneLootCard';
  card.className='scene-loot-card';
  card.hidden=true;
  card.innerHTML=`
    <button type="button" class="scene-loot-close" aria-label="Fundfenster schließen">×</button>
    <div class="scene-loot-kicker">Gefundener Gegenstand</div>
    <strong id="sceneLootTitle">Fundstück</strong>
    <p id="sceneLootDescription"></p>
    <div class="scene-loot-actions">
      <button type="button" id="sceneLootTake">＋ Ins Gruppeninventar nehmen</button>
      <button type="button" id="sceneLootCancel">liegen lassen</button>
    </div>`;
  host.append(card);
  card.querySelector('.scene-loot-close')?.addEventListener('click',closeCard);
  card.querySelector('#sceneLootCancel')?.addEventListener('click',closeCard);
  card.querySelector('#sceneLootTake')?.addEventListener('click',()=>{
    const entry=findActive();if(!entry)return closeCard();
    window.dispatchEvent(new CustomEvent('maze-content-action',{detail:{node:entry.nodeId,slot:entry.assignment.slotId,action:'take'}}));
    closeCard();
  });
  return card;
}

function findActive(){
  if(!activeKey)return null;
  const nodeId=currentNodeId();
  const assignment=eligibleLoot().find(a=>lootKey(nodeId,a)===activeKey);
  return assignment?{nodeId,assignment}:null;
}
function closeCard(){const card=document.querySelector('#sceneLootCard');if(card)card.hidden=true;activeKey=null}
function openCard(nodeId,assignment){
  const card=ensureCard();if(!card)return;
  activeKey=lootKey(nodeId,assignment);
  const title=card.querySelector('#sceneLootTitle'),description=card.querySelector('#sceneLootDescription');
  if(title)title.textContent=assignment.label||assignment.contentId||'Fundstück';
  if(description)description.textContent=assignment.description||'Der Gegenstand wurde von der Gruppe entdeckt und kann mitgenommen werden.';
  card.hidden=false;
  card.querySelector('#sceneLootTake')?.focus({preventScroll:true});
}

function clearMarker(marker){
  if(!marker.classList.contains('scene-loot-takeable')&&!marker.querySelector('.scene-loot-pickup-halo'))return;
  marker.classList.remove('scene-loot-takeable');
  marker.removeAttribute('data-loot-key');
  marker.removeAttribute('data-loot-slot');
  marker.removeAttribute('role');
  marker.removeAttribute('tabindex');
  marker.removeAttribute('aria-label');
  marker.querySelector('.scene-loot-pickup-halo')?.remove();
}
function addHalo(marker){
  if(marker.querySelector('.scene-loot-pickup-halo'))return;
  const dot=marker.querySelector('.v3-feature-dot');if(!dot)return;
  const cx=Number(dot.getAttribute('cx')),cy=Number(dot.getAttribute('cy'));if(!Number.isFinite(cx)||!Number.isFinite(cy))return;
  const halo=document.createElementNS(NS,'circle');
  halo.setAttribute('cx',String(cx));halo.setAttribute('cy',String(cy));halo.setAttribute('r','12');halo.setAttribute('class','scene-loot-pickup-halo');
  marker.insertBefore(halo,marker.firstChild);
}
function markLoot(marker,nodeId,assignment){
  marker.classList.add('scene-loot-takeable');
  marker.dataset.lootKey=lootKey(nodeId,assignment);marker.dataset.lootSlot=assignment.slotId;
  marker.setAttribute('role','button');marker.setAttribute('tabindex','0');marker.setAttribute('aria-label',`${assignment.label} ins Gruppeninventar nehmen`);
  addHalo(marker);
}
function decorateMarkers(){
  const svg=document.querySelector('#crawlerSvg');if(!svg)return;
  const nodeId=currentNodeId(),loot=eligibleLoot();
  const byRenderedLabel=new Map();
  for(const assignment of loot){const key=visibleLabel(assignment.label);if(!byRenderedLabel.has(key))byRenderedLabel.set(key,[]);byRenderedLabel.get(key).push(assignment)}
  for(const marker of svg.querySelectorAll('.v3-feature-marker')){
    const label=marker.querySelector('.v3-feature-label')?.textContent?.trim()||'';
    const matches=byRenderedLabel.get(label)||[];
    if(matches.length===1)markLoot(marker,nodeId,matches[0]);else clearMarker(marker);
  }
  if(activeKey&&!findActive())closeCard();
}

function assignmentForMarker(marker){
  const slot=marker?.dataset?.lootSlot,nodeId=currentNodeId();if(!slot||!nodeId)return null;
  const assignment=eligibleLoot().find(a=>a.slotId===slot);return assignment?{nodeId,assignment}:null;
}
function activateMarker(marker){const entry=assignmentForMarker(marker);if(entry)openCard(entry.nodeId,entry.assignment)}

function install(){
  const svg=document.querySelector('#crawlerSvg');if(!svg)return;
  svg.addEventListener('click',event=>{const marker=event.target.closest?.('.v3-feature-marker.scene-loot-takeable');if(marker)activateMarker(marker)});
  svg.addEventListener('keydown',event=>{if(event.key!=='Enter'&&event.key!==' ')return;const marker=event.target.closest?.('.v3-feature-marker.scene-loot-takeable');if(!marker)return;event.preventDefault();activateMarker(marker)});
  const observer=new MutationObserver(()=>queueMicrotask(decorateMarkers));
  observer.observe(svg,{childList:true,subtree:true});
}

window.addEventListener('maze-state',event=>{last=event.detail;queueMicrotask(decorateMarkers)});
if(window.MAZE_APP)last=window.MAZE_APP;
install();
queueMicrotask(decorateMarkers);
