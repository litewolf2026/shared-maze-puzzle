const LABELS={loot:'Beute',hazard:'Gefahr',encounter:'Begegnung',discovery:'Entdeckung',secret:'Geheimnis',secret_connection:'Geheimweg',event:'Ereignis'};
let last=null,catalog={};
fetch('./data/content/catalog.json',{cache:'no-store'}).then(r=>r.json()).then(data=>{catalog=data.items||{};render()}).catch(console.error);

function ensureStyles(){if(document.querySelector('#gmContentStyle'))return;const s=document.createElement('style');s.id='gmContentStyle';s.textContent='.gm-content{margin-top:12px;padding-top:10px;border-top:1px solid #4b3d2d;max-height:330px;overflow:auto}.gm-content h4{margin:0 0 8px;font-size:13px}.gm-content>small{color:#9f9079}.gm-content-item{padding:7px;margin-top:6px;border:1px solid #493b2c;border-radius:8px;background:#120f0c}.gm-content-head{display:flex;gap:7px;align-items:baseline}.gm-content-head span{font-size:9px;text-transform:uppercase;letter-spacing:.1em;color:#b29567}.gm-content-head b{font-size:11px}.gm-content-item>small{display:block;margin-top:4px;color:#8f816d;font-size:9px}.gm-content-desc{margin:6px 0 0;color:#c9baa1;font-size:10px;line-height:1.35}.gm-content-item.state-resolved,.gm-content-item.state-taken{opacity:.5}';document.head.append(s)}
function ensurePanel(){ensureStyles();const gm=document.querySelector('.gm-panel');if(!gm)return null;let box=document.querySelector('#gmContent');if(!box){box=document.createElement('section');box.id='gmContent';box.className='gm-content';gm.append(box)}return box}
function render(){
  const box=ensurePanel();if(!box)return;
  if(!last?.isGm){box.hidden=true;return}box.hidden=false;box.innerHTML='';
  const title=document.createElement('h4');title.textContent='Rauminhalt';box.append(title);
  const nodeId=last.state.transit?.from||last.state.node,content=last.state.roomState?.[nodeId]?.content;
  if(!content?.generated){const p=document.createElement('small');p.textContent='Für diesen Ort ist noch kein Content materialisiert.';box.append(p);return}
  const assignments=content.assignments||[];
  if(!assignments.length){const p=document.createElement('small');p.textContent='Keine erzeugten Inhalte für diesen Ort.';box.append(p);return}
  for(const a of assignments){
    const definition=catalog[a.contentId]||{};
    const item=document.createElement('div');item.className=`gm-content-item type-${a.type} state-${a.state}`;
    const head=document.createElement('div');head.className='gm-content-head';const type=document.createElement('span');type.textContent=LABELS[a.type]||a.type;const name=document.createElement('b');name.textContent=a.label;head.append(type,name);item.append(head);
    const meta=document.createElement('small');meta.textContent=`${a.hidden?'verborgen · ':''}${a.source==='fixed'?'authored':`Pool ${a.source}`} · ${a.state}`;item.append(meta);
    if(definition.description){const desc=document.createElement('p');desc.className='gm-content-desc';desc.textContent=definition.description;item.append(desc)}
    box.append(item);
  }
}
window.addEventListener('maze-state',e=>{last=e.detail;render()});
