export const FACING_ORDER=['N','NE','E','SE','S','SW','W','NW'];

const NS='http://www.w3.org/2000/svg';
const FRAMES=[
  {l:0,r:800,t:0,b:450},
  {l:105,r:695,t:62,b:388},
  {l:205,r:595,t:122,b:328},
  {l:285,r:515,t:168,b:282},
  {l:335,r:465,t:192,b:258}
];

export function rotateFacing(facing,steps){
  const index=FACING_ORDER.indexOf(facing);
  const start=index>=0?index:0;
  return FACING_ORDER[(start+steps%8+8)%8];
}

export function relativeExitSide(facing,dir){
  const a=FACING_ORDER.indexOf(facing),b=FACING_ORDER.indexOf(dir);
  if(a<0||b<0)return null;
  const delta=(b-a+8)%8;
  if(delta===0)return 'front';
  if(delta===4)return 'back';
  if(delta<4)return 'right';
  return 'left';
}

export function buildCrawlerAdj(map,dirs){
  const adj=new Map(map.nodes.map(n=>[n.id,{}]));
  for(const [from,dir,to] of map.edges){
    if(!adj.has(from)||!adj.has(to))continue;
    adj.get(from)[dir]=to;
    const reverse=dirs[dir]?.opp;
    if(reverse&&!adj.get(to)[reverse])adj.get(to)[reverse]=from;
  }
  return adj;
}

export function traceSightline(map,dirs,nodeId,facing,maxDepth=4){
  const adj=buildCrawlerAdj(map,dirs),out=[];
  let current=nodeId;
  for(let depth=0;depth<maxDepth;depth++){
    const exits=adj.get(current)||{};
    out.push({node:current,exits:{...exits}});
    const next=exits[facing];
    if(!next)break;
    current=next;
  }
  return out;
}

function el(name,attrs={}){
  const node=document.createElementNS(NS,name);
  for(const [key,value] of Object.entries(attrs))node.setAttribute(key,String(value));
  return node;
}

function polygon(svg,pts,className){
  svg.append(el('polygon',{points:pts.map(p=>p.join(',')).join(' '),class:className}));
}

function hasSideExit(exits,facing,side){
  return FACING_ORDER.some(dir=>exits[dir]&&relativeExitSide(facing,dir)===side);
}

function sideOpening(svg,outer,inner,side,depth){
  const topMix=.30,bottomMix=.70;
  const oy1=outer.t+(outer.b-outer.t)*topMix;
  const oy2=outer.t+(outer.b-outer.t)*bottomMix;
  const iy1=inner.t+(inner.b-inner.t)*.32;
  const iy2=inner.t+(inner.b-inner.t)*.68;
  if(side==='left'){
    polygon(svg,[[outer.l,oy1],[inner.l+3,iy1],[inner.l+3,iy2],[outer.l,oy2]],`crawler-opening left depth-${depth}`);
    svg.append(el('line',{x1:outer.l,y1:oy1,x2:inner.l+3,y2:iy1,class:'crawler-opening-edge'}));
  }else{
    polygon(svg,[[outer.r,oy1],[inner.r-3,iy1],[inner.r-3,iy2],[outer.r,oy2]],`crawler-opening right depth-${depth}`);
    svg.append(el('line',{x1:outer.r,y1:oy1,x2:inner.r-3,y2:iy1,class:'crawler-opening-edge'}));
  }
}

function corridorShell(svg,outer,inner,depth,wet=false){
  polygon(svg,[[outer.l,outer.t],[outer.r,outer.t],[inner.r,inner.t],[inner.l,inner.t]],`crawler-ceiling depth-${depth}`);
  polygon(svg,[[outer.l,outer.b],[inner.l,inner.b],[inner.r,inner.b],[outer.r,outer.b]],`crawler-floor depth-${depth}${wet?' wet':''}`);
  polygon(svg,[[outer.l,outer.t],[inner.l,inner.t],[inner.l,inner.b],[outer.l,outer.b]],`crawler-wall left depth-${depth}`);
  polygon(svg,[[outer.r,outer.t],[outer.r,outer.b],[inner.r,inner.b],[inner.r,inner.t]],`crawler-wall right depth-${depth}`);
  svg.append(el('rect',{x:inner.l,y:inner.t,width:inner.r-inner.l,height:inner.b-inner.t,class:`crawler-frame depth-${depth}`}));
}

function nodeIsWet(node){return /Wasser|Zisterne|Brücke|Pump|Versunken|Feucht|Nass/i.test(node?.name||'')}

function drawEndWall(svg,frame,node,depth){
  svg.append(el('rect',{x:frame.l,y:frame.t,width:frame.r-frame.l,height:frame.b-frame.t,class:`crawler-end-wall depth-${depth}`}));
  if(node?.kind==='gate'){
    for(let x=frame.l+18;x<frame.r-10;x+=18)svg.append(el('line',{x1:x,y1:frame.t+8,x2:x,y2:frame.b-8,class:'crawler-gate-bar'}));
    svg.append(el('line',{x1:frame.l+7,y1:frame.t+30,x2:frame.r-7,y2:frame.t+30,class:'crawler-gate-bar horizontal'}));
  }
  if(node?.kind==='prison'){
    for(let x=frame.l+15;x<frame.r-8;x+=15)svg.append(el('line',{x1:x,y1:frame.t+10,x2:x,y2:frame.b-10,class:'crawler-prison-bar'}));
  }
  if(node?.kind==='glyph'||node?.kind==='goal'){
    const cx=(frame.l+frame.r)/2,cy=(frame.t+frame.b)/2,r=Math.max(10,(frame.r-frame.l)*.13);
    svg.append(el('circle',{cx,cy,r,class:'crawler-glyph'}));
    svg.append(el('circle',{cx,cy,r:r*.62,class:'crawler-glyph inner'}));
  }
}

function drawCurrentFeature(svg,node,exits){
  if(node?.kind==='room'||node?.kind==='lens'){
    svg.append(el('rect',{x:72,y:86,width:18,height:268,rx:5,class:'crawler-pillar'}));
    svg.append(el('rect',{x:710,y:86,width:18,height:268,rx:5,class:'crawler-pillar'}));
  }
  if(exits.UP){
    const text=el('text',{x:400,y:47,class:'crawler-vertical-mark'});text.textContent='▲ AUF';svg.append(text);
  }
  if(exits.DOWN){
    for(let i=0;i<5;i++)svg.append(el('line',{x1:345+i*9,y1:410-i*8,x2:455-i*9,y2:410-i*8,class:'crawler-stair'}));
    const text=el('text',{x:400,y:431,class:'crawler-vertical-mark down'});text.textContent='AB ▼';svg.append(text);
  }
}

function renderScene(svg,map,dirs,state){
  if(!svg)return;
  const byId=new Map(map.nodes.map(n=>[n.id,n]));
  const adj=buildCrawlerAdj(map,dirs);
  const current=byId.get(state.node);
  if(!current)return;
  const facing=FACING_ORDER.includes(state.facing)?state.facing:'N';
  svg.dataset.level=String(current.z);
  svg.innerHTML='<defs><filter id="crawlerGlow"><feGaussianBlur stdDeviation="5" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter><pattern id="crawlerDust" width="28" height="28" patternUnits="userSpaceOnUse"><circle cx="5" cy="8" r="1" class="crawler-dust-dot"/><circle cx="21" cy="19" r="1.4" class="crawler-dust-dot"/><path d="M2 24l9-3M17 5l7 2" class="crawler-dust-line"/></pattern></defs>';
  svg.append(el('rect',{x:0,y:0,width:800,height:450,class:'crawler-bg'}));
  svg.append(el('rect',{x:0,y:0,width:800,height:450,fill:'url(#crawlerDust)',class:'crawler-dust'}));

  let node=current;
  for(let depth=0;depth<4;depth++){
    const outer=FRAMES[depth],inner=FRAMES[depth+1],exits=adj.get(node.id)||{};
    corridorShell(svg,outer,inner,depth,nodeIsWet(node));
    if(hasSideExit(exits,facing,'left'))sideOpening(svg,outer,inner,'left',depth);
    if(hasSideExit(exits,facing,'right'))sideOpening(svg,outer,inner,'right',depth);
    if(depth===0)drawCurrentFeature(svg,node,exits);
    const nextId=exits[facing];
    if(!nextId){drawEndWall(svg,inner,node,depth);break}
    const next=byId.get(nextId);
    if(!next){drawEndWall(svg,inner,node,depth);break}
    node=next;
    if(depth===3){
      const far=FRAMES[4];
      svg.append(el('rect',{x:far.l,y:far.t,width:far.r-far.l,height:far.b-far.t,class:'crawler-distance-dark'}));
    }
  }
}

export function createCrawlerView({map,dirs,getState,onTurn,onForward,onVertical}){
  const svg=document.querySelector('#crawlerSvg');
  const viewCrawler=document.querySelector('#viewCrawler');
  const viewMap=document.querySelector('#viewMap');
  const facingLabel=document.querySelector('#crawlerFacing');
  const forward=document.querySelector('#crawlerForward');
  const left=document.querySelector('#crawlerLeft');
  const right=document.querySelector('#crawlerRight');
  const turnAround=document.querySelector('#crawlerAround');
  const up=document.querySelector('#crawlerUp');
  const down=document.querySelector('#crawlerDown');
  const currentTitle=document.querySelector('#crawlerCurrent');
  const adj=buildCrawlerAdj(map,dirs);
  let mode=localStorage.getItem('maze-view-mode')||'crawler';

  function setMode(next){
    mode=next==='map'?'map':'crawler';
    localStorage.setItem('maze-view-mode',mode);
    document.body.classList.toggle('view-crawler',mode==='crawler');
    document.body.classList.toggle('view-map',mode==='map');
    viewCrawler?.classList.toggle('active',mode==='crawler');
    viewMap?.classList.toggle('active',mode==='map');
    viewCrawler?.setAttribute('aria-pressed',String(mode==='crawler'));
    viewMap?.setAttribute('aria-pressed',String(mode==='map'));
  }

  viewCrawler?.addEventListener('click',()=>setMode('crawler'));
  viewMap?.addEventListener('click',()=>setMode('map'));
  left?.addEventListener('click',()=>onTurn(-1));
  right?.addEventListener('click',()=>onTurn(1));
  turnAround?.addEventListener('click',()=>onTurn(4));
  forward?.addEventListener('click',()=>onForward());
  up?.addEventListener('click',()=>onVertical('UP'));
  down?.addEventListener('click',()=>onVertical('DOWN'));

  window.addEventListener('keydown',event=>{
    if(mode!=='crawler'||event.altKey||event.ctrlKey||event.metaKey)return;
    if(/INPUT|TEXTAREA|SELECT|BUTTON/.test(document.activeElement?.tagName||''))return;
    if(event.key==='ArrowLeft'){event.preventDefault();onTurn(-1)}
    else if(event.key==='ArrowRight'){event.preventDefault();onTurn(1)}
    else if(event.key==='ArrowUp'){event.preventDefault();onForward()}
    else if(event.key==='ArrowDown'){event.preventDefault();onTurn(4)}
  });

  setMode(mode);

  return {
    render(){
      const state=getState();
      if(!state?.node)return;
      const node=map.nodes.find(n=>n.id===state.node);
      const exits=adj.get(state.node)||{};
      const facing=FACING_ORDER.includes(state.facing)?state.facing:'N';
      renderScene(svg,map,dirs,{...state,facing});
      if(facingLabel)facingLabel.textContent=`Blick ${dirs[facing]?.label||facing}`;
      if(currentTitle)currentTitle.textContent=node?.name||state.node;
      if(forward){forward.disabled=!exits[facing];forward.title=exits[facing]?'Vorwärts gehen':'Vor euch ist kein begehbarer Gang.'}
      if(up){up.disabled=!exits.UP;up.classList.toggle('available',Boolean(exits.UP))}
      if(down){down.disabled=!exits.DOWN;down.classList.toggle('available',Boolean(exits.DOWN))}
    },
    setMode
  };
}
