const LABELS={loot:'Beute',hazard:'Gefahr',encounter:'Begegnung',discovery:'Entdeckung',secret:'Geheimnis',secret_connection:'Geheimweg',event:'Ereignis'};
let last=null;

function ensurePanel(){
  const gm=document.querySelector('.gm-panel');if(!gm)return null;
  let box=document.querySelector('#gmContent');
  if(!box){box=document.createElement('section');box.id='gmContent';box.className='gm-content';gm.append(box)}
  return box;
}
function button(label,state,node,slot){const b=document.createElement('button');b.textContent=label;b.addEventListener('click',()=>window.dispatchEvent(new CustomEvent('maze-content-action',{detail:{node,slot,state}})));return b}
function render(){
  const box=ensurePanel();if(!box)return;
  if(!last?.isGm){box.hidden=true;return}box.hidden=false;box.innerHTML='';
  const title=document.createElement('h4');title.textContent='Rauminhalt';box.append(title);
  const nodeId=last.state.transit?.from||last.state.node,content=last.state.roomState?.[nodeId]?.content;
  if(!content?.generated){const p=document.createElement('small');p.textContent='Für diesen Ort ist noch kein Content materialisiert.';box.append(p);return}
  const assignments=content.assignments||[];
  if(!assignments.length){const p=document.createElement('small');p.textContent='Keine erzeugten Inhalte für diesen Ort.';box.append(p);return}
  for(const a of assignments){
    const item=document.createElement('div');item.className=`gm-content-item type-${a.type} state-${a.state}`;
    const head=document.createElement('div');head.className='gm-content-head';const type=document.createElement('span');type.textContent=LABELS[a.type]||a.type;const name=document.createElement('b');name.textContent=a.label;head.append(type,name);item.append(head);
    const meta=document.createElement('small');meta.textContent=`${a.hidden?'verborgen · ':''}${a.source==='fixed'?'authored':`Pool ${a.source}`} · ${a.state}`;item.append(meta);
    const actions=document.createElement('div');actions.className='gm-content-actions';
    if(a.state==='unresolved'){actions.append(button(a.hidden?'Aufdecken':'Aktivieren','discovered',nodeId,a.slotId),button('Auslösen','triggered',nodeId,a.slotId))}
    else if(a.type==='loot'&&a.state!=='taken')actions.append(button('Genommen','taken',nodeId,a.slotId));
    if(!['resolved','taken','disabled'].includes(a.state))actions.append(button('Erledigt','resolved',nodeId,a.slotId));
    item.append(actions);box.append(item);
  }
}
window.addEventListener('maze-state',e=>{last=e.detail;render()});
