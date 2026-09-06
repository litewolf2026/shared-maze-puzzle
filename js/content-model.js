import {buildAdj} from './navigation-model.js';

export function solutionNodeSet(map){
  const adj=buildAdj(map),out=new Set([map.start]);let node=map.start;
  for(const dir of map.solution){const edge=adj.get(node)?.[dir];if(!edge)throw new Error(`Broken solution at ${node}/${dir}`);node=edge.to;out.add(node)}
  return out;
}

export function distanceFromSolution(map){
  const adj=buildAdj(map),solution=solutionNodeSet(map),dist=new Map(),queue=[];
  for(const id of solution){dist.set(id,0);queue.push(id)}
  for(let i=0;i<queue.length;i++){
    const id=queue[i],d=dist.get(id);
    for(const edge of Object.values(adj.get(id)||{}))if(!dist.has(edge.to)){dist.set(edge.to,d+1);queue.push(edge.to)}
  }
  return dist;
}

export function baseDangerForDistance(distance){
  if(distance<=0)return 0;
  if(distance===1)return 1;
  if(distance<=3)return 2;
  if(distance<=5)return 3;
  return 4;
}

export function deriveNodeContent(map,node,distances=null){
  const dist=distances||distanceFromSolution(map);
  const distance=dist.get(node.id)??99;
  const dangerTier=Math.max(baseDangerForDistance(distance),Number(node.dangerFloor||0));
  const authoredLoot=Number.isInteger(node.lootTier)?node.lootTier:null;
  const lootCeiling=Math.min(4,Math.max(0,distance===0?0:distance===1?1:distance<=3?2:distance<=5?3:4));
  return {
    id:node.id,
    distanceFromSolution:distance,
    dangerTier,
    lootTier:authoredLoot,
    lootCeiling,
    tags:[...(node.tags||[])],
    encounterPools:[...(node.tags||[])].filter(Boolean)
  };
}

export function enrichMapContent(map){
  const distances=distanceFromSolution(map);
  return map.nodes.map(node=>deriveNodeContent(map,node,distances));
}
