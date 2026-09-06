export function applyExpansion(base,expansion){
  if(!expansion)return structuredClone(base);
  if(expansion.baseMap!==base.id)throw new Error(`Expansion ${expansion.id||''} targets ${expansion.baseMap}, not ${base.id}`);
  const map=structuredClone(base);
  map.gridSizeMeters=expansion.gridSizeMeters||map.gridSizeMeters||3;
  map.displayUnitsPerGridCell=expansion.displayUnitsPerGridCell||map.displayUnitsPerGridCell||2.4;
  const levelIds=new Set(map.levels.map(l=>Number(l.z)));
  for(const level of expansion.levels||[]){if(!levelIds.has(Number(level.z))){map.levels.push(structuredClone(level));levelIds.add(Number(level.z))}}
  const byId=new Map(map.nodes.map(n=>[n.id,n]));
  for(const patch of expansion.nodeUpdates||[]){
    const current=byId.get(patch.id);if(!current)throw new Error(`Expansion node update references missing node ${patch.id}`);
    const immutable=['id','x','y','z'];for(const key of immutable)if(key in patch&&patch[key]!==current[key])throw new Error(`Expansion node update may not change ${patch.id}.${key}`);
    Object.assign(current,structuredClone(patch));
  }
  const nodeIds=new Set(map.nodes.map(n=>n.id));
  for(const node of expansion.nodes||[]){if(nodeIds.has(node.id))throw new Error(`Expansion duplicates node ${node.id}`);map.nodes.push(structuredClone(node));nodeIds.add(node.id)}
  map.edges.push(...structuredClone(expansion.edges||[]));
  map.decor=[...(map.decor||[]),...structuredClone(expansion.decor||[])];
  map.edgeMeta={...(map.edgeMeta||{}),...(expansion.edgeMeta||{})};
  const ids=Array.isArray(map.expansionIds)?map.expansionIds:[map.expansionId].filter(Boolean);
  if(expansion.id)ids.push(expansion.id);
  map.expansionIds=[...new Set(ids)];
  map.expansionId=map.expansionIds.at(-1)||null;
  return map;
}

export function applyExpansions(base,...overlays){return overlays.filter(Boolean).reduce((map,overlay)=>applyExpansion(map,overlay),structuredClone(base))}
