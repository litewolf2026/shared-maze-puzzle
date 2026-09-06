const OUTCOME_POLICIES={
  hazard:[
    {id:'avoided',label:'Umgangen',from:['discovered','triggered'],next:'discovered',terminal:false},
    {id:'neutralized',label:'Entschärft / gesichert',from:['discovered','triggered'],next:'disabled',terminal:true},
    {id:'suffered',label:'Wirkung eingetreten',from:['triggered'],next:'effect',terminal:'mechanics.once'}
  ],
  encounter:[
    {id:'peaceful',label:'Friedlich gelöst',from:['triggered'],next:'resolved',terminal:true},
    {id:'defeated',label:'Besiegt / überwunden',from:['triggered'],next:'resolved',terminal:true},
    {id:'escaped',label:'Begegnung entkommt',from:['triggered'],next:'resolved',terminal:true},
    {id:'party_withdrew',label:'Gruppe zieht sich zurück',from:['triggered'],next:'discovered',terminal:false}
  ],
  event:[{id:'observed',label:'Ereignis abgeschlossen',from:['triggered'],next:'resolved',terminal:true}]
};

function clone(v){return structuredClone(v)}
function policiesFor(assignment){const custom=assignment?.mechanics?.outcomes;return Array.isArray(custom)&&custom.length?custom:(OUTCOME_POLICIES[assignment?.type]||[])}
function policyFor(assignment,outcomeId){return policiesFor(assignment).find(x=>x.id===outcomeId)||null}
function nextState(policy,assignment){if(policy.next!=='effect')return policy.next;return assignment?.mechanics?.once===true?'resolved':'discovered'}

export function outcomeOptions(assignment){
  if(!assignment)return [];
  return policiesFor(assignment).filter(x=>Array.isArray(x.from)&&x.from.includes(assignment.state)).map(x=>({id:x.id,label:x.label,nextState:nextState(x,assignment),terminal:x.terminal==='mechanics.once'?assignment?.mechanics?.once===true:Boolean(x.terminal),actorStatus:x.actorStatus||null}));
}

export function applyContentOutcome(state,nodeId,slotId,outcomeId,{isGm=false}={}){
  const next=clone(state),assignments=next.roomState?.[nodeId]?.content?.assignments;
  if(!Array.isArray(assignments))return {ok:false,state:next,error:'CONTENT_NOT_MATERIALIZED'};
  const index=assignments.findIndex(a=>a.slotId===slotId);if(index<0)return {ok:false,state:next,error:'CONTENT_NOT_FOUND'};
  const assignment=assignments[index];
  if(!isGm)return {ok:false,state:next,error:'CONTENT_OUTCOME_REQUIRES_GM'};
  const policy=policyFor(assignment,outcomeId);if(!policy)return {ok:false,state:next,error:'CONTENT_OUTCOME_UNKNOWN'};
  if(!Array.isArray(policy.from)||!policy.from.includes(assignment.state))return {ok:false,state:next,error:'CONTENT_OUTCOME_INVALID_STATE'};
  const target=nextState(policy,assignment),runtime=clone(assignment.runtime||{}),history=Array.isArray(runtime.outcomes)?runtime.outcomes:[];
  history.push({sequence:history.length+1,outcome:outcomeId,fromState:assignment.state,toState:target,actorStatus:policy.actorStatus||null});
  runtime.outcomes=history;runtime.lastOutcome=outcomeId;runtime.lastOutcomeSequence=history.length;
  if(policy.actorStatus)runtime.actorStatus=policy.actorStatus;
  assignments[index]={...assignment,state:target,runtime};
  return {ok:true,state:next,assignment:assignments[index],outcome:{id:outcomeId,label:policy.label,actorStatus:policy.actorStatus||null}};
}

export function outcomeLabel(assignment){const id=assignment?.runtime?.lastOutcome;if(!id)return '';return policyFor(assignment,id)?.label||id}
export function actorStatus(assignment){return assignment?.runtime?.actorStatus||null}
export function hasOutcomePolicy(type){return Boolean(OUTCOME_POLICIES[type]?.length)}
export function hasCustomOutcomePolicy(assignment){return Array.isArray(assignment?.mechanics?.outcomes)&&assignment.mechanics.outcomes.length>0}
export const CONTENT_OUTCOME_TYPES=Object.freeze(Object.keys(OUTCOME_POLICIES));
