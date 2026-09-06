import {checksForAssignment,formatCheck} from './dsa41-exploration.js';
import {hazardGuidanceRows} from './dsa41-hazards.js';
import {encounterGuidanceRows} from './dsa41-encounters.js';
import {lootGuidanceRows} from './dsa41-loot.js';
import {reusableDefinition} from './reusable-content-pack.js';
import {outcomeOptions,outcomeLabel} from './content-outcomes.js';
const LABELS={loot:'Beute',hazard:'Gefahr',encounter:'Begegnung',discovery:'Entdeckung',secret:'Geheimnis',secret_connection:'Geheimweg',event:'Ereignis'};
const STATE_LABELS={unresolved:'offen',discovered:'entdeckt',triggered:'aktiv',opened:'geöffnet',resolved:'erledigt',taken:'Inventar',disabled:'deaktiviert'};
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

function ensurePanel(){const gm=document.querySelector('.gm-panel');if(!gm)return null;let box=document.querySelector('#gmContent');if(!box){box=document.createElement('section');box.id='gmContent';box.className='gm-content';gm.append(box)}return box}
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
function contentSummary(a,tableManaged,locked){
  const summary=document.createElement('summary');summary.className='gm-content-summary';
  const type=document.createElement('span');type.className=`gm-content-type type-${a.type}`;type.textContent=LABELS[a.type]||a.type;
  const name=document.createElement('b');name.textContent=a.label;
  const status=document.createElement('em');status.textContent=locked?'gesperrt':tableManaged?'Spieltisch':STATE_LABELS[a.state]||a.state;
  summary.append(type,name,status);return summary;
}
function render(){
  const box=ensurePanel();if(!box)return;if(!last?.isGm){box.hidden=true;return}box.hidden=false;box.innerHTML='';
  const nodeId=last.state.transit?.from||last.state.node,content=last.state.roomState?.[nodeId]?.content;
  const title=document.createElement('h4');title.className='gm-section-title';title.textContent='Rauminhalt';box.append(title);
  if(!content?.generated){const p=document.createElement('small');p.className='gm-empty';p.textContent='Für diesen Ort ist noch kein Content materialisiert.';box.append(p);return}
  const assignments=content.assignments||[];title.dataset.count=String(assignments.length);
  if(!assignments.length){const p=document.createElement('small');p.className='gm-empty';p.textContent='Keine erzeugten Inhalte für diesen Ort.';box.append(p);return}
  const bySlot=new Map(assignments.map(a=>[a.slotId,a]));
  for(const a of assignments){
    const tableManaged=TABLE_MANAGED_CONTENT.has(a.contentId),parent=a.lockedBy?bySlot.get(a.lockedBy):null,locked=Boolean(parent&&!OPEN_STATES.has(parent.state)),definition=definitionFor(a);
    const item=document.createElement('details');item.className=`gm-content-item type-${a.type} ${tableManaged?'state-table':`state-${a.state}`}${locked?' payload-locked':''}`;item.open=a.state==='triggered';
    item.append(contentSummary(a,tableManaged,locked));
    const body=document.createElement('div');body.className='gm-content-body';item.append(body);
    const meta=document.createElement('small');meta.className='gm-content-meta';meta.textContent=tableManaged?`${a.source==='fixed'?'authored':`Pool ${a.source}`} · Spieltisch-Szene · ${anchorLabel(a.anchor)}`:`${a.hidden?'verborgen · ':''}${a.source==='fixed'?'authored':`Pool ${a.source}`} · ${STATE_LABELS[a.state]||a.state} · ${anchorLabel(a.anchor)}${locked?` · hinter ${parent?.label||a.lockedBy} verborgen`:''}`;body.append(meta);
    const description=definition.description||a.description;if(description){const desc=document.createElement('p');desc.className='gm-content-desc';desc.textContent=description;body.append(desc)}
    appendChecks(body,a,definition);appendMechanics(body,a,definition);appendHazardGuidance(body,a,definition);appendEncounterGuidance(body,a,definition);appendLootGuidance(body,a,definition);
    if(tableManaged){appendTableNote(body);box.append(item);continue}
    appendOutcomeHistory(body,a);
    if(!TERMINAL.has(a.state)&&!locked){
      const actions=document.createElement('div');actions.className='gm-content-actions';
      if(a.state==='unresolved')actions.append(actionButton(discoverButtonLabel(a,definition),nodeId,a.slotId,'discover'));
      if(a.type==='secret_connection'&&a.state==='discovered')actions.append(actionButton('Feinmechanik gelungen → öffnen',nodeId,a.slotId,'open'));
      if(a.type==='secret'&&a.state==='discovered')actions.append(actionButton('Öffnen → Inhalt freilegen',nodeId,a.slotId,'open'));
      if(['hazard','encounter','event'].includes(a.type)&&['unresolved','discovered'].includes(a.state))actions.append(actionButton('Auslösen',nodeId,a.slotId,'trigger'));
      if(a.type==='loot'&&a.state==='discovered')actions.append(actionButton('Ins Inventar',nodeId,a.slotId,'take'));
      const structured=appendOutcomeButtons(actions,a,nodeId);
      if(a.state==='opened')actions.append(actionButton('Offen lassen / erledigt',nodeId,a.slotId,'resolve'));
      else if(!['secret_connection','secret'].includes(a.type)&&!structured)actions.append(actionButton('Erledigt',nodeId,a.slotId,'resolve'),actionButton('Deaktivieren',nodeId,a.slotId,'disable'));
      body.append(actions);
    }
    box.append(item);
  }
}
window.addEventListener('maze-state',e=>{last=e.detail;render()});
