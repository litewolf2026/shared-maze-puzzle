const DIRS={N:{label:'12',opp:'S'},NE:{label:'½2',opp:'SW'},E:{label:'3',opp:'W'},SE:{label:'½5',opp:'NW'},S:{label:'6',opp:'N'},SW:{label:'½8',opp:'NE'},W:{label:'9',opp:'E'},NW:{label:'½11',opp:'SE'},UP:{label:'AUF',opp:'DOWN'},DOWN:{label:'AB',opp:'UP'}};
const $=s=>document.querySelector(s); const $$=s=>[...document.querySelectorAll(s)];
let map,cipher,scenario; let state={room:'SELEM',node:null,step:0,history:[],visited:[],updated_at:null};
let supabase=null, channel=null, clientId=crypto.randomUUID(), gm=false;

async function loadJSON(path){const r=await fetch(path);if(!r.ok)throw new Error(path);return r.json()}
async function init(){
  const [ms,cs,ss]=await Promise.all([loadJSON('./data/maps.json'),loadJSON('./data/ciphers.json'),loadJSON('./data/scenarios.json')]);
  scenario=ss.scenarios[0]; map=ms.maps.find(m=>m.id===scenario.map); cipher=cs.ciphers.find(c=>c.id===scenario.cipher);
  validateMap(); state.node=map.start; state.visited=[map.start]; renderBand(); setupControls(); render(); await setupRealtime();
}
function validateMap(){
  const nodes=new Map(map.nodes.map(n=>[n.id,n])); const adj=buildAdj(); let cur=map.start;
  for(const d of map.solution){const nxt=adj.get(cur)?.[d]; if(!nxt)throw new Error(`Ungültige Lösung: ${cur} -> ${d}`); cur=nxt;}
  if(cur!==map.goal)throw new Error(`Lösung endet in ${cur}, nicht ${map.goal}`);
}
function buildAdj(){const a=new Map(map.nodes.map(n=>[n.id,{}])); for(const [from,dir,to] of map.edges){a.get(from)[dir]=to; if(['UP','DOWN'].includes(dir)) continue; const rev=DIRS[dir]?.opp; if(rev&&!a.get(to)[rev])a.get(to)[rev]=from;} return a}
function renderBand(){
  const band=$('#band'); band.innerHTML=''; map.solution.forEach((d,i)=>{const cell=document.createElement('div');cell.className='symbol';cell.dataset.i=i;cell.title=`Zeichen ${i+1}`; const bits=cipher.symbols[d]; for(const b of bits){const dot=document.createElement('span');dot.className='dot'+(b?' on':'');cell.append(dot)} band.append(cell)});
}
function setupControls(){
  $$('.dir, .vertical button').forEach(b=>b.addEventListener('click',()=>move(b.dataset.d)));
  $$('.level-btn').forEach(b=>b.addEventListener('click',()=>{$$('.level-btn').forEach(x=>x.classList.remove('active'));b.classList.add('active');renderMap(Number(b.dataset.z))}));
  $('#gmToggle').addEventListener('click',()=>{gm=!gm;$('.gm-panel').classList.toggle('on',gm);$('#gmToggle').textContent=gm?'SL schließen':'SL';render()});
  $('#undo').addEventListener('click',undo); $('#reset').addEventListener('click',reset);
  $('#reveal').addEventListener('click',()=>{document.body.classList.toggle('reveal-all');render()});
}
function move(dir){
  const adj=buildAdj(); const next=adj.get(state.node)?.[dir];
  if(!next){message('Von hier führt kein Gang in diese Richtung. Irgendwo stimmt eure Lesart nicht.');return}
  state.history.push({from:state.node,dir,to:next,step:state.step}); state.node=next; state.step=Math.min(state.step+1,map.solution.length); if(!state.visited.includes(next))state.visited.push(next); state.updated_at=new Date().toISOString();
  const exhausted=state.step>=map.solution.length;
  message(next===map.goal?'Ihr habt die geheime Kultstätte erreicht.':exhausted?'Das Band endet hier – doch dies ist nicht die Kultstätte. Der Fehler liegt früher.':'Der Weg setzt sich fort.'); render(); syncState();
}
function undo(){const h=state.history.pop();if(!h)return;state.node=h.from;state.step=h.step;state.updated_at=new Date().toISOString();render();syncState();message('Der letzte Schritt wurde zurückgenommen.')}
function reset(){if(!confirm('Rätsel wirklich zurücksetzen?'))return;state.node=map.start;state.step=0;state.history=[];state.visited=[map.start];state.updated_at=new Date().toISOString();render();syncState();message('Der gemeinsame Spielstand wurde zurückgesetzt.')}
function message(t){$('#message').textContent=t;clearTimeout(message.t);message.t=setTimeout(()=>$('#message').textContent='',5000)}
function render(){
  $$('.symbol').forEach((x,i)=>{x.classList.toggle('used',i<state.step);x.classList.toggle('current',i===state.step&&state.step<map.solution.length)});
  const n=map.nodes.find(x=>x.id===state.node);$('#loc').innerHTML=`${n.name}<small>${map.levels.find(l=>l.z===n.z).name} · Schritt ${state.step}/${map.solution.length}</small>`;
  $('#roomPill').textContent=`Raum ${state.room}`; const active=$(`.level-btn[data-z="${n.z}"]`); if(active){$$('.level-btn').forEach(x=>x.classList.remove('active'));active.classList.add('active')}
  renderMap(n.z); renderHistory(); renderButtons();
}
function renderButtons(){const adj=buildAdj().get(state.node)||{}; $$('.dir, .vertical button').forEach(b=>b.classList.toggle('disabled',!adj[b.dataset.d]))}
function renderHistory(){const ol=$('#history');ol.innerHTML='';state.history.slice().reverse().forEach((h,idx)=>{const li=document.createElement('li');const from=map.nodes.find(n=>n.id===h.from),to=map.nodes.find(n=>n.id===h.to);li.innerHTML=`<b>${DIRS[h.dir].label}</b> · ${from.name} → ${to.name}`;ol.append(li)})}
function renderMap(z){
  const svg=$('#mapSvg'), ns='http://www.w3.org/2000/svg';svg.innerHTML=`<defs><filter id="glow"><feGaussianBlur stdDeviation=".8" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter><filter id="softShadow"><feDropShadow dx=".2" dy=".3" stdDeviation=".35" flood-opacity=".6"/></filter></defs>`;
  const levelNodes=map.nodes.filter(n=>n.z===z), byId=new Map(map.nodes.map(n=>[n.id,n])), visited=new Set(state.visited), cur=byId.get(state.node), reveal=document.body.classList.contains('reveal-all')&&gm;
  for(let x=8;x<=68;x+=4){let l=document.createElementNS(ns,'line');l.setAttribute('x1',x);l.setAttribute('x2',x);l.setAttribute('y1',2);l.setAttribute('y2',34);l.setAttribute('class','legend-line');svg.append(l)}
  for(let y=4;y<=32;y+=4){let l=document.createElementNS(ns,'line');l.setAttribute('x1',8);l.setAttribute('x2',68);l.setAttribute('y1',y);l.setAttribute('y2',y);l.setAttribute('class','legend-line');svg.append(l)}
  const visible=new Set(); if(cur.z===z){visible.add(cur.id); const adj=buildAdj().get(cur.id)||{};Object.values(adj).forEach(id=>visible.add(id));} visited.forEach(id=>{const n=byId.get(id);if(n?.z===z)visible.add(id)});
  const routePts=[]; for(const h of state.history){const a=byId.get(h.from),b=byId.get(h.to); if(a.z===z&&b.z===z)routePts.push([a,b])}
  for(const [a,b] of routePts){const p=document.createElementNS(ns,'line');p.setAttribute('x1',a.x);p.setAttribute('y1',a.y);p.setAttribute('x2',b.x);p.setAttribute('y2',b.y);p.setAttribute('class','pathline');svg.append(p)}
  for(const [from,dir,to] of map.edges){const a=byId.get(from),b=byId.get(to);if(!a||!b||a.z!==z||b.z!==z)continue; const e=document.createElementNS(ns,'line');e.setAttribute('x1',a.x);e.setAttribute('y1',a.y);e.setAttribute('x2',b.x);e.setAttribute('y2',b.y);e.setAttribute('class','edge'+((a.name+b.name).match(/Wasser|Zisterne|Brücke|Pump/)?' water':'')); if(reveal||visible.has(from)||visible.has(to)){svg.append(e)} }
  for(const n of levelNodes){
    const canSee=reveal||visible.has(n.id); if(!canSee)continue; const g=document.createElementNS(ns,'g'); const r=document.createElementNS(ns,'rect');r.setAttribute('x',n.x-2.4);r.setAttribute('y',n.y-1.6);r.setAttribute('width',4.8);r.setAttribute('height',3.2);r.setAttribute('rx',n.kind==='junction'?1.4:.6);let cl=`room ${n.kind}`;if(visited.has(n.id))cl+=' visited';if(n.id===state.node)cl+=' current';if(cur.z===z&&buildAdj().get(cur.id)&&Object.values(buildAdj().get(cur.id)).includes(n.id))cl+=' neighbor';r.setAttribute('class',cl);g.append(r);const t=document.createElementNS(ns,'text');t.setAttribute('x',n.x);t.setAttribute('y',n.y+3);t.setAttribute('class','room-label');t.textContent=n.name;g.append(t);svg.append(g)
  }
  if(cur.z===z){const m=document.createElementNS(ns,'circle');m.setAttribute('cx',cur.x);m.setAttribute('cy',cur.y);m.setAttribute('r','.8');m.setAttribute('class','marker');svg.append(m)}
  $('#levelName').textContent=map.levels.find(l=>l.z===z)?.name||'';
}
async function setupRealtime(){
  const cfg=window.MAZE_CONFIG||{}; if(!cfg.supabaseUrl||!cfg.supabaseKey){$('#syncState').textContent='lokal';return}
  try{
    const {createClient}=await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm'); supabase=createClient(cfg.supabaseUrl,cfg.supabaseKey);
    const {data,error}=await supabase.from('maze_rooms').select('state').eq('room_id',state.room).maybeSingle(); if(error)throw error; if(data?.state){state={...state,...data.state};render()} else await syncState();
    channel=supabase.channel(`maze:${state.room}`).on('postgres_changes',{event:'*',schema:'public',table:'maze_rooms',filter:`room_id=eq.${state.room}`},payload=>{if(payload.new?.state&&payload.new.client_id!==clientId){state={...state,...payload.new.state};render();message('Der Weg wurde auf einem anderen Gerät verändert.')}}).subscribe(s=>{$('#syncState').textContent=s==='SUBSCRIBED'?'live':'verbinden…'});
  }catch(e){console.error(e);$('#syncState').textContent='offline';message('Live-Sync nicht erreichbar – lokaler Modus aktiv.')}
}
async function syncState(){if(!supabase)return;const payload={...state};await supabase.from('maze_rooms').upsert({room_id:state.room,scenario_id:scenario.id,state:payload,client_id:clientId,updated_at:new Date().toISOString()},{onConflict:'room_id'})}
init().catch(e=>{console.error(e);document.body.innerHTML=`<pre style="color:white;padding:20px">${e.stack}</pre>`});
