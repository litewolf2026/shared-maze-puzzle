import assert from 'node:assert/strict';
import fs from 'node:fs';
import {applyExpansion} from '../js/map-expansion.js';
import {enrichMapContent,solutionNodeSet} from '../js/content-model.js';
import {generateContentPlan,materializeRoomState,updateContentState,itemMatches,expandSlotConfig} from '../js/content-engine.js';

const read=p=>JSON.parse(fs.readFileSync(new URL(p,import.meta.url),'utf8'));
const base=read('../data/maps.json').maps[0];
const map=applyExpansion(base,read('../data/selem-expansion.json'));
const catalog=read('../data/content/catalog.json');
const pools=read('../data/content/pools.json');
const profiles=read('../data/content/profiles.json');
const slots=read('../data/content/selem-slots.json');
const derivedByNode=Object.fromEntries(enrichMapContent(map).map(x=>[x.id,x]));

for(const nodeId of Object.keys(slots.rooms))assert.ok(map.nodes.some(n=>n.id===nodeId),`Unknown slotted node ${nodeId}`);
for(const [poolId,pool] of Object.entries(pools.pools))for(const id of pool.entries)assert.ok(catalog.items[id],`Pool ${poolId} references unknown ${id}`);
for(const rule of slots.rules||[])for(const profileId of rule.profiles||[rule.profile])assert.ok(profiles.profiles[profileId],`Unknown rule profile ${profileId}`);
for(const [profileId,profile] of Object.entries(profiles.profiles))for(const slot of profile.slots){assert.ok(slot.fixed?catalog.items[slot.fixed]:pools.pools[slot.pool],`Profile ${profileId}/${slot.id} references missing content source`)}
for(const [nodeId,room] of Object.entries(slots.rooms))for(const slot of room.slots){if(slot.fixed)assert.ok(catalog.items[slot.fixed],`${nodeId}/${slot.id} fixed item missing`);else assert.ok(pools.pools[slot.pool],`${nodeId}/${slot.id} pool missing`)}

const expandedSlots=expandSlotConfig({map,slotConfig:slots,profiles,derivedByNode});
assert.ok(expandedSlots.rooms.D06?.slots.some(x=>x.id==='hazard-wet'),'Water profile should create wet hazard slot in D06.');
assert.ok(expandedSlots.rooms.D06?.slots.some(x=>x.id==='loot-deep'),'Deep profile should create deep loot slot in D06.');
assert.ok(expandedSlots.rooms.C17?.slots.some(x=>x.id==='encounter-memory'&&x.fixed==='encounter_lost_waiter'),'Authored room slot must override profile slot by id.');

const seed=slots.generation.seed;
const planA=generateContentPlan({map,slotConfig:slots,catalog,pools,profiles,derivedByNode,seed});
const planB=generateContentPlan({map,slotConfig:slots,catalog,pools,profiles,derivedByNode,seed});
assert.deepEqual(planA,planB,'Same seed must produce the same complete content plan.');

const allAssignments=Object.values(planA.rooms).flatMap(r=>r.assignments);
const ids=allAssignments.map(x=>x.contentId);
assert.equal(ids.filter(id=>id==='loot_old_elem_component').length,1,'Unique Alt-Elem component must exist exactly once.');
assert.equal(planA.rooms.D08.assignments.find(x=>x.slotId==='loot-deep').contentId,'loot_old_elem_component');
assert.equal(planA.rooms.C17.assignments.find(x=>x.slotId==='encounter-memory').contentId,'encounter_lost_waiter');
assert.equal(planA.rooms.C21.assignments.find(x=>x.slotId==='discovery-memory').contentId,'discovery_three_maps');

// Generic generation rules must never populate the protected black-band route.
const solutionNodes=solutionNodeSet(map);
for(const nodeId of Object.keys(planA.rooms))assert.equal(solutionNodes.has(nodeId),false,`Random/profile content leaked onto protected solution node ${nodeId}`);

const waterNode=map.nodes.find(n=>n.id==='D06');
const waterCtx={nodeId:'D06',kind:waterNode.kind,level:waterNode.z,tags:waterNode.tags,dangerTier:4,distanceFromSolution:4};
assert.equal(itemMatches(catalog.items.hazard_black_water,waterCtx,{type:'hazard',placement:['water']}),true);
assert.equal(itemMatches(catalog.items.hazard_unstable_ceiling,waterCtx,{type:'hazard',placement:['water']}),false);

let state={roomState:{}};
let m=materializeRoomState(state,planA,'D08');state=m.state;
assert.equal(m.changed,true);assert.equal(state.roomState.D08.content.generated,true);
m=materializeRoomState(state,planA,'D08');assert.equal(m.changed,false,'Room content materialization must be idempotent.');
let u=updateContentState(state,'D08','loot-deep',{state:'discovered'});assert.equal(u.changed,true);assert.equal(u.state.roomState.D08.content.assignments.find(x=>x.slotId==='loot-deep').state,'discovered');

// The generator must actually be seedable, not just deterministic.
const syntheticMap={nodes:Array.from({length:12},(_,i)=>({id:`R${String(i).padStart(2,'0')}`,kind:'room',z:0,tags:['test']}))};
const syntheticCatalog={items:{a:{id:'a',type:'loot',label:'A',rarity:'common',requires:{tagsAny:['test']}},b:{id:'b',type:'loot',label:'B',rarity:'common',requires:{tagsAny:['test']}}}};
const syntheticPools={pools:{p:{types:['loot'],entries:['a','b']}}};
const syntheticProfiles={profiles:{test:{slots:[{id:'x',type:'loot',pool:'p',chance:.55}]}}};
const syntheticSlots={rules:[{when:{tagsAny:['test']},profile:'test'}]};
const signatures=new Set();for(let i=0;i<12;i++){const p=generateContentPlan({map:syntheticMap,slotConfig:syntheticSlots,catalog:syntheticCatalog,pools:syntheticPools,profiles:syntheticProfiles,seed:`seed-${i}`});signatures.add(JSON.stringify(p.rooms))}
assert.ok(signatures.size>1,'Different seeds must be able to produce different plans.');

console.log(`content-engine: OK (${allAssignments.length} Selem assignments across ${Object.keys(planA.rooms).length} optional rooms)`);
