import {canonicalPhysicalPath,canonicalPhysicalEdges,canonicalDecisionPlan,routeProgressStatus} from './canonical-route.js?v=20260906-routefix1';

const NS='http://www.w3.org/2000/svg';
let map=null,state=null,isGm=false,routeVisible=false,namesVisible=false,idsVisible=false,installed=false,drawing=false;

function el(name,attrs={}){const e=document.createElementNS(NS,name);for(const [k,v] of Object.entries(attrs))e.setAttribute(k,String(v));return e}
function activeLevel(){const b=document.querySelector('.level-btn.active');return b?Number(b.dataset.z):null}
function shortName(n){const raw=n.gmName||n.name||n.id;return raw.length>27?`${raw.slice(0,25)}…`:raw}
function sameEdge(a,b){return Boolean(a&&b&&a.from===b.from&&a.dir===b.dir&&a.to===b.to)}
function edgeText(edge){return edge?`${edge.from}/${edge.dir}/${edge.to}`:'–'}

function routeData(){
  try{return {path:canonicalPhysicalPath(map),edges:canonicalPhysicalEdges(map),decisions:canonicalDecisionPlan(map)}}
  catch(error){console.error(error);return {path:[],edges:[],decisions:[],error}}
}

function renderOverlay(){
  if(drawing||!map||!isGm)return;const svg=document.querySelector('#mapSvg');if(!svg)return;svg.querySelector('#gmOverlayRoot')?.remove();if(!routeVisible&&!namesVisible&&!idsVisible)return;drawing=true;
  try{
    const z=activeLevel(),byId=new Map(map.nodes.map(n=>[n.id,n])),root=el('g',{id:'gmOverlayRoot',class:'gm-overlay-root','aria-hidden':'true'});
    if(routeVisible){
      const {path,edges,decisions}=routeData(),g=el('g',{class:'gm-solution-overlay'}),decisionSources=new Set(decisions.map(d=>d.from));
      for(const edge of edges){
        const a=byId.get(edge.from),b=byId.get(edge.to);if(!a||!b)continue;
        if(a.z===z&&b.z===z)g.append(el('line',{x1:a.x,y1:a.y,x2:b.x,y2:b.y,class:'gm-solution-line'}));
        else if(a.z===z||b.z===z){const n=a.z===z?a:b,v=el('g',{class:'gm-solution-vertical'});v.append(el('circle',{cx:n.x,cy:n.y,r:1.35,class:'gm-solution-vertical-ring'}));const t=el('text',{x:n.x,y:n.y+.36,class:'gm-solution-vertical-text'});t.textContent=a.z===z?'↓':'↑';v.append(t);g.append(v)}
      }
      for(const d of decisions){const n=byId.get(d.from);if(!n||n.z!==z)continue;const m=el('g',{class:'gm-solution-step'}),x=n.x+1.65,y=n.y-1.45;m.append(el('circle',{cx:x,cy:y,r:.78,class:'gm-solution-step-bg'}));const t=el('text',{x,y:y+.25,class:'gm-solution-step-text'});t.textContent=String(d.step);m.append(t);g.append(m)}
      for(const id of path){const n=byId.get(id);if(!n||n.z!==z||decisionSources.has(id)||id===map.goal)continue;g.append(el('circle',{cx:n.x,cy:n.y,r:.42,class:'gm-solution-transit-dot'}))}
      const goal=byId.get(map.goal);if(goal?.z===z){const m=el('g',{class:'gm-solution-goal'});m.append(el('circle',{cx:goal.x,cy:goal.y,r:1.08,class:'gm-solution-goal-bg'}));const t=el('text',{x:goal.x,y:goal.y+.34,class:'gm-solution-goal-text'});t.textContent='✓';m.append(t);g.append(m)}
      root.append(g)
    }
    if(namesVisible||idsVisible){const labels=el('g',{class:'gm-map-overlay'});for(const n of map.nodes.filter(n=>n.z===z)){if(namesVisible){const text=shortName(n),w=Math.min(13.5,Math.max(4.7,text.length*.34+1.4)),y=n.y+(n.y<7?3.1:n.y>31?-3:(Number(n.id.replace(/\D/g,''))||0)%2?-2.9:3.1),g=el('g',{class:'gm-map-name'});g.append(el('rect',{x:n.x-w/2,y:y-.8,width:w,height:1.55,rx:.42,class:'gm-map-name-bg'}));const t=el('text',{x:n.x,y:y+.22,class:'gm-map-name-text'});t.textContent=text;g.append(t);labels.append(g)}if(idsVisible){const g=el('g',{class:'gm-map-id'});g.append(el('circle',{cx:n.x,cy:n.y,r:.78,class:'gm-map-id-bg'}));const t=el('text',{x:n.x,y:n.y+.24,class:'gm-map-id-text'});t.textContent=n.id;g.append(t);labels.append(g)}}root.append(labels)}
    svg.append(root);
  }finally{drawing=false}
}

function routeStatus(){
  const box=document.querySelector('#gmRouteStatus');if(!box||!map||!state)return;const result=routeProgressStatus(map,state);
  if(result.ok){box.className='gm-route-status on-route';if(result.kind==='complete')box.textContent=`Sollpfad vollständig: ${result.bandTotal}/${result.bandTotal} Bandentscheidungen, ${result.physicalTotal}/${result.physicalTotal} physische Wege.`;else if(result.kind==='on-route-transit')box.textContent=`Sollpfad stimmt · im Gang zum nächsten Sollort · Band ${result.bandStep}/${result.bandTotal} · Wege ${result.physicalDone}/${result.physicalTotal}.`;else box.textContent=`Sollpfad stimmt · Band ${result.bandStep}/${result.bandTotal} · physische Wege ${result.physicalDone}/${result.physicalTotal}.`;return}
  box.className='gm-route-status off-route';
  if(result.kind==='decision-divergence'){box.textContent=`Bandabweichung bei Entscheidung ${result.step}: ${edgeText(result.actual)} statt ${edgeText(result.expected)}.`;return}
  if(result.kind==='path-divergence'||result.kind==='transit-divergence'){box.textContent=`Physischer Sollpfad weicht an Weg ${result.edge} ab: ${edgeText(result.actual)} statt ${edgeText(result.expected)}.`;return}
  if(result.kind==='node-divergence'){box.textContent=`Aktuell ${result.actualNode}; Sollort nach ${result.physicalDone} abgeschlossenen Wegen: ${result.expectedNode}.`;return}
  box.textContent=result.message||'Der kanonische Sollpfad ist in den Kartendaten inkonsistent.';
}

function toggle(button,key,on,off){button.classList.toggle('active',key);button.textContent=key?on:off;renderOverlay()}
function install(){
  if(installed||!isGm)return;const panel=document.querySelector('.gm-panel');if(!panel)return;installed=true;
  const host=panel.querySelector('#gmToolbox .gm-toolbox-body')||panel;
  const row=document.createElement('div');row.className='gm-row gm-overlay-tools';row.id='gmOverlayTools';
  const r=document.createElement('button');r.textContent='Pfad';r.title='Sollpfad des Schwarzen Bandes auf der Automap anzeigen';r.onclick=()=>{routeVisible=!routeVisible;toggle(r,routeVisible,'Pfad ✓','Pfad')};
  const n=document.createElement('button');n.textContent='Namen';n.title='Raumnamen auf der Automap anzeigen';n.onclick=()=>{namesVisible=!namesVisible;toggle(n,namesVisible,'Namen ✓','Namen')};
  const i=document.createElement('button');i.textContent='IDs';i.title='Raum-IDs auf der Automap anzeigen';i.onclick=()=>{idsVisible=!idsVisible;toggle(i,idsVisible,'IDs ✓','IDs')};
  row.append(r,n,i);
  const status=document.createElement('div');status.id='gmRouteStatus';status.className='gm-route-status';
  const preview=host.querySelector('#gmPreviewTools');host.insertBefore(row,preview||null);host.insertBefore(status,preview||null);routeStatus();
  document.querySelector('#mapSvg')&&new MutationObserver(()=>{if(!drawing)requestAnimationFrame(renderOverlay)}).observe(document.querySelector('#mapSvg'),{childList:true});
}

window.addEventListener('maze-state',e=>{map=e.detail.map;state=e.detail.state;isGm=Boolean(e.detail.isGm);install();routeStatus();renderOverlay()});
