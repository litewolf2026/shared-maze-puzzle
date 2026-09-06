import {applyExpansion} from './map-expansion.js';

let readabilityMap=null,pinnedNodeId=null,lastPointer={x:0,y:0};
function gmEnabled(){const toggle=document.querySelector('#gmToggle');return Boolean(toggle&&getComputedStyle(toggle).display!=='none')}
function activeLevel(){const b=document.querySelector('.level-btn.active');return b?Number(b.dataset.z):null}
async function loadReadabilityMap(){
  if(readabilityMap)return readabilityMap;
  if(window.MAZE_APP?.map){readabilityMap=window.MAZE_APP.map;return readabilityMap}
  const [mapsRes,scenariosRes,expRes]=await Promise.all([fetch('./data/maps.json',{cache:'no-store'}),fetch('./data/scenarios.json',{cache:'no-store'}),fetch('./data/selem-expansion.json',{cache:'no-store'})]);
  const maps=(await mapsRes.json()).maps||[],scenarios=(await scenariosRes.json()).scenarios||[],exp=await expRes.json(),scenario=scenarios[0],base=maps.find(m=>m.id===scenario?.map)||maps[0]||null;
  readabilityMap=base?applyExpansion(base,exp):null;return readabilityMap;
}
function ensureUi(){const shell=document.querySelector('.map-shell');if(!shell)return {};let badge=document.querySelector('#mapCurrentBadge');if(!badge){badge=document.createElement('div');badge.id='mapCurrentBadge';badge.className='map-current-badge';shell.append(badge)}let popup=document.querySelector('#mapRoomPopup');if(!popup){popup=document.createElement('div');popup.id='mapRoomPopup';popup.className='map-room-popup';popup.hidden=true;popup.innerHTML='<strong></strong><small></small>';shell.append(popup)}return {shell,badge,popup}}
function nodeForGroup(group){if(!readabilityMap||!group)return null;const shape=group.querySelector('.room-shape');if(!shape)return null;let x,y;if(shape.tagName.toLowerCase()==='circle'){x=Number(shape.getAttribute('cx'));y=Number(shape.getAttribute('cy'))}else{x=Number(shape.getAttribute('x'))+Number(shape.getAttribute('width'))/2;y=Number(shape.getAttribute('y'))+Number(shape.getAttribute('height'))/2}const z=activeLevel();return readabilityMap.nodes.find(n=>Number(n.z)===z&&Math.abs(n.x-x)<.05&&Math.abs(n.y-y)<.05)||null}
function canInspect(group){if(!group)return false;if(group.classList.contains('visited')||group.classList.contains('current'))return true;return gmEnabled()&&document.body.classList.contains('reveal-all')}
function displayName(node){return !node?'':gmEnabled()&&node.gmName?node.gmName:node.name}
function levelName(node){return readabilityMap?.levels?.find(l=>Number(l.z)===Number(node?.z))?.name||''}
function positionPopup(clientX,clientY){const {shell,popup}=ensureUi();if(!shell||!popup||popup.hidden)return;const r=shell.getBoundingClientRect(),pr=popup.getBoundingClientRect();let x=clientX-r.left+14,y=clientY-r.top+14;x=Math.max(8,Math.min(x,r.width-pr.width-8));y=Math.max(8,Math.min(y,r.height-pr.height-8));popup.style.left=`${x}px`;popup.style.top=`${y}px`}
function showPopup(node,clientX=lastPointer.x,clientY=lastPointer.y){if(!node)return;const {popup}=ensureUi();if(!popup)return;popup.querySelector('strong').textContent=displayName(node);popup.querySelector('small').textContent=gmEnabled()?`${levelName(node)} · ${node.id}`:levelName(node);popup.hidden=false;requestAnimationFrame(()=>positionPopup(clientX,clientY))}
function hidePopup(){const popup=document.querySelector('#mapRoomPopup');if(popup)popup.hidden=true}
function updateCurrentBadge(){const {badge}=ensureUi();if(!badge)return;const loc=document.querySelector('#loc'),name=(loc?.firstChild?.textContent||'').trim(),small=(loc?.querySelector('small')?.textContent||'').split('·')[0].trim();if(!name){badge.hidden=true;return}badge.hidden=false;badge.innerHTML=`<span>Aktuell</span><strong>${name}</strong><small>${small}</small>`}
function bindMapInteractions(){
  const svg=document.querySelector('#mapSvg');if(!svg||svg.dataset.readabilityBound==='1')return;svg.dataset.readabilityBound='1';
  svg.addEventListener('pointermove',e=>{lastPointer={x:e.clientX,y:e.clientY};if(pinnedNodeId)return;const group=e.target.closest?.('.room-node');if(!group||!canInspect(group))return;const node=nodeForGroup(group);if(node)showPopup(node,e.clientX,e.clientY)});
  svg.addEventListener('pointerover',e=>{if(pinnedNodeId)return;const group=e.target.closest?.('.room-node');if(!group||!canInspect(group)||e.relatedTarget&&group.contains(e.relatedTarget))return;const node=nodeForGroup(group);if(node)showPopup(node,e.clientX,e.clientY)});
  svg.addEventListener('pointerout',e=>{if(pinnedNodeId)return;const group=e.target.closest?.('.room-node');if(!group||e.relatedTarget&&group.contains(e.relatedTarget))return;hidePopup()});
  svg.addEventListener('click',e=>{const group=e.target.closest?.('.room-node');if(!group||!canInspect(group)){pinnedNodeId=null;hidePopup();return}const node=nodeForGroup(group);if(!node)return;if(pinnedNodeId===node.id){pinnedNodeId=null;hidePopup();return}pinnedNodeId=node.id;showPopup(node,e.clientX,e.clientY)});
  new MutationObserver(()=>{updateCurrentBadge();if(pinnedNodeId){const present=[...svg.querySelectorAll('.room-node')].some(g=>nodeForGroup(g)?.id===pinnedNodeId);if(!present){pinnedNodeId=null;hidePopup()}}}).observe(svg,{childList:true,subtree:true});
}
async function installReadability(){try{await loadReadabilityMap()}catch(e){console.error(e);return}ensureUi();bindMapInteractions();updateCurrentBadge();const loc=document.querySelector('#loc');if(loc)new MutationObserver(updateCurrentBadge).observe(loc,{childList:true,subtree:true,characterData:true})}
window.addEventListener('maze-state',e=>{readabilityMap=e.detail.map;updateCurrentBadge()});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',installReadability,{once:true});else installReadability();
