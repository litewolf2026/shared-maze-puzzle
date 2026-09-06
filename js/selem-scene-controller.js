import {loadSelemScenes,sceneForNode,randomPolicyLabel} from './selem-scenes.js';

let sceneBook=null,last=null;

function ensurePlayerArrival(){
  let box=document.querySelector('#sceneArrival');
  if(box)return box;
  const shell=document.querySelector('.crawler-shell'),head=shell?.querySelector('.crawler-head');
  if(!shell||!head)return null;
  box=document.createElement('p');
  box.id='sceneArrival';
  box.className='scene-arrival';
  box.hidden=true;
  head.insertAdjacentElement('afterend',box);
  return box;
}

function ensureGmGuide(){
  const gm=document.querySelector('.gm-panel');
  if(!gm)return null;
  let box=document.querySelector('#gmSceneGuide');
  if(box)return box;
  box=document.createElement('section');
  box.id='gmSceneGuide';
  box.className='gm-scene-guide';
  const content=document.querySelector('#gmContent');
  if(content)gm.insertBefore(box,content);else gm.append(box);
  return box;
}

function addRow(box,label,text){
  if(!text)return;
  const row=document.createElement('small');
  const b=document.createElement('b');b.textContent=`${label}: `;
  row.append(b,document.createTextNode(text));
  box.append(row);
}

function renderPlayer(scene){
  const box=ensurePlayerArrival();if(!box)return;
  if(!scene||last?.state?.transit){box.hidden=true;box.textContent='';return}
  box.textContent=scene.playerArrival||'';
  box.hidden=!box.textContent;
}

function renderGm(scene,nodeId){
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
}

function render(){
  if(!sceneBook||!last)return;
  const nodeId=last.state?.transit?.from||last.state?.node;
  const scene=sceneForNode(sceneBook,nodeId);
  renderPlayer(scene);
  renderGm(scene,nodeId);
}

loadSelemScenes().then(data=>{sceneBook=data;render()}).catch(console.error);
window.addEventListener('maze-state',e=>{last=e.detail;render()});
