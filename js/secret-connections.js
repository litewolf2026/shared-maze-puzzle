export const SECRET_OPEN_STATES=['opened','resolved'];

function clone(value){return structuredClone(value)}
function assignmentFor(state,nodeId,slotId){return state?.roomState?.[nodeId]?.content?.assignments?.find?.(a=>a.slotId===slotId)||null}

export function secretConnectionStatus(state,nodeId,slotId){
  const assignment=assignmentFor(state,nodeId,slotId);
  if(!assignment)return {exists:false,discovered:false,opened:false,state:null};
  return {
    exists:assignment.type==='secret_connection',
    discovered:['discovered','opened','resolved'].includes(assignment.state),
    opened:SECRET_OPEN_STATES.includes(assignment.state),
    state:assignment.state
  };
}

export function openSecretConnection(state,nodeId,slotId,{isGm=false}={}){
  const next=clone(state),assignments=next.roomState?.[nodeId]?.content?.assignments;
  if(!Array.isArray(assignments))return {ok:false,state:next,error:'CONTENT_NOT_MATERIALIZED'};
  const index=assignments.findIndex(a=>a.slotId===slotId);if(index<0)return {ok:false,state:next,error:'CONTENT_NOT_FOUND'};
  const assignment=assignments[index];
  if(assignment.type!=='secret_connection')return {ok:false,state:next,error:'NOT_SECRET_CONNECTION'};
  if(!isGm)return {ok:false,state:next,error:'CONTENT_ACTION_FORBIDDEN'};
  if(SECRET_OPEN_STATES.includes(assignment.state))return {ok:false,state:next,error:'ALREADY_OPEN'};
  if(assignment.state!=='discovered')return {ok:false,state:next,error:'MUST_DISCOVER_FIRST'};
  assignments[index]={...assignment,state:'opened'};
  return {ok:true,state:next,assignment:assignments[index]};
}

export function resolveOpenedSecretConnection(state,nodeId,slotId,{isGm=false}={}){
  const next=clone(state),assignments=next.roomState?.[nodeId]?.content?.assignments;
  if(!Array.isArray(assignments))return {ok:false,state:next,error:'CONTENT_NOT_MATERIALIZED'};
  const index=assignments.findIndex(a=>a.slotId===slotId);if(index<0)return {ok:false,state:next,error:'CONTENT_NOT_FOUND'};
  const assignment=assignments[index];
  if(assignment.type!=='secret_connection'||!isGm)return {ok:false,state:next,error:'CONTENT_ACTION_FORBIDDEN'};
  if(assignment.state!=='opened')return {ok:false,state:next,error:'NOT_OPEN'};
  assignments[index]={...assignment,state:'resolved'};
  return {ok:true,state:next,assignment:assignments[index]};
}
