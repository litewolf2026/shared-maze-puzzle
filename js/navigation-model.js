export const HORIZONTAL_DIRS=['N','NE','E','SE','S','SW','W','NW'];
export const OPP={N:'S',NE:'SW',E:'W',SE:'NW',S:'N',SW:'NE',W:'E',NW:'SE',UP:'DOWN',DOWN:'UP'};
const SOLUTION_SOURCES=new WeakMap();
const ROOM_DECISION_KINDS=new Set(['room','lens','prison','goal','gate']);

export function edgeKey(from,dir){return `${from}:${dir}`}
function clone(value){return structuredClone(value)}
export function nodeById(map,id){return map.nodes.find(n=>n.id===id)||null}

export function edgeCells(map,from,dir,to){
  const meta=map.edgeMeta?.[edgeKey(from,dir)]||map.edgeMeta?.[`${from}:${dir}:${to}`];
  if(Number.isInteger(meta?.cells)&&meta.cells>0)return meta.cells;
  if(dir==='UP'||dir==='DOWN')return 1;
  const a=nodeById(map,from),b=nodeById(map,to);if(!a||!b)return 1;
  const d=Math.hypot((b.x??0)-(a.x??0),(b.y??0)-(a.y??0));
  return Math.max(1,Math.round(d/(map.displayUnitsPerGridCell||2.4)));
}

export function buildAdj(map){
  const adj=new Map(map.nodes.map(n=>[n.id,{}]));
  for(const [from,dir,to] of map.edges){
    if(!adj.has(from)||!adj.has(to))continue;
    const cells=edgeCells(map,from,dir,to),existing=adj.get(from)[dir];
    if(existing&&existing.to!==to)throw new Error(`Conflicting edge ${from}/${dir}: ${existing.to} vs ${to}`);
    adj.get(from)[dir]={from,dir,to,cells};
    const reverse=OPP[dir];
    if(reverse&&!adj.get(to)[reverse])adj.get(to)[reverse]={from:to,dir:reverse,to:from,cells};
  }
  return adj;
}

function solutionSourceNodes(map){
  if(SOLUTION_SOURCES.has(map))return SOLUTION_SOURCES.get(map);
  const set=new Set(),adj=buildAdj(map);let node=map.start;
  for(const dir of map.solution||[]){set.add(node);const edge=adj.get(node)?.[dir];if(!edge)break;node=edge.to}
  SOLUTION_SOURCES.set(map,set);return set;
}

export function isDecisionNode(map,nodeId){
  const node=nodeById(map,nodeId);if(!node)return false;
  if(typeof node.decision==='boolean')return node.decision;
  if(solutionSourceNodes(map).has(nodeId))return true;
  if(ROOM_DECISION_KINDS.has(node.kind))return true;
  return Object.keys(buildAdj(map).get(nodeId)||{}).length>=3;
}

export function initialSharedState(map){return {node:map.start,bandStep:0,step:0,decisionHistory:[],pathHistory:[],history:[],transit:null,visited:[map.start],discovered:[],roomState:{},partyFacing:HORIZONTAL_DIRS.includes(map.solution?.[0])?map.solution[0]:'N',updated_at:null}}

export function normalizeSharedState(input,map){
  const base=initialSharedState(map),state={...base,...clone(input||{})};
  if(!Array.isArray(state.decisionHistory))state.decisionHistory=Array.isArray(state.history)?clone(state.history):[];
  if(!Array.isArray(state.pathHistory))state.pathHistory=Array.isArray(state.history)?clone(state.history):[];
  if(!Array.isArray(state.visited))state.visited=[map.start];if(!Array.isArray(state.discovered))state.discovered=[];
  if(!state.roomState||typeof state.roomState!=='object'||Array.isArray(state.roomState))state.roomState={};
  if(!Number.isInteger(state.bandStep))state.bandStep=Number.isInteger(state.step)?state.step:state.decisionHistory.length;
  state.step=state.bandStep;state.history=clone(state.decisionHistory);
  if(!nodeById(map,state.node))state.node=map.start;if(!HORIZONTAL_DIRS.includes(state.partyFacing))state.partyFacing='N';
  if(state.transit&&typeof state.transit==='object'){
    const t=state.transit;if(!nodeById(map,t.from)||!nodeById(map,t.to)||!OPP[t.dir]||!Number.isInteger(t.cells)||!Number.isInteger(t.progress)||t.cells<1||t.progress<0||t.progress>t.cells)state.transit=null;
  }else state.transit=null;
  return state;
}

function finalizeState(state){state.step=state.bandStep;state.history=clone(state.decisionHistory);state.updated_at=new Date().toISOString();return state}
function markFacing(state,dir){if(HORIZONTAL_DIRS.includes(dir))state.partyFacing=dir}
function matchesDecision(decision,from,dir,to){return Boolean(decision&&decision.from===from&&decision.dir===dir&&decision.to===to)}
function completeForwardTransit(state){const t=state.transit;state.node=t.to;state.pathHistory.push({from:t.from,dir:t.dir,to:t.to});if(!state.visited.includes(t.to))state.visited.push(t.to);state.transit=null}
function completeRewindTransit(state){const t=state.transit,lastPath=state.pathHistory.at(-1);if(lastPath&&lastPath.from===t.to&&lastPath.to===t.from&&OPP[lastPath.dir]===t.dir)state.pathHistory.pop();const lastDecision=state.decisionHistory.at(-1);if(lastDecision&&lastDecision.from===t.to&&lastDecision.to===t.from&&OPP[lastDecision.dir]===t.dir){state.decisionHistory.pop();state.bandStep=Math.max(0,state.bandStep-1)}state.node=t.to;state.transit=null}
function cancelForwardTransit(state){const t=state.transit;if(t?.decisionAdded){const last=state.decisionHistory.at(-1);if(matchesDecision(last,t.from,t.dir,t.to)){state.decisionHistory.pop();state.bandStep=Math.max(0,state.bandStep-1)}}state.transit=null}

export function availableDirections(map,input){const state=normalizeSharedState(input,map);if(state.transit)return [state.transit.dir,OPP[state.transit.dir]].filter(Boolean);return Object.keys(buildAdj(map).get(state.node)||{})}
export function advanceTransit(map,input,dir){
  const state=normalizeSharedState(input,map),t=state.transit;if(!t)return {ok:false,state,error:'NOT_IN_TRANSIT'};const reverse=OPP[t.dir];if(dir!==t.dir&&dir!==reverse)return {ok:false,state,error:'TRANSIT_DIRECTION_BLOCKED'};
  if(dir===t.dir){t.progress+=1;markFacing(state,dir);if(t.progress>=t.cells){if(t.rewind)completeRewindTransit(state);else completeForwardTransit(state)}return {ok:true,state:finalizeState(state),event:'TRANSIT_STEP'}}
  t.progress-=1;markFacing(state,dir);if(t.progress<=0){if(t.rewind){state.node=t.from;state.transit=null}else cancelForwardTransit(state)}return {ok:true,state:finalizeState(state),event:'TRANSIT_BACKSTEP'};
}

export function beginMove(map,input,dir){
  let state=normalizeSharedState(input,map);if(state.transit)return advanceTransit(map,state,dir);const edge=buildAdj(map).get(state.node)?.[dir];if(!edge)return {ok:false,state,error:'NO_EXIT'};
  const lastPath=state.pathHistory.at(-1),rewinding=Boolean(lastPath&&lastPath.to===state.node&&lastPath.from===edge.to&&OPP[lastPath.dir]===dir);let decisionAdded=false;
  if(!rewinding&&isDecisionNode(map,state.node)){
    if(state.bandStep>=map.solution.length)return {ok:false,state,error:'BAND_EXHAUSTED'};
    state.decisionHistory.push({from:edge.from,dir:edge.dir,to:edge.to,stepBefore:state.bandStep});state.bandStep+=1;decisionAdded=true;
  }
  state.transit={from:edge.from,to:edge.to,dir:edge.dir,cells:edge.cells,progress:0,rewind:rewinding,decisionAdded};state=advanceTransit(map,state,dir).state;
  return {ok:true,state,event:rewinding?'REWIND_STARTED':decisionAdded?'DECISION_TAKEN':'TRANSIT_STARTED'};
}

export function gmUndoDecision(map,input){
  const state=normalizeSharedState(input,map);
  if(state.transit){if(state.transit.decisionAdded){const last=state.decisionHistory.at(-1);if(matchesDecision(last,state.transit.from,state.transit.dir,state.transit.to)){state.decisionHistory.pop();state.bandStep=Math.max(0,state.bandStep-1)}}state.node=state.transit.from;state.transit=null;return {ok:true,state:finalizeState(state)}}
  const decision=state.decisionHistory.at(-1);if(!decision)return {ok:false,state,error:'NO_DECISION'};state.decisionHistory.pop();state.bandStep=Math.max(0,state.bandStep-1);
  while(state.pathHistory.length){const p=state.pathHistory.pop();if(p.from===decision.from&&p.dir===decision.dir&&p.to===decision.to)break}state.node=decision.from;return {ok:true,state:finalizeState(state)};
}

export function locationLabel(map,input){const state=normalizeSharedState(input,map);if(!state.transit)return nodeById(map,state.node)?.name||state.node;const t=state.transit,meters=t.progress*(map.gridSizeMeters||3),total=t.cells*(map.gridSizeMeters||3);return `Im Gang ${t.dir} · ${meters}/${total} m`}
