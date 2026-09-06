import assert from 'node:assert/strict';
import fs from 'node:fs';
import {applyExpansions} from '../js/map-expansion.js';
import {enrichMapContent,solutionNodeSet} from '../js/content-model.js';
import {generateContentPlan,materializeRoomState,updateContentState,itemMatches,expandSlotConfig} from '../js/content-engine.js';
import {REUSABLE_CONTENT_PACK,mergeReusableCatalog,mergeReusablePools,mergeReusableProfiles} from '../js/reusable-content-pack.js';
import {mergeScenarioCatalog,scenarioContentPack} from '../js/scenario-content-pack.js';

const read=p=>JSON.parse(fs.readFileSync(new URL(p,import.meta.url),'utf8'));
const base=read('../data/maps.json').maps[0];
const map=applyExpansions(base,read('../data/selem-expansion.json'),read('../data/selem-secrets.json'));
const baseCatalog=read('../data/content/catalog.json');
const basePools=read('../data/content/pools.json');
const baseProfiles=read('../data/content/profiles.json');
const slots=read('../data/content/selem-slots.json');
const catalog=mergeScenarioCatalog(mergeReusableCatalog(baseCatalog),slots.scenario);
const pools=mergeReusablePools(basePools);
const profiles=mergeReusableProfiles(baseProfiles);
const derivedByNode=Object.fromEntries(enrichMapContent(map).map(x=>[x.id,x]));

for(const nodeId of Object.keys(slots.rooms))assert.ok(map.nodes.some(n=>n.id===nodeId),`Unknown slotted node ${nodeId}`);
for(const [poolId,pool] of Object.entries(pools.pools))for(const id of pool.entries){
  assert.ok(catalog.items[id],`Pool ${poolId} references unknown ${id}`);
  assert.equal(catalog.items[id].scope,undefined,`Reusable pool ${poolId} contains scenario-scoped item ${id}`);
}
for(const rule of slots.rules||[])for(const profileId of rule.profiles||[rule.profile])assert.ok(profiles.profiles[profileId],`Unknown rule profile ${profileId}`);
for(const [profileId,profile] of Object.entries(profiles.profiles))for(const slot of profile.slots)assert.ok(slot.fixed?catalog.items[slot.fixed]:pools.pools[slot.pool],`Profile ${profileId}/${slot.id} references missing content source`);
for(const [nodeId,room] of Object.entries(slots.rooms))for(const slot of room.slots){if(slot.fixed)assert.ok(catalog.items[slot.fixed],`${nodeId}/${slot.id} fixed item missing`);else assert.ok(pools.pools[slot.pool],`${nodeId}/${slot.id} pool missing`)}
for(const item of Object.values(catalog.items).filter(x=>x.scope))assert.equal(item.scope,slots.scenario,`Unexpected scoped catalog item ${item.id}: ${item.scope}`);
assert.ok(Object.keys(REUSABLE_CONTENT_PACK.items).length>=30,'Reusable core pack should contain a meaningful content library.');

const expandedSlots=expandSlotConfig({map,slotConfig:slots,profiles:baseProfiles,derivedByNode});
assert.ok(expandedSlots.rooms.D06?.slots.some(x=>x.id==='hazard-wet'),'Water profile should create wet hazard slot in D06.');
assert.ok(expandedSlots.rooms.D06?.slots.some(x=>x.id==='loot-deep'),'Deep profile should create deep loot slot in D06.');
assert.ok(expandedSlots.rooms.D06?.slots.some(x=>x.id==='reusable-hazard'),'Reusable core should layer a context hazard slot into D06.');
assert.ok(expandedSlots.rooms.D06?.slots.some(x=>x.id==='encounter-morfu'&&x._origin==='scenario'),'Scenario pack must attach the Morfu only to D06.');
assert.ok(expandedSlots.rooms.B31?.slots.some(x=>x.id==='encounter-sumpfranzen'&&x._origin==='scenario'),'Scenario pack must attach the Sumpfranzen to B31.');
assert.ok(expandedSlots.rooms.A08?.slots.some(x=>x.id==='loot-grave'),'Original-map grave room should receive the reusable grave profile.');
assert.ok(expandedSlots.rooms.C17?.slots.some(x=>x.id==='encounter-memory'&&x.fixed==='encounter_lost_waiter'),'Authored room slot must override profile slot by id.');
assert.ok(expandedSlots.rooms.C10?.slots.some(x=>x.id==='actor-nottel'&&x._origin==='scenario'),'Scenario pack must attach Nottel to C10.');
assert.ok(expandedSlots.rooms.C15?.slots.some(x=>x.id==='actor-sahira'&&x._origin==='scenario'),'Scenario pack must attach Sahira to C15.');
assert.ok(expandedSlots.rooms.C15?.slots.some(x=>x.id==='actor-nachzehrer'&&x._origin==='scenario'),'Scenario pack must attach the Nachzehrer to C15.');

const seed=slots.generation.seed;
const planA=generateContentPlan({map,slotConfig:slots,catalog:baseCatalog,pools:basePools,profiles:baseProfiles,derivedByNode,seed});
const planB=generateContentPlan({map,slotConfig:slots,catalog:baseCatalog,pools:basePools,profiles:baseProfiles,derivedByNode,seed});
assert.deepEqual(planA,planB,'Same seed must produce the same complete content plan.');
assert.equal(planA.version,6);
assert.deepEqual(planA.contentPacks,['core-dungeon-exploration-v1','selem-authored-content-v2']);

const allAssignments=Object.values(planA.rooms).flatMap(r=>r.assignments);
const ids=allAssignments.map(x=>x.contentId);
assert.ok(Object.keys(planA.rooms).length>=25,`Expected broad optional content coverage, got only ${Object.keys(planA.rooms).length} rooms.`);
assert.ok(allAssignments.length>=35,`Expected a useful content population, got only ${allAssignments.length} assignments.`);
for(const type of ['loot','hazard','encounter','discovery','secret','secret_connection','event'])assert.ok(allAssignments.some(x=>x.type===type),`Generated plan lacks content type ${type}.`);
assert.ok(allAssignments.some(x=>REUSABLE_CONTENT_PACK.items[x.contentId]),'Reusable core pack did not contribute any generated assignment.');
assert.ok(allAssignments.filter(x=>REUSABLE_CONTENT_PACK.items[x.contentId]).every(x=>x.description&&x.mechanics),'Reusable assignments must materialize description and mechanics metadata.');

assert.equal(ids.filter(id=>id==='loot_old_elem_component').length,1,'Unique Alt-Elem component must exist exactly once.');
assert.equal(planA.rooms.D08.assignments.find(x=>x.slotId==='loot-deep').contentId,'loot_old_elem_component');
assert.equal(planA.rooms.C17.assignments.find(x=>x.slotId==='encounter-memory').contentId,'encounter_lost_waiter');
assert.equal(planA.rooms.C21.assignments.find(x=>x.slotId==='discovery-memory').contentId,'discovery_three_maps');
assert.equal(planA.rooms.A23.assignments.find(x=>x.slotId==='secret-pilgrim-room').contentId,'secret_connection_pilgrim_reliquary');
assert.equal(planA.rooms.B33.assignments.find(x=>x.slotId==='secret-maintenance-room').contentId,'secret_connection_maintenance');
assert.ok(planA.rooms.A31.assignments.some(x=>x.contentId==='loot_hidden_coin_cache'));
assert.ok(planA.rooms.B35.assignments.some(x=>x.contentId==='hazard_pressure_plate'));
assert.equal(planA.rooms.A02.assignments.find(x=>x.slotId==='story-vorhalle-pilgrims').contentId,'selem_vorhalle_pilgrim_traces');
assert.equal(planA.rooms.A04.assignments.find(x=>x.slotId==='hazard-falling-masonry').contentId,'hazard_falling_masonry');
assert.equal(planA.rooms.A25.assignments.find(x=>x.slotId==='secret-false-back').contentId,'secret_false_back');
assert.equal(planA.rooms.C03.assignments.find(x=>x.slotId==='story-memory-niche').contentId,'selem_memory_niche_echo');
assert.equal(planA.rooms.C10.assignments.find(x=>x.slotId==='actor-nottel').contentId,'selem_nottel_witness');
assert.equal(planA.rooms.C15.assignments.find(x=>x.slotId==='actor-sahira').contentId,'selem_sahira_antagonist');
assert.equal(planA.rooms.C15.assignments.find(x=>x.slotId==='actor-nachzehrer').contentId,'selem_nachzehrer');
assert.equal(planA.rooms.B31.assignments.find(x=>x.slotId==='encounter-sumpfranzen').contentId,'selem_sumpfranzen');
assert.equal(planA.rooms.D06.assignments.find(x=>x.slotId==='encounter-morfu').contentId,'selem_morfu');
for(const id of ['selem_nottel_witness','selem_sahira_antagonist','selem_nachzehrer','selem_sumpfranzen','selem_morfu'])assert.equal(ids.filter(x=>x===id).length,1,`${id} must exist exactly once.`);

const storyIds=[
  'selem_vorhalle_pilgrim_traces','selem_memory_niche_echo','selem_green_lens_clue','selem_submerged_ledger','selem_sacrifice_layer','selem_shrine_reuse','selem_pump_sequence','selem_whisper_memory','selem_band_experiments','selem_nottel_cell_marks','selem_cult_roster','selem_black_gate_residue','selem_pale_threshold_echo','selem_sahira_notes','selem_sahira_personal_cache','selem_cult_ritual_traces','selem_blind_lens_memory'
];
for(const id of storyIds)assert.equal(ids.filter(x=>x===id).length,1,`Authored story content ${id} must occur exactly once.`);

// The canonical route may contain deliberate fixed story beats and actors, but never pool/profile randomness.
const solutionNodes=solutionNodeSet(map);
for(const [nodeId,room] of Object.entries(planA.rooms))if(solutionNodes.has(nodeId))for(const assignment of room.assignments){
  assert.equal(assignment.source,'fixed',`Random/profile content leaked onto protected solution node ${nodeId}: ${assignment.contentId}`);
  assert.equal(catalog.items[assignment.contentId]?.scope,slots.scenario,`Non-scenario fixed content placed on protected route at ${nodeId}`);
}

const waterNode=map.nodes.find(n=>n.id==='D06');
const waterCtx={nodeId:'D06',kind:waterNode.kind,level:waterNode.z,tags:waterNode.tags,dangerTier:4,distanceFromSolution:4};
assert.equal(itemMatches(catalog.items.hazard_black_water,waterCtx,{type:'hazard',placement:['water']}),true);
assert.equal(itemMatches(catalog.items.hazard_unstable_ceiling,waterCtx,{type:'hazard',placement:['water']}),false);
assert.equal(itemMatches(catalog.items.hazard_water_surge,waterCtx,{type:'hazard',placement:['water']}),false,'Water surge also needs machinery/structural/unstable context.');
assert.equal(itemMatches(catalog.items.selem_morfu,waterCtx,{type:'encounter',placement:['water']}),true);

let state={roomState:{}};
let m=materializeRoomState(state,planA,'D08');state=m.state;
assert.equal(m.changed,true);assert.equal(state.roomState.D08.content.generated,true);
m=materializeRoomState(state,planA,'D08');assert.equal(m.changed,false,'Room content materialization must be idempotent.');
let u=updateContentState(state,'D08','loot-deep',{state:'discovered'});assert.equal(u.changed,true);assert.equal(u.state.roomState.D08.content.assignments.find(x=>x.slotId==='loot-deep').state,'discovered');

// Existing materialized assignments gain descriptive/mechanical metadata without rerolling state.
const reusableAssignment=allAssignments.find(x=>REUSABLE_CONTENT_PACK.items[x.contentId]);
const legacyState={roomState:{[reusableAssignment.nodeId]:{content:{generated:true,planVersion:2,assignments:[{...reusableAssignment,state:'discovered',description:'',mechanics:null}]}}}};
const upgraded=materializeRoomState(legacyState,planA,reusableAssignment.nodeId);
const upgradedAssignment=upgraded.state.roomState[reusableAssignment.nodeId].content.assignments[0];
assert.equal(upgradedAssignment.state,'discovered');assert.ok(upgradedAssignment.description);assert.ok(upgradedAssignment.mechanics);

// Additive scenario content can enter previously materialized rooms without rerolling existing content.
const oldC10=structuredClone(planA.rooms.C10);oldC10.planVersion=4;oldC10.assignments=oldC10.assignments.filter(x=>x.slotId!=='actor-nottel');oldC10.assignments[0].state='discovered';
const actorUpgrade=materializeRoomState({roomState:{C10:{content:oldC10}}},planA,'C10');
assert.equal(actorUpgrade.changed,true);assert.equal(actorUpgrade.state.roomState.C10.content.assignments.find(x=>x.slotId==='actor-nottel').state,'unresolved');assert.equal(actorUpgrade.state.roomState.C10.content.assignments.find(x=>x.slotId===oldC10.assignments[0].slotId).state,'discovered');
const oldD06=structuredClone(planA.rooms.D06);oldD06.planVersion=5;oldD06.assignments=oldD06.assignments.filter(x=>x.slotId!=='encounter-morfu');
const faunaUpgrade=materializeRoomState({roomState:{D06:{content:oldD06}}},planA,'D06');assert.equal(faunaUpgrade.changed,true);assert.equal(faunaUpgrade.state.roomState.D06.content.assignments.find(x=>x.slotId==='encounter-morfu').state,'unresolved');

// The generator must actually be seedable, not just deterministic. Disable both reusable and scenario-specific packs for this isolated test.
const syntheticMap={nodes:Array.from({length:12},(_,i)=>({id:`R${String(i).padStart(2,'0')}`,kind:'room',z:0,tags:['test']}))};
const syntheticCatalog={items:{a:{id:'a',type:'loot',label:'A',rarity:'common',requires:{tagsAny:['test']}},b:{id:'b',type:'loot',label:'B',rarity:'common',requires:{tagsAny:['test']}}}};
const syntheticPools={pools:{p:{types:['loot'],entries:['a','b']}}};
const syntheticProfiles={profiles:{test:{slots:[{id:'x',type:'loot',pool:'p',chance:.55}]}}};
const syntheticSlots={generation:{useReusableCore:false},rules:[{when:{tagsAny:['test']},profile:'test'}]};
const signatures=new Set();for(let i=0;i<12;i++){const p=generateContentPlan({map:syntheticMap,slotConfig:syntheticSlots,catalog:syntheticCatalog,pools:syntheticPools,profiles:syntheticProfiles,seed:`seed-${i}`});signatures.add(JSON.stringify(p.rooms))}
assert.ok(signatures.size>1,'Different seeds must be able to produce different plans.');
assert.equal(scenarioContentPack(undefined),null);

console.log(`content-engine: OK (${allAssignments.length} assignments across ${Object.keys(planA.rooms).length} rooms; reusable core + Selem authored content pack active; ${storyIds.length} authored story beats)`);
