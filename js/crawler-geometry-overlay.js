import {visibleAdj} from './navigation-model.js';

const NS='http://www.w3.org/2000/svg';
export const HORIZONTAL_FACING=['N','NE','E','SE','S','SW','W','NW'];

function svgEl(name,attrs={}){const node=document.createElementNS(NS,name);for(const [key,value] of Object.entries(attrs))node.setAttribute(key,String(value));return node}
function append(parent,name,attrs={}){const node=svgEl(name,attrs);parent.append(node);return node}
function path(parent,d,className){return append(parent,'path',{d,class:className})}
function polygon(parent,points,className){return append(parent,'polygon',{points:points.map(([x,y])=>`${x},${y}`).join(' '),class:className})}

function directionDelta(facing,dir){const a=HORIZONTAL_FACING.indexOf(facing),b=HORIZONTAL_FACING.indexOf(dir);if(a<0||b<0)return null;return (b-a+8)%8}

export function classifyExits(exits={},facing='N'){
  const result={front:false,left:[],right:[],rear:[],back:false,up:Boolean(exits.UP),down:Boolean(exits.DOWN)};
  for(const dir of HORIZONTAL_FACING){
    if(!exits[dir])continue;
    const delta=directionDelta(facing,dir);
    if(delta===0)result.front=true;
    else if(delta===1||delta===2)result.right.push(dir);
    else if(delta===6||delta===7)result.left.push(dir);
    else if(delta===4)result.back=true;
    else result.rear.push(dir);
  }
  return result;
}

function currentNodeId(state){return state?.transit?.from||state?.node||null}
function facingFromLocal(state){const stored=typeof localStorage!=='undefined'?localStorage.getItem('maze-view-facing'):null;return HORIZONTAL_FACING.includes(stored)?stored:(HORIZONTAL_FACING.includes(state?.partyFacing)?state.partyFacing:'N')}
function exitsFor(map,state,nodeId){const edges=visibleAdj(map,state).get(nodeId)||{};const exits={};for(const [dir,edge] of Object.entries(edges))if(edge?.to)exits[dir]=edge.to;return exits}
function safeBox(element){try{const b=element?.getBBox?.();if(b&&b.width>0&&b.height>0)return b}catch{}return {x:326,y:188,width:148,height:80}}

function drawFrontCutout(parent,endWall){
  const b=safeBox(endWall),cx=b.x+b.width/2,w=Math.max(56,Math.min(160,b.width*.48)),h=Math.max(74,Math.min(180,b.height*.76)),left=cx-w/2,right=cx+w/2,bottom=b.y+b.height,shoulder=bottom-h*.62,top=bottom-h;
  const g=append(parent,'g',{class:'v31-front-cutout','data-geometry-fix':'front'});
  path(g,`M${left} ${bottom}L${left} ${shoulder}Q${cx} ${top-18} ${right} ${shoulder}L${right} ${bottom}Z`,'v31-opening-dark');
  path(g,`M${left} ${bottom}L${left} ${shoulder}Q${cx} ${top-18} ${right} ${shoulder}L${right} ${bottom}`,'v31-opening-frame');
  polygon(g,[[left+8,bottom],[right-8,bottom],[cx+w*.24,450],[cx-w*.24,450]],'v31-opening-floor');
}

function drawTurnMouth(parent,side){
  const left=side==='left',outer=left?0:800,inner=left?168:632,near=left?238:562;
  const g=append(parent,'g',{class:`v31-turn-mouth ${side}`,'data-geometry-fix':`turn-${side}`});
  const pts=[[outer,146],[inner,184],[inner,346],[outer,405]];
  polygon(g,pts,'v31-turn-dark');
  path(g,left?`M0 146Q84 132 168 184L168 346Q84 370 0 405`:`M800 146Q716 132 632 184L632 346Q716 370 800 405`,'v31-turn-frame');
  polygon(g,left?[[0,405],[168,346],[near,450],[0,450]]:[[800,405],[632,346],[near,450],[800,450]],'v31-turn-floor');
}

function drawVerticalExit(parent,dir){
  const down=dir==='DOWN',x=down?535:105,w=160,y=338,h=78,cx=x+w/2;
  const g=append(parent,'g',{class:`v31-vertical-exit ${down?'down':'up'}`,'data-dir':dir});
  const title=append(g,'title');title.textContent=down?'Abstieg nach Unter Alt-Elem':'Aufstieg zur höheren Ebene';
  polygon(g,[[x,y],[x+w,y],[x+w+30,y+h],[x-30,y+h]],'v31-stairwell');
  for(let i=0;i<5;i++){const yy=y+12+i*12,shrink=i*5;append(g,'line',{x1:x+8+shrink,y1:yy,x2:x+w-8-shrink,y2:yy,class:'v31-stair-step'})}
  path(g,down?`M${cx} ${y+18}v34m-12-12 12 12 12-12`:`M${cx} ${y+54}v-34m-12 12 12-12 12 12`,'v31-stair-arrow');
  const label=append(g,'text',{x:cx,y:y+h+20,class:'v31-stair-label'});label.textContent=down?'AB':'AUF';
}

export function renderGeometryOverlay({map,state}){
  if(typeof document==='undefined'||!map||!state)return;
  const svg=document.querySelector('#crawlerSvg');if(!svg)return;
  svg.querySelector('.v31-geometry-overlay')?.remove();
  const nodeId=currentNodeId(state);if(!nodeId)return;
  const exits=exitsFor(map,state,nodeId),facing=facingFromLocal(state),visibility=classifyExits(exits,facing);
  const group=append(svg,'g',{class:'v31-geometry-overlay','data-node':nodeId,'data-facing':facing,'pointer-events':'none'});
  const endWall=svg.querySelector('.v3-end-wall,.v3-end-rock');
  if(endWall&&visibility.front)drawFrontCutout(group,endWall);
  if(endWall&&!visibility.front){if(visibility.left.length)drawTurnMouth(group,'left');if(visibility.right.length)drawTurnMouth(group,'right')}
  if(visibility.up)drawVerticalExit(group,'UP');
  if(visibility.down)drawVerticalExit(group,'DOWN');
  if(!group.childNodes.length)group.remove();
  else svg.dataset.geometryOverlay='v31';
}

function scheduleOverlay(detail){queueMicrotask(()=>renderGeometryOverlay(detail))}

if(typeof window!=='undefined'&&typeof document!=='undefined'){
  window.addEventListener('maze-state',event=>scheduleOverlay(event.detail||{}));
  if(window.MAZE_APP?.map&&window.MAZE_APP?.state)scheduleOverlay({map:window.MAZE_APP.map,state:window.MAZE_APP.state});
}
