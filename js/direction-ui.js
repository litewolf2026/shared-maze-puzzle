const DIRS={N:{opp:'S',arrow:'↑'},NE:{opp:'SW',arrow:'↗'},E:{opp:'W',arrow:'→'},SE:{opp:'NW',arrow:'↘'},S:{opp:'N',arrow:'↓'},SW:{opp:'NE',arrow:'↙'},W:{opp:'E',arrow:'←'},NW:{opp:'SE',arrow:'↖'},UP:{opp:'DOWN',arrow:'↑'},DOWN:{opp:'UP',arrow:'↓'}};

let map=null;
let adj=null;

async function loadData(){
  const [mapsRes,scenariosRes]=await Promise.all([fetch('./data/maps.json'),fetch('./data/scenarios.json')]);
  const maps=(await mapsRes.json()).maps||[];
  const scenarios=(await scenariosRes.json()).scenarios||[];
  const scenario=scenarios[0];
  map=maps.find(m=>m.id===scenario?.map)||maps[0];
  if(!map)return;
  adj=new Map(map.nodes.map(n=>[n.id,{}]));
  for(const [from,dir,to] of map.edges){
    if(!adj.has(from)||!adj.has(to))continue;
    adj.get(from)[dir]=to;
    const reverse=DIRS[dir]?.opp;
    if(reverse&&!adj.get(to)[reverse])adj.get(to)[reverse]=from;
  }
}

function currentNode(){
  if(!map)return null;
  const loc=document.querySelector('#loc');
  if(!loc)return null;
  const name=(loc.firstChild?.textContent||'').trim();
  const levelText=(loc.querySelector('small')?.textContent||'').split('·')[0].trim();
  const level=map.levels.find(l=>l.name===levelText);
  return map.nodes.find(n=>(level?Number(n.z)===Number(level.z):true)&&(n.name===name||n.gmName===name))||null;
}

function refreshDirections(){
  const node=currentNode();
  if(!node||!adj)return;
  const exits=adj.get(node.id)||{};
  document.querySelectorAll('.dir, .vertical button[data-d]').forEach(button=>{
    const dir=button.dataset.d;
    const available=Boolean(exits[dir]);
    button.classList.toggle('available',available);
    button.classList.toggle('unavailable',!available);
    button.disabled=!available;
    button.setAttribute('aria-disabled',String(!available));
    button.dataset.arrow=DIRS[dir]?.arrow||'';
    button.title=available?'Hier gibt es einen Ausgang.':'In diese Richtung führt von hier kein Weg.';
  });
}

async function init(){
  await loadData();
  const loc=document.querySelector('#loc');
  if(loc)new MutationObserver(refreshDirections).observe(loc,{childList:true,subtree:true,characterData:true});
  const svg=document.querySelector('#mapSvg');
  if(svg)new MutationObserver(refreshDirections).observe(svg,{childList:true,subtree:true});
  refreshDirections();
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
else init();
