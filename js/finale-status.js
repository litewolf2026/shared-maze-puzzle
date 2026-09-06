import {actorStatus} from './content-outcomes.js';

const ANCHORS=Object.freeze([
  {id:'socket',label:'Leere Fassung / Entnahmespuren',mechanic:'handoutId',value:'a06-empty-lens'},
  {id:'nottel',label:'Nottels unmittelbare Notizen',mechanic:'handoutId',value:'c10-nottel-notes'},
  {id:'sahira',label:'Sahiras eigenes Richtungsprotokoll',mechanic:'handoutId',value:'c14-sahira-protocol'},
  {id:'hero',label:'Eigener unabhängiger Anker',mechanic:'handoutId',value:'c15-time-anchor-network',runtimeOutcome:'own_anchor_created'}
]);
const RITUAL_LABELS={
  unresolved:'vorbereitet / noch nicht ausgelöst',triggered:'aktiv',resolved:'abgeschlossen',
  destabilized:'destabilisiert',control_recovered:'Sahira hat Teilkontrolle zurückgewonnen',
  broken:'gebrochen',aborted:'abgebrochen',partial_rewrite:'Teilbehauptung vorläufig durchgesetzt'
};
const ACTOR_LABELS={
  with_party:'bei der Gruppe',secured:'gesichert',evacuated:'evakuiert',
  negotiating:'in Verhandlung',ritual_broken:'Ritual gebrochen',surrendered:'aufgegeben / festgesetzt',defeated:'besiegt',escaped:'entkommen',
  bound:'gebunden',driven_off:'vertrieben',destroyed:'vernichtet',repelled:'vorläufig zurückgedrängt'
};

export function allAssignments(state){
  const out=[];for(const [nodeId,room] of Object.entries(state?.roomState||{}))for(const assignment of room?.content?.assignments||[])out.push({nodeId,assignment});return out;
}
export function assignmentByMechanic(state,key,value){return allAssignments(state).find(x=>x.assignment?.mechanics?.[key]===value)||null}
export function actorAssignment(state,actorId){return assignmentByMechanic(state,'actorId',actorId)}
export function ritualAssignment(state){return assignmentByMechanic(state,'ritualId','sahira-rewrite')}
function securedAssignment(row,def){
  if(!row||['unresolved','disabled'].includes(row.assignment?.state))return false;
  if(def.runtimeOutcome)return row.assignment?.runtime?.lastOutcome===def.runtimeOutcome;
  return true;
}

export function finaleAnchorRows(state){
  return ANCHORS.map(def=>{const row=assignmentByMechanic(state,def.mechanic,def.value);return {...def,nodeId:row?.nodeId||null,secured:securedAssignment(row,def),state:row?.assignment?.state||'missing',runtimeOutcome:row?.assignment?.runtime?.lastOutcome||null}});
}
export function ritualStatus(state){
  const row=ritualAssignment(state);if(!row)return {present:false,id:'missing',label:'noch nicht materialisiert',terminal:false,nodeId:null};
  const a=row.assignment,last=a.runtime?.lastOutcome||null,id=last||a.state;
  return {present:true,id,label:RITUAL_LABELS[id]||id,terminal:a.state==='resolved',nodeId:row.nodeId,assignment:a};
}
export function finaleActorStatus(state,actorId){
  const row=actorAssignment(state,actorId);if(!row)return {present:false,id:'missing',label:'noch nicht materialisiert',nodeId:null};
  const status=actorStatus(row.assignment),id=status||row.assignment.state;
  return {present:true,id,label:ACTOR_LABELS[id]||id,nodeId:row.nodeId,assignment:row.assignment};
}

export function finaleSignals(state){
  const anchors=finaleAnchorRows(state),byId=Object.fromEntries(anchors.map(a=>[a.id,a]));
  const ritual=ritualStatus(state),nachzehrer=finaleActorStatus(state,'nachzehrer'),sahira=finaleActorStatus(state,'sahira'),nottel=finaleActorStatus(state,'nottel');
  const historicalChain=Boolean(byId.socket?.secured&&byId.nottel?.secured);
  const ritualStopped=['broken','aborted'].includes(ritual.id);
  const nachzehrerControlled=['bound','driven_off','destroyed'].includes(nachzehrer.id);
  return {
    available:ritual.present,
    ritual,nachzehrer,sahira,nottel,anchors,
    anchorCount:anchors.filter(a=>a.secured).length,
    historicalChain,ritualStopped,nachzehrerControlled,
    signals:[
      {id:'historical-chain',label:'Ablauf von Entnahme bis Nottels Untersuchung belastbar',met:historicalChain},
      {id:'ritual-stopped',label:'Umschreibungsritual gebrochen oder abgebrochen',met:ritualStopped},
      {id:'nachzehrer-controlled',label:'Nachzehrer gebunden, vertrieben oder vernichtet',met:nachzehrerControlled}
    ]
  };
}
