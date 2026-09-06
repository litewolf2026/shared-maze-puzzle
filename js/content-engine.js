const RARITY_WEIGHT={common:100,uncommon:55,rare:22,very_rare:8,unique:2};

function hash32(text){
  let h=2166136261>>>0;
  for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,16777619)}
  h+=h<<13;h^=h>>>7;h+=h<<3;h^=h>>>17;h+=h<<5;
  return h>>>0;
}
function rngFor(seed){let a=hash32(String(seed));return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
function arr(v){return Array.isArray(v)?v:[]}
function intersects(a,b){const set=new Set(arr(a));return arr(b).some(x=>set.has(x))}
function includesAll(haystack,needles){const set=new Set(arr(haystack));return arr(needles).every(x=>set.has(x))}

export function contentContext(map,node,derived={}){
  return {
    nodeId:node.id,
    kind:node.kind,
    level:Number(node.z),
    tags:arr(node.tags),
    dangerTier:Number(derived.dangerTier??node.dangerFloor??0),
    lootTier:Number.isInteger(derived.lootTier)?derived.lootTier:Number(node.lootTier??0),
    distanceFromSolution:Number(derived.distanceFromSolution??0)
  };
}

function conditionMatches(req,context){
  if(req.tagsAny?.length&&!intersects(req.tagsAny,context.tags))return false;
  if(req.tagsAll?.length&&!includesAll(context.tags,req.tagsAll))return false;
  if(req.kinds?.length&&!req.kinds.includes(context.kind))return false;
  if(req.levels?.length&&!req.levels.includes(context.level))return false;
  if(Number.isFinite(req.minDanger)&&context.dangerTier<req.minDanger)return false;
  if(Number.isFinite(req.maxDanger)&&context.dangerTier>req.maxDanger)return false;
  if(Number.isFinite(req.minDistance)&&context.distanceFromSolution<req.minDistance)return false;
  if(Number.isFinite(req.maxDistance)&&context.distanceFromSolution>req.maxDistance)return false;
  return true;
}

export function itemMatches(item,context,slot={}){
  if(slot.type&&item.type!==slot.type)return false;
  if(!conditionMatches(item.requires||{},context))return false;
  if(slot.placement?.length&&item.placement?.features?.length&&!intersects(slot.placement,item.placement.features))return false;
  return true;
}

function mergeSlots(target,source){for(const slot of arr(source)){const index=target.findIndex(x=>x.id===slot.id);if(index>=0)target[index]={...target[index],...structuredClone(slot)};else target.push(structuredClone(slot))}}

export function expandSlotConfig({map,slotConfig,profiles={profiles:{}},derivedByNode={}}){
  const rooms={};
  for(const node of map.nodes){
    const context=contentContext(map,node,derivedByNode[node.id]||{}),slots=[];
    for(const rule of arr(slotConfig.rules)){
      if(!conditionMatches(rule.when||{},context))continue;
      for(const profileId of arr(rule.profiles||[rule.profile]).filter(Boolean)){
        const profile=profiles.profiles?.[profileId];if(!profile)throw new Error(`Unknown content profile ${profileId}`);mergeSlots(slots,profile.slots);
      }
    }
    const authored=slotConfig.rooms?.[node.id];
    if(authored){
      for(const profileId of arr(authored.profiles||[authored.profile]).filter(Boolean)){
        const profile=profiles.profiles?.[profileId];if(!profile)throw new Error(`Unknown content profile ${profileId}`);mergeSlots(slots,profile.slots);
      }
      mergeSlots(slots,authored.slots);
    }
    if(slots.length)rooms[node.id]={slots};
  }
  return {...slotConfig,rooms};
}

function weightedPick(candidates,seed){
  if(!candidates.length)return null;
  const random=rngFor(seed),weighted=candidates.map(x=>({item:x,weight:Number(x.weight??RARITY_WEIGHT[x.rarity]??25)}));
  const total=weighted.reduce((s,x)=>s+Math.max(0,x.weight),0);if(total<=0)return weighted[0].item;
  let roll=random()*total;
  for(const row of weighted){roll-=Math.max(0,row.weight);if(roll<=0)return row.item}
  return weighted.at(-1).item;
}

function slotSelected(slot,seed,nodeId){const chance=slot.chance==null?1:Math.max(0,Math.min(1,Number(slot.chance)));return chance>=1||rngFor(`${seed}|${nodeId}|${slot.id}|chance`)()<chance}

export function resolveSlot({slot,node,context,catalog,pools,seed,claimedUnique=new Set()}){
  const items=catalog.items||{};
  if(slot.fixed){const item=items[slot.fixed];if(!item)throw new Error(`Unknown fixed content ${slot.fixed}`);if(!itemMatches(item,context,slot))throw new Error(`Fixed content ${slot.fixed} is incompatible with ${node.id}/${slot.id}`);return materialize(item,slot,node,'fixed')}
  const pool=pools.pools?.[slot.pool];if(!pool)throw new Error(`Unknown content pool ${slot.pool}`);
  const allowedTypes=arr(pool.types),poolEntries=arr(pool.entries),candidates=[];
  for(const id of poolEntries){
    const item=items[id];if(!item)throw new Error(`Pool ${slot.pool} references unknown content ${id}`);
    if(allowedTypes.length&&!allowedTypes.includes(item.type))continue;
    if((item.unique||item.rarity==='unique')&&claimedUnique.has(item.id))continue;
    if(itemMatches(item,context,slot))candidates.push(item);
  }
  const picked=weightedPick(candidates,`${seed}|${node.id}|${slot.id}`);
  if(!picked)return null;
  return materialize(picked,slot,node,slot.pool);
}

function materialize(item,slot,node,source){
  return {
    slotId:slot.id,
    contentId:item.id,
    type:item.type,
    label:item.label,
    source,
    placement:slot.placement||item.placement?.features||[],
    hidden:Boolean(slot.hidden??item.hidden),
    discoverDifficulty:Number(slot.discoverDifficulty??item.discover?.difficulty??0),
    state:'unresolved',
    nodeId:node.id
  };
}

function reserveAuthoredUniques(slotConfig,catalog){
  const reserved=new Set(),seen=new Map();
  for(const [nodeId,room] of Object.entries(slotConfig.rooms||{})){
    for(const slot of arr(room.slots)){
      if(!slot.fixed)continue;
      const item=catalog.items?.[slot.fixed];if(!item)throw new Error(`Unknown fixed content ${slot.fixed}`);
      if(!(item.unique||item.rarity==='unique'))continue;
      if(seen.has(item.id))throw new Error(`Unique fixed content ${item.id} assigned twice: ${seen.get(item.id)} and ${nodeId}/${slot.id}`);
      seen.set(item.id,`${nodeId}/${slot.id}`);reserved.add(item.id);
    }
  }
  return reserved;
}

export function generateContentPlan({map,slotConfig,catalog,pools,profiles={profiles:{}},derivedByNode={},seed='default'}){
  const expanded=expandSlotConfig({map,slotConfig,profiles,derivedByNode});
  const rooms={},claimedUnique=reserveAuthoredUniques(expanded,catalog),nodes=[...map.nodes].sort((a,b)=>a.id.localeCompare(b.id));
  for(const node of nodes){
    const config=expanded.rooms?.[node.id];if(!config)continue;
    const context=contentContext(map,node,derivedByNode[node.id]||{}),assignments=[];
    for(const slot of [...arr(config.slots)].sort((a,b)=>a.id.localeCompare(b.id))){
      if(!slotSelected(slot,seed,node.id))continue;
      const count=Math.max(1,Number(slot.count||1));
      for(let i=0;i<count;i++){
        const instanceSlot=count===1?slot:{...slot,id:`${slot.id}-${i+1}`};
        const resolved=resolveSlot({slot:instanceSlot,node,context,catalog,pools,seed,claimedUnique});
        if(!resolved)continue;
        const item=catalog.items[resolved.contentId];if(item?.unique||item?.rarity==='unique')claimedUnique.add(item.id);
        assignments.push(resolved);
      }
    }
    if(assignments.length)rooms[node.id]={generated:true,seed:String(seed),assignments};
  }
  return {version:1,seed:String(seed),rooms,uniqueContent:[...claimedUnique].sort()};
}

export function roomContentFromPlan(plan,nodeId){return structuredClone(plan.rooms?.[nodeId]||{generated:true,seed:String(plan.seed),assignments:[]})}

export function materializeRoomState(state,plan,nodeId){
  const next=structuredClone(state),current=next.roomState?.[nodeId];
  if(current?.content?.generated)return {state:next,changed:false};
  next.roomState=next.roomState&&typeof next.roomState==='object'?next.roomState:{};
  next.roomState[nodeId]={...(current||{}),content:roomContentFromPlan(plan,nodeId)};
  return {state:next,changed:true};
}

export function updateContentState(state,nodeId,slotId,patch={}){
  const next=structuredClone(state),assignments=next.roomState?.[nodeId]?.content?.assignments;
  if(!Array.isArray(assignments))return {state:next,changed:false};
  const index=assignments.findIndex(x=>x.slotId===slotId);if(index<0)return {state:next,changed:false};
  assignments[index]={...assignments[index],...patch};return {state:next,changed:true};
}
