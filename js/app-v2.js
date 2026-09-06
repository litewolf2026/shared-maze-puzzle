import {OPP,buildAdj,visibleAdj,initialSharedState,normalizeSharedState,availableDirections,beginMove,gmUndoDecision,locationLabel,nodeById} from './navigation-model.js';
import {applyExpansions} from './map-expansion.js';
import {enrichMapContent} from './content-model.js';
import {generateContentPlan,materializeRoomState,applyContentAction} from './content-engine.js';
import {openSecretConnection} from './secret-connections.js';

const DIR_LABEL={N:'N',NE:'NO',E:'O',SE:'SO',S:'S',SW:'SW',W:'W',NW:'NW',UP:'AUF',DOWN:'AB'};
const $=s=>document.querySelector(s);const $$=s=>[...document.querySelectorAll(s)];
const NS='http://www.w3.org/2000/svg';
let map,cipher,scenario,state,featureCatalog={},contentPlan=null,supabase=null,channel=null,roomCode='',accessToken='',playerToken='',channelSecret='',version=0,isGm=false,gmPanelOpen=false,activeLevel=0;
let mutationQueue=Promise.resolve(),mutationActive=false,deferredIncoming=null;

async function loadJSON(path){const r=await fetch(path,{cache:'no-store'});if(!r.ok)throw new Error(path);return r.json()}
function credentialsFromHash(){const p=new URLSearchParams(location.hash.replace(/^#/,''));return {room:(p.get('room')||'').toUpperCase(),token:p.get('token')||'',play:p.get('play')||''}}
function inviteUrl(token){const base=`${location.origin}${location.pathname}`;return `${base}#room=${encodeURIComponent(roomCode)}&token=${encodeURIComponent(token)}`}
async function copyText(text,label){try{await navigator.clipboard.writeText(text);message(`${label} kopiert.`)}catch{prompt(label,text)}}
function labelFor(n,gm=false){return gm&&isGm&&n?.gmName?n.gmName:n?.name||n?.id||''}
function message(t){const el=$('#message');if(!el)return;el.textContent=t;clearTimeout(message.t);message.t=setTimeout(()=>el.textContent='',6500)}
function applyIncoming(incoming){if(Number(incoming?.version)<=version)return;version=Number(incoming.version);state=normalizeSharedState(incoming.state,map);render();message('Die Gruppe wurde auf einem anderen Gerät bewegt.')}
function enqueueMutation(work){
  const run=mutationQueue.then(async()=>{
    mutationActive=true;
    try{return await work()}
    finally{
      mutationActive=false;
      if(deferredIncoming){const incoming=deferredIncoming;deferredIncoming=null;applyIncoming(incoming)}
    }
  });
  mutationQueue=run.catch(e=>{console.error(e);message(`Aktion fehlgeschlagen: ${e.message||e}`)});
  return run;
}

function validateMap(){
  if((map.gridSizeMeters||3)!==3)throw new Error('Diese Version erwartet ein 3-m-Raster.');
  const adj=buildAdj(map),canonical=map.canonicalPath,decisionNodes=map.bandDecisionNodes;
  if(Array.isArray(canonical)&&canonical.length>=2&&Array.isArray(decisionNodes)&&decisionNodes.length){
    if(canonical[0]!==map.start||canonical.at(-1)!==map.goal)throw new Error('Der kanonische physische Weg beginnt oder endet am falschen Ort.');
    if(decisionNodes.length!==map.solution.length)throw new Error('Bandentscheidungen und Bandsymbole haben unterschiedliche Länge.');
    const decisionSet=new Set(decisionNodes),seen=[];
    for(let i=0;i<canonical.length-1;i++){
      const from=canonical[i],to=canonical[i+1],edge=Object.values(adj.get(from)||{}).find(e=>e.to===to);
      if(!edge)throw new Error(`Ungültiger kanonischer Weg: ${from} -> ${to}`);
      if(decisionSet.has(from))seen.push({node:from,dir:edge.dir});
    }
    if(seen.length!==map.solution.length)throw new Error(`Kanonischer Weg enthält ${seen.length} Bandentscheidungen statt ${map.solution.length}.`);
    for(let i=0;i<map.solution.length;i++){
      if(seen[i].node!==decisionNodes[i])throw new Error(`Bandentscheidung ${i+1} liegt an ${seen[i].node} statt ${decisionNodes[i]}.`);
      if(seen[i].dir!==map.solution[i])throw new Error(`Bandentscheidung ${i+1} an ${seen[i].node}: ${seen[i].dir} statt ${map.solution[i]}.`);
    }
    return;
  }
  let node=map.start;
  for(const dir of map.solution){const edge=adj.get(node)?.[dir];if(!edge)throw new Error(`Ungültige Bandroute: ${node} -> ${dir}`);node=edge.to}
  if(node!==map.goal)throw new Error(`Bandroute endet in ${node}, nicht ${map.goal}.`);
}

function renderBand(){const band=$('#band');band.innerHTML='';map.solution.forEach((d,i)=>{const cell=document.createElement('div');cell.className='symbol';cell.dataset.step=i+1;cell.title=`Bandentscheidung ${i+1}`;const bits=cipher.symbols?.[d]||[];for(const bit of bits){const dot=document.createElement('span');dot.className='dot'+(bit?' on':'');cell.append(dot)}band.append(cell)})}
function renderLevels(){const box=$('#levelButtons');if(!box)return;box.innerHTML='';map.levels.forEach(l=>{const b=document.createElement('button');b.className='level-btn';b.dataset.z=l.z;b.textContent=l.name;b.onclick=()=>{activeLevel=Number(l.z);renderMap()};box.append(b)})}
function currentDisplayNode(){return nodeById(map,state.transit?.from||state.node)}

function renderDirections(){
  const dirs=new Set(availableDirections(map,state));
  $$('.dir,.vertical button[data-d]').forEach(b=>{const d=b.dataset.d,ok=dirs.has(d);b.disabled=!ok;b.classList.toggle('available',ok);b.classList.toggle('unavailable',!ok);b.title=ok?(state.transit?`Im Gang ${DIR_LABEL[d]||d} weiter.`:`Ausgang ${DIR_LABEL[d]||d}`):'Hier ist keine Gruppenbewegung möglich.'});
  const title=$('#movementTitle');if(title)title.textContent=state.transit?'Gruppenbewegung · Gang':'Gruppenausgänge';
  const note=$('#movementNote');if(note)note.textContent=state.transit?'Transit verbraucht kein weiteres Bandzeichen. Ihr könnt feldweise gehen oder bis zum nächsten Ort durchlaufen.':'Das Band nennt die absolute Himmelsrichtung des nächsten relevanten Ausgangs.';
  const fast=$('#continueTransit');if(fast){fast.hidden=!state.transit;fast.disabled=!state.transit}
}

function renderHistory(){const ol=$('#history');if(!ol)return;ol.innerHTML='';if(!state.decisionHistory.length){const li=document.createElement('li');li.className='empty-history';li.textContent='Noch keine Bandentscheidung.';ol.append(li);return}[...state.decisionHistory].reverse().forEach(h=>{const li=document.createElement('li');li.innerHTML=`<b>${DIR_LABEL[h.dir]||h.dir}</b> · ${labelFor(nodeById(map,h.from),isGm)} → ${labelFor(nodeById(map,h.to),isGm)}`;ol.append(li)})}
function renderLocation(){const n=currentDisplayNode(),level=map.levels.find(l=>Number(l.z)===Number(n?.z)),loc=$('#loc');if(state.transit)loc.innerHTML=`${locationLabel(map,state)}<small>${level?.name||''} · Band ${state.bandStep}/${map.solution.length}</small>`;else loc.innerHTML=`${labelFor(n,isGm)}<small>${level?.name||''} · Band ${state.bandStep}/${map.solution.length}</small>`;$('#stepPill').textContent=`${state.bandStep} / ${map.solution.length}`;$('#roomPill').textContent=roomCode?`Raum ${roomCode}`:'Lokaler Probelauf';$('#gmToggle').style.display=isGm?'':'none'}

function svgEl(name,attrs={}){const e=document.createElementNS(NS,name);for(const [k,v] of Object.entries(attrs))e.setAttribute(k,String(v));return e}
function fitMapView(svg){const nodes=map.nodes.filter(n=>n.z===activeLevel);if(!nodes.length)return;const xs=nodes.map(n=>n.x),ys=nodes.map(n=>n.y),pad=6;const minX=Math.min(...xs)-pad,maxX=Math.max(...xs)+pad,minY=Math.min(...ys)-pad,maxY=Math.max(...ys)+pad;svg.setAttribute('viewBox',`${minX} ${minY} ${Math.max(24,maxX-minX)} ${Math.max(20,maxY-minY)}`)}
function renderMap(){
  const svg=$('#mapSvg');if(!svg)return;svg.innerHTML='';fitMapView(svg);
  const levelNodes=map.nodes.filter(n=>n.z===activeLevel),xs=levelNodes.map(n=>n.x),ys=levelNodes.map(n=>n.y);if(xs.length)svg.append(svgEl('rect',{x:Math.min(...xs)-8,y:Math.min(...ys)-8,width:Math.max(...xs)-Math.min(...xs)+16,height:Math.max(...ys)-Math.min(...ys)+16,class:'map-bg'}));
  const byId=new Map(map.nodes.map(n=>[n.id,n])),visited=new Set(state.visited),reveal=document.body.classList.contains('reveal-all')&&isGm,adj=reveal?buildAdj(map):visibleAdj(map,state);
  const known=new Set(visited);for(const id of visited){for(const e of Object.values(adj.get(id)||{}))known.add(e.to)}
  for(const [from,dir,to] of map.edges){const a=byId.get(from),b=byId.get(to);if(!a||!b||a.z!==activeLevel||b.z!==activeLevel)continue;if(!reveal&&adj.get(from)?.[dir]?.to!==to)continue;if(!reveal&&!visited.has(from)&&!visited.has(to))continue;svg.append(svgEl('line',{x1:a.x,y1:a.y,x2:b.x,y2:b.y,class:'corridor-wall'}));svg.append(svgEl('line',{x1:a.x,y1:a.y,x2:b.x,y2:b.y,class:'corridor-floor'}))}
  for(const h of state.pathHistory){const a=byId.get(h.from),b=byId.get(h.to);if(a?.z===activeLevel&&b?.z===activeLevel)svg.append(svgEl('line',{x1:a.x,y1:a.y,x2:b.x,y2:b.y,class:'pathline'}))}
  for(const n of map.nodes.filter(n=>n.z===activeLevel&&(reveal||known.has(n.id)))){const g=svgEl('g',{class:`room-node ${n.kind}${visited.has(n.id)?' visited':''}${n.id===state.node&&!state.transit?' current':''}`});const r=n.kind==='goal'?2.6:n.kind==='junction'?1.8:2.1;g.append(svgEl('circle',{cx:n.x,cy:n.y,r,class:'room-shape'}));if(reveal||visited.has(n.id)){const t=svgEl('text',{x:n.x,y:n.y+3,class:'room-label'});t.textContent=labelFor(n,reveal);g.append(t)}svg.append(g)}
  const markerNode=state.transit?byId.get(state.transit.from):byId.get(state.node);if(markerNode?.z===activeLevel){let x=markerNode.x,y=markerNode.y;if(state.transit){const to=byId.get(state.transit.to),ratio=state.transit.progress/state.transit.cells;if(to){x+=(to.x-x)*ratio;y+=(to.y-y)*ratio}}svg.append(svgEl('circle',{cx:x,cy:y,r:1,class:'marker-ring'}));svg.append(svgEl('circle',{cx:x,cy:y,r:.42,class:'marker-core'}))}
  $('#levelName').textContent=map.levels.find(l=>Number(l.z)===Number(activeLevel))?.name||'';$$('.level-btn').forEach(b=>b.classList.toggle('active',Number(b.dataset.z)===activeLevel));
}

function announce(){window.MAZE_APP={map,state:structuredClone(state),isGm,contentSeed:contentPlan?.seed||null};window.dispatchEvent(new CustomEvent('maze-state',{detail:{map,state:structuredClone(state),isGm}}))}
function render(){state=normalizeSharedState(state,map);$$('.symbol').forEach((x,i)=>{x.classList.toggle('used',i<state.bandStep);x.classList.toggle('current',i===state.bandStep&&state.bandStep<map.solution.length)});const n=currentDisplayNode();if(n&&activeLevel!==n.z)activeLevel=n.z;renderLocation();renderDirections();renderHistory();renderMap();announce()}
function materializeCurrentContent(next){if(!contentPlan||next.transit||!next.node)return next;return materializeRoomState(next,contentPlan,next.node).state}
async function commit(next,gmOnly=false,success=''){
  const previous=structuredClone(state);
  state=normalizeSharedState(materializeCurrentContent(next),map);render();
  const sync=await syncState(gmOnly);
  if(sync.ok){if(success)message(success);return true}
  if(sync.refreshed)return false;
  state=previous;render();return false;
}

async function move(dir){const result=beginMove(map,state,dir);if(!result.ok){message(result.error==='NO_EXIT'||result.error==='LOCKED_EXIT'?'Dort ist kein begehbarer Weg.':'Diese Bewegung ist hier nicht möglich.');return}const before=state.bandStep,after=result.state.bandStep,text=result.state.node===map.goal&&!result.state.transit?'Ihr habt die geheime Kultstätte erreicht.':after>before?'Ihr wählt diesen Ausgang. Das nächste Bandzeichen wird aktiv.':'Ihr bewegt euch weiter durch den Gang.';await commit(result.state,false,text)}
async function finishTransit(){
  if(!state.transit)return;
  let next=structuredClone(state),guard=0;
  while(next.transit&&guard++<128){const dir=next.transit.dir,result=beginMove(map,next,dir);if(!result.ok)break;next=result.state}
  if(guard>=128){message('Der automatische Ganglauf wurde aus Sicherheitsgründen abgebrochen.');return}
  await commit(next,false,'Ihr geht bis zum nächsten Ort weiter.');
}
async function undo(){if(!isGm){message('Nur die Spielleitung kann Undo benutzen.');return}const result=gmUndoDecision(map,state);if(!result.ok){message('Keine Entscheidung zum Zurücknehmen.');return}await commit(result.state,true,'Letzte Bandentscheidung zurückgenommen.')}
async function backtrack(){if(state.transit){const r=beginMove(map,state,OPP[state.transit.dir]);if(r.ok)await commit(r.state,false,'Ihr geht zurück.');return}const last=state.pathHistory.at(-1);if(!last){message('Kein Rückweg vorhanden.');return}const r=beginMove(map,state,OPP[last.dir]);if(r.ok)await commit(r.state,false,'Ihr kehrt auf demselben Weg zurück.')}
async function discover(detail){
  if(state.transit||detail?.node!==state.node)return;
  const feature=(featureCatalog[detail.node]||[]).find(f=>f.id===detail.feature);if(!feature)return;
  const key=`${detail.node}:${detail.feature}`;if(state.discovered.includes(key))return;
  const next=structuredClone(state);next.discovered.push(key);await commit(next,false,`${feature.label} wurde entdeckt und mit der Gruppe geteilt.`);
}
async function contentAction(detail){
  if(state.transit||detail?.node!==state.node||!detail?.slot||!detail?.action)return;
  const result=detail.action==='open'?openSecretConnection(state,detail.node,detail.slot,{isGm}):applyContentAction(state,detail.node,detail.slot,detail.action,{isGm});
  if(!result.ok){
    if(result.error==='CONTENT_ACTION_FORBIDDEN')message('Diese Aktion muss die Spielleitung auslösen.');
    else if(result.error==='MUST_DISCOVER_FIRST')message('Der verborgene Mechanismus muss zuerst entdeckt werden.');
    return;
  }
  const verb={discover:'entdeckt',open:'geöffnet',trigger:'ausgelöst',take:'genommen',resolve:'erledigt',disable:'deaktiviert'}[detail.action]||'aktualisiert';
  await commit(result.state,isGm,`${result.assignment.label}: ${verb}.`);
}
async function reset(){if(!isGm){message('Nur die Spielleitung kann zurücksetzen.');return}if(!confirm('Rätsel wirklich vollständig zurücksetzen?'))return;await commit(initialSharedState(map),true,'Der gemeinsame Spielstand wurde zurückgesetzt.')}
function setupControls(){
  $$('.dir,.vertical button[data-d]').forEach(b=>b.addEventListener('click',()=>enqueueMutation(()=>move(b.dataset.d))));
  $('#continueTransit').addEventListener('click',()=>enqueueMutation(finishTransit));$('#backtrack').addEventListener('click',()=>enqueueMutation(backtrack));$('#undo').addEventListener('click',()=>enqueueMutation(undo));$('#reset').addEventListener('click',()=>enqueueMutation(reset));
  window.addEventListener('maze-discover',e=>enqueueMutation(()=>discover(e.detail)));window.addEventListener('maze-content-action',e=>enqueueMutation(()=>contentAction(e.detail)));
  $('#gmToggle').addEventListener('click',()=>{if(!isGm)return;gmPanelOpen=!gmPanelOpen;$('.gm-panel').classList.toggle('on',gmPanelOpen);$('#gmToggle').textContent=gmPanelOpen?'SL schließen':'SL'});
  $('#reveal').addEventListener('click',()=>{if(!isGm)return;document.body.classList.toggle('reveal-all');renderMap()});$('#copyPlayer').addEventListener('click',()=>playerToken?copyText(inviteUrl(playerToken),'Spielerlink'):message('Dieser SL-Link enthält keinen Spieler-Token.'));$('#copyCurrent').addEventListener('click',()=>copyText(location.href,'Aktueller Link'));$('#zoomIn').onclick=$('#zoomOut').onclick=$('#zoomReset').onclick=()=>message('Die V2-Automap passt sich automatisch an die aktuelle Ebene an.');
}

async function fetchRemoteState(){const {data,error}=await supabase.rpc('get_maze_room',{p_room_code:roomCode,p_token:accessToken});if(error)throw error;const row=Array.isArray(data)?data[0]:data;if(!row)throw new Error('Raum oder Zugangslink ungültig.');state=normalizeSharedState(row.state,map);version=Number(row.version);channelSecret=row.channel_secret;isGm=Boolean(row.is_gm);render();return row}
async function setupRealtime(){const cfg=window.MAZE_CONFIG||{},cred=credentialsFromHash();roomCode=cred.room;accessToken=cred.token;playerToken=cred.play;if(!cfg.supabaseUrl||!cfg.supabaseKey||!roomCode||!accessToken){$('#syncState').textContent='lokal';message('Lokaler Probelauf.');return}try{const {createClient}=await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');supabase=createClient(cfg.supabaseUrl,cfg.supabaseKey);await fetchRemoteState();if(channel)await supabase.removeChannel(channel);channel=supabase.channel(`maze:${roomCode}:${channelSecret}`,{config:{broadcast:{self:false}}}).on('broadcast',{event:'state'},p=>{const incoming=p?.payload||{};if(Number(incoming.version)<=version)return;if(mutationActive){if(!deferredIncoming||Number(incoming.version)>Number(deferredIncoming.version))deferredIncoming=incoming;return}applyIncoming(incoming)}).subscribe(s=>{$('#syncState').textContent=s==='SUBSCRIBED'?'live':s==='CHANNEL_ERROR'?'offline':'verbinden…'})}catch(e){console.error(e);$('#syncState').textContent='offline';message(e.message||'Live-Sync nicht erreichbar.')}}
async function syncState(gmOnly=false){
  if(!supabase)return {ok:true,refreshed:false};
  try{
    const fn=gmOnly?'gm_update_maze_room':'update_maze_room',args=gmOnly?{p_room_code:roomCode,p_gm_token:accessToken,p_expected_version:version,p_state:state}:{p_room_code:roomCode,p_token:accessToken,p_expected_version:version,p_state:state};
    const {data,error}=await supabase.rpc(fn,args);if(error)throw error;const row=Array.isArray(data)?data[0]:data;version=Number(row.version);state=normalizeSharedState(row.state,map);render();return {ok:true,refreshed:false};
  }catch(e){
    console.error(e);
    if(String(e.message).includes('STALE_VERSION')){
      message('Jemand war schneller – aktueller Gruppenstand wird geladen.');
      try{await fetchRemoteState();return {ok:false,refreshed:true}}
      catch{}
    }else message(`Synchronisation fehlgeschlagen: ${e.message||e}`);
    return {ok:false,refreshed:false};
  }
}

async function init(){
  const [ms,cs,ss,exp,secrets,features,catalog,pools,profiles,slots]=await Promise.all([loadJSON('./data/maps.json'),loadJSON('./data/ciphers.json'),loadJSON('./data/scenarios.json'),loadJSON('./data/selem-expansion.json'),loadJSON('./data/selem-secrets.json'),loadJSON('./data/room-features.json'),loadJSON('./data/content/catalog.json'),loadJSON('./data/content/pools.json'),loadJSON('./data/content/profiles.json'),loadJSON('./data/content/selem-slots.json')]);
  scenario=ss.scenarios[0];const base=ms.maps.find(m=>m.id===scenario.map);map=applyExpansions(base,exp,secrets);featureCatalog=features.features||{};cipher=cs.ciphers.find(c=>c.id===scenario.cipher);if(!map||!cipher)throw new Error('Szenario unvollständig.');validateMap();
  const cred=credentialsFromHash();roomCode=cred.room;const baseSeed=slots.generation?.seed||scenario.id||scenario.name;const seed=slots.generation?.mode==='instance'?`${baseSeed}|${roomCode||'local'}`:baseSeed;const derivedByNode=Object.fromEntries(enrichMapContent(map).map(x=>[x.id,x]));contentPlan=generateContentPlan({map,slotConfig:slots,catalog,pools,profiles,roomFeatures:featureCatalog,derivedByNode,seed});
  state=initialSharedState(map);activeLevel=nodeById(map,map.start)?.z??0;
  $('#scenarioTitle').textContent=scenario.name;$('#scenarioSubtitle').textContent=map.subtitle||map.name;$('#mapName').textContent=map.name;$('#bandTitle').textContent=scenario.bandTitle||'Der Weg, den die Erinnerung nicht bewahren kann';renderLevels();renderBand();setupControls();render();await setupRealtime();
}
init().catch(e=>{console.error(e);document.body.innerHTML=`<pre style="color:white;padding:20px;white-space:pre-wrap">${e.stack}</pre>`});