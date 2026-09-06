import {checksForAssignment,formatCheck} from './dsa41-exploration.js';
import {hazardGuidanceRows} from './dsa41-hazards.js';
import {encounterGuidanceRows} from './dsa41-encounters.js';
import {lootGuidanceRows} from './dsa41-loot.js';
import {reusableDefinition} from './reusable-content-pack.js';
import {outcomeOptions,outcomeLabel} from './content-outcomes.js';
const LABELS={loot:'Beute',hazard:'Gefahr',encounter:'Begegnung',discovery:'Entdeckung',secret:'Geheimnis',secret_connection:'Geheimweg',event:'Ereignis'};
const TERMINAL=new Set(['taken','resolved','disabled']);
const OPEN_STATES=new Set(['opened','resolved']);
const TABLE_MANAGED_CONTENT=new Set(['selem_nottel_witness','selem_sahira_antagonist','selem_nachzehrer','selem_sahira_rewrite_ritual']);
let last=null,catalog={},rules=null,hazardRules=null,encounterRules=null,lootRules=null;
Promise.all([
  fetch('./data/content/catalog.json',{cache:'no-store'}).then(r=>r.json()),
  fetch('./data/rules/dsa41-exploration.json',{cache:'no-store'}).then(r=>r.json()),
  fetch('./data/rules/dsa41-hazards.json',{cache:'no-store'}).then(r=>r.json()),
  fetch('./data/rules/dsa41-encounters.json',{cache:'no-store'}).then(r=>r.json()),
  fetch('./data/rules/dsa41-loot.json',{cache:'no-store'}).then(r=>r.json())
]).then(([data,r,h,e,l])=>{catalog=data.items||{};rules=r;hazardRules=h;encounterRules=e;lootRules=l;render()}).catch(console.error);

function ensureStyles(){if(document.querySelector('#gmContentStyle'))return;const s=document.createElement('style');s.id='gmContentStyle';s.textContent='.gm-content{margin-top:12px;padding-top:10px;border-top:1px solid #4b3d2d;max-height:430px;overflow:auto}.gm-content h4{margin:0 0 8px;font-size:13px}.gm-content>small{color:#9f9079}.gm-content-item{padding:7px;margin-top:6px;border:1px solid #493b2c;border-radius:8px;background:#120f0c}.gm-content-head{display:flex;gap:7px;align-items:baseline}.gm-content-head span{font-size:9px;text-transform:uppercase;letter-spacing:.1em;color:#b29567}.gm-content-head b{font-size:11px}.gm-content-item>small{display:block;margin-top:4px;color:#8f816d;font-size:9px}.gm-content-item.payload-locked{opacity:.72;border-style:dashed}.gm-content-desc{margin:6px 0 0;color:#c9baa1;font-size:10px;line-height:1.35}.gm-content-checks,.gm-content-mechanics,.gm-content-outcome,.gm-content-hazard,.gm-content-encounter,.gm-content-loot{display:grid;gap:3px;margin-top:6px;padding:5px 6px;border-left:2px solid #7b684a;background:#17120d}.gm-content-checks small,.gm-content-mechanics small,.gm-content-outcome small,.gm-content-hazard small,.gm-content-encounter small,.gm-content-loot small{font-size:9px;line-height:1.3;color:#c9b894}.gm-content-checks b,.gm-content-mechanics b,.gm-content-outcome b,.gm-content-hazard b,.gm-content-encounter b,.gm-content-loot b{color:#dfc796}.gm-content-mechanics{border-left-color:#6d5842}.gm-content-outcome{border-left-color:#86704e}.gm-content-hazard{border-left-color:#9b6848;background:#1b120d}.gm-content-hazard .project-convention{color:#d5a778}.gm-content-encounter{border-left-color:#536f69;background:#101817}.gm-content-encounter .project-convention{color:#9cc9bf}.gm-content-loot{border-left-color:#6c618b;background:#14121c}.gm-content-loot .project-convention{color:#b9acd9}.gm-content-table-note{display:block;margin-top:7px;padding:6px;border-left:2px solid #806a49;background:#19140e;color:#c9b894;font-size:9px;line-height:1.35}.gm-content-actions{display:flex;flex-wrap:wrap;gap:5px;margin-top:7px}.gm-content-actions button{padding:4px 7px!important;font-size:9px!important;min-height:0!important}.gm-content-outcomes button{border-color:#6f5d43!important;background:#20180f!important}.gm-content-item.state-opened{border-color:#7b6a46;background:#19150f}.gm-content-item.state-resolved,.gm-content-item.state-taken,.gm-content-item.state-disabled{opacity:.58}';document.head.append(s)}
function ensurePanel(){ensureStyles();const gm=document.querySelector('.gm-panel');if(!gm)return null;let box=document.querySelector('#gmContent');if(!box){box=document.createElement('section');box.id='gmContent';box.className='gm-content';gm.append(box)}return box}
function actionButton(label,node,slot,action){const b=document.createElement('button');b.textContent=label;b.addEventListener('click',()=>window.dispatchEvent(new CustomEvent('maze-content-action',{detail:{node,slot,action}})));return b}
function anchorLabel(a){if(!a)return 'abstrakt';if(a.kind==='feature')return `Anker ${a.anchorId}`;return `Feld ${a.x+1}/${a.y+1}`}
function definitionFor(a){return catalog[a.contentId]||reusableDefinition(a.contentId)||{description:a.description||'',mechanics:a.mechanics||null,placement:{features:a.placement||[]}}}
function appendRows(item,className,rows,{projectLabel='Einordnung'}={}){if(!rows.length)return;const box=document.createElement('div');box.className=className;for(const [label,text] of rows){const row=document.createElement('small');if(label===projectLabel&&String(text).startsWith('Projekt'))row.className='project-convention';const b=document.createElement('b');b.textContent=`${label}: `;row.append(b,document.createTextNode(text));box.append(row)}item.append(box)}
function appendChecks(item,a,definition){if(!rules)return;const checks=checksForAssignment(a,definition,rules),rows=[];if(checks.discovery)rows.push(['Entdecken',formatCheck(checks.discovery)]);if(checks.warning)rows.push(['Warnung',`${formatCheck(checks.warning)} · warnt nur vor unmittelbarer Gefahr`]);if(checks.mechanical)rows.push(['Mechanik',formatCheck(checks.mechanical,{includeAlternate:false})]);appendRows(item,'gm-content-checks',rows)}
function prettyToken(value){return String(value||'').replaceAll('_',' ')}
function appendMechanics(item,a,definition){const m=definition?.mechanics||a.mechanics;if(!m||typeof m!=='object')return;const rows=[];if(m.trigger)rows.push(['Auslöser',prettyToken(m.trigger)]);if(m.resolution)rows.push(['Auflösung',prettyToken(m.resolution)]);if(m.category)rows.push(['Kategorie',prettyToken(m.category)]);if(m.stance)rows.push(['Haltung',prettyToken(m.stance)]);if(a.type!=='loot'&&Number.isFinite(Number(m.valueTier)))rows.push(['Wertstufe',String(m.valueTier)]);if(Array.isArray(m.effectTags)&&m.effectTags.length)rows.push(['Folgen',m.effectTags.map(prettyToken).join(', ')]);if(Array.isArray(m.informationTags)&&m.informationTags.length)rows.push(['Hinweis',m.informationTags.map(prettyToken).join(', ')]);if(m.once===true)rows.push(['Persistenz','einmalig']);else if(m.repeatable===true)rows.push(['Persistenz','wiederholbar']);appendRows(item,'gm-content-mechanics',rows)}
function appendHazardGuidance(item,a,definition){if(a.type==='hazard'&&hazardRules&&rules)appendRows(item,'gm-content-hazard',hazardGuidanceRows(a,definition,hazardRules,rules))}
function appendEncounterGuidance(item,a,definition){if(a.type==='encounter'&&encounterRules)appendRows(item,'gm-content-encounter',encounterGuidanceRows(a,definition,encounterRules))}
function appendLootGuidance(item,a,definition){if(a.type==='loot'&&lootRules)appendRows(item,'gm-content-loot',lootGuidanceRows(a,definition,lootRules))}
function appendOutcomeHistory(item,a){const label=outcomeLabel(a),history=a.runtime?.outcomes;if(!label&&!Array.isArray(history))return;const box=document.createElement('div');box.className='gm-content-outcome';const row=document.createElement('small');row.innerHTML=`<b>Letztes Ergebnis:</b> ${label||'—'}${Array.isArray(history)?` · ${history.length} Eintrag${history.length===1?'':'e'}`:''}`;box.append(row);item.append(box)}
function appendTableNote(item){const note=document.createElement('small');note.className='gm-content-table-note';note.textContent='Am Spieltisch ausspielen. Der Crawler verwaltet für diese Figur bzw. dieses Finale weder Status noch Ergebnis.';item.append(note)}
function discoverButtonLabel(a,definition){if(!rules)return a.hidden?'Aufdecken':'Als entdeckt';const check=checksForAssignment(a,definition,rules).discovery;if(!check)return a.hidden?'Aufdecken':'Als entdeckt';const mod=check.modifier>0?` +${check.modifier}`:check.modifier<0?` ${check.modifier}`:'';return `Probe gelungen → entdeckt${mod}`}
function appendOutcomeButtons(actions,a,nodeId){const options=outcomeOptions(a);if(!options.length)return false;actions.classList.add('gm-content-outcomes');for(const option of options)actions.append(actionButton(option.label,nodeId,a.slotId,`outcome:${option.id}`));return true}
function render(){
  const box=ensurePanel();if(!box)return;if(!last?.isGm){box.hidden=true;return}box.hidden=false;box.innerHTML='';
  const title=document.createElement('h4');title.textContent='Rauminhalt';box.append(title);
  const nodeId=last.state.transit?.from||last.state.node,content=last.state.roomState?.[nodeId]?.content;
  if(!content?.generated){const p=document.createElement('small');p.textContent='Für diesen Ort ist noch kein Content materialisiert.';box.append(p);return}
  const assignments=content.assignments||[];if(!assignments.length){const p=document.createElement('small');p.textContent='Keine erzeugten Inhalte für diesen Ort.';box.append(p);return}
  const bySlot=new Map(assignments.map(a=>[a.slotId,a]));
  for(const a of assignments){
    const tableManaged=TABLE_MANAGED_CONTENT.has(a.contentId);
    const parent=a.lockedBy?bySlot.get(a.lockedBy):null,locked=Boolean(parent&&!OPEN_STATES.has(parent.state));
    const definition=definitionFor(a),item=document.createElement('div');item.className=`gm-content-item type-${a.type} ${tableManaged?'state-table':`state-${a.state}`}${locked?' payload-locked':''}`;
    const head=document.createElement('div');head.className='gm-content-head';const type=document.createElement('span');type.textContent=LABELS[a.type]||a.type;const name=document.createElement('b');name.textContent=a.label;head.append(type,name);item.append(head);
    const meta=document.createElement('small');meta.textContent=tableManaged?`${a.source==='fixed'?'authored':`Pool ${a.source}`} · Spieltisch-Szene · ${anchorLabel(a.anchor)}`:`${a.hidden?'verborgen · ':''}${a.source==='fixed'?'authored':`Pool ${a.source}`} · ${a.state} · ${anchorLabel(a.anchor)}${locked?` · hinter ${parent?.label||a.lockedBy} verborgen`:''}`;item.append(meta);
    const description=definition.description||a.description;if(description){const desc=document.createElement('p');desc.className='gm-content-desc';desc.textContent=description;item.append(desc)}
    appendChecks(item,a,definition);appendMechanics(item,a,definition);appendHazardGuidance(item,a,definition);appendEncounterGuidance(item,a,definition);appendLootGuidance(item,a,definition);
    if(tableManaged){appendTableNote(item);box.append(item);continue}
    appendOutcomeHistory(item,a);
    if(!TERMINAL.has(a.state)&&!locked){
      const actions=document.createElement('div');actions.className='gm-content-actions';
      if(a.state==='unresolved')actions.append(actionButton(discoverButtonLabel(a,definition),nodeId,a.slotId,'discover'));
      if(a.type==='secret_connection'&&a.state==='discovered')actions.append(actionButton('Feinmechanik gelungen → öffnen',nodeId,a.slotId,'open'));
      if(a.type==='secret'&&a.state==='discovered')actions.append(actionButton('Öffnen → Inhalt freilegen',nodeId,a.slotId,'open'));
      if(['hazard','encounter','event'].includes(a.type)&&['unresolved','discovered'].includes(a.state))actions.append(actionButton('Auslösen',nodeId,a.slotId,'trigger'));
      if(a.type==='loot'&&a.state==='discovered')actions.append(actionButton('Genommen',nodeId,a.slotId,'take'));
      const structured=appendOutcomeButtons(actions,a,nodeId);
      if(a.state==='opened')actions.append(actionButton('Offen lassen / erledigt',nodeId,a.slotId,'resolve'));
      else if(!['secret_connection','secret'].includes(a.type)&&!structured)actions.append(actionButton('Erledigt',nodeId,a.slotId,'resolve'),actionButton('Deaktivieren',nodeId,a.slotId,'disable'));
      item.append(actions);
    }
    box.append(item);
  }
}
window.addEventListener('maze-state',e=>{last=e.detail;render()});
