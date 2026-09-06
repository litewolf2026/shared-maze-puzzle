import {createCrawlerView,FACING_ORDER,rotateFacing} from './crawler-view-v3.js?v=20260906-v3';
import {roomStartPosition,terrainTypeAt,terrainWalkable,terrainLabel} from './room-terrain.js?v=20260906-v3';
import {renderGeometryOverlay} from './crawler-geometry-overlay.js?v=20260906-v31c';

const DIRS={N:{label:'N',opp:'S'},NE:{label:'NO',opp:'SW'},E:{label:'O',opp:'W'},SE:{label:'SO',opp:'NW'},S:{label:'S',opp:'N'},SW:{label:'SW',opp:'NE'},W:{label:'W',opp:'E'},NW:{label:'NW',opp:'SE'},UP:{label:'AUF',opp:'DOWN'},DOWN:{label:'AB',opp:'UP'}};
const VECTORS={N:[0,-1],NE:[1,-1],E:[1,0],SE:[1,1],S:[0,1],SW:[-1,1],W:[-1,0],NW:[-1,-1]};
const PREVIEW_TARGETS=['C14','D06','D14','C15'];
const EXPLORE_KINDS=new Set(['room','lens','prison','goal','deadend']);

let appDetail=null;
let previewNodeId=null;
let previewFacing='N';
let previewPos=null;
let previewCrawler=null;
let originalStoredFacing=null;

function mapNode(id){return appDetail?.map?.nodes?.find(node=>node.id===id)||null}
function roomGridFor(node){
  if(node?.exploreGrid?.w&&node?.exploreGrid?.h)return node.exploreGrid;
  if(!EXPLORE_KINDS.has(node?.kind))return null;
  if(node.kind==='goal')return {w:7,h:7};
  if(node.kind==='prison')return {w:4,h:4};
  return {w:5,h:5};
}
function previewSharedState(){return {...appDetail.state,node:previewNodeId,transit:null}}
function previewCrawlerState(){
  const node=mapNode(previewNodeId),grid=roomGridFor(node),pos=previewPos||roomStartPosition(node)||{x:0,y:0};
  return {node:previewNodeId,facing:previewFacing,roomGrid:grid,heroPosition:grid?pos:null,terrainType:grid?terrainTypeAt(node,pos.x,pos.y):null,visibleFeatures:[],sharedState:previewSharedState()};
}
function updatePreviewUi(){
  const node=mapNode(previewNodeId),badge=document.querySelector('#gmPreviewBadge'),status=document.querySelector('#gmPreviewStatus'),sub=document.querySelector('#crawlerSubline'),posLabel=document.querySelector('#heroPosition');
  if(badge)badge.textContent=previewNodeId?`SL-Vorschau · ${previewNodeId} · ${node?.name||''}`:'';
  if(status)status.textContent=previewNodeId?`${previewNodeId} · ${node?.name||''}`:'Live-Ansicht der Gruppe';
  document.querySelectorAll('[data-gm-preview]').forEach(button=>button.classList.toggle('active',button.dataset.gmPreview===previewNodeId));
  document.querySelector('[data-gm-preview="LIVE"]')?.classList.toggle('active',!previewNodeId);
  if(previewNodeId&&sub)sub.textContent='Lokale SL-Grafikvorschau · Gruppenstand bleibt unverändert';
  if(previewNodeId&&posLabel&&previewPos&&node){const grid=roomGridFor(node),terrain=terrainTypeAt(node,previewPos.x,previewPos.y);posLabel.textContent=`Vorschau ${node.name} · Feld ${previewPos.x+1}/${grid.w} · ${previewPos.y+1}/${grid.h} · ${terrainLabel(terrain)}`}
}
function renderPreview(){
  if(!previewNodeId||!appDetail?.map||!appDetail?.state)return;
  if(!previewCrawler)previewCrawler=createCrawlerView({map:appDetail.map,dirs:DIRS,getState:previewCrawlerState});
  localStorage.setItem('maze-view-facing',previewFacing);
  previewCrawler.render();
  renderGeometryOverlay({map:appDetail.map,state:previewSharedState()});
  document.body.classList.add('gm-preview-active');
  updatePreviewUi();
}
function beginPreview(nodeId){
  if(!appDetail?.isGm||!mapNode(nodeId))return;
  if(!previewNodeId)originalStoredFacing=localStorage.getItem('maze-view-facing');
  previewNodeId=nodeId;
  previewFacing=FACING_ORDER.includes(originalStoredFacing)?originalStoredFacing:(FACING_ORDER.includes(appDetail.state?.partyFacing)?appDetail.state.partyFacing:'N');
  const node=mapNode(nodeId),grid=roomGridFor(node);
  previewPos=grid?(roomStartPosition(node)||{x:Math.floor(grid.w/2),y:Math.floor(grid.h/2)}):null;
  renderPreview();
}
function endPreview(){
  if(!previewNodeId)return;
  previewNodeId=null;previewPos=null;previewCrawler=null;
  document.body.classList.remove('gm-preview-active');
  if(originalStoredFacing===null)localStorage.removeItem('maze-view-facing');else localStorage.setItem('maze-view-facing',originalStoredFacing);
  originalStoredFacing=null;
  updatePreviewUi();
  if(appDetail)window.dispatchEvent(new CustomEvent('maze-state',{detail:appDetail}));
}
function turnPreview(steps){if(!previewNodeId)return;previewFacing=rotateFacing(previewFacing,steps);renderPreview()}
function walkPreview(sign=1){
  if(!previewNodeId||!previewPos)return;
  const node=mapNode(previewNodeId),grid=roomGridFor(node),v=VECTORS[previewFacing]||[0,0],next={x:previewPos.x+v[0]*sign,y:previewPos.y+v[1]*sign};
  if(next.x<0||next.y<0||next.x>=grid.w||next.y>=grid.h)return;
  if(!terrainWalkable(node,next.x,next.y))return;
  previewPos=next;renderPreview();
}
function interceptButton(id,action){
  document.querySelector(id)?.addEventListener('click',event=>{if(!previewNodeId)return;event.preventDefault();event.stopImmediatePropagation();action()},true);
}
function installPreviewInterceptors(){
  interceptButton('#crawlerLeft',()=>turnPreview(-1));
  interceptButton('#crawlerRight',()=>turnPreview(1));
  interceptButton('#crawlerAround',()=>turnPreview(4));
  interceptButton('#heroForward',()=>walkPreview(1));
  interceptButton('#heroBack',()=>walkPreview(-1));
  window.addEventListener('keydown',event=>{
    if(!previewNodeId||event.altKey||event.ctrlKey||event.metaKey)return;
    let handled=true;
    if(event.key==='ArrowLeft')turnPreview(-1);
    else if(event.key==='ArrowRight')turnPreview(1);
    else if(event.key==='ArrowDown')turnPreview(4);
    else if(event.key==='ArrowUp')walkPreview(1);
    else if(event.key==='Escape')endPreview();
    else handled=false;
    if(handled){event.preventDefault();event.stopImmediatePropagation()}
  },true);
}
function setCollapsed(panel,collapsed){
  panel.classList.toggle('collapsed',collapsed);
  localStorage.setItem('maze-gm-collapsed',collapsed?'1':'0');
  const button=panel.querySelector('#gmCollapse');if(button){button.textContent=collapsed?'▸':'▾';button.title=collapsed?'SL-Fenster ausklappen':'SL-Fenster einklappen'}
}
function ensurePanelUi(isGm){
  const panel=document.querySelector('.gm-panel');if(!panel)return;
  if(!panel.querySelector('.gm-panel-head')){
    const title=panel.querySelector(':scope > h3'),head=document.createElement('div');head.className='gm-panel-head';
    panel.insertBefore(head,title||panel.firstChild);if(title)head.append(title);
    const collapse=document.createElement('button');collapse.id='gmCollapse';collapse.className='gm-collapse';collapse.type='button';head.append(collapse);
    collapse.addEventListener('click',()=>setCollapsed(panel,!panel.classList.contains('collapsed')));
    setCollapsed(panel,localStorage.getItem('maze-gm-collapsed')==='1');
  }
  let tools=panel.querySelector('#gmPreviewTools');
  if(!tools){
    tools=document.createElement('div');tools.id='gmPreviewTools';tools.className='gm-preview-tools';
    const heading=document.createElement('strong');heading.textContent='Grafiktest · lokale SL-Vorschau';tools.append(heading);
    const note=document.createElement('small');note.textContent='Springt nur die Crawler-Ansicht zu Testorten. Der gemeinsame Spielstand, Bandweg und die Spieler bleiben unangetastet.';tools.append(note);
    const buttons=document.createElement('div');buttons.className='gm-preview-buttons';
    for(const id of PREVIEW_TARGETS){const button=document.createElement('button');button.type='button';button.dataset.gmPreview=id;button.textContent=id;button.addEventListener('click',()=>beginPreview(id));buttons.append(button)}
    const live=document.createElement('button');live.type='button';live.dataset.gmPreview='LIVE';live.className='gm-preview-live';live.textContent='↩ Live-Ansicht';live.addEventListener('click',endPreview);buttons.append(live);tools.append(buttons);
    const status=document.createElement('small');status.id='gmPreviewStatus';status.className='gm-preview-status';status.textContent='Live-Ansicht der Gruppe';tools.append(status);
    const rows=[...panel.querySelectorAll(':scope > .gm-row')];(rows.at(-1)||panel.querySelector('.gm-help')||panel.firstChild)?.after(tools);
  }
  tools.hidden=!isGm;
  if(!document.querySelector('#gmPreviewBadge')){const badge=document.createElement('div');badge.id='gmPreviewBadge';badge.className='gm-preview-badge';document.querySelector('.crawler-shell')?.append(badge)}
}

installPreviewInterceptors();
window.addEventListener('maze-state',event=>{
  appDetail=event.detail||appDetail;
  ensurePanelUi(Boolean(appDetail?.isGm));
  if(previewNodeId){if(!appDetail?.isGm)endPreview();else queueMicrotask(renderPreview)}
});
if(window.MAZE_APP){appDetail=window.MAZE_APP;ensurePanelUi(Boolean(appDetail.isGm))}
