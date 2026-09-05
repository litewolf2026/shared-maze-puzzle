const DIRS={N:{label:'12',opp:'S'},NE:{label:'½2',opp:'SW'},E:{label:'3',opp:'W'},SE:{label:'½5',opp:'NW'},S:{label:'6',opp:'N'},SW:{label:'½8',opp:'NE'},W:{label:'9',opp:'E'},NW:{label:'½11',opp:'SE'},UP:{label:'AUF',opp:'DOWN'},DOWN:{label:'AB',opp:'UP'}};
const $=s=>document.querySelector(s); const $$=s=>[...document.querySelectorAll(s)];
let map,cipher,scenario;
let state={room:'LOCAL',node:null,step:0,history:[],visited:[],updated_at:null};
let supabase=null, channel=null, roomCode='', accessToken='', playerToken='', channelSecret='', version=0, isGm=false, gmPanelOpen=false;

async function loadJSON(path){const r=await fetch(path);if(!r.ok)throw new Error(path);return r.json()}
function credentialsFromHash(){
  const p=new URLSearchParams(location.hash.replace(/^#/,''));
  return {room:(p.get('room')||'').toUpperCase(),token:p.get('token')||'',play:p.get('play')||''};
}
function inviteUrl(token){
  const base=`${location.origin}${location.pathname}`;
  return `${base}#room=${encodeURIComponent(roomCode)}&token=${encodeURIComponent(token)}`;
}
async function copyText(text,label){
  try{await navigator.clipboard.writeText(text);message(`${label} kopiert.`)}
  catch{prompt(label,text)}
}

async function init(){
  const [ms,cs,ss]=await Promise.all([loadJSON('./data/maps.json'),loadJSON('./data/ciphers.json'),loadJSON('./data/scenarios.json')]);
  scenario=ss.scenarios[0]; map=ms.maps.find(m=>m.id===scenario.map); cipher=cs.ciphers.find(c=>c.id===scenario.cipher);
  validateMap(); state.node=map.start; state.visited=[map.start]; renderBand(); setupControls(); render(); await setupRealtime();
}
function validateMap(){
  const adj=buildAdj(); let cur=map.start;
  for(const d of map.solution){const nxt=adj.get(cur)?.[d]; if(!nxt)throw new Error(`Ungültige Lösung: ${cur} -> ${d}`); cur=nxt;}
  if(cur!==map.goal)throw new Error(`Lösung endet in ${cur}, nicht ${map.goal}`);
}
function buildAdj(){
  const a=new Map(map.nodes.map(n=>[n.id,{}]));
  for(const [from,dir,to] of map.edges){
    a.get(from)[dir]=to;
    const rev=DIRS[dir]?.opp;
    if(rev&&!a.get(to)[rev])a.get(to)[rev]=from;
  }
  return a;
}
function renderBand(){
  const band=$('#band'); band.innerHTML='';
  map.solution.forEach((d,i)=>{const cell=document.createElement('div');cell.className='symbol';cell.dataset.i=i;cell.title=`Zeichen ${i+1}`; const bits=cipher.symbols[d]; for(const b of bits){const dot=document.createElement('span');dot.className='dot'+(b?' on':'');cell.append(dot)} band.append(cell)});
}
function setupControls(){
  $$('.dir, .vertical button').forEach(b=>b.addEventListener('click',()=>move(b.dataset.d)));
  $$('.level-btn').forEach(b=>b.addEventListener('click',()=>{$$('.level-btn').forEach(x=>x.classList.remove('active'));b.classList.add('active');renderMap(Number(b.dataset.z))}));
  $('#gmToggle').addEventListener('click',()=>{if(!isGm)return;gmPanelOpen=!gmPanelOpen;$('.gm-panel').classList.toggle('on',gmPanelOpen);$('#gmToggle').textContent=gmPanelOpen?'SL schließen':'SL';render()});
  $('#undo').addEventListener('click',undo); $('#reset').addEventListener('click',reset);
  $('#reveal').addEventListener('click',()=>{if(!isGm)return;document.body.classList.toggle('reveal-all');render()});
  $('#copyPlayer')?.addEventListener('click',()=>{if(playerToken)copyText(inviteUrl(playerToken),'Spielerlink');else message('Dieser SL-Link enthält keinen Spieler-Token.')});
  $('#copyCurrent')?.addEventListener('click',()=>copyText(location.href,'Aktueller Link'));
}
async function move(dir){
  const adj=buildAdj(); const next=adj.get(state.node)?.[dir];
  if(!next){message('Von hier führt kein Gang in diese Richtung. Irgendwo stimmt eure Lesart nicht.');return}
  const previous=structuredClone(state);
  state.history.push({from:state.node,dir,to:next,step:state.step}); state.node=next; state.step=Math.min(state.step+1,map.solution.length); if(!state.visited.includes(next))state.visited.push(next); state.updated_at=new Date().toISOString();
  const exhausted=state.step>=map.solution.length;
  message(next===map.goal?'Ihr habt die geheime Kultstätte erreicht.':exhausted?'Das Band endet hier – doch dies ist nicht die Kultstätte. Der Fehler liegt früher.':'Der Weg setzt sich fort.'); render();
  if(!(await syncState())){state=previous;render()}
}
async function undo(){
  if(!isGm){message('Nur die Spielleitung kann Schritte zurücknehmen.');return}
  const h=state.history.pop();if(!h)return; const previous=structuredClone(state); state.node=h.from;state.step=h.step;state.updated_at=new Date().toISOString();render();
  if(await syncState(true))message('Der letzte Schritt wurde zurückgenommen.'); else {state=previous;render()}
}
async function reset(){
  if(!isGm){message('Nur die Spielleitung kann zurücksetzen.');return}
  if(!confirm('Rätsel wirklich zurücksetzen?'))return; const previous=structuredClone(state); state.node=map.start;state.step=0;state.history=[];state.visited=[map.start];state.updated_at=new Date().toISOString();render();
  if(await syncState(true))message('Der gemeinsame Spielstand wurde zurückgesetzt.'); else {state=previous;render()}
}
function message(t){$('#message').textContent=t;clearTimeout(message.t);message.t=setTimeout(()=>$('#message').textContent='',6000)}
function render(){
  $$('.symbol').forEach((x,i)=>{x.classList.toggle('used',i<state.step);x.classList.toggle('current',i===state.step&&state.step<map.solution.length)});
  const n=map.nodes.find(x=>x.id===state.node); if(!n)return;
  $('#loc').innerHTML=`${n.name}<small>${map.levels.find(l=>l.z===n.z).name} · Schritt ${state.step}/${map.solution.length}</small>`;
  $('#roomPill').textContent=roomCode?`Raum ${roomCode}`:'Lokaler Probelauf';
  $('#gmToggle').style.display=isGm?'':'none';
  const active=$(`.level-btn[data-z="${n.z}"]`); if(active){$$('.level-btn').forEach(x=>x.classList.remove('active'));active.classList.add('active')}
  renderMap(n.z); renderHistory(); renderButtons();
}
function renderButtons(){const adj=buildAdj().get(state.node)||{}; $$('.dir, .vertical button').forEach(b=>b.classList.toggle('disabled',!adj[b.dataset.d]))}
function renderHistory(){const ol=$('#history');ol.innerHTML='';state.history.slice().reverse().forEach(h=>{const li=document.createElement('li');const from=map.nodes.find(n=>n.id===h.from),to=map.nodes.find(n=>n.id===h.to);li.innerHTML=`<b>${DIRS[h.dir].label}</b> · ${from.name} → ${to.name}`;ol.append(li)})}
function renderMap(z){
  const svg=$('#mapSvg'), ns='http://www.w3.org/2000/svg';svg.innerHTML=`<defs><filter id="glow"><feGaussianBlur stdDeviation=".8" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter><filter id="softShadow"><feDropShadow dx=".2" dy=".3" stdDeviation=".35" flood-opacity=".6"/></filter></defs>`;
  const levelNodes=map.nodes.filter(n=>n.z===z), byId=new Map(map.nodes.map(n=>[n.id,n])), visited=new Set(state.visited), cur=byId.get(state.node), reveal=document.body.classList.contains('reveal-all')&&isGm;
  for(let x=8;x<=68;x+=4){let l=document.createElementNS(ns,'line');l.setAttribute('x1',x);l.setAttribute('x2',x);l.setAttribute('y1',2);l.setAttribute('y2',34);l.setAttribute('class','legend-line');svg.append(l)}
  for(let y=4;y<=32;y+=4){let l=document.createElementNS(ns,'line');l.setAttribute('x1',8);l.setAttribute('x2',68);l.setAttribute('y1',y);l.setAttribute('y2',y);l.setAttribute('class','legend-line');svg.append(l)}
  const visible=new Set(); if(cur.z===z){visible.add(cur.id); const adj=buildAdj().get(cur.id)||{};Object.values(adj).forEach(id=>visible.add(id));} visited.forEach(id=>{const n=byId.get(id);if(n?.z===z)visible.add(id)});
  for(const h of state.history){const a=byId.get(h.from),b=byId.get(h.to); if(a?.z===z&&b?.z===z){const p=document.createElementNS(ns,'line');p.setAttribute('x1',a.x);p.setAttribute('y1',a.y);p.setAttribute('x2',b.x);p.setAttribute('y2',b.y);p.setAttribute('class','pathline');svg.append(p)}}
  for(const [from,,to] of map.edges){const a=byId.get(from),b=byId.get(to);if(!a||!b||a.z!==z||b.z!==z)continue; const e=document.createElementNS(ns,'line');e.setAttribute('x1',a.x);e.setAttribute('y1',a.y);e.setAttribute('x2',b.x);e.setAttribute('y2',b.y);e.setAttribute('class','edge'+((a.name+b.name).match(/Wasser|Zisterne|Brücke|Pump/)?' water':'')); if(reveal||visible.has(from)||visible.has(to))svg.append(e)}
  for(const n of levelNodes){const canSee=reveal||visible.has(n.id); if(!canSee)continue; const g=document.createElementNS(ns,'g'); const r=document.createElementNS(ns,'rect');r.setAttribute('x',n.x-2.4);r.setAttribute('y',n.y-1.6);r.setAttribute('width',4.8);r.setAttribute('height',3.2);r.setAttribute('rx',n.kind==='junction'?1.4:.6);let cl=`room ${n.kind}`;if(visited.has(n.id))cl+=' visited';if(n.id===state.node)cl+=' current';if(cur.z===z&&Object.values(buildAdj().get(cur.id)||{}).includes(n.id))cl+=' neighbor';r.setAttribute('class',cl);g.append(r);const t=document.createElementNS(ns,'text');t.setAttribute('x',n.x);t.setAttribute('y',n.y+3);t.setAttribute('class','room-label');t.textContent=n.name;g.append(t);svg.append(g)}
  if(cur.z===z){const m=document.createElementNS(ns,'circle');m.setAttribute('cx',cur.x);m.setAttribute('cy',cur.y);m.setAttribute('r','.8');m.setAttribute('class','marker');svg.append(m)}
  $('#levelName').textContent=map.levels.find(l=>l.z===z)?.name||'';
}
async function fetchRemoteState(){
  const {data,error}=await supabase.rpc('get_maze_room',{p_room_code:roomCode,p_token:accessToken});
  if(error)throw error; const row=Array.isArray(data)?data[0]:data; if(!row)throw new Error('Raum oder Zugangslink ungültig.');
  state={...state,...row.state,room:roomCode};version=Number(row.version);channelSecret=row.channel_secret;isGm=Boolean(row.is_gm);render();
  return row;
}
async function setupRealtime(){
  const cfg=window.MAZE_CONFIG||{}, cred=credentialsFromHash(); roomCode=cred.room;accessToken=cred.token;playerToken=cred.play;
  if(!cfg.supabaseUrl||!cfg.supabaseKey||!roomCode||!accessToken){$('#syncState').textContent='lokal';message('Kein Raumlink erkannt – lokaler Probelauf.');return}
  try{
    const {createClient}=await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm'); supabase=createClient(cfg.supabaseUrl,cfg.supabaseKey);
    await fetchRemoteState();
    if(channel)await supabase.removeChannel(channel);
    channel=supabase.channel(`maze:${roomCode}:${channelSecret}`,{config:{broadcast:{self:false}}})
      .on('broadcast',{event:'state'},p=>{const incoming=p?.payload||{};if(Number(incoming.version)<=version)return;version=Number(incoming.version);state={...state,...incoming.state,room:roomCode};render();message('Der Weg wurde auf einem anderen Gerät verändert.')})
      .subscribe(s=>{$('#syncState').textContent=s==='SUBSCRIBED'?'live':s==='CHANNEL_ERROR'?'offline':'verbinden…'});
  }catch(e){console.error(e);$('#syncState').textContent='offline';message(e.message||'Live-Sync nicht erreichbar.')}
}
async function syncState(gmOnly=false){
  if(!supabase)return true;
  try{
    const fn=gmOnly?'gm_update_maze_room':'update_maze_room';
    const args=gmOnly?{p_room_code:roomCode,p_gm_token:accessToken,p_expected_version:version,p_state:state}:{p_room_code:roomCode,p_token:accessToken,p_expected_version:version,p_state:state};
    const {data,error}=await supabase.rpc(fn,args); if(error)throw error; const row=Array.isArray(data)?data[0]:data;version=Number(row.version);state={...state,...row.state,room:roomCode};render();return true;
  }catch(e){console.error(e); if(String(e.message).includes('STALE_VERSION')){message('Jemand war schneller – der aktuelle gemeinsame Stand wird geladen.');try{await fetchRemoteState()}catch{}} else message('Änderung konnte nicht synchronisiert werden.');return false}
}
init().catch(e=>{console.error(e);document.body.innerHTML=`<pre style="color:white;padding:20px">${e.stack}</pre>`});
