import assert from 'node:assert/strict';
import fs from 'node:fs';
import {mergeReusableCatalog,REUSABLE_CONTENT_PACK} from '../js/reusable-content-pack.js';
import {encounterProfileFor,encounterGuidanceRows,encounterThreatTier} from '../js/dsa41-encounters.js';

const read=p=>JSON.parse(fs.readFileSync(new URL(p,import.meta.url),'utf8'));
const rules=read('../data/rules/dsa41-encounters.json');
const catalog=mergeReusableCatalog(read('../data/content/catalog.json'));

assert.equal(rules.system,'DSA4.1');
assert.equal(rules.projectPolicy.archetypesAreProjectConvention,true);
assert.equal(rules.projectPolicy.threatScaleIsProjectConvention,true);
assert.equal(rules.projectPolicy.exactCombatStatsRequireCharacterBaseline,true);
assert.equal(rules.projectPolicy.automaticPartyScaling,false);
assert.deepEqual(Object.keys(rules.threatScale).sort(),['0','1','2','3','4']);

const encounters=Object.values(catalog.items).filter(x=>x.type==='encounter');
assert.ok(encounters.length>=12,`Expected broad encounter library, got ${encounters.length}.`);
for(const encounter of encounters){
  const binding=rules.bindings[encounter.id];assert.ok(binding,`Encounter ${encounter.id} lacks an archetype binding.`);
  const archetype=rules.archetypes[binding];assert.ok(archetype,`Encounter ${encounter.id} binds missing archetype ${binding}.`);
  assert.ok(Number.isInteger(archetype.threatTier)&&archetype.threatTier>=0&&archetype.threatTier<=4,`${binding} has invalid threat tier.`);
  assert.ok(archetype.label&&archetype.defaultDisposition&&archetype.opening&&archetype.retreat,`${binding} lacks table guidance.`);
  assert.ok(Array.isArray(archetype.escalation)&&archetype.escalation.length>=3,`${binding} lacks an escalation sequence.`);
  assert.ok(Array.isArray(archetype.gmLevers)&&archetype.gmLevers.length>=2,`${binding} lacks GM levers.`);
  for(const forbidden of ['AT','PA','LeP','RS','INI','TP'])assert.equal(Object.prototype.hasOwnProperty.call(archetype,forbidden),false,`${binding} embeds uncalibrated combat stat ${forbidden}.`);
}

function assignment(id){return {contentId:id,type:'encounter'}}
function profile(id){return encounterProfileFor(assignment(id),catalog.items[id],rules)}

let p=profile('encounter_lost_waiter');assert.equal(p.id,'lost_noncombatant');assert.equal(p.threatTier,0);assert.equal(p.defaultDisposition,'fearful');assert.match(p.opening,/real/i);assert.equal(encounterThreatTier(assignment('encounter_lost_waiter'),catalog.items.encounter_lost_waiter,rules),0);
p=profile('encounter_cult_scout_pair');assert.equal(p.id,'cult_scouts');assert.equal(p.threatTier,2);assert.equal(p.defaultDisposition,'alert');assert.ok(p.escalation.some(x=>/Meldung|Verstärkung/i.test(x)));
p=profile('encounter_water_predator');assert.equal(p.id,'water_predator');assert.equal(p.threatTier,3);assert.equal(p.defaultDisposition,'ambush');assert.ok(p.gmLevers.some(x=>/Futter|Stand/i.test(x)));
p=profile('encounter_old_elem_echo_worker');assert.equal(p.id,'memory_echo');assert.equal(p.threatTier,0);assert.equal(p.defaultDisposition,'echo');

const rows=encounterGuidanceRows(assignment('encounter_cult_scout_pair'),catalog.items.encounter_cult_scout_pair,rules);
assert.ok(rows.some(([label,text])=>label==='Bedrohung'&&text.startsWith('2')));
assert.ok(rows.some(([label,text])=>label==='Eskalation'&&text.includes('→')));
assert.ok(rows.some(([label,text])=>label==='Einordnung'&&text.startsWith('Projektarchetyp')));

for(const id of Object.keys(REUSABLE_CONTENT_PACK.items).filter(id=>REUSABLE_CONTENT_PACK.items[id].type==='encounter'))assert.ok(rules.bindings[id],`Reusable encounter ${id} is not bound.`);
assert.equal(encounterProfileFor({contentId:'not-an-encounter',type:'loot'},{},rules),null);

console.log(`dsa41-encounters: OK (${encounters.length} encounter definitions, ${Object.keys(rules.archetypes).length} reusable archetypes; no uncalibrated combat stats)`);
