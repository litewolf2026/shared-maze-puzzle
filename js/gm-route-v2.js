const NS='http://www.w3.org/2000/svg';
let map=null,state=null,isGm=false,routeVisible=false,namesVisible=false,idsVisible=false,installed=false,drawing=false;

function el(name,attrs={}){const e=document.createElementNS(NS,name);for(const [k,v] of Object.entries(attrs))e.setAttribute(k,String(v));return e}
function activeLevel(){const b=document.querySelector('.level-btn.active');return b?Number(b.dataset.z):null}
function buildAdj(){const opp={N:'S',NE:'SW',E:'W',SE:'NW',S:'N',SW:'NE',W:'E',NW:'SE',UP:'DOWN',DOWN:'UP'},a=new Map(map.nodes.map(n=>[n.id,{}]));for(const [from,dir,to] of map.edges){a.get(from)[dir]=to;const r=opp[dir];if(r&&!a.get(to)[r])a.get(to)[r]=from}return a}
function trace(){const adj=buildAdj(),out=[];let node=map.start;for(let i=0;i<map.solution.length;i++){const dir=map.solution[i],to=adj.get(node)?.[dir];if(!to)break;out.push({step:i+1,from:node,to,dir});node=to}return out}
function solutionNodes(){return [map.start,...trace().map(x=>x.to)]}
function shortName(n){const raw=n.gmName||n.name||n.id;return raw.length>27?`${raw.slice(0,25)}…`:raw}

function renderOverlay(){
  if(drawing||!map||!isGm)return;const svg=document.querySelector('#mapSvg');if(!svg)return;svg.querySelector('#gmOverlayRoot')?.remove();if(!routeVisible&&!namesVisible&&!idsVisible)return;drawing=true;
  try{
    const z=activeLevel(),byId=new Map(map.nodes.map(n=>[n.id,n])),root=el('g',{id:'gmOverlayRoot',class:'gm-overlay-root','aria-hidden':'true'});
    if(routeVisible){const g=el('g',{class:'gm-solution-overlay'});for(const s of trace()){const a=byId.get(s.from),b=byId.get(s.to);if(!a||!b)continue;if(a.z===z&&b.z===z)g.append(el('line',{x1:a.x,y1:a.y,x2:b.x,y2:b.y,class:'gm-solution-line'}));else if(a.z===z||b.z===z){const n=a.z===z?a:b,v=el('g',{class:'gm-solution-vertical'});v.append(el('circle',{cx:n.x,cy:n.y,r:1.35,class:'gm-solution-vertical-ring'}));const t=el('text',{x:n.x,y:n.y+.36,class:'gm-solution-vertical-text'});t.textContent=a.z===z?'↓':'↑';v.append(t);g.append(v)}}solutionNodes().forEach((id,i)=>{const n=byId.get(id);if(!n||n.z!==z)return;const m=el('g',{class:'gm-solution-step'}),x=n.x+1.65,y=n.y-1.45;m.append(el('circle',{cx:x,cy:y,r:.76,class:'gm-solution-step-bg'}));const t=el('text',{x,y:y+.25,class:'gm-solution-step-text'});t.textContent=String(i);m.append(t);g.append(m)});root.append(g)}
    if(namesVisible||idsVisible){const labels=el('g',{class:'gm-map-overlay'});for(const n of map.nodes.filter(n=>n.z===z)){if(namesVisible){const text=shortName(n),w=Math.min(13.5,Math.max(4.7,text.length*.34+1.4)),y=n.y+(n.y<7?3.1:n.y>31?-3:(Number(n.id.replace(/\D/g,''))||0)%2?-2.9:3.1),g=el('g',{class:'gm-map-name'});g.append(el('rect',{x:n.x-w/2,y:y-.8,width:w,height:1.55,rx:.42,class:'gm-map-name-bg'}));const t=el('text',{x:n.x,y:y+.22,class:'gm-map-name-text'});t.textContent=text;g.append(t);labels.append(g)}if(idsVisible){const g=el('g',{class:'gm-map-id'});g.append(el('circle',{cx:n.x,cy:n.y,r:.78,class:'gm-map-id-bg'}));const t=el('text',{x:n.x,y:n.y+.24,class:'gm-map-id-text'});t.textContent=n.id;g.append(t);labels.append(g)}}root.append(labels)}
    svg.append(root);
  }finally{drawing=false}
}

function routeStatus(){
  const box=document.querySelector('#gmRouteStatus');if(!box||!map||!state)return;const expected=solutionNodes(),step=state.bandStep??state.step??0,last=state.decisionHistory?.at(-1);let divergence=null;
  for(let i=0;i<(state.decisionHistory||[]).length;i++){const h=state.decisionHistory[i];if(h.from!==expected[i]||h.to!==expected[i+1]||h.dir!==map.solution[i]){divergence={step:i+1,actual:`${h.from}/${h.dir}/${h.to}`,expected:`${expected[i]}/${map.solution[i]}/${expected[i+1]}`};break}}
  if(divergence){box.className='gm-route-status off-route';box.textContent=`Abweichung ab Bandentscheidung ${divergence.step}: ${divergence.actual} statt ${divergence.expected}.`;return}
  const current=state.transit?.from||state.node,expectedHere=expected[Math.min(step,expected.length-1)];
  if(current===expectedHere){box.className='gm-route-status on-route';box.textContent=`Sollpfad stimmt bis Bandentscheidung ${step}.`}
  else{box.className='gm-route-status off-route';box.textContent=`Aktuell ${current}; Sollort bei Bandentscheidung ${step}: ${expectedHere}.${last?' Letzte Wahl: '+last.dir+'.':''}`}
}

function toggle(button,key,on,off){button.classList.toggle('active',key);button.textContent=key?on:off;renderOverlay()}
function install(){
  if(installed||!isGm)return;const panel=document.querySelector('.gm-panel');if(!panel)return;installed=true;
  const row=document.createElement('div');row.className='gm-row gm-overlay-tools';
  const r=document.createElement('button');r.textContent='Pfad';r.onclick=()=>{routeVisible=!routeVisible;toggle(r,routeVisible,'Pfad ✓','Pfad')};
  const n=document.createElement('button');n.textContent='Namen';n.onclick=()=>{namesVisible=!namesVisible;toggle(n,namesVisible,'Namen ✓','Namen')};
  const i=document.createElement('button');i.textContent='IDs';i.onclick=()=>{idsVisible=!idsVisible;toggle(i,idsVisible,'IDs ✓','IDs')};
  row.append(r,n,i);const status=document.createElement('div');status.id='gmRouteStatus';status.className='gm-route-status';const anchor=[...panel.querySelectorAll('.gm-row')].at(-1);panel.insertBefore(row,anchor||null);panel.insertBefore(status,anchor||null);routeStatus();
  document.querySelector('#mapSvg')&&new MutationObserver(()=>{if(!drawing)requestAnimationFrame(renderOverlay)}).observe(document.querySelector('#mapSvg'),{childList:true});
}

window.addEventListener('maze-state',e=>{map=e.detail.map;state=e.detail.state;isGm=Boolean(e.detail.isGm);install();routeStatus();renderOverlay()});
