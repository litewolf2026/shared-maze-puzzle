import assert from 'node:assert/strict';
import fs from 'node:fs';
import {REUSABLE_CONTENT_PACK,mergeReusableCatalog,mergeReusablePools,mergeReusableProfiles,reusableRules} from '../js/reusable-content-pack.js';
import {generateContentPlan} from '../js/content-engine.js';

const read=p=>JSON.parse(fs.readFileSync(new URL(p,import.meta.url),'utf8'));
const baseCatalog=read('../data/content/catalog.json');
const basePools=read('../data/content/pools.json');
const baseProfiles=read('../data/content/profiles.json');

assert.equal(REUSABLE_CONTENT_PACK.id,'core-dungeon-exploration-v1');
const items=REUSABLE_CONTENT_PACK.items,pools=REUSABLE_CONTENT_PACK.pools,profiles=REUSABLE_CONTENT_PACK.profiles;
assert.ok(Object.keys(items).length>=30,'Core pack is too small to be a useful reusable library.');
for(const type of ['loot','hazard','encounter','discovery','secret','secret_connection','event'])assert.ok(Object.values(items).some(x=>x.type===type),`Core pack lacks ${type}.`);
for(const [id,item] of Object.entries(items)){
  assert.equal(item.id,id,`Reusable item key/id mismatch at ${id}.`);
  assert.ok(item.label&&item.description,`Reusable item ${id} lacks text.`);
  assert.ok(item.rarity,`Reusable item ${id} lacks rarity.`);
  assert.ok(item.mechanics&&typeof item.mechanics==='object',`Reusable item ${id} lacks mechanics metadata.`);
  assert.equal(item.scope,undefined,`Reusable item ${id} must not be scenario-scoped.`);
  assert.equal(baseCatalog.items[id],undefined,`Reusable item ${id} collides with base catalog.`);
}
for(const [poolId,pool] of Object.entries(pools)){
  assert.equal(basePools.pools[poolId],undefined,`Reusable pool ${poolId} collides with base pools.`);
  assert.ok(pool.entries.length,`Reusable pool ${poolId} is empty.`);
  for(const id of pool.entries){assert.ok(items[id],`Reusable pool ${poolId} references non-pack item ${id}.`);assert.ok(pool.types.includes(items[id].type),`Reusable pool ${poolId} type mismatch for ${id}.`)}
}
for(const [profileId,profile] of Object.entries(profiles)){
  assert.equal(baseProfiles.profiles[profileId],undefined,`Reusable profile ${profileId} collides with base profiles.`);
  assert.ok(profile.slots.length,`Reusable profile ${profileId} has no slots.`);
  for(const slot of profile.slots){assert.ok(pools[slot.pool],`Reusable profile ${profileId}/${slot.id} references missing pool ${slot.pool}.`);assert.ok(slot.chance>=0&&slot.chance<=1,`Reusable profile ${profileId}/${slot.id} has invalid chance.`)}
}
for(const rule of reusableRules())for(const id of rule.profiles||[rule.profile])assert.ok(profiles[id],`Reusable rule references missing profile ${id}.`);

const mergedCatalog=mergeReusableCatalog(baseCatalog),mergedPools=mergeReusablePools(basePools),mergedProfiles=mergeReusableProfiles(baseProfiles);
assert.equal(Object.keys(mergedCatalog.items).length,Object.keys(baseCatalog.items).length+Object.keys(items).length);
assert.equal(Object.keys(mergedPools.pools).length,Object.keys(basePools.pools).length+Object.keys(pools).length);
assert.equal(Object.keys(mergedProfiles.profiles).length,Object.keys(baseProfiles.profiles).length+Object.keys(profiles).length);

// Core pack can be disabled for scenarios that want a fully authored population.
const syntheticMap={nodes:[{id:'R1',kind:'room',z:0,tags:['old_elem'],dangerFloor:2}],start:'R1',goal:'R1',solution:[]};
const disabled=generateContentPlan({map:syntheticMap,slotConfig:{generation:{useReusableCore:false},rules:[]},catalog:{items:{}},pools:{pools:{}},profiles:{profiles:{}},seed:'off'});
assert.deepEqual(disabled.contentPacks,[]);assert.deepEqual(disabled.rooms,{});

// When enabled, the pack is deterministic and can contribute without scenario-specific definitions.
const enabledSlots={generation:{useReusableCore:true,maxProfileAssignmentsPerRoom:4},rules:[]};
const p1=generateContentPlan({map:syntheticMap,slotConfig:enabledSlots,catalog:{items:{}},pools:{pools:{}},profiles:{profiles:{}},derivedByNode:{R1:{distanceFromSolution:2,dangerTier:2}},seed:'core-test'});
const p2=generateContentPlan({map:syntheticMap,slotConfig:enabledSlots,catalog:{items:{}},pools:{pools:{}},profiles:{profiles:{}},derivedByNode:{R1:{distanceFromSolution:2,dangerTier:2}},seed:'core-test'});
assert.deepEqual(p1,p2);assert.deepEqual(p1.contentPacks,['core-dungeon-exploration-v1']);
assert.ok((p1.rooms.R1?.assignments||[]).every(a=>items[a.contentId]),'Standalone core generation produced a non-pack item.');

console.log(`reusable-content-pack: OK (${Object.keys(items).length} items, ${Object.keys(pools).length} pools, ${Object.keys(profiles).length} profiles)`);
