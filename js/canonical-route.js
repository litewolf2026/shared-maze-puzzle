import {buildAdj,OPP} from './navigation-model.js';

function sameEdge(a,b){return Boolean(a&&b&&a.from===b.from&&a.dir===b.dir&&a.to===b.to)}

export function canonicalPhysicalPath(map){
  if(Array.isArray(map?.canonicalPath)&&map.canonicalPath.length>=2)return [...map.canonicalPath];
  const adj=buildAdj(map),path=[map.start];let node=map.start;
  for(const dir of map.solution||[]){const edge=adj.get(node)?.[dir];if(!edge)break;node=edge.to;path.push(node)}
  return path;
}

export function canonicalPhysicalEdges(map){
  const path=canonicalPhysicalPath(map),adj=buildAdj(map),edges=[];
  for(let i=0;i<path.length-1;i++){
    const from=path[i],to=path[i+1];
    const edge=Object.values(adj.get(from)||{}).find(e=>e.to===to);
    if(!edge)throw new Error(`Canonical path is missing physical edge ${from} -> ${to}`);
    edges.push({from,to,dir:edge.dir,pathIndex:i});
  }
  return edges;
}

export function canonicalDecisionPlan(map){
  const physical=canonicalPhysicalEdges(map),solution=map.solution||[],sources=Array.isArray(map.bandDecisionNodes)?map.bandDecisionNodes:[];
  if(sources.length===solution.length&&sources.length){
    return sources.map((from,i)=>{
      const edge=physical.find(e=>e.from===from);
      if(!edge)throw new Error(`Band decision ${i+1} source ${from} is not on the canonical physical path.`);
      if(edge.dir!==solution[i])throw new Error(`Band decision ${i+1} at ${from}: canonical edge is ${edge.dir}, band requires ${solution[i]}.`);
      return {step:i+1,from,dir:solution[i],to:edge.to,pathIndex:edge.pathIndex};
    });
  }
  return physical.slice(0,solution.length).map((edge,i)=>({step:i+1,...edge}));
}

export function canonicalRouteAudit(map){
  const path=canonicalPhysicalPath(map),physical=canonicalPhysicalEdges(map),decisions=canonicalDecisionPlan(map),errors=[];
  if(path[0]!==map.start)errors.push(`Canonical path starts at ${path[0]}, expected ${map.start}.`);
  if(path.at(-1)!==map.goal)errors.push(`Canonical path ends at ${path.at(-1)}, expected ${map.goal}.`);
  if(decisions.length!==(map.solution||[]).length)errors.push(`Decision plan has ${decisions.length} steps, expected ${(map.solution||[]).length}.`);
  const seen=new Set();for(const d of decisions){if(seen.has(d.from))errors.push(`Decision source ${d.from} occurs more than once.`);seen.add(d.from)}
  return {ok:errors.length===0,errors,path,physical,decisions};
}

export function routeProgressStatus(map,state){
  const audit=canonicalRouteAudit(map);if(!audit.ok)return {ok:false,kind:'invalid-map',message:audit.errors.join(' ')};
  const {physical,decisions,path}=audit,decisionHistory=state?.decisionHistory||[],pathHistory=state?.pathHistory||[];
  for(let i=0;i<decisionHistory.length;i++){
    const expected=decisions[i],actual=decisionHistory[i];
    if(!expected||!sameEdge(actual,expected))return {ok:false,kind:'decision-divergence',step:i+1,actual,expected};
  }
  for(let i=0;i<pathHistory.length;i++){
    const expected=physical[i],actual=pathHistory[i];
    if(!expected||!sameEdge(actual,expected))return {ok:false,kind:'path-divergence',edge:i+1,actual,expected};
  }
  if(state?.transit){
    const expected=physical[pathHistory.length],actual={from:state.transit.from,dir:state.transit.dir,to:state.transit.to};
    if(!expected||!sameEdge(actual,expected))return {ok:false,kind:'transit-divergence',edge:pathHistory.length+1,actual,expected};
    return {ok:true,kind:'on-route-transit',physicalDone:pathHistory.length,physicalTotal:physical.length,bandStep:state.bandStep??state.step??decisionHistory.length,bandTotal:decisions.length,expectedNode:state.transit.to};
  }
  const expectedNode=path[Math.min(pathHistory.length,path.length-1)];
  if(state?.node!==expectedNode)return {ok:false,kind:'node-divergence',actualNode:state?.node,expectedNode,physicalDone:pathHistory.length,bandStep:state?.bandStep??state?.step??decisionHistory.length};
  return {ok:true,kind:state?.node===map.goal?'complete':'on-route',physicalDone:pathHistory.length,physicalTotal:physical.length,bandStep:state?.bandStep??state?.step??decisionHistory.length,bandTotal:decisions.length,expectedNode};
}

export function reverseDir(dir){return OPP[dir]||null}
