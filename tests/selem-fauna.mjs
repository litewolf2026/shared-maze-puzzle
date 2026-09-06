import assert from 'node:assert/strict';
import fs from 'node:fs';
import {applyExpansions} from '../js/map-expansion.js';
import {enrichMapContent,solutionNodeSet} from '../js/content-model.js';
import {generateContentPlan} from '../js/content-engine.js';
import {mergeReusablePools} from '../js/reusable-content-pack.js';
import {mergeScenarioCatalog,mergeScenarioPools,scenarioContentPack} from '../js/scenario-content-pack.js';

const read=p=>JSON.parse(fs.readFileSync(new URL(p,import.meta.url),'utf8'));
const base=read('../data/maps.json').maps[0];
const map=applyExpansions(base,read('../data/selem-expansion.json'),read('../data/selem-secrets.json'));
const catalog=read('../data/content/catalog.json');
const pools=read('../data/content/pools.json');
const profiles=read('../data/content/profiles.json');
const slots=read('../data/content/selem-slots.json');
const roomFeatures=read('../data/room-features.json').features;
const derivedByNode=Object.fromEntries(enrichMapContent(map).map(x=>[x.id,x]));
const pack=scenarioContentPack('selem-01');
const mergedCatalog=mergeScenarioCatalog(catalog,'selem-01');
const mergedPools=mergeScenarioPools(mergeReusablePools(pools),'selem-01');
const plan=generateContentPlan({map,slotConfig:slots,catalog,pools,profiles,roomFeatures,derivedByNode,seed:slots.generation.seed});
const solution=solutionNodeSet(map);

const faunaIds=['selem_fledermauskolonie','selem_riesenspringegel','selem_bleichmuraene','selem_grubenwurm','selem_morfu','selem_sumpfranzen'];
for(const id of faunaIds){
  const item=pack.items[id];assert.ok(item,`Missing Selem fauna ${id}`);assert.equal(item.type,'encounter');assert.match(item.mechanics?.source||'',/Zoo-Botanica Aventurica/);assert.ok(item.mechanics?.sourceKind,`${id} must distinguish official source from scenario adaptation.`);
  for(const forbidden of ['AT','PA','LeP','RS','INI','TP'])assert.equal(Object.prototype.hasOwnProperty.call(item.mechanics||{},forbidden),false,`${id} must not carry combat stat ${forbidden}.`);
}
assert.equal(pack.items.selem_bleichmuraene.mechanics.species,'Muräne','Bleichmuräne must be transparent as the regional name/variant of the ZBA Muräne.');
assert.match(pack.items.selem_sumpfranzen.mechanics.adaptation,/Szenarioanpassung|Szenarioanpass/i);
assert.match(pack.items.selem_morfu.mechanics.researchHook,/Norel|Alchim/i);

for(const id of faunaIds)assert.ok(mergedCatalog.items[id],`Scenario fauna ${id} must merge into the active catalog.`);
const forbiddenGeneric=['encounter_vermin','encounter_cave_creatures','encounter_scavenger_swarm','encounter_water_predator'];
for(const id of forbiddenGeneric){
  assert.equal(mergedPools.pools.ambient_encounters?.entries?.includes(id)??false,false,`${id} must not remain in Selem ambient encounters.`);
  assert.equal(mergedPools.pools.water_encounters?.entries?.includes(id)??false,false,`${id} must not remain in Selem water encounters.`);
  assert.equal(mergedPools.pools.reusable_encounters?.entries?.includes(id)??false,false,`${id} must not remain in Selem reusable encounter pool.`);
}
for(const id of ['selem_bleichmuraene','selem_riesenspringegel','selem_grubenwurm','selem_fledermauskolonie'])assert.ok(mergedPools.pools.water_encounters.entries.includes(id),`${id} missing from Selem water pool.`);
assert.ok(mergedPools.pools.ambient_encounters.entries.includes('selem_fledermauskolonie'));

const all=Object.values(plan.rooms).flatMap(r=>r.assignments||[]),encounters=all.filter(a=>a.type==='encounter');
for(const id of forbiddenGeneric)assert.equal(encounters.some(a=>a.contentId===id),false,`Generated Selem plan still contains placeholder encounter ${id}.`);
const morfu=encounters.filter(a=>a.contentId==='selem_morfu');assert.equal(morfu.length,1,'Exactly one Morfu should exist in Selem.');assert.equal(morfu[0].nodeId,'D06');
const ranzen=encounters.filter(a=>a.contentId==='selem_sumpfranzen');assert.equal(ranzen.length,1,'Exactly one authored Sumpfranzen rotte should exist.');assert.equal(ranzen[0].nodeId,'B31');assert.equal(ranzen[0].mechanics.occurrence,'2W6');
assert.equal(solution.has('D06'),false,'Morfu must remain off the canonical story path.');assert.equal(solution.has('B31'),false,'Sumpfranzen must remain off the canonical story path.');
for(const a of encounters.filter(x=>faunaIds.includes(x.contentId)))assert.equal(solution.has(a.nodeId),false,`Canonical fauna ${a.contentId} leaked onto required path at ${a.nodeId}.`);

assert.equal(mergedCatalog.items.selem_grubenwurm.rarity,'very_rare');
assert.equal(mergedCatalog.items.selem_morfu.unique,true);
assert.equal(mergedCatalog.items.selem_sumpfranzen.unique,true);

console.log(`selem-fauna: OK (${faunaIds.length} ZBA-grounded encounter types; Morfu D06 and Sumpfranzen B31 fixed off-route; no generic animal placeholders in Selem plan)`);
