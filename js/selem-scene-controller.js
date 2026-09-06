import {loadSelemScenes,sceneForNode,setpieceForNode,randomPolicyLabel} from './selem-scenes.js';

let sceneBook=null,last=null;

function ensurePlayerArrival(){
  let box=document.querySelector('#sceneArrival');
  if(box)return box;
  const shell=document.querySelector('.crawler-shell'),head=shell?.querySelector('.crawler-head');
  if(!shell||!head)return null;
  box=document.createElement('p');box.id='sceneArrival';box.className='scene-arrival';box.hidden=true;
  head.insertAdjacentElement('afterend',box);return box;
}

function ensureGmGuide(){
  const gm=document.querySelector('.gm-panel');if(!gm)return null;
  let box=document.querySelector('#gmSceneGuide');if(box)return box;
  box=document.createElement('section');box.id='gmSceneGuide';box.className='gm-scene-guide';
  const content=document.querySelector('#gmContent');if(content)gm.insertBefore(box,content);else gm.append(box);return box;
}

function addRow(box,label,text){if(!text)return;const row=document.createElement('small'),b=document.createElement('b');b.textContent=`${label}: `;row.append(b,document.createTextNode(text));box.append(row)}
function addList(box,label,items){if(!Array.isArray(items)||!items.length)return;addRow(box,label,items.join(' · '))}

function renderPlayer(scene){
  const box=ensurePlayerArrival();if(!box)return;
  if(!scene||last?.state?.transit){box.hidden=true;box.textContent='';return}
  box.textContent=scene.playerArrival||'';box.hidden=!box.textContent;
}

function appendSetpiece(box,setpiece){
  if(!setpiece)return;
  const details=document.createElement('details');details.className='gm-setpiece';
  const summary=document.createElement('summary');summary.textContent=`Setpiece · ${setpiece.title}`;details.append(summary);
  const body=document.createElement('div');body.className='gm-setpiece-body';details.append(body);
  addRow(body,'Ziel',setpiece.objective);addList(body,'Gesichert',setpiece.facts);addList(body,'Offen',setpiece.unknowns);
  for(const phase of setpiece.phases||[]){
    const card=document.createElement('div');card.className='gm-setpiece-phase';
    const h=document.createElement('b');h.textContent=phase.title;card.append(h);
    addRow(card,'SL',phase.gm);addList(card,'Optionen',phase.choices);addList(card,'Folgen',phase.consequences);body.append(card);
  }
  addList(body,'Erfolgssignale',setpiece.successSignals);addList(body,'Druck bei Scheitern',setpiece.failurePressure);addRow(body,'Weiterführung',setpiece.handoff);
  box.append(details);
}

function renderGm(scene,setpiece,nodeId){
  const box=ensureGmGuide();if(!box)return;
  if(!last?.isGm||!scene||last?.state?.transit){box.hidden=true;box.innerHTML='';return}
  box.hidden=false;box.innerHTML='';
  const title=document.createElement('h4');title.textContent=`Szenenführung · ${nodeId}`;box.append(title);
  if(scene.signature){const badge=document.createElement('span');badge.className='scene-signature';badge.textContent=scene.critical?'SCHLÜSSELSZENE':'SIGNATURE';box.append(badge)}
  addRow(box,'Funktion',scene.gmPurpose);
  addRow(box,'Ausspielen',(scene.beats||[]).map((x,i)=>`${i+1}. ${x}`).join(' → '));
  addRow(box,'Hinweise',(scene.clues||[]).join(' · '));
  addRow(box,'Heldenhaken',(scene.heroHooks||[]).join(', '));
  addRow(box,'Pool',randomPolicyLabel(scene.randomPolicy));
  appendSetpiece(box,setpiece);
}

function render(){
  if(!sceneBook||!last)return;
  const nodeId=last.state?.transit?.from||last.state?.node,scene=sceneForNode(sceneBook,nodeId),setpiece=setpieceForNode(sceneBook,nodeId);
  renderPlayer(scene);renderGm(scene,setpiece,nodeId);
}

loadSelemScenes().then(data=>{sceneBook=data;render()}).catch(console.error);
window.addEventListener('maze-state',e=>{last=e.detail;render()});
