import assert from 'node:assert/strict';
import fs from 'node:fs';
import {applyExpansion} from '../js/map-expansion.js';
import {enrichMapContent} from '../js/content-model.js';
import {generateContentPlan,materializeRoomState,updateContentState,itemMatches} from '../js/content-engine.js';

const read=p=>JSON.parse(fs.readFileSync(new URL(p,import.meta.url),'utf8'));
const base=read('../data/maps.json').maps[0];
const map=applyExpansion(base,read('../data/selem-expansion.json'));
const catalog=read('../data/content/catalog.json');
const pools=read('../data/content/pools.json');
const slots=read('../data/content/selem-slots.json');
const derivedByNode=Object.fromEntries(enrichMapContent(map).map(x=>[x.id,x]));

for(const nodeId of Object.keys(slots.rooms))assert.ok(map.nodes.some(n=>n.id===nodeId),`Unknown slotted node ${nodeId}`);
for(const [poolId,pool] of Object.entries(pools.pools))for(const id of pool.entries)assert.ok(catalog.items[id],`Pool ${poolId} references unknown ${id}`);
for(const [nodeId,room] of Object.entries(slots.rooms))for(const slot of room.slots){if(slot.fixed)assert.ok(catalog.items[slot.fixed],`${nodeId}/${slot.id} fixed item missing`);else assert.ok(pools.pools[slot.pool],`${nodeId}/${slot.id} pool missing`)}

const seed=slots.generation.seed;
const planA=generateContentPlan({map,slotConfig:slots,catalog,pools,derivedByNode,seed});
const planB=generateContentPlan({map,slotConfig:slots,catalog,pools,derivedByNode,seed});
assert.deepEqual(planA,planB,'Same seed must produce the same complete content plan.');

const allAssignments=Object.values(planA.rooms).flatMap(r=>r.assignments);
const ids=allAssignments.map(x=>x.contentId);
assert.equal(ids.filter(id=>id==='loot_old_elem_component').length,1,'Unique Alt-Elem component must exist exactly once.');
assert.equal(planA.rooms.D08.assignments.find(x=>x.slotId==='loot-1').contentId,'loot_old_elem_component');
assert.notEqual(planA.rooms.D03.assignments.find(x=>x.slotId==='loot-1')?.contentId,'loot_old_elem_component','Authored unique content must be reserved before random pools resolve.');
assert.equal(planA.rooms.C17.assignments[0].contentId,'encounter_lost_waiter');
assert.equal(planA.rooms.C21.assignments.find(x=>x.slotId==='discovery-1').contentId,'discovery_three_maps');

const waterNode=map.nodes.find(n=>n.id==='D06');
const waterCtx={nodeId:'D06',kind:waterNode.kind,level:waterNode.z,tags:waterNode.tags,dangerTier:4,distanceFromSolution:4};
assert.equal(itemMatches(catalog.items.hazard_black_water,waterCtx,{type:'hazard',placement:['water']}),true);
assert.equal(itemMatches(catalog.items.hazard_unstable_ceiling,waterCtx,{type:'hazard',placement:['water']}),false);

let state={roomState:{}};
let m=materializeRoomState(state,planA,'D08');state=m.state;
assert.equal(m.changed,true);assert.equal(state.roomState.D08.content.generated,true);
m=materializeRoomState(state,planA,'D08');assert.equal(m.changed,false,'Room content materialization must be idempotent.');
let u=updateContentState(state,'D08','loot-1',{state:'discovered'});assert.equal(u.changed,true);assert.equal(u.state.roomState.D08.content.assignments.find(x=>x.slotId==='loot-1').state,'discovered');

// The generator must actually be seedable, not just deterministic. Use a synthetic pool with many slots.
const syntheticMap={nodes:Array.from({length:12},(_,i)=>({id:`R${String(i).padStart(2,'0')}`,kind:'room',z:0,tags:['test']}))};
const syntheticCatalog={items:{a:{id:'a',type:'loot',label:'A',rarity:'common',requires:{tagsAny:['test']}},b:{id:'b',type:'loot',label:'B',rarity:'common',requires:{tagsAny:['test']}}}};
const syntheticPools={pools:{p:{types:['loot'],entries:['a','b']}}};
const syntheticSlots={rooms:Object.fromEntries(syntheticMap.nodes.map(n=>[n.id,{slots:[{id:'x',type:'loot',pool:'p'}]}]))};
const signatures=new Set();for(let i=0;i<12;i++){const p=generateContentPlan({map:syntheticMap,slotConfig:syntheticSlots,catalog:syntheticCatalog,pools:syntheticPools,seed:`seed-${i}`});signatures.add(JSON.stringify(p.rooms))}
assert.ok(signatures.size>1,'Different seeds must be able to produce different plans.');

console.log(`content-engine: OK (${allAssignments.length} Selem assignments across ${Object.keys(planA.rooms).length} rooms)`);
