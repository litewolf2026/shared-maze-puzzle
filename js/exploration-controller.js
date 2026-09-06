import {createCrawlerView,FACING_ORDER,rotateFacing} from './crawler-view.js';

let map=null,shared=null,crawler=null,featureCatalog={};
let viewFacing=localStorage.getItem('maze-view-facing')||'N';
const EXPLORE_KINDS=new Set(['room','lens','prison','goal']);
const VECTORS={N:[0,-1],NE:[1,-1],E:[1,0],SE:[1,1],S:[0,1],SW:[-1,1],W:[-1,0],NW:[-1,-1]};
const DIRS={N:{label:'N',opp:'S'},NE:{label:'NO',opp:'SW'},E:{label:'O',opp:'W'},SE:{label:'SO',opp:'NW'},S:{label:'S',opp:'N'},SW:{label:'SW',opp:'NE'},W:{label:'W',opp:'E'},NW:{label:'NW',opp:'SE'},UP:{label:'AUF',opp:'DOWN'},DOWN:{label:'AB',opp:'UP'}};

fetch('./data/room-features.json',{cache:'no-store'}).then(r=>r.json()).then(data=>{featureCatalog=data.features||{};render()}).catch(console.error);

function currentNode(){if(!map||!shared)return null;const id=shared.transit?.from||shared.node;return map.nodes.find(n=>n.id===id)||null}
function roomGrid(node){if(!node||!EXPLORE_KINDS.has(node.kind))return null;if(node.exploreGrid?.w&&node.exploreGrid?.h)return node.exploreGrid;if(node.kind==='goal')return {w:7,h:7};if(node.kind==='prison')return {w:4,h:4};return {w:5,h:5}}
function heroKey(node){return `maze-hero:${node.id}`}
function loadHero(node){const grid=roomGrid(node);if(!grid)return null;try{const parsed=JSON.parse(localStorage.getItem(heroKey(node))||'null');if(Number.isInteger(parsed?.x)&&Number.isInteger(parsed?.y))return {x:Math.max(0,Math.min(grid.w-1,parsed.x)),y:Math.max(0,Math.min(grid.h-1,parsed.y))}}catch{}return {x:Math.floor(grid.w/2),y:Math.floor(grid.h/2)}}
function saveHero(node,pos){localStorage.setItem(heroKey(node),JSON.stringify(pos))}
function turn(steps){viewFacing=rotateFacing(viewFacing,steps);localStorage.setItem('maze-view-facing',viewFacing);render()}
function walkHero(sign=1){const node=currentNode(),grid=roomGrid(node);if(!grid||shared?.transit)return;const pos=loadHero(node),v=VECTORS[viewFacing]||[0,0];const next={x:Math.max(0,Math.min(grid.w-1,pos.x+v[0]*sign)),y:Math.max(0,Math.min(grid.h-1,pos.y+v[1]*sign))};saveHero(node,next);render()}

function updateCompass(){const viewIndex=Math.max(0,FACING_ORDER.indexOf(viewFacing)),party=FACING_ORDER.includes(shared?.partyFacing)?shared.partyFacing:'N',partyIndex=Math.max(0,FACING_ORDER.indexOf(party));const v=document.querySelector('#viewFacingMark'),p=document.querySelector('#partyFacingMark');if(v)v.style.transform=`translate(-50%,-50%) rotate(${viewIndex*45}deg) translateY(-25px)`;if(p)p.style.transform=`translate(-50%,-50%) rotate(${partyIndex*45}deg) translateY(-15px)`;const label=document.querySelector('#crawlerFacing');if(label)label.textContent=`Blick ${DIRS[viewFacing]?.label||viewFacing} · Gruppe ${DIRS[party]?.label||party}`}

function featureKey(nodeId,id){return `${nodeId}:${id}`}
function nearbyFeatures(node,pos){return (featureCatalog[node.id]||[]).filter(f=>Math.max(Math.abs(f.x-pos.x),Math.abs(f.y-pos.y))<=1)}
function renderFeatures(node,pos){
  const list=document.querySelector('#featureList');if(!list)return;list.innerHTML='';
  const all=featureCatalog[node.id]||[],nearby=nearbyFeatures(node,pos),discovered=new Set(shared?.discovered||[]);
  const visible=[...new Map([...nearby,...all.filter(f=>discovered.has(featureKey(node.id,f.id)))].map(f=>[f.id,f])).values()];
  if(!visible.length){const s=document.createElement('small');s.className='nothing-nearby';s.textContent=all.length?'Hier fällt dir nichts Besonderes auf.':'Dieser Raum ist derzeit ohne besondere Suchpunkte.';list.append(s);return}
  for(const feature of visible){
    const key=featureKey(node.id,feature.id),known=discovered.has(key),box=document.createElement('div');box.className='feature-item'+(known?' discovered':'');
    const title=document.createElement('b');title.textContent=feature.label;box.append(title);
    if(known){const text=document.createElement('small');text.textContent=feature.description;box.append(text)}else{const button=document.createElement('button');button.textContent='Untersuchen';button.addEventListener('click',()=>window.dispatchEvent(new CustomEvent('maze-discover',{detail:{node:node.id,feature:feature.id,label:feature.label}})));box.append(button)}
    list.append(box);
  }
}

function renderRoomExplore(){const node=currentNode(),grid=roomGrid(node),box=document.querySelector('#roomExplore');if(!box)return;const enabled=Boolean(grid&&!shared?.transit);box.hidden=!enabled;if(!enabled){const list=document.querySelector('#featureList');if(list)list.innerHTML='';return}const pos=loadHero(node),label=document.querySelector('#heroPosition');if(label)label.textContent=`${node.name} · Feld ${pos.x+1}/${grid.w} · ${pos.y+1}/${grid.h}`;renderFeatures(node,pos)}
function render(){if(!map||!shared)return;crawler?.render();updateCompass();renderRoomExplore();const node=currentNode(),title=document.querySelector('#crawlerCurrent');if(title)title.textContent=shared.transit?`Gang nach ${DIRS[shared.transit.dir]?.label||shared.transit.dir}`:(node?.name||shared.node);const sub=document.querySelector('#crawlerSubline');if(sub)sub.textContent=shared.transit?`Gruppentransit · Abschnitt ${shared.transit.progress}/${shared.transit.cells}`:roomGrid(node)?'Freie persönliche Raumerkundung · Ausgang gemeinsam wählen':'Persönlicher Blick · Gruppenstandort gemeinsam'}
function setViewMode(mode){const crawlerMode=mode!=='map';document.body.classList.toggle('view-crawler',crawlerMode);document.body.classList.toggle('view-map',!crawlerMode);document.querySelector('#viewCrawler')?.classList.toggle('active',crawlerMode);document.querySelector('#viewMap')?.classList.toggle('active',!crawlerMode);document.querySelector('#viewCrawler')?.setAttribute('aria-pressed',String(crawlerMode));document.querySelector('#viewMap')?.setAttribute('aria-pressed',String(!crawlerMode));localStorage.setItem('maze-view-mode',crawlerMode?'crawler':'map')}
function install(){document.querySelector('#crawlerLeft')?.addEventListener('click',()=>turn(-1));document.querySelector('#crawlerRight')?.addEventListener('click',()=>turn(1));document.querySelector('#crawlerAround')?.addEventListener('click',()=>turn(4));document.querySelector('#heroForward')?.addEventListener('click',()=>walkHero(1));document.querySelector('#heroBack')?.addEventListener('click',()=>walkHero(-1));document.querySelector('#viewCrawler')?.addEventListener('click',()=>setViewMode('crawler'));document.querySelector('#viewMap')?.addEventListener('click',()=>setViewMode('map'));setViewMode(localStorage.getItem('maze-view-mode')||'crawler');window.addEventListener('keydown',e=>{if(!document.body.classList.contains('view-crawler')||e.altKey||e.ctrlKey||e.metaKey)return;if(e.key==='ArrowLeft'){e.preventDefault();turn(-1)}else if(e.key==='ArrowRight'){e.preventDefault();turn(1)}else if(e.key==='ArrowDown'){e.preventDefault();turn(4)}else if(e.key==='ArrowUp'&&roomGrid(currentNode())&&!shared?.transit){e.preventDefault();walkHero(1)}})}

window.addEventListener('maze-state',e=>{map=e.detail.map;shared=e.detail.state;if(!FACING_ORDER.includes(viewFacing))viewFacing='N';if(!crawler)crawler=createCrawlerView({map,dirs:DIRS,getState:()=>({node:shared.transit?.from||shared.node,facing:viewFacing}),onTurn:turn,onForward:()=>{},onVertical:()=>{}});render()});
install();
