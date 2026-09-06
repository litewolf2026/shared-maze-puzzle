import {outcomeLabel,actorStatus} from './content-outcomes.js';

let last=null;
const STATUS_LABELS={
  with_party:'bei der Gruppe',secured:'gesichert',evacuated:'aus dem Untergrund gebracht',
  negotiating:'in Verhandlung',ritual_broken:'Ritual gebrochen',surrendered:'festgesetzt / aufgegeben',defeated:'besiegt',escaped:'entkommen',
  bound:'gebunden',driven_off:'vertrieben',destroyed:'vernichtet',repelled:'vorläufig zurückgedrängt'
};

function actorAssignments(state){
  const out=[];
  for(const [nodeId,room] of Object.entries(state?.roomState||{}))for(const a of room?.content?.assignments||[]){if(a?.mechanics?.actorId)out.push({nodeId,assignment:a})}
  return out.sort((a,b)=>String(a.assignment.mechanics.actorId).localeCompare(String(b.assignment.mechanics.actorId)));
}

function ensurePanel(){
  const gm=document.querySelector('.gm-panel');if(!gm)return null;
  let box=document.querySelector('#gmActorStatus');if(box)return box;
  box=document.createElement('section');box.id='gmActorStatus';box.className='gm-actor-status';
  const scene=document.querySelector('#gmSceneGuide');if(scene)gm.insertBefore(box,scene);else gm.append(box);
  return box;
}

function statusText(a,nodeId){
  const explicit=actorStatus(a);if(explicit)return STATUS_LABELS[explicit]||outcomeLabel(a)||explicit;
  if(a.state==='triggered')return `aktiv · Ursprung ${nodeId}`;
  if(a.state==='resolved')return outcomeLabel(a)||'abgeschlossen';
  if(a.state==='discovered')return `bekannt · ${nodeId}`;
  return `noch nicht ausgelöst · ${nodeId}`;
}

function render(){
  const box=ensurePanel();if(!box)return;
  if(!last?.isGm){box.hidden=true;return}
  const actors=actorAssignments(last.state);box.hidden=!actors.length;box.innerHTML='';if(!actors.length)return;
  const title=document.createElement('h4');title.textContent='Kernfiguren';box.append(title);
  for(const {nodeId,assignment:a} of actors){
    const row=document.createElement('div');row.className=`gm-actor-row state-${a.state}`;
    const name=document.createElement('b');name.textContent=a.label;
    const status=document.createElement('small');status.textContent=statusText(a,nodeId);
    row.append(name,status);box.append(row);
  }
}

window.addEventListener('maze-state',e=>{last=e.detail;render()});
