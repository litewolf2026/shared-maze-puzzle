export const FACING_ORDER=['N','NE','E','SE','S','SW','W','NW'];
const NS='http://www.w3.org/2000/svg';
const FRAMES=[{l:0,r:800,t:0,b:450},{l:105,r:695,t:62,b:388},{l:205,r:595,t:122,b:328},{l:285,r:515,t:168,b:282},{l:335,r:465,t:192,b:258}];
const VECTORS={N:[0,-1],NE:[1,-1],E:[1,0],SE:[1,1],S:[0,1],SW:[-1,1],W:[-1,0],NW:[-1,-1]};

const SCENE_DEFS=`<defs>
  <filter id="crawlerGlow"><feGaussianBlur stdDeviation="5" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  <filter id="crawlerStoneNoise" x="-10%" y="-10%" width="120%" height="120%"><feTurbulence type="fractalNoise" baseFrequency=".72" numOctaves="3" seed="13"/><feColorMatrix type="matrix" values=".35 0 0 0 .15  0 .32 0 0 .13  0 0 .28 0 .10  0 0 0 .34 0"/></filter>
  <pattern id="crawlerDust" width="31" height="31" patternUnits="userSpaceOnUse"><circle cx="5" cy="9" r=".8" class="crawler-dust-dot"/><circle cx="23" cy="19" r="1.1" class="crawler-dust-dot"/><path d="M3 26l10-3M18 5l8 2" class="crawler-dust-line"/></pattern>
  <linearGradient id="ceilingShade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#090806"/><stop offset="1" stop-color="#2d251d"/></linearGradient>
  <linearGradient id="floorShade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1b1712"/><stop offset=".62" stop-color="#30271e"/><stop offset="1" stop-color="#16110d"/></linearGradient>
  <linearGradient id="waterFloorShade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#121b1b"/><stop offset=".65" stop-color="#1d3132"/><stop offset="1" stop-color="#0b1112"/></linearGradient>
  <linearGradient id="wallLeftShade" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#0b0907"/><stop offset=".72" stop-color="#33291f"/><stop offset="1" stop-color="#4a3a2a"/></linearGradient>
  <linearGradient id="wallRightShade" x1="1" y1="0" x2="0" y2="0"><stop offset="0" stop-color="#0b0907"/><stop offset=".72" stop-color="#30271f"/><stop offset="1" stop-color="#49392a"/></linearGradient>
  <linearGradient id="backWallShade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#33291f"/><stop offset=".55" stop-color="#241d17"/><stop offset="1" stop-color="#15110e"/></linearGradient>
  <linearGradient id="pillarShade" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#17120e"/><stop offset=".48" stop-color="#4c3c2c"/><stop offset="1" stop-color="#18130f"/></linearGradient>
  <radialGradient id="sceneLight" cx="50%" cy="52%" r="56%"><stop offset="0" stop-color="#d6a25b" stop-opacity=".24"/><stop offset=".28" stop-color="#ae7540" stop-opacity=".10"/><stop offset=".78" stop-color="#000" stop-opacity="0"/></radialGradient>
  <radialGradient id="sceneVignette" cx="50%" cy="48%" r="68%"><stop offset="0" stop-color="#000" stop-opacity="0"/><stop offset=".63" stop-color="#000" stop-opacity=".05"/><stop offset=".83" stop-color="#000" stop-opacity=".42"/><stop offset="1" stop-color="#000" stop-opacity=".88"/></radialGradient>
</defs>`;

export function rotateFacing(facing,steps){const index=FACING_ORDER.indexOf(facing),start=index>=0?index:0;return FACING_ORDER[(start+steps%8+8)%8]}
export function relativeExitSide(facing,dir){const a=FACING_ORDER.indexOf(facing),b=FACING_ORDER.indexOf(dir);if(a<0||b<0)return null;const delta=(b-a+8)%8;if(delta===0)return 'front';if(delta===4)return 'back';if(delta<4)return 'right';return 'left'}
export function buildCrawlerAdj(map,dirs){const adj=new Map(map.nodes.map(n=>[n.id,{}]));for(const [from,dir,to] of map.edges){if(!adj.has(from)||!adj.has(to))continue;const current=adj.get(from)[dir];if(current&&current!==to)throw new Error(`Conflicting crawler edge ${from}/${dir}`);adj.get(from)[dir]=to;const reverse=dirs[dir]?.opp;if(reverse&&!adj.get(to)[reverse])adj.get(to)[reverse]=from}return adj}
export function traceSightline(map,dirs,nodeId,facing,maxDepth=4){const adj=buildCrawlerAdj(map,dirs),out=[];let current=nodeId;for(let depth=0;depth<maxDepth;depth++){const exits=adj.get(current)||{};out.push({node:current,exits:{...exits}});const next=exits[facing];if(!next)break;current=next}return out}

function el(name,attrs={}){const node=document.createElementNS(NS,name);for(const [key,value] of Object.entries(attrs))node.setAttribute(key,String(value));return node}
function polygon(svg,pts,className){svg.append(el('polygon',{points:pts.map(p=>p.join(',')).join(' '),class:className}))}
function hasSideExit(exits,facing,side){return FACING_ORDER.some(dir=>exits[dir]&&relativeExitSide(facing,dir)===side)}
function sideOpening(svg,outer,inner,side,depth){const oy1=outer.t+(outer.b-outer.t)*.30,oy2=outer.t+(outer.b-outer.t)*.70,iy1=inner.t+(inner.b-inner.t)*.32,iy2=inner.t+(inner.b-inner.t)*.68;if(side==='left'){polygon(svg,[[outer.l,oy1],[inner.l+3,iy1],[inner.l+3,iy2],[outer.l,oy2]],`crawler-opening left depth-${depth}`);svg.append(el('line',{x1:outer.l,y1:oy1,x2:inner.l+3,y2:iy1,class:'crawler-opening-edge'}))}else{polygon(svg,[[outer.r,oy1],[inner.r-3,iy1],[inner.r-3,iy2],[outer.r,oy2]],`crawler-opening right depth-${depth}`);svg.append(el('line',{x1:outer.r,y1:oy1,x2:inner.r-3,y2:iy1,class:'crawler-opening-edge'}))}}
function corridorShell(svg,outer,inner,depth,wet=false){polygon(svg,[[outer.l,outer.t],[outer.r,outer.t],[inner.r,inner.t],[inner.l,inner.t]],`crawler-ceiling depth-${depth}`);polygon(svg,[[outer.l,outer.b],[inner.l,inner.b],[inner.r,inner.b],[outer.r,outer.b]],`crawler-floor depth-${depth}${wet?' wet':''}`);polygon(svg,[[outer.l,outer.t],[inner.l,inner.t],[inner.l,inner.b],[outer.l,outer.b]],`crawler-wall left depth-${depth}`);polygon(svg,[[outer.r,outer.t],[outer.r,outer.b],[inner.r,inner.b],[inner.r,inner.t]],`crawler-wall right depth-${depth}`);svg.append(el('rect',{x:inner.l,y:inner.t,width:inner.r-inner.l,height:inner.b-inner.t,class:`crawler-frame depth-${depth}`}))}
function nodeIsWet(node){return /Wasser|Zisterne|Brücke|Pump|Versunken|Feucht|Nass/i.test(node?.name||'')||node?.tags?.includes('water')}

function drawEndWall(svg,frame,node,depth){svg.append(el('rect',{x:frame.l,y:frame.t,width:frame.r-frame.l,height:frame.b-frame.t,class:`crawler-end-wall depth-${depth}`}));if(node?.kind==='gate'){for(let x=frame.l+18;x<frame.r-10;x+=18)svg.append(el('line',{x1:x,y1:frame.t+8,x2:x,y2:frame.b-8,class:'crawler-gate-bar'}));svg.append(el('line',{x1:frame.l+7,y1:frame.t+30,x2:frame.r-7,y2:frame.t+30,class:'crawler-gate-bar horizontal'}))}if(node?.kind==='prison'){for(let x=frame.l+15;x<frame.r-8;x+=15)svg.append(el('line',{x1:x,y1:frame.t+10,x2:x,y2:frame.b-10,class:'crawler-prison-bar'}))}if(node?.kind==='glyph'||node?.kind==='goal'){const cx=(frame.l+frame.r)/2,cy=(frame.t+frame.b)/2,r=Math.max(10,(frame.r-frame.l)*.13);svg.append(el('circle',{cx,cy,r,class:'crawler-glyph'}));svg.append(el('circle',{cx,cy,r:r*.62,class:'crawler-glyph inner'}))}}
function drawCurrentFeature(svg,node,exits){if(node?.kind==='room'||node?.kind==='lens'){svg.append(el('rect',{x:72,y:86,width:18,height:268,rx:5,class:'crawler-pillar'}));svg.append(el('rect',{x:710,y:86,width:18,height:268,rx:5,class:'crawler-pillar'}))}if(exits.UP){const text=el('text',{x:400,y:47,class:'crawler-vertical-mark'});text.textContent='▲ AUF';svg.append(text)}if(exits.DOWN){for(let i=0;i<5;i++)svg.append(el('line',{x1:345+i*9,y1:410-i*8,x2:455-i*9,y2:410-i*8,class:'crawler-stair'}));const text=el('text',{x:400,y:431,class:'crawler-vertical-mark down'});text.textContent='AB ▼';svg.append(text)}}

function stepsToBoundary(pos,grid,facing){const [dx,dy]=VECTORS[facing]||[0,0];let x=pos.x,y=pos.y,steps=0;while(steps<12){const nx=x+dx,ny=y+dy;if(nx<0||ny<0||nx>=grid.w||ny>=grid.h)break;x=nx;y=ny;steps++}return steps}
function drawDoor(svg,frame,label=''){const w=Math.max(34,(frame.r-frame.l)*.28),h=Math.max(48,(frame.b-frame.t)*.62),x=(frame.l+frame.r-w)/2,y=frame.b-h;svg.append(el('rect',{x,y,width:w,height:h,rx:3,class:'crawler-room-door'}));if(label){const t=el('text',{x:x+w/2,y:y-7,class:'crawler-room-door-label'});t.textContent=label;svg.append(t)}}
function renderRoomScene(svg,node,exits,state){
  const grid=state.roomGrid,pos=state.heroPosition,facing=state.facing,steps=stepsToBoundary(pos,grid,facing),frame=FRAMES[Math.min(4,Math.max(1,steps+1))];
  polygon(svg,[[0,0],[800,0],[frame.r,frame.t],[frame.l,frame.t]],'crawler-room-ceiling');
  polygon(svg,[[0,450],[frame.l,frame.b],[frame.r,frame.b],[800,450]],`crawler-room-floor${nodeIsWet(node)?' wet':''}`);
  polygon(svg,[[0,0],[frame.l,frame.t],[frame.l,frame.b],[0,450]],'crawler-room-wall left');
  polygon(svg,[[800,0],[800,450],[frame.r,frame.b],[frame.r,frame.t]],'crawler-room-wall right');
  svg.append(el('rect',{x:frame.l,y:frame.t,width:frame.r-frame.l,height:frame.b-frame.t,class:'crawler-room-back'}));
  for(let i=1;i<=Math.min(steps,4);i++){const f=FRAMES[Math.min(4,i)];svg.append(el('line',{x1:f.l,y1:f.b,x2:f.r,y2:f.b,class:'crawler-room-grid'}))}
  const mid=(frame.l+frame.r)/2;for(const pct of [.25,.5,.75])svg.append(el('line',{x1:400+(pct-.5)*760,y1:450,x2:mid+(pct-.5)*(frame.r-frame.l),y2:frame.b,class:'crawler-room-grid'}));
  if(exits[facing])drawDoor(svg,frame,`Ausgang ${facing}`);
  if(hasSideExit(exits,facing,'left'))sideOpening(svg,FRAMES[0],frame,'left',0);
  if(hasSideExit(exits,facing,'right'))sideOpening(svg,FRAMES[0],frame,'right',0);
  drawCurrentFeature(svg,node,exits);
  const features=state.visibleFeatures||[];features.slice(0,3).forEach((f,i)=>{const g=el('g',{class:'crawler-feature-marker'}),x=400+(i-(features.length-1)/2)*155,y=345-i%2*28;g.append(el('circle',{cx:x,cy:y,r:6,class:'crawler-feature-dot'}));const t=el('text',{x:x+11,y:y+4,class:'crawler-feature-text'});t.textContent=f.label;g.append(t);svg.append(g)});
  const coords=el('text',{x:400,y:420,class:'crawler-room-position'});coords.textContent=`Feld ${pos.x+1}/${grid.w} · ${pos.y+1}/${grid.h}`;svg.append(coords);
}

function renderCorridorScene(svg,map,dirs,current,facing){const byId=new Map(map.nodes.map(n=>[n.id,n])),adj=buildCrawlerAdj(map,dirs);let node=current;for(let depth=0;depth<4;depth++){const outer=FRAMES[depth],inner=FRAMES[depth+1],exits=adj.get(node.id)||{};corridorShell(svg,outer,inner,depth,nodeIsWet(node));if(hasSideExit(exits,facing,'left'))sideOpening(svg,outer,inner,'left',depth);if(hasSideExit(exits,facing,'right'))sideOpening(svg,outer,inner,'right',depth);if(depth===0)drawCurrentFeature(svg,node,exits);const nextId=exits[facing];if(!nextId){drawEndWall(svg,inner,node,depth);break}const next=byId.get(nextId);if(!next){drawEndWall(svg,inner,node,depth);break}node=next;if(depth===3){const far=FRAMES[4];svg.append(el('rect',{x:far.l,y:far.t,width:far.r-far.l,height:far.b-far.t,class:'crawler-distance-dark'}))}}}

function addAtmosphere(svg){
  svg.append(el('rect',{x:0,y:0,width:800,height:450,class:'crawler-grain',filter:'url(#crawlerStoneNoise)'}));
  svg.append(el('rect',{x:0,y:0,width:800,height:450,class:'crawler-light'}));
  svg.append(el('rect',{x:0,y:0,width:800,height:450,class:'crawler-vignette'}));
}

function renderScene(svg,map,dirs,state){
  if(!svg)return;const byId=new Map(map.nodes.map(n=>[n.id,n])),current=byId.get(state.node);if(!current)return;const facing=FACING_ORDER.includes(state.facing)?state.facing:'N',adj=buildCrawlerAdj(map,dirs),exits=adj.get(current.id)||{};
  svg.dataset.level=String(current.z);svg.dataset.kind=current.kind||'';svg.dataset.wet=nodeIsWet(current)?'1':'0';svg.innerHTML=SCENE_DEFS;
  svg.append(el('rect',{x:0,y:0,width:800,height:450,class:'crawler-bg'}));
  if(state.roomGrid&&state.heroPosition)renderRoomScene(svg,current,exits,{...state,facing});else renderCorridorScene(svg,map,dirs,current,facing);
  svg.append(el('rect',{x:0,y:0,width:800,height:450,fill:'url(#crawlerDust)',class:'crawler-dust'}));
  addAtmosphere(svg);
}

export function createCrawlerView({map,dirs,getState}){
  const svg=document.querySelector('#crawlerSvg'),facingLabel=document.querySelector('#crawlerFacing'),currentTitle=document.querySelector('#crawlerCurrent');
  return {render(){const state=getState();if(!state?.node)return;const node=map.nodes.find(n=>n.id===state.node),facing=FACING_ORDER.includes(state.facing)?state.facing:'N';renderScene(svg,map,dirs,{...state,facing});if(facingLabel)facingLabel.textContent=`Blick ${dirs[facing]?.label||facing}`;if(currentTitle)currentTitle.textContent=node?.name||state.node},setMode(next){document.body.classList.toggle('view-crawler',next!=='map');document.body.classList.toggle('view-map',next==='map')}};
}