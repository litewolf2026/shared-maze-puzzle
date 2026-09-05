const DIRS={N:{opp:'S'},NE:{opp:'SW'},E:{opp:'W'},SE:{opp:'NW'},S:{opp:'N'},SW:{opp:'NE'},W:{opp:'E'},NW:{opp:'SE'},UP:{opp:'DOWN'},DOWN:{opp:'UP'}};
const NS='http://www.w3.org/2000/svg';
let map=null;
let trace=[];
let routeVisible=false;
let namesVisible=false;
let idsVisible=false;
let installed=false;
let drawing=false;

function gmEnabled(){
  const toggle=document.querySelector('#gmToggle');
  return Boolean(toggle&&getComputedStyle(toggle).display!=='none');
}

async function loadMap(){
  if(map)return map;
  const [mapsRes,scenariosRes]=await Promise.all([
    fetch('./data/maps.json?v=20260906-gmroute2',{cache:'no-store'}),
    fetch('./data/scenarios.json?v=20260906-gmroute2',{cache:'no-store'})
  ]);
  const maps=(await mapsRes.json()).maps||[];
  const scenarios=(await scenariosRes.json()).scenarios||[];
  const scenario=scenarios[0];
  map=maps.find(m=>m.id===scenario?.map)||maps[0];
  if(!map)throw new Error('Keine Karte für die SL-Routenanzeige gefunden.');
  trace=buildTrace(map);
  return map;
}

function buildTrace(m){
  const adj=new Map(m.nodes.map(n=>[n.id,{}]));
  for(const [from,dir,to] of m.edges){
    if(!adj.has(from)||!adj.has(to))continue;
    adj.get(from)[dir]=to;
    const reverse=DIRS[dir]?.opp;
    if(reverse&&!adj.get(to)[reverse])adj.get(to)[reverse]=from;
  }
  const out=[];
  let node=m.start;
  for(let i=0;i<m.solution.length;i++){
    const dir=m.solution[i];
    const next=adj.get(node)?.[dir];
    if(!next)throw new Error(`SL-Pfad bricht bei ${node} / ${dir}.`);
    out.push({index:i,step:i+1,from:node,to:next,dir});
    node=next;
  }
  if(node!==m.goal)throw new Error(`SL-Pfad endet in ${node} statt ${m.goal}.`);
  return out;
}

function svgEl(name,attrs={}){
  const e=document.createElementNS(NS,name);
  for(const [k,v] of Object.entries(attrs))e.setAttribute(k,String(v));
  return e;
}

function activeLevel(){
  const b=document.querySelector('.level-btn.active');
  return b?Number(b.dataset.z):null;
}

function solutionNodes(){
  const nodes=[map.start];
  for(const s of trace)nodes.push(s.to);
  return nodes;
}

function shortName(n){
  const raw=n.gmName||n.name||n.id;
  return raw.length>25?`${raw.slice(0,23)}…`:raw;
}

function labelOffset(n){
  if(n.y<7)return 3.05;
  if(n.y>27)return -3.0;
  const num=Number(String(n.id).replace(/\D/g,''))||0;
  return num%2===0?-2.9:3.05;
}

function renderOverlays(){
  if(drawing)return;
  const svg=document.querySelector('#mapSvg');
  if(!svg)return;
  svg.querySelector('#gmOverlayRoot')?.remove();
  if(!gmEnabled()||!map||(!routeVisible&&!namesVisible&&!idsVisible))return;

  drawing=true;
  try{
    const z=activeLevel();
    const byId=new Map(map.nodes.map(n=>[n.id,n]));
    const root=svgEl('g',{id:'gmOverlayRoot',class:'gm-overlay-root','aria-hidden':'true'});

    if(routeVisible){
      const route=svgEl('g',{class:'gm-solution-overlay'});
      for(const s of trace){
        const a=byId.get(s.from),b=byId.get(s.to);
        if(!a||!b)continue;
        if(a.z===z&&b.z===z){
          route.append(svgEl('line',{x1:a.x,y1:a.y,x2:b.x,y2:b.y,class:'gm-solution-line'}));
        }else if(a.z===z||b.z===z){
          const n=a.z===z?a:b;
          const vertical=svgEl('g',{class:'gm-solution-vertical'});
          vertical.append(svgEl('circle',{cx:n.x,cy:n.y,r:1.35,class:'gm-solution-vertical-ring'}));
          const t=svgEl('text',{x:n.x,y:n.y+.36,class:'gm-solution-vertical-text'});
          t.textContent=a.z===z?'↓':'↑';
          vertical.append(t);
          route.append(vertical);
        }
      }
      solutionNodes().forEach((id,step)=>{
        const n=byId.get(id);
        if(!n||n.z!==z)return;
        const marker=svgEl('g',{class:'gm-solution-step'});
        const dx=n.x+1.65,dy=n.y-1.45;
        marker.append(svgEl('circle',{cx:dx,cy:dy,r:.76,class:'gm-solution-step-bg'}));
        const text=svgEl('text',{x:dx,y:dy+.25,class:'gm-solution-step-text'});
        text.textContent=String(step);
        marker.append(text);
        route.append(marker);
      });
      root.append(route);
    }

    if(namesVisible||idsVisible){
      const labels=svgEl('g',{class:'gm-map-overlay'});
      for(const n of map.nodes.filter(n=>n.z===z)){
        if(namesVisible){
          const textValue=shortName(n);
          const width=Math.min(12.8,Math.max(4.5,textValue.length*.34+1.35));
          const y=n.y+labelOffset(n);
          const g=svgEl('g',{class:'gm-map-name'});
          g.append(svgEl('rect',{x:n.x-width/2,y:y-.8,width,height:1.55,rx:.42,class:'gm-map-name-bg'}));
          const t=svgEl('text',{x:n.x,y:y+.22,class:'gm-map-name-text'});
          t.textContent=textValue;
          g.append(t);
          labels.append(g);
        }
        if(idsVisible){
          const g=svgEl('g',{class:'gm-map-id'});
          g.append(svgEl('circle',{cx:n.x,cy:n.y,r:.78,class:'gm-map-id-bg'}));
          const t=svgEl('text',{x:n.x,y:n.y+.24,class:'gm-map-id-text'});
          t.textContent=n.id;
          g.append(t);
          labels.append(g);
        }
      }
      root.append(labels);
    }

    svg.append(root);
  }finally{drawing=false;}
}

function nodeFromLabel(label,levelName=''){
  const level=map.levels.find(l=>l.name===levelName);
  return map.nodes.find(n=>(level?Number(n.z)===Number(level.z):true)&&(n.name===label||n.gmName===label))||null;
}

function routeStatus(){
  const box=document.querySelector('#gmRouteStatus');
  if(!box||!map)return;
  const items=[...document.querySelectorAll('#history li')].filter(li=>!li.classList.contains('empty-history')).reverse();
  const expected=solutionNodes();
  let divergence=null;
  items.forEach((li,i)=>{
    if(divergence)return;
    const raw=li.textContent||'';
    const parts=raw.split('·');
    if(parts.length<2)return;
    const travel=parts.slice(1).join('·').trim();
    const arrow=travel.lastIndexOf('→');
    if(arrow<0)return;
    const toLabel=travel.slice(arrow+1).trim();
    const node=map.nodes.find(n=>n.name===toLabel||n.gmName===toLabel);
    if(node&&node.id!==expected[i+1])divergence={step:i+1,actual:node.id,expected:expected[i+1]};
  });

  const step=Number((document.querySelector('#stepPill')?.textContent||'0').split('/')[0].trim())||0;
  const loc=document.querySelector('#loc');
  const currentLabel=(loc?.firstChild?.textContent||'').trim();
  const levelText=(loc?.querySelector('small')?.textContent||'').split('·')[0].trim();
  const current=nodeFromLabel(currentLabel,levelText);
  const expectedHere=expected[Math.min(step,expected.length-1)];

  if(divergence){
    box.className='gm-route-status off-route';
    box.textContent=`Abweichung ab Schritt ${divergence.step}: ${divergence.actual} statt ${divergence.expected}.`;
  }else if(current&&current.id===expectedHere){
    box.className='gm-route-status on-route';
    box.textContent=`Sollpfad stimmt bis Schritt ${step}.`;
  }else if(current){
    box.className='gm-route-status off-route';
    box.textContent=`Aktuell ${current.id}; Sollposition bei Schritt ${step}: ${expectedHere}.`;
  }else{
    box.className='gm-route-status';
    box.textContent='Pfadstatus wird ermittelt …';
  }
}

function setToggle(button,on,onText,offText){
  button.classList.toggle('active',on);
  button.textContent=on?onText:offText;
}

function refresh(){
  if(!installed||!gmEnabled())return;
  renderOverlays();
  routeStatus();
}

async function install(){
  if(installed||!gmEnabled())return;
  installed=true;
  try{await loadMap();}catch(e){console.error(e);installed=false;return;}
  const panel=document.querySelector('.gm-panel');
  if(!panel)return;

  const row=document.createElement('div');
  row.className='gm-row gm-overlay-tools';

  const routeButton=document.createElement('button');
  routeButton.id='gmRouteToggle';
  routeButton.textContent='Pfad';
  routeButton.title='Vollständigen Lösungspfad einblenden';
  routeButton.addEventListener('click',()=>{
    routeVisible=!routeVisible;
    setToggle(routeButton,routeVisible,'Pfad ✓','Pfad');
    renderOverlays();
  });

  const namesButton=document.createElement('button');
  namesButton.id='gmNamesToggle';
  namesButton.textContent='Namen';
  namesButton.title='Raumnamen nur für die Spielleitung einblenden';
  namesButton.addEventListener('click',()=>{
    namesVisible=!namesVisible;
    setToggle(namesButton,namesVisible,'Namen ✓','Namen');
    renderOverlays();
  });

  const idsButton=document.createElement('button');
  idsButton.id='gmIdsToggle';
  idsButton.textContent='IDs';
  idsButton.title='Technische Knoten-IDs nur für die Spielleitung einblenden';
  idsButton.addEventListener('click',()=>{
    idsVisible=!idsVisible;
    setToggle(idsButton,idsVisible,'IDs ✓','IDs');
    renderOverlays();
  });

  row.append(routeButton,namesButton,idsButton);

  const status=document.createElement('div');
  status.id='gmRouteStatus';
  status.className='gm-route-status';
  status.textContent='Pfadstatus wird ermittelt …';

  const copyRow=[...panel.querySelectorAll('.gm-row')].at(-1);
  panel.insertBefore(row,copyRow||null);
  panel.insertBefore(status,copyRow||null);

  const svg=document.querySelector('#mapSvg');
  if(svg)new MutationObserver(()=>{
    if(drawing)return;
    if((routeVisible||namesVisible||idsVisible)&&!svg.querySelector('#gmOverlayRoot'))requestAnimationFrame(renderOverlays);
    routeStatus();
  }).observe(svg,{childList:true,subtree:true});

  const levels=document.querySelector('#levelButtons');
  if(levels)new MutationObserver(refresh).observe(levels,{attributes:true,subtree:true,attributeFilter:['class']});
  const history=document.querySelector('#history');
  if(history)new MutationObserver(routeStatus).observe(history,{childList:true,subtree:true,characterData:true});
  refresh();
}

const gmToggle=document.querySelector('#gmToggle');
if(gmToggle)new MutationObserver(install).observe(gmToggle,{attributes:true,attributeFilter:['style']});
const timer=setInterval(()=>{if(gmEnabled()){clearInterval(timer);install();}},250);
setTimeout(()=>clearInterval(timer),15000);
