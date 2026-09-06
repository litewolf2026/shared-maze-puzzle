import {finaleSignals} from './finale-status.js';

let last=null;

function ensurePanel(){
  const gm=document.querySelector('.gm-panel');if(!gm)return null;
  let box=document.querySelector('#gmFinaleStatus');if(box)return box;
  box=document.createElement('section');box.id='gmFinaleStatus';box.className='gm-finale-status';
  const actors=document.querySelector('#gmActorStatus'),scene=document.querySelector('#gmSceneGuide');
  if(actors)actors.insertAdjacentElement('afterend',box);else if(scene)gm.insertBefore(box,scene);else gm.append(box);
  return box;
}
function row(label,value,className=''){
  const el=document.createElement('div');el.className=`gm-finale-row ${className}`.trim();const b=document.createElement('b');b.textContent=label;const s=document.createElement('small');s.textContent=value;el.append(b,s);return el;
}
function render(){
  const box=ensurePanel();if(!box)return;
  if(!last?.isGm){box.hidden=true;return}
  const model=finaleSignals(last.state);if(!model.available){box.hidden=true;box.innerHTML='';return}
  box.hidden=false;box.innerHTML='';
  const h=document.createElement('h4');h.textContent='Finale · Ritual & Zeitanker';box.append(h);
  box.append(row('Umschreibungsritual',model.ritual.label,`ritual-${model.ritual.id}`));
  box.append(row('Sahira',model.sahira.label));box.append(row('Nachzehrer',model.nachzehrer.label));

  const ah=document.createElement('b');ah.className='gm-finale-subhead';ah.textContent=`Belastbare Gegenanker · ${model.anchorCount}/${model.anchors.length}`;box.append(ah);
  for(const anchor of model.anchors)box.append(row(anchor.label,anchor.secured?'gesichert':'noch nicht gesichert',anchor.secured?'anchor-secured':'anchor-open'));
  const note=document.createElement('small');note.className='gm-finale-note';note.textContent='Die Zahl ist kein Siegwert und keine Probe. Sie zeigt nur, welche unabhängigen Belege derzeit im gemeinsamen Zustand gesichert sind.';box.append(note);

  const sh=document.createElement('b');sh.className='gm-finale-subhead';sh.textContent='Erfolgssignale · nicht automatisch';box.append(sh);
  for(const signal of model.signals)box.append(row(signal.met?'✓':'○',signal.label,signal.met?'signal-met':'signal-open'));

  if(model.ritual.id==='partial_rewrite'){const n=document.createElement('small');n.className='gm-finale-warning';n.textContent='Teilbehauptung bedeutet lokalen Schaden / neuen Kampagnendruck – keinen automatischen Total-Retcon.';box.append(n)}
}

window.addEventListener('maze-state',e=>{last=e.detail;render()});
