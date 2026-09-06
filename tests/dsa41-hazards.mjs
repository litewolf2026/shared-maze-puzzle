import assert from 'node:assert/strict';
import fs from 'node:fs';
import {REUSABLE_CONTENT_PACK,mergeReusableCatalog} from '../js/reusable-content-pack.js';
import {hazardProfileFor,formatHazardCheck,formatOfficialFallback,hazardGuidanceRows} from '../js/dsa41-hazards.js';

const read=p=>JSON.parse(fs.readFileSync(new URL(p,import.meta.url),'utf8'));
const hazardRules=read('../data/rules/dsa41-hazards.json');
const exploration=read('../data/rules/dsa41-exploration.json');
const catalog=mergeReusableCatalog(read('../data/content/catalog.json'));

assert.equal(hazardRules.system,'DSA4.1');
assert.equal(hazardRules.projectPolicy.difficultyMappingIsProjectConvention,true);
assert.equal(hazardRules.projectPolicy.impactDamageScaleIsProjectConvention,true);
assert.equal(hazardRules.projectPolicy.supernaturalResolutionIsProjectConvention,true);
assert.equal(hazardRules.projectPolicy.doNotRollAutomatically,true);

const hazards=Object.values(catalog.items).filter(x=>x.type==='hazard');
assert.ok(hazards.length>=15,`Expected broad hazard library, got ${hazards.length}.`);
for(const hazard of hazards){
  const binding=hazardRules.bindings[hazard.id];assert.ok(binding,`Hazard ${hazard.id} lacks a DSA 4.1 resolution binding.`);
  const profile=hazardRules.profiles[binding];assert.ok(profile,`Hazard ${hazard.id} binds missing profile ${binding}.`);
  assert.ok(profile.check||profile.officialFallback,`Hazard profile ${binding} lacks both check and official fallback.`);
  if(profile.check)assert.ok(hazardRules.checks[profile.check],`Hazard profile ${binding} references missing check ${profile.check}.`);
  if(profile.officialFallback)assert.ok(hazardRules.officialRules[profile.officialFallback],`Hazard profile ${binding} references missing official rule ${profile.officialFallback}.`);
}

const fall=hazardRules.officialRules.fall;
assert.equal(fall.damage,'1W6−1 SP pro gefallenen Schritt');
assert.equal(fall.armorApplies,false);
assert.match(fall.mitigation.modifier,/max\. \+10/);
assert.match(fall.mitigation.effect,/Jeder TaP\*/);
const drowning=hazardRules.officialRules.drowning;
assert.equal(drowning.success,'1 AuP Verlust');assert.equal(drowning.failure,'1W6 AuP Verlust');assert.match(drowning.atZeroEndurance,/1W6 SP pro KR/);
const suffocation=hazardRules.officialRules.suffocation;
assert.match(suffocation.holdBreath,/AU KR/);assert.match(suffocation.holdBreath,/AU\/2 KR/);assert.equal(suffocation.failure,'1W6 AuP Verlust');assert.match(suffocation.atZeroEndurance,/1W6 LeP pro KR/);
const water=hazardRules.officialRules.waterCombat;
assert.deepEqual(water.kneeDeep,{AT:0,PA:2});assert.deepEqual(water.hipDeep,{AT:2,PA:4});assert.deepEqual(water.shoulderDeep,{AT:4,PA:6});assert.deepEqual(water.underwater,{AT:6,PA:6});

function assignment(id){const item=catalog.items[id];return {contentId:id,type:'hazard',discoverDifficulty:Number(item.discover?.difficulty??0),mechanics:item.mechanics||null}}
function guidance(id){return hazardProfileFor(assignment(id),catalog.items[id],hazardRules,exploration)}

let g=guidance('hazard_falling_masonry');assert.equal(g.id,'collapsing_structure');assert.equal(g.check.name,'Körperbeherrschung');assert.deepEqual(g.check.attributes,['MU','IN','GE']);assert.equal(g.check.modifier,3);assert.equal(g.check.effectiveEncumbrance,'BE×2');assert.equal(g.impact.damage,'1W6+2 TP');assert.equal(g.projectConvention,true);assert.equal(g.officialFallback,'fall');assert.match(formatOfficialFallback(g),/1W6−1 SP/);

g=guidance('hazard_pressure_plate');assert.equal(g.id,'mechanical_trap');assert.equal(g.check.name,'Feinmechanik');assert.deepEqual(g.check.attributes,['KL','FF','FF']);assert.equal(g.check.modifier,3);assert.equal(g.impact.damage,'1W6+2 TP');assert.equal(g.impact.armorApplies,true);assert.equal(g.projectConvention,true);

g=guidance('hazard_black_water');assert.equal(g.id,'deep_water');assert.equal(g.check.name,'Schwimmen');assert.deepEqual(g.check.attributes,['GE','KO','KK']);assert.equal(g.check.modifier,3);assert.equal(g.check.effectiveEncumbrance,'BE×2');assert.equal(g.officialFallback,'drowning');assert.match(formatOfficialFallback(g),/1W6 AuP/);

g=guidance('hazard_demonic_mark');assert.equal(g.id,'supernatural_contact');assert.equal(g.check.name,'Selbstbeherrschung');assert.deepEqual(g.check.attributes,['MU','KO','KK']);assert.equal(g.check.modifier,7);assert.equal(g.projectConvention,true);assert.equal(g.impact,null);

assert.match(formatHazardCheck(g),/Selbstbeherrschung \(MU\/KO\/KK\) \+7/);
const rows=hazardGuidanceRows(assignment('hazard_pressure_plate'),catalog.items.hazard_pressure_plate,hazardRules,exploration);
assert.ok(rows.some(([label,text])=>label==='Projekt-Schaden'&&text.includes('1W6+2 TP')));
assert.ok(rows.some(([label,text])=>label==='Einordnung'&&text.startsWith('Projektkonvention')));

for(const [tier,row] of Object.entries(hazardRules.projectImpactDamage)){assert.match(row.damage,/W/);assert.equal(typeof row.armorApplies,'boolean');assert.ok(row.label,`Impact tier ${tier} lacks label.`)}
assert.equal(hazardRules.sources.fall.includes('S. 144'),true);
assert.equal(hazardRules.sources.drowning.includes('140–141'),true);
assert.equal(hazardRules.sources.suffocation.includes('146–147'),true);
assert.equal(hazardRules.sources.waterCombat.includes('198'),true);

// A reusable hazard definition may carry generic trigger metadata, but the resolution
// profile remains external and therefore reusable across scenarios without duplicating rules.
for(const id of Object.keys(REUSABLE_CONTENT_PACK.items).filter(id=>REUSABLE_CONTENT_PACK.items[id].type==='hazard'))assert.ok(hazardRules.bindings[id],`Reusable hazard ${id} is not bound.`);

console.log(`dsa41-hazards: OK (${hazards.length} hazard definitions, ${Object.keys(hazardRules.profiles).length} resolution profiles; official rules separated from project conventions)`);
