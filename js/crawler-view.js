import {visibleAdj} from './navigation-model.js';
import {terrainTypeAt} from './room-terrain.js';

export const FACING_ORDER=['N','NE','E','SE','S','SW','W','NW'];
const NS='http://www.w3.org/2000/svg';
const W=800,H=450;
const FRAMES=[{l:0,r:800,t:0,b:450},{l:105,r:695,t:62,b:388},{l:205,r:595,t:122,b:328},{l:285,r:515,t:168,b:282},{l:335,r:465,t:192,b:258}];
const VECTORS={N:[0,-1],NE:[1,-1],E:[1,0],SE:[1,1],S:[0,1],SW:[-1,1],W:[-1,0],NW:[-1,-1]};
const PALETTES={
  A:{void:'#050403',stone:'#2a2119',stone2:'#4a3a2b',floor:'#34271c',mortar:'#6f5941',water:'#082226',accent:'#d99545',fog:'#79614a'},
  B:{void:'#020607',stone:'#1d2825',stone2:'#35423a',floor:'#202b27',mortar:'#617267',water:'#031c24',accent:'#c18d46',fog:'#42615d'},
  C:{void:'#070304',stone:'#291d1b',stone2:'#49302a',floor:'#30211e',mortar:'#75564b',water:'#071a1f',accent:'#c2683c',fog:'#704840'},
  D:{void:'#010405',stone:'#172123',stone2:'#2d3937',floor:'#182321',mortar:'#526764',water:'#01171d',accent:'#77a9a1',fog:'#344f51'}
};

export function rotateFacing(facing,steps){const index=FACING_ORDER.indexOf(facing),start=index>=0?index:0;return FACING_ORDER[(start+steps%8+8)%8]}
export function relativeExitSide(facing,dir){const a=FACING_ORDER.indexOf(facing),b=FACING_ORDER.indexOf(dir);if(a<0||b<0)return null;const delta=(b-a+8)%8;if(delta===0)return 'front';if(delta===4)return 'back';if(delta<4)return 'right';return 'left'}
export function buildCrawlerAdj(map,dirs,sharedState=null){
  if(sharedState){const nav=visibleAdj(map,sharedState),adj=new Map(map.nodes.map(n=>[n.id,{}]));for(const [id,edges] of nav)for(const [dir,edge] of Object.entries(edges))adj.get(id)[dir]=edge.to;return adj}
  const adj=new Map(map.nodes.map(n=>[n.id,{}]));for(const [from,dir,to] of map.edges){if(!adj.has(from)||!adj.has(to))continue;const current=adj.get(from)[dir];if(current&&current!==to)throw new Error(`Conflicting crawler edge ${from}/${dir}`);adj.get(from)[dir]=to;const reverse=dirs[dir]?.opp;if(reverse&&!adj.get(to)[reverse])adj.get(to)[reverse]=from}return adj
}
export function traceSightline(map,dirs,nodeId,facing,maxDepth=4,sharedState=null){const adj=buildCrawlerAdj(map,dirs,sharedState),out=[];let current=nodeId;for(let depth=0;depth<maxDepth;depth++){const exits=adj.get(current)||{};out.push({node:current,exits:{...exits}});const next=exits[facing];if(!next)break;current=next}return out}

function el(name,attrs={}){const node=document.createElementNS(NS,name);for(const [key,value] of Object.entries(attrs))node.setAttribute(key,String(value));return node}
function polygon(svg,pts,className,attrs={}){svg.append(el('polygon',{points:pts.map(p=>p.join(',')).join(' '),class:className,...attrs}))}
function path(svg,d,className,attrs={}){svg.append(el('path',{d,class:className,...attrs}))}
function zoneFor(node){return Number(node?.z)===0?'A':Number(node?.z)===-1?'B':Number(node?.z)===-2?'C':'D'}
function nodeIsWet(node){return /Wasser|Zisterne|Brücke|Pump|Versunken|Feucht|Nass|Kaverne/i.test(node?.name||'')||node?.tags?.includes('water')}
function themeFor(node){const zone=zoneFor(node),tags=new Set(node?.tags||[]),shape=node?.geometry?.shape||'';return {zone,palette:PALETTES[zone],cave:tags.has('cavern')||/cavern|grotte/i.test(shape)||/Grotte|Kaverne/i.test(node?.name||''),cult:tags.has('cult')||tags.has('demonic'),oldElem:tags.has('old_elem'),machinery:tags.has('machinery')||/machine|workshop|industrial/i.test(shape),grave:tags.has('grave')||/ossuary|burial/i.test(shape),wet:nodeIsWet(node),shape,ceiling:Number(node?.geometry?.ceilingM)||4}}
function hasSideExit(exits,facing,side){return FACING_ORDER.some(dir=>exits[dir]&&relativeExitSide(facing,dir)===side)}
function clamp(v,a,b){return Math.max(a,Math.min(b,v))}

function installDefs(svg,theme){
  const p=theme.palette,accent=theme.cult&&theme.zone==='C'?'#b85937':p.accent,defs=el('defs');
  defs.innerHTML=`
    <linearGradient id="crawlerVoid" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${p.void}"/><stop offset=".58" stop-color="${p.stone}"/><stop offset="1" stop-color="${p.void}"/></linearGradient>
    <linearGradient id="crawlerFloorGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${p.stone}"/><stop offset="1" stop-color="${p.floor}"/></linearGradient>
    <linearGradient id="crawlerRockGrad" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${p.stone2}"/><stop offset=".55" stop-color="${p.stone}"/><stop offset="1" stop-color="${p.void}"/></linearGradient>
    <linearGradient id="crawlerWaterGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${p.water}"/><stop offset=".58" stop-color="#09252c"/><stop offset="1" stop-color="#01090c"/></linearGradient>
    <radialGradient id="crawlerTorch"><stop offset="0" stop-color="#fff2b2" stop-opacity=".95"/><stop offset=".18" stop-color="${accent}" stop-opacity=".88"/><stop offset=".48" stop-color="${accent}" stop-opacity=".24"/><stop offset="1" stop-color="${accent}" stop-opacity="0"/></radialGradient>
    <radialGradient id="crawlerVignette"><stop offset="42%" stop-color="#000" stop-opacity="0"/><stop offset="78%" stop-color="#000" stop-opacity=".35"/><stop offset="100%" stop-color="#000" stop-opacity=".88"/></radialGradient>
    <linearGradient id="crawlerFog" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${p.fog}" stop-opacity="0"/><stop offset="1" stop-color="${p.fog}" stop-opacity=".22"/></linearGradient>
    <pattern id="crawlerStoneBlocks" width="74" height="38" patternUnits="userSpaceOnUse"><rect width="74" height="38" fill="${p.stone}"/><path d="M0 1h74M0 37h74M0 19h74M18 1v18M55 19v18" fill="none" stroke="${p.mortar}" stroke-opacity=".23" stroke-width="1"/><path d="M5 9l18-4M43 28l17-3M29 16l8 2" stroke="${p.stone2}" stroke-opacity=".25"/></pattern>
    <pattern id="crawlerFloorSlabs" width="86" height="52" patternUnits="userSpaceOnUse"><rect width="86" height="52" fill="${p.floor}"/><path d="M0 1h86M0 51h86M0 26h86M22 1v25M64 26v25" fill="none" stroke="${p.mortar}" stroke-opacity=".24"/><path d="M9 18l14-3M47 43l22-5" stroke="#000" stroke-opacity=".25"/></pattern>
    <filter id="crawlerStoneNoise" x="-15%" y="-15%" width="130%" height="130%"><feTurbulence type="fractalNoise" baseFrequency=".7" numOctaves="3" seed="19" result="noise"/><feColorMatrix in="noise" type="saturate" values="0" result="mono"/><feBlend in="SourceGraphic" in2="mono" mode="soft-light"/></filter>
    <filter id="crawlerSoftGlow" x="-150%" y="-150%" width="400%" height="400%"><feGaussianBlur stdDeviation="5" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    <filter id="crawlerWaterNoise" x="-10%" y="-20%" width="120%" height="140%"><feTurbulence type="turbulence" baseFrequency=".018 .09" numOctaves="2" seed="7" result="waves"/><feDisplacementMap in="SourceGraphic" in2="waves" scale="5" xChannelSelector="R" yChannelSelector="B"/></filter>
  `;
  svg.append(defs);
}

function drawAtmosphere(svg,theme){
  svg.append(el('rect',{x:0,y:0,width:W,height:H,fill:'url(#crawlerVoid)',class:'crawler-bg'}));
  const haze=el('ellipse',{cx:400,cy:260,rx:330,ry:175,fill:'url(#crawlerFog)',class:'crawler-haze'});svg.append(haze);
  for(let i=0;i<18;i++){const x=(i*137+71)%800,y=60+((i*83)%320),r=.7+(i%3)*.35;svg.append(el('circle',{cx:x,cy:y,r,class:'crawler-mote'}))}
}
function drawVignette(svg){svg.append(el('rect',{x:0,y:0,width:W,height:H,fill:'url(#crawlerVignette)',class:'crawler-vignette'}))}
function drawTorch(svg,x,y,scale=1,dim=false){
  const g=el('g',{class:`crawler-torch${dim?' dim':''}`});g.append(el('circle',{cx:x,cy:y,r:46*scale,fill:'url(#crawlerTorch)',class:'crawler-torch-glow'}));
  g.append(el('path',{d:`M${x},${y+9*scale} q${-7*scale},${-10*scale} 0,${-22*scale} q${10*scale},${10*scale} 0,${22*scale}z`,class:'crawler-flame'}));
  g.append(el('line',{x1:x,y1:y+9*scale,x2:x,y2:y+25*scale,class:'crawler-sconce'}));svg.append(g)
}
function drawMasonryCracks(svg,frame,depth){const o=.34/(depth+1);path(svg,`M${frame.l+18} ${frame.t+26} l22 18 -8 25 31 17`, 'crawler-crack',{opacity:o});path(svg,`M${frame.r-31} ${frame.b-22} l-18 -15 11 -17 -25 -12`,'crawler-crack',{opacity:o*.8})}
function drawArch(svg,frame,depth,theme){const h=frame.b-frame.t,cx=(frame.l+frame.r)/2,shoulder=frame.t+h*.36;path(svg,`M${frame.l} ${frame.b} L${frame.l} ${shoulder} Q${cx} ${frame.t-18} ${frame.r} ${shoulder} L${frame.r} ${frame.b}`,'crawler-arch',{opacity:clamp(.75-depth*.13,.25,.8)});if(theme.oldElem&&depth<2){path(svg,`M${frame.l+8} ${shoulder+5} Q${cx} ${frame.t-5} ${frame.r-8} ${shoulder+5}`,'crawler-arch-rune',{opacity:.52-depth*.16})}}
function sideOpening(svg,outer,inner,side,depth){const oy1=outer.t+(outer.b-outer.t)*.28,oy2=outer.t+(outer.b-outer.t)*.75,iy1=inner.t+(inner.b-inner.t)*.31,iy2=inner.t+(inner.b-inner.t)*.72;if(side==='left'){polygon(svg,[[outer.l,oy1],[inner.l+4,iy1],[inner.l+4,iy2],[outer.l,oy2]],`crawler-opening left depth-${depth}`);path(svg,`M${outer.l} ${oy2} L${outer.l} ${oy1} Q${(outer.l+inner.l)/2} ${oy1-18} ${inner.l+4} ${iy1}`,'crawler-opening-edge')}else{polygon(svg,[[outer.r,oy1],[inner.r-4,iy1],[inner.r-4,iy2],[outer.r,oy2]],`crawler-opening right depth-${depth}`);path(svg,`M${outer.r} ${oy2} L${outer.r} ${oy1} Q${(outer.r+inner.r)/2} ${oy1-18} ${inner.r-4} ${iy1}`,'crawler-opening-edge')}}

function corridorShell(svg,outer,inner,depth,theme){
  const wallFill=theme.cave?'url(#crawlerRockGrad)':'url(#crawlerStoneBlocks)',floorFill=theme.wet?'url(#crawlerWaterGrad)':'url(#crawlerFloorSlabs)';
  polygon(svg,[[outer.l,outer.t],[outer.r,outer.t],[inner.r,inner.t],[inner.l,inner.t]],`crawler-ceiling depth-${depth}`,{fill:theme.cave?'url(#crawlerRockGrad)':'url(#crawlerRockGrad)'});
  polygon(svg,[[outer.l,outer.b],[inner.l,inner.b],[inner.r,inner.b],[outer.r,outer.b]],`crawler-floor depth-${depth}${theme.wet?' wet':''}`,{fill:floorFill});
  polygon(svg,[[outer.l,outer.t],[inner.l,inner.t],[inner.l,inner.b],[outer.l,outer.b]],`crawler-wall left depth-${depth}`,{fill:wallFill});
  polygon(svg,[[outer.r,outer.t],[outer.r,outer.b],[inner.r,inner.b],[inner.r,inner.t]],`crawler-wall right depth-${depth}`,{fill:wallFill});
  if(!theme.cave)drawArch(svg,inner,depth,theme);drawMasonryCracks(svg,inner,depth);
  if(theme.wet){const y=(outer.b+inner.b)/2;path(svg,`M${outer.l+10} ${y} Q400 ${y-8} ${outer.r-10} ${y}`,'crawler-water-glint',{opacity:.25/(depth+1)})}
}
function drawCaveRibs(svg,frame,depth){const mid=(frame.l+frame.r)/2;path(svg,`M${frame.l} ${frame.b} Q${frame.l+18} ${frame.t+30} ${mid-28} ${frame.t+14} Q${mid} ${frame.t-10} ${mid+32} ${frame.t+17} Q${frame.r-13} ${frame.t+42} ${frame.r} ${frame.b}`,'crawler-cave-rib',{opacity:clamp(.7-depth*.12,.25,.7)})}
function drawEndWall(svg,frame,node,depth,theme){
  if(theme.cave){polygon(svg,[[frame.l,frame.b],[frame.l-5,frame.t+45],[frame.l+25,frame.t+13],[(frame.l+frame.r)/2,frame.t-5],[frame.r-18,frame.t+24],[frame.r+4,frame.t+58],[frame.r,frame.b]],`crawler-end-rock depth-${depth}`,{fill:'url(#crawlerRockGrad)'});return}
  svg.append(el('rect',{x:frame.l,y:frame.t,width:frame.r-frame.l,height:frame.b-frame.t,class:`crawler-end-wall depth-${depth}`,fill:'url(#crawlerStoneBlocks)'}));
  drawArch(svg,frame,depth,theme);
  if(node?.kind==='gate'){for(let x=frame.l+18;x<frame.r-10;x+=18)svg.append(el('line',{x1:x,y1:frame.t+8,x2:x,y2:frame.b-8,class:'crawler-gate-bar'}));svg.append(el('line',{x1:frame.l+7,y1:frame.t+30,x2:frame.r-7,y2:frame.t+30,class:'crawler-gate-bar horizontal'}))}
  if(node?.kind==='prison'){for(let x=frame.l+15;x<frame.r-8;x+=15)svg.append(el('line',{x1:x,y1:frame.t+10,x2:x,y2:frame.b-10,class:'crawler-prison-bar'}))}
  if(node?.kind==='glyph'||node?.kind==='goal'){const cx=(frame.l+frame.r)/2,cy=(frame.t+frame.b)/2,r=Math.max(10,(frame.r-frame.l)*.13);svg.append(el('circle',{cx,cy,r,class:'crawler-glyph'}));svg.append(el('circle',{cx,cy,r:r*.62,class:'crawler-glyph inner'}));path(svg,`M${cx-r*.65} ${cy}h${r*1.3}M${cx} ${cy-r*.65}v${r*1.3}`,'crawler-glyph-mark')}
}
function drawVerticalExits(svg,exits){if(exits.UP){const text=el('text',{x:400,y:49,class:'crawler-vertical-mark'});text.textContent='▲ AUF';svg.append(text)}if(exits.DOWN){for(let i=0;i<5;i++)svg.append(el('line',{x1:344+i*8,y1:408-i*8,x2:456-i*8,y2:408-i*8,class:'crawler-stair'}));const text=el('text',{x:400,y:432,class:'crawler-vertical-mark down'});text.textContent='AB ▼';svg.append(text)}}
function drawCorridorDetails(svg,node,exits,theme){
  if(theme.cult){drawTorch(svg,104,185,.8);drawTorch(svg,696,185,.8);if(theme.zone==='C')path(svg,'M132 82v105 l36 -11v-88z','crawler-banner');}
  else if(theme.zone==='A'){drawTorch(svg,126,204,.68,true)}
  if(theme.machinery){for(const x of [118,682]){path(svg,`M${x} 78v270 M${x+11} 95v230`,'crawler-pipe');svg.append(el('circle',{cx:x,cy:180,r:11,class:'crawler-valve'}))}}
  if(theme.grave){for(const x of [62,738])for(const y of [120,190,260])svg.append(el('rect',{x:x-22,y:y-18,width:44,height:28,rx:8,class:'crawler-niche'}))}
  drawVerticalExits(svg,exits)
}

function stepsToBoundary(pos,grid,facing){const [dx,dy]=VECTORS[facing]||[0,0];let x=pos.x,y=pos.y,steps=0;while(steps<18){const nx=x+dx,ny=y+dy;if(nx<0||ny<0||nx>=grid.w||ny>=grid.h)break;x=nx;y=ny;steps++}return steps}
function roomHorizon(node){return clamp(186-(Math.max(2.5,Number(node?.geometry?.ceilingM)||4)-4)*4.3,92,188)}
function frameForDistance(distance,horizon){const d=clamp(distance,1,14),s=1/(1+d*.22),halfW=380*s,halfH=175*s;return {l:400-halfW,r:400+halfW,t:horizon-halfH*.78,b:horizon+halfH}}
function localCoords(worldX,worldY,pos,facing){const [fx,fy]=VECTORS[facing]||[0,-1],norm=fx*fx+fy*fy,rx=-fy,ry=fx,dx=worldX-(pos.x+.5),dy=worldY-(pos.y+.5);return {forward:(dx*fx+dy*fy)/norm,right:(dx*rx+dy*ry)/norm}}
function projectLocal(right,forward,horizon){const d=Math.max(.08,forward+1.05),scale=1/(1+d*.235);return {x:400+right*102*scale,y:438-d*78*scale,scale,forward}}
function projectWorld(worldX,worldY,pos,facing,horizon){const c=localCoords(worldX,worldY,pos,facing);return {...projectLocal(c.right,c.forward,horizon),right:c.right}}
function cellProjection(x,y,pos,facing,horizon){const corners=[[x,y],[x+1,y],[x+1,y+1],[x,y+1]].map(([cx,cy])=>projectWorld(cx,cy,pos,facing,horizon));const center=projectWorld(x+.5,y+.5,pos,facing,horizon);return {corners,center}}
function visibleRoomCells(node,pos,facing,horizon){const grid=node.exploreGrid,rows=[];for(let y=0;y<grid.h;y++)for(let x=0;x<grid.w;x++){const center=localCoords(x+.5,y+.5,pos,facing);if(center.forward<-.72||center.forward>13||Math.abs(center.right)>8.5)continue;rows.push({x,y,forward:center.forward,...cellProjection(x,y,pos,facing,horizon)})}return rows.sort((a,b)=>b.forward-a.forward)}
function terrainClass(type){return `crawler-terrain crawler-terrain-${type}`}
function drawTerrainFloor(svg,node,pos,facing,horizon){
  for(const cell of visibleRoomCells(node,pos,facing,horizon)){
    const type=terrainTypeAt(node,cell.x,cell.y),pts=cell.corners.map(p=>[p.x,p.y]);polygon(svg,pts,terrainClass(type));
    if(type==='deep_water'||type==='shallow_water'){const c=cell.center,w=28*c.scale;path(svg,`M${c.x-w} ${c.y} q${w*.55} -${3*c.scale} ${w} 0 t${w} 0`,'crawler-cell-water-glint',{opacity:clamp(.55-cell.forward*.035,.14,.5)})}
  }
}
function drawGenericRoomFloor(svg,frame,theme){polygon(svg,[[0,H],[frame.l,frame.b],[frame.r,frame.b],[W,H]],`crawler-room-floor${theme.wet?' wet':''}`,{fill:theme.wet?'url(#crawlerWaterGrad)':'url(#crawlerFloorSlabs)'});for(let i=1;i<=5;i++){const t=i/5,y=H-(H-frame.b)*t*.85;svg.append(el('line',{x1:40+(frame.l-40)*t,y1:y,x2:760+(frame.r-760)*t,y2:y,class:'crawler-room-grid'}))}}
function drawRoomEnvelope(svg,node,frame,theme,horizon){
  if(theme.cave){polygon(svg,[[0,0],[W,0],[frame.r,frame.t],[frame.l,frame.t]],'crawler-room-ceiling cave',{fill:'url(#crawlerRockGrad)'});path(svg,`M0 450 Q20 130 115 78 Q225 12 350 44 Q400 5 452 47 Q590 4 704 88 Q780 150 800 450`,'crawler-cavern-mouth');return}
  polygon(svg,[[0,0],[W,0],[frame.r,frame.t],[frame.l,frame.t]],'crawler-room-ceiling',{fill:'url(#crawlerRockGrad)'});
  polygon(svg,[[0,0],[frame.l,frame.t],[frame.l,frame.b],[0,H]],'crawler-room-wall left',{fill:'url(#crawlerStoneBlocks)'});
  polygon(svg,[[W,0],[W,H],[frame.r,frame.b],[frame.r,frame.t]],'crawler-room-wall right',{fill:'url(#crawlerStoneBlocks)'});
  svg.append(el('rect',{x:frame.l,y:frame.t,width:frame.r-frame.l,height:frame.b-frame.t,class:'crawler-room-back',fill:'url(#crawlerStoneBlocks)'}));drawArch(svg,frame,0,theme)
}
function drawDoor(svg,frame,label=''){const w=Math.max(36,(frame.r-frame.l)*.28),h=Math.max(52,(frame.b-frame.t)*.62),x=(frame.l+frame.r-w)/2,y=frame.b-h;path(svg,`M${x} ${frame.b}v${-h*.62} Q${x+w/2} ${y-14} ${x+w} ${frame.b-h*.62}v${h*.62}z`,'crawler-room-door');if(label){const t=el('text',{x:x+w/2,y:y-9,class:'crawler-room-door-label'});t.textContent=label;svg.append(t)}}
function drawProjectedPillar(svg,node,state,x,y,height=5,broken=false){const p=projectWorld(x+.5,y+.5,state.heroPosition,state.facing,state.horizon);if(p.forward<-.3||p.forward>12||Math.abs(p.right)>7)return;const h=clamp(height*15*p.scale,12,150),w=clamp(20*p.scale,5,28);svg.append(el('rect',{x:p.x-w/2,y:p.y-h,width:w,height:h,rx:w*.18,class:`crawler-projected-pillar${broken?' broken':''}`}));svg.append(el('ellipse',{cx:p.x,cy:p.y-h,rx:w*.65,ry:w*.22,class:'crawler-pillar-cap'}))}
function drawRitualDais(svg,node,state){const cx=(node.exploreGrid.w-1)/2,cy=(node.exploreGrid.h-1)/2,p=projectWorld(cx+.5,cy+.5,state.heroPosition,state.facing,state.horizon);if(p.forward<-.35||p.forward>13||Math.abs(p.right)>6.5)return;const rx=clamp(105*p.scale,24,140),ry=rx*.32;svg.append(el('ellipse',{cx:p.x,cy:p.y,rx,ry,class:'crawler-ritual-dais'}));svg.append(el('ellipse',{cx:p.x,cy:p.y,rx:rx*.72,ry:ry*.72,class:'crawler-ritual-ring'}));svg.append(el('ellipse',{cx:p.x,cy:p.y,rx:rx*.28,ry:ry*.28,class:'crawler-ritual-core'}));path(svg,`M${p.x-rx*.62} ${p.y}h${rx*1.24}M${p.x} ${p.y-ry*.7}v${ry*1.4}`,'crawler-ritual-lines');for(const [dx,dy] of [[-3,-3],[3,-3],[-3,3],[3,3]])drawProjectedPillar(svg,node,state,cx+dx,cy+dy,5,false)}
function drawSpecialRoomDetails(svg,node,state,theme){
  if(node.id==='C15'){
    drawRitualDais(svg,node,state);for(const [x,y] of [[5,5],[9,5],[5,9],[9,9]]){const p=projectWorld(x+.5,y+.5,state.heroPosition,state.facing,state.horizon);if(p.forward>-.2&&p.forward<9&&Math.abs(p.right)<6)drawTorch(svg,p.x,p.y-32*p.scale,.55*p.scale)}
  }else if(node.id==='D06'){
    for(const [x,y,b] of [[5,3,0],[8,3,1],[5,7,1],[8,7,0],[3,5,1],[10,5,0]])drawProjectedPillar(svg,node,state,x,y,b?3:6,Boolean(b));
  }else if(node.id==='D14'){
    for(const [x,y,b] of [[7,3,1],[10,4,0],[13,4,1],[5,10,0],[11,11,1],[15,9,0]])drawProjectedPillar(svg,node,state,x,y,b?5:10,Boolean(b));
    for(let i=0;i<9;i++){const x=45+i*91,y=8+(i%3)*9;path(svg,`M${x} 0 l${10+i%4*4} ${44+(i%3)*16} l${12+i%2*5} -${36+(i%3)*10}z`,'crawler-stalactite',{opacity:.65})}
  }else if(node.kind==='lens'){
    const p=projectWorld((node.exploreGrid.w)/2,(node.exploreGrid.h)/2,state.heroPosition,state.facing,state.horizon);if(p.forward>=-.2){svg.append(el('circle',{cx:p.x,cy:p.y-55*p.scale,r:28*p.scale,class:'crawler-lens-ring'}));svg.append(el('circle',{cx:p.x,cy:p.y-55*p.scale,r:17*p.scale,class:'crawler-lens-core'}))}
  }
  if(theme.machinery&&node.id!=='D06'){for(const [x,y] of [[1,1],[node.exploreGrid.w-2,1]])drawProjectedPillar(svg,node,state,x,y,3,true)}
}
function drawRoomMarkers(svg,state){const features=state.visibleFeatures||[];features.slice(0,3).forEach((f,i)=>{const g=el('g',{class:'crawler-feature-marker'}),x=400+(i-(features.length-1)/2)*150,y=342-i%2*25;g.append(el('circle',{cx:x,cy:y,r:7,class:'crawler-feature-dot'}));const t=el('text',{x:x+12,y:y+4,class:'crawler-feature-text'});t.textContent=f.label;g.append(t);svg.append(g)})}
function renderRoomScene(svg,node,exits,state,theme){
  const grid=state.roomGrid,pos=state.heroPosition,facing=state.facing,horizon=roomHorizon(node),steps=stepsToBoundary(pos,grid,facing),frame=frameForDistance(steps+1,horizon),explicit=Boolean(node.terrain?.rows);
  drawRoomEnvelope(svg,node,frame,theme,horizon);
  if(explicit)drawTerrainFloor(svg,node,pos,facing,horizon);else drawGenericRoomFloor(svg,frame,theme);
  if(exits[facing])drawDoor(svg,frame,`Ausgang ${facing}`);if(hasSideExit(exits,facing,'left'))sideOpening(svg,FRAMES[0],frame,'left',0);if(hasSideExit(exits,facing,'right'))sideOpening(svg,FRAMES[0],frame,'right',0);
  const detailState={...state,horizon};drawSpecialRoomDetails(svg,node,detailState,theme);drawCorridorDetails(svg,node,exits,theme);drawRoomMarkers(svg,state);
  const coords=el('text',{x:400,y:421,class:'crawler-room-position'});coords.textContent=`${node.exploreGrid.w*3} × ${node.exploreGrid.h*3} m · Feld ${pos.x+1}/${grid.w} · ${pos.y+1}/${grid.h}`;svg.append(coords)
}
function renderCorridorScene(svg,map,current,facing,adj){const byId=new Map(map.nodes.map(n=>[n.id,n]));let node=current;for(let depth=0;depth<4;depth++){const theme=themeFor(node),outer=FRAMES[depth],inner=FRAMES[depth+1],exits=adj.get(node.id)||{};corridorShell(svg,outer,inner,depth,theme);if(theme.cave)drawCaveRibs(svg,inner,depth);if(hasSideExit(exits,facing,'left'))sideOpening(svg,outer,inner,'left',depth);if(hasSideExit(exits,facing,'right'))sideOpening(svg,outer,inner,'right',depth);if(depth===0)drawCorridorDetails(svg,node,exits,theme);const nextId=exits[facing];if(!nextId){drawEndWall(svg,inner,node,depth,theme);break}const next=byId.get(nextId);if(!next){drawEndWall(svg,inner,node,depth,theme);break}node=next;if(depth===3){const far=FRAMES[4];svg.append(el('rect',{x:far.l,y:far.t,width:far.r-far.l,height:far.b-far.t,class:'crawler-distance-dark'}))}}}
function renderScene(svg,map,dirs,state){
  if(!svg)return;const byId=new Map(map.nodes.map(n=>[n.id,n])),current=byId.get(state.node);if(!current)return;const facing=FACING_ORDER.includes(state.facing)?state.facing:'N',adj=buildCrawlerAdj(map,dirs,state.sharedState||null),exits=adj.get(current.id)||{},theme=themeFor(current);
  svg.dataset.level=String(current.z);svg.dataset.zone=theme.zone;svg.dataset.room=current.id;svg.dataset.shape=theme.shape||current.kind;svg.innerHTML='';installDefs(svg,theme);drawAtmosphere(svg,theme);
  if(state.roomGrid&&state.heroPosition)renderRoomScene(svg,current,exits,{...state,facing},theme);else renderCorridorScene(svg,map,current,facing,adj);
  drawVignette(svg)
}
export function createCrawlerView({map,dirs,getState}){const svg=document.querySelector('#crawlerSvg'),facingLabel=document.querySelector('#crawlerFacing'),currentTitle=document.querySelector('#crawlerCurrent');return {render(){const state=getState();if(!state?.node)return;const node=map.nodes.find(n=>n.id===state.node),facing=FACING_ORDER.includes(state.facing)?state.facing:'N';renderScene(svg,map,dirs,{...state,facing});if(facingLabel)facingLabel.textContent=`Blick ${dirs[facing]?.label||facing}`;if(currentTitle)currentTitle.textContent=node?.name||state.node},setMode(next){document.body.classList.toggle('view-crawler',next!=='map');document.body.classList.toggle('view-map',next==='map')}}}
