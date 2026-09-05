const DIRS={N:{label:'12',opp:'S'},NE:{label:'½2',opp:'SW'},E:{label:'3',opp:'W'},SE:{label:'½5',opp:'NW'},S:{label:'6',opp:'N'},SW:{label:'½8',opp:'NE'},W:{label:'9',opp:'E'},NW:{label:'½11',opp:'SE'},UP:{label:'AUF',opp:'DOWN'},DOWN:{label:'AB',opp:'UP'}};
const $=s=>document.querySelector(s); const $$=s=>[...document.querySelectorAll(s)];
const NS='http://www.w3.org/2000/svg';
const BASE_VIEW={x:6,y:1,w:64,h:35};
let map,cipher,scenario;
let state={room:'LOCAL',node:null,step:0,history:[],visited:[],updated_at:null};
let supabase=null, channel=null, roomCode='', accessToken='', playerToken='', channelSecret='', version=0, isGm=false, gmPanelOpen=false;
let activeLevel=0, view={...BASE_VIEW}, drag=null;

async function loadJSON(path){const r=await fetch(path);if(!r.ok)throw new Error(path);return r.json()}
function credentialsFromHash(){const p=new URLSearchParams(location.hash.replace(/^#/,''));return {room:(p.get('room')||'').toUpperCase(),token:p.get('token')||'',play:p.get('play')||''}}
function inviteUrl(token){const base=`${location.origin}${location.pathname}`;return `${base}#room=${encodeURIComponent(roomCode)}&token=${encodeURIComponent(token)}`}
async function copyText(text,label){try{await navigator.clipboard.writeText(text);message(`${label} kopiert.`)}catch{prompt(label,text)}}
function labelFor(n,gmDetail=false){return gmDetail&&isGm&&n.gmName?n.gmName:n.name}

async function init(){
  const [ms,cs,ss]=await Promise.all([loadJSON('./data/maps.json'),loadJSON('./data/ciphers.json'),loadJSON('./data/scenarios.json')]);
  scenario=ss.scenarios[0];map=ms.maps.find(m=>m.id===scenario.map);cipher=cs.ciphers.find(c=>c.id===scenario.cipher);
  if(!map||!cipher)throw new Error('Szenario verweist auf eine unbekannte Karte oder Chiffre.');
  validateMap();state.node=map.start;state.visited=[map.start];activeLevel=map.nodes.find(n=>n.id===map.start)?.z??0;
  $('#scenarioTitle').textContent=scenario.name||'Shared Maze Puzzle';
  $('#scenarioSubtitle').textContent=map.subtitle||map.name;
  $('#mapName').textContent=map.name;
  $('#bandTitle').textContent=scenario.bandTitle||'Der Weg, den die Erinnerung nicht bewahren kann';
  renderLevelButtons();renderBand();setupControls();render();await setupRealtime();
}
function validateMap(){
  const ids=new Set(map.nodes.map(n=>n.id));if(ids.size!==map.nodes.length)throw new Error('Doppelte Kartenknoten.');
  const adj=buildAdj();let cur=map.start;
  for(const d of map.solution){const nxt=adj.get(cur)?.[d];if(!nxt)throw new Error(`Ungültige Lösung: ${cur} -> ${d}`);cur=nxt}
  if(cur!==map.goal)throw new Error(`Lösung endet in ${cur}, nicht ${map.goal}`);
}
function buildAdj(){
  const a=new Map(map.nodes.map(n=>[n.id,{}]));
  for(const [from,dir,to] of map.edges){if(!a.has(from)||!a.has(to))continue;a.get(from)[dir]=to;const rev=DIRS[dir]?.opp;if(rev&&!a.get(to)[rev])a.get(to)[rev]=from}
  return a;
}
function renderLevelButtons(){
  const box=$('#levelButtons');box.innerHTML='';
  map.levels.forEach(l=>{const b=document.createElement('button');b.className='level-btn';b.dataset.z=l.z;b.textContent=l.name;b.addEventListener('click',()=>{activeLevel=Number(l.z);resetView();renderMap(activeLevel);syncLevelButtons()});box.append(b)});
  syncLevelButtons();
}
function syncLevelButtons(){$$('.level-btn').forEach(b=>b.classList.toggle('active',Number(b.dataset.z)===activeLevel))}
function renderBand(){
  const band=$('#band');band.innerHTML='';
  map.solution.forEach((d,i)=>{const cell=document.createElement('div');cell.className='symbol';cell.dataset.i=i;cell.dataset.step=i+1;cell.title=`Zeichen ${i+1}`;
    if(cipher.type==='six-dot'){const bits=cipher.symbols[d]||[];for(const bit of bits){const dot=document.createElement('span');dot.className='dot'+(bit?' on':'');cell.append(dot)}}
    else cell.textContent=String(cipher.symbols?.[d]??d);
    band.append(cell)
  });
}
function setupControls(){
  $$('.dir, .vertical button').forEach(b=>b.addEventListener('click',()=>move(b.dataset.d)));
  $('#backtrack').addEventListener('click',()=>rewind(false,'Ihr kehrt zum letzten Abzweig zurück. Das letzte Zeichen ist wieder aktiv.'));
  $('#gmToggle').addEventListener('click',()=>{if(!isGm)return;gmPanelOpen=!gmPanelOpen;$('.gm-panel').classList.toggle('on',gmPanelOpen);$('#gmToggle').textContent=gmPanelOpen?'SL schließen':'SL';render()});
  $('#undo').addEventListener('click',()=>rewind(true,'Der letzte Schritt wurde zurückgenommen.'));
  $('#reset').addEventListener('click',reset);
  $('#reveal').addEventListener('click',()=>{if(!isGm)return;document.body.classList.toggle('reveal-all');renderMap(activeLevel)});
  $('#copyPlayer')?.addEventListener('click',()=>{if(playerToken)copyText(inviteUrl(playerToken),'Spielerlink');else message('Dieser SL-Link enthält keinen Spieler-Token.')});
  $('#copyCurrent')?.addEventListener('click',()=>copyText(location.href,'Aktueller Link'));
  $('#zoomIn').addEventListener('click',()=>zoomAt(.78));$('#zoomOut').addEventListener('click',()=>zoomAt(1.28));$('#zoomReset').addEventListener('click',resetView);
  const svg=$('#mapSvg');
  svg.addEventListener('wheel',e=>{e.preventDefault();zoomAt(e.deltaY<0?.84:1.19,e.clientX,e.clientY)},{passive:false});
  svg.addEventListener('pointerdown',e=>{if(e.button!==0)return;drag={x:e.clientX,y:e.clientY,vx:view.x,vy:view.y};svg.setPointerCapture(e.pointerId);$('.map-shell').classList.add('dragging')});
  svg.addEventListener('pointermove',e=>{if(!drag)return;const r=svg.getBoundingClientRect();view.x=drag.vx-(e.clientX-drag.x)*view.w/r.width;view.y=drag.vy-(e.clientY-drag.y)*view.h/r.height;applyViewBox()});
  const stop=e=>{drag=null;$('.map-shell').classList.remove('dragging');try{svg.releasePointerCapture(e.pointerId)}catch{}};svg.addEventListener('pointerup',stop);svg.addEventListener('pointercancel',stop);
}
function resetView(){view={...BASE_VIEW};applyViewBox();$('#zoomReset').textContent='100%'}
function applyViewBox(){const svg=$('#mapSvg');if(svg)svg.setAttribute('viewBox',`${view.x} ${view.y} ${view.w} ${view.h}`);const pct=Math.round(BASE_VIEW.w/view.w*100);if($('#zoomReset'))$('#zoomReset').textContent=`${pct}%`}
function zoomAt(factor,cx=null,cy=null){
  const svg=$('#mapSvg'),r=svg.getBoundingClientRect();const px=cx==null?view.x+view.w/2:view.x+(cx-r.left)/r.width*view.w;const py=cy==null?view.y+view.h/2:view.y+(cy-r.top)/r.height*view.h;
  const newW=Math.max(20,Math.min(92,view.w*factor)),newH=newW*(BASE_VIEW.h/BASE_VIEW.w),ratio=newW/view.w;view.x=px-(px-view.x)*ratio;view.y=py-(py-view.y)*ratio;view.w=newW;view.h=newH;applyViewBox();
}
async function move(dir){
  if(state.step>=map.solution.length){message(state.node===map.goal?'Ihr seid bereits am Ziel.':'Das Band ist zu Ende. Ihr müsst einen früheren Schritt zurücknehmen.');return}
  const next=buildAdj().get(state.node)?.[dir];
  if(!next){message('Von hier führt kein Gang in diese Richtung. Wenn das Band stimmt, liegt der Fehler früher.');return}
  const previous=structuredClone(state);state.history.push({from:state.node,dir,to:next,step:state.step});state.node=next;state.step+=1;if(!state.visited.includes(next))state.visited.push(next);state.updated_at=new Date().toISOString();
  const exhausted=state.step>=map.solution.length;message(next===map.goal?'Ihr habt die geheime Kultstätte erreicht.':exhausted?'Das Band endet hier – doch dies ist nicht das gesuchte Ziel. Der Fehler liegt früher.':'Der Schritt ist gegangen.');render();
  if(!(await syncState(false))){state=previous;render()}
}
async function rewind(gmOnly=false,successText='Schritt zurückgenommen.'){
  if(gmOnly&&!isGm){message('Nur die Spielleitung kann dieses Undo benutzen.');return}
  if(!state.history.length){message('Es gibt noch keinen Schritt, zu dem ihr zurückkehren könnt.');return}
  const previous=structuredClone(state),h=state.history.pop();state.node=h.from;state.step=h.step;state.updated_at=new Date().toISOString();render();
  if(await syncState(gmOnly))message(successText);else{state=previous;render()}
}
async function reset(){
  if(!isGm){message('Nur die Spielleitung kann zurücksetzen.');return}
  if(!confirm('Rätsel wirklich vollständig zurücksetzen?'))return;const previous=structuredClone(state);state.node=map.start;state.step=0;state.history=[];state.visited=[map.start];state.updated_at=new Date().toISOString();activeLevel=map.nodes.find(n=>n.id===map.start)?.z??0;resetView();render();
  if(await syncState(true))message('Der gemeinsame Spielstand wurde zurückgesetzt.');else{state=previous;render()}
}
function message(t){$('#message').textContent=t;clearTimeout(message.t);message.t=setTimeout(()=>$('#message').textContent='',6500)}
function render(){
  $$('.symbol').forEach((x,i)=>{x.classList.toggle('used',i<state.step);x.classList.toggle('current',i===state.step&&state.step<map.solution.length)});
  const currentSymbol=$('.symbol.current');if(currentSymbol)currentSymbol.scrollIntoView({behavior:'smooth',block:'nearest',inline:'center'});
  const n=map.nodes.find(x=>x.id===state.node);if(!n)return;
  $('#loc').innerHTML=`${labelFor(n,isGm)}<small>${map.levels.find(l=>l.z===n.z)?.name||''} · Schritt ${state.step}/${map.solution.length}</small>`;
  $('#stepPill').textContent=`${state.step} / ${map.solution.length}`;$('#roomPill').textContent=roomCode?`Raum ${roomCode}`:'Lokaler Probelauf';$('#gmToggle').style.display=isGm?'':'none';$('#backtrack').disabled=!state.history.length;
  if(activeLevel!==n.z){activeLevel=n.z;resetView()}syncLevelButtons();renderMap(activeLevel);renderHistory();
}
function renderHistory(){
  const ol=$('#history');ol.innerHTML='';if(!state.history.length){const li=document.createElement('li');li.className='empty-history';li.textContent='Noch kein Weg gegangen.';ol.append(li);return}
  state.history.slice().reverse().forEach((h,idx)=>{const li=document.createElement('li'),from=map.nodes.find(n=>n.id===h.from),to=map.nodes.find(n=>n.id===h.to);li.innerHTML=`<b>${DIRS[h.dir]?.label||h.dir}</b> · ${labelFor(from,isGm)} → ${labelFor(to,isGm)}`;ol.append(li)})
}
function el(name,attrs={}){const e=document.createElementNS(NS,name);for(const [k,v] of Object.entries(attrs))e.setAttribute(k,String(v));return e}
function pointsString(points){return points.map(p=>p.join(',')).join(' ')}
function decorAnchor(d){if(Number.isFinite(d.x)&&Number.isFinite(d.y))return [d.x,d.y];if(d.points?.length){const s=d.points.reduce((a,p)=>[a[0]+p[0],a[1]+p[1]],[0,0]);return [s[0]/d.points.length,s[1]/d.points.length]}return [0,0]}
function renderDecor(svg,z,visited,reveal){
  const visitedNodes=map.nodes.filter(n=>n.z===z&&visited.has(n.id));
  for(const d of (map.decor||[]).filter(x=>x.z===z)){
    const [ax,ay]=decorAnchor(d),near=visitedNodes.some(n=>Math.hypot(n.x-ax,n.y-ay)<13);if(!reveal&&!near)continue;
    if(d.type==='waterPool'){svg.append(el('polygon',{points:pointsString(d.points),class:'terrain-water'}))}
    else if(d.type==='waterLine'){svg.append(el('polyline',{points:pointsString(d.points),class:'terrain-water-line'}))}
    else if(d.type==='crack'){svg.append(el('polyline',{points:pointsString(d.points),class:'terrain-crack'}))}
    else if(d.type==='pillars'){d.points.forEach(([x,y])=>svg.append(el('circle',{cx:x,cy:y,r:.72,class:'terrain-pillar'})))}
    else if(d.type==='rubble'){d.points.forEach(([x,y],i)=>svg.append(el('circle',{cx:x,cy:y,r:.35+(i%3)*.12,class:'terrain-rubble'})))}
    else if(d.type==='glyph'){svg.append(el('circle',{cx:d.x,cy:d.y,r:d.r||3,class:'terrain-glyph'}));svg.append(el('circle',{cx:d.x,cy:d.y,r:(d.r||3)*.68,class:'terrain-glyph'}))}
    else if(d.type==='caption'){const t=el('text',{x:d.x,y:d.y,class:'terrain-caption'});t.textContent=d.text;svg.append(t)}
  }
}
function corridorIsWater(a,b){return `${a.name} ${b.name}`.match(/Wasser|Zisterne|Brücke|Pump|Versunken/i)}
function renderMap(z){
  const svg=$('#mapSvg');svg.innerHTML=`<defs><filter id="glow"><feGaussianBlur stdDeviation=".7" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter><filter id="mapShadow"><feDropShadow dx=".18" dy=".28" stdDeviation=".28" flood-opacity=".75"/></filter><pattern id="stoneDust" width="5" height="5" patternUnits="userSpaceOnUse"><circle cx=".8" cy="1.2" r=".08" fill="#8a7a65" opacity=".2"/><circle cx="3.9" cy="3.6" r=".1" fill="#756956" opacity=".13"/><path d="M1.8 4.5l.7-.35" stroke="#8c7a62" stroke-width=".05" opacity=".18"/></pattern></defs>`;
  svg.append(el('rect',{x:4,y:0,width:68,height:36,class:'map-bg'}));svg.append(el('rect',{x:4,y:0,width:68,height:36,fill:'url(#stoneDust)',opacity:.8}));
  const seal=el('circle',{cx:38,cy:18,r:13,class:'level-seal'});svg.append(seal);const seal2=el('circle',{cx:38,cy:18,r:10.5,class:'level-seal'});svg.append(seal2);const st=el('text',{x:38,y:18.7,class:'level-seal-text'});st.textContent='ALT–ELEM';svg.append(st);
  const byId=new Map(map.nodes.map(n=>[n.id,n])),adj=buildAdj(),visited=new Set(state.visited),cur=byId.get(state.node),reveal=document.body.classList.contains('reveal-all')&&isGm;
  const known=new Set();for(const id of visited){const n=byId.get(id);if(n?.z!==z)continue;known.add(id);Object.values(adj.get(id)||{}).forEach(other=>{if(byId.get(other)?.z===z)known.add(other)})}
  renderDecor(svg,z,visited,reveal);
  for(const [from,,to] of map.edges){const a=byId.get(from),b=byId.get(to);if(!a||!b||a.z!==z||b.z!==z)continue;const edgeKnown=reveal||visited.has(from)||visited.has(to);if(!edgeKnown)continue;const common={x1:a.x,y1:a.y,x2:b.x,y2:b.y};svg.append(el('line',{...common,class:'corridor-wall'}));let cls='corridor-floor';if(corridorIsWater(a,b))cls+=' corridor-water';if(a.id===state.node||b.id===state.node)cls+=' corridor-current';svg.append(el('line',{...common,class:cls}));svg.append(el('line',{...common,class:'corridor-inner'}))}
  for(const h of state.history){const a=byId.get(h.from),b=byId.get(h.to);if(a?.z===z&&b?.z===z)svg.append(el('line',{x1:a.x,y1:a.y,x2:b.x,y2:b.y,class:'pathline'}))}
  for(const n of map.nodes.filter(n=>n.z===z)){
    if(!(reveal||known.has(n.id)))continue;const wasVisited=visited.has(n.id),isCurrent=n.id===state.node,isNeighbor=!wasVisited&&known.has(n.id);const g=el('g',{class:`room-node ${n.kind}${wasVisited?' visited':''}${isCurrent?' current':''}${isNeighbor?' neighbor':''}`});
    let shape;if(n.kind==='junction'){shape=el('circle',{cx:n.x,cy:n.y,r:2.0,class:'room-shape'});g.append(shape);g.append(el('circle',{cx:n.x,cy:n.y,r:1.65,class:'room-rim'}))}
    else if(n.kind==='goal'){shape=el('circle',{cx:n.x,cy:n.y,r:3.0,class:'room-shape'});g.append(shape);g.append(el('circle',{cx:n.x,cy:n.y,r:2.55,class:'room-rim'}));g.append(el('circle',{cx:n.x,cy:n.y,r:1.75,class:'goal-mark'}))}
    else {const w=n.kind==='room'||n.kind==='lens'||n.kind==='prison'?5.7:4.8,h=n.kind==='gate'?4.1:3.4;shape=el('rect',{x:n.x-w/2,y:n.y-h/2,width:w,height:h,rx:n.kind==='deadend'?.5:.85,class:'room-shape'});g.append(shape);g.append(el('rect',{x:n.x-w/2+.35,y:n.y-h/2+.35,width:w-.7,height:h-.7,rx:n.kind==='deadend'?.35:.62,class:'room-rim'}))}
    if(n.kind==='stairs'){for(let i=-1;i<=1;i++)g.append(el('line',{x1:n.x-1.2,y1:n.y+i*.55,x2:n.x+1.2,y2:n.y+i*.55,class:'stair-mark'}))}
    const canLabel=reveal||wasVisited||isCurrent;if(canLabel){const t=el('text',{x:n.x,y:n.y+(n.kind==='goal'?4.1:3.0),class:'room-label'+(reveal&&n.gmName?' gm-label':'')});t.textContent=labelFor(n,reveal);g.append(t);if(reveal){const idx=el('text',{x:n.x,y:n.y+.3,class:'room-index'});idx.textContent=n.id;g.append(idx)}}else{const q=el('text',{x:n.x,y:n.y+.4,class:'unknown-mark'});q.textContent='•';g.append(q)}
    svg.append(g)
  }
  if(cur?.z===z){svg.append(el('circle',{cx:cur.x,cy:cur.y,r:1.08,class:'marker-ring'}));svg.append(el('circle',{cx:cur.x,cy:cur.y,r:.48,class:'marker-core'}))}
  $('#levelName').textContent=map.levels.find(l=>l.z===z)?.name||'';applyViewBox();
}
async function fetchRemoteState(){
  const {data,error}=await supabase.rpc('get_maze_room',{p_room_code:roomCode,p_token:accessToken});if(error)throw error;const row=Array.isArray(data)?data[0]:data;if(!row)throw new Error('Raum oder Zugangslink ungültig.');
  state={...state,...row.state,room:roomCode};version=Number(row.version);channelSecret=row.channel_secret;isGm=Boolean(row.is_gm);render();return row;
}
async function setupRealtime(){
  const cfg=window.MAZE_CONFIG||{},cred=credentialsFromHash();roomCode=cred.room;accessToken=cred.token;playerToken=cred.play;
  if(!cfg.supabaseUrl||!cfg.supabaseKey||!roomCode||!accessToken){$('#syncState').textContent='lokal';message('Kein Raumlink erkannt – lokaler Probelauf.');return}
  try{
    const {createClient}=await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');supabase=createClient(cfg.supabaseUrl,cfg.supabaseKey);await fetchRemoteState();if(channel)await supabase.removeChannel(channel);
    channel=supabase.channel(`maze:${roomCode}:${channelSecret}`,{config:{broadcast:{self:false}}}).on('broadcast',{event:'state'},p=>{const incoming=p?.payload||{};if(Number(incoming.version)<=version)return;version=Number(incoming.version);state={...state,...incoming.state,room:roomCode};render();message('Der Weg wurde auf einem anderen Gerät verändert.')}).subscribe(s=>{$('#syncState').textContent=s==='SUBSCRIBED'?'live':s==='CHANNEL_ERROR'?'offline':'verbinden…'});
  }catch(e){console.error(e);$('#syncState').textContent='offline';message(e.message||'Live-Sync nicht erreichbar.')}
}
async function syncState(gmOnly=false){
  if(!supabase)return true;
  try{
    const fn=gmOnly?'gm_update_maze_room':'update_maze_room',args=gmOnly?{p_room_code:roomCode,p_gm_token:accessToken,p_expected_version:version,p_state:state}:{p_room_code:roomCode,p_token:accessToken,p_expected_version:version,p_state:state};
    const {data,error}=await supabase.rpc(fn,args);if(error)throw error;const row=Array.isArray(data)?data[0]:data;version=Number(row.version);state={...state,...row.state,room:roomCode};render();return true;
  }catch(e){console.error(e);if(String(e.message).includes('STALE_VERSION')){message('Jemand war schneller – der aktuelle gemeinsame Stand wird geladen.');try{await fetchRemoteState()}catch{}}else message('Änderung konnte nicht synchronisiert werden.');return false}
}
init().catch(e=>{console.error(e);document.body.innerHTML=`<pre style="color:white;padding:20px;white-space:pre-wrap">${e.stack}</pre>`});
