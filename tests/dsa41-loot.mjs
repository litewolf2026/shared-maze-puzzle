import fs from 'node:fs';
import assert from 'node:assert/strict';
import {applyExpansions} from '../js/map-expansion.js';
import {enrichMapContent} from '../js/content-model.js';
import {generateContentPlan} from '../js/content-engine.js';
import {mergeReusableCatalog,reusableDefinition} from '../js/reusable-content-pack.js';
import {lootProfileFor,lootGuidanceRows,lootValueTier} from '../js/dsa41-loot.js';

const read=p=>JSON.parse(fs.readFileSync(new URL(p,import.meta.url),'utf8'));
const rules=read('../data/rules/dsa41-loot.json');
const baseCatalog=read('../data/content/catalog.json');
const catalog=mergeReusableCatalog(baseCatalog);

assert.equal(rules.system,'DSA4.1');
assert.equal(rules.projectPolicy.valueScaleIsProjectConvention,true);
assert.equal(rules.projectPolicy.noAutomaticDukatPrices,true);
assert.equal(rules.projectPolicy.valueTiersAreNotCurrency,true);
for(const [tier,row] of Object.entries(rules.valueScale)){
  assert.ok(Number(tier)>=0&&Number(tier)<=4,`Unexpected loot tier ${tier}`);
  assert.ok(row.label&&row.intent,`Loot tier ${tier} lacks label/intent`);
}
for(const [id,profile] of Object.entries(rules.profiles)){
  assert.ok(Number.isInteger(Number(profile.valueTier))&&profile.valueTier>=0&&profile.valueTier<=4,`${id} has invalid value tier`);
  assert.ok(rules.portability[profile.portability],`${id} references unknown portability ${profile.portability}`);
  assert.ok(profile.identification?.level,`${id} lacks identification guidance`);
  for(const forbidden of ['price','ducats','dukaten','silverCoins','currencyValue'])assert.equal(Object.prototype.hasOwnProperty.call(profile,forbidden),false,`${id} embeds forbidden automatic currency field ${forbidden}`);
}

const lootDefinitions=Object.values(catalog.items).filter(x=>x.type==='loot');
assert.ok(lootDefinitions.length>=18,`Expected current reusable+scenario loot library, got only ${lootDefinitions.length}`);
for(const definition of lootDefinitions){
  const assignment={type:'loot',contentId:definition.id,mechanics:definition.mechanics||null};
  const profile=lootProfileFor(assignment,definition,rules);
  assert.ok(profile,`No loot profile for ${definition.id}`);
  assert.ok(lootGuidanceRows(assignment,definition,rules).length>=6,`Incomplete loot guidance for ${definition.id}`);
}

assert.equal(lootValueTier({type:'loot',contentId:'loot_old_elem_component'},catalog.items.loot_old_elem_component,rules),4);
assert.equal(lootProfileFor({type:'loot',contentId:'loot_old_keyring'},reusableDefinition('loot_old_keyring'),rules).id,'key');
assert.equal(lootProfileFor({type:'loot',contentId:'loot_alchemy_vial'},catalog.items.loot_alchemy_vial,rules).identification.level,'specialist');
assert.ok(lootProfileFor({type:'loot',contentId:'selem_sahira_personal_cache'},catalog.items.selem_sahira_personal_cache,rules).relevance.includes('information'));

const map=applyExpansions(read('../data/maps.json').maps[0],read('../data/selem-expansion.json'),read('../data/selem-secrets.json'));
const slots=read('../data/content/selem-slots.json'),pools=read('../data/content/pools.json'),profiles=read('../data/content/profiles.json'),features=read('../data/room-features.json').features;
const derivedByNode=Object.fromEntries(enrichMapContent(map).map(x=>[x.id,x]));
const plan=generateContentPlan({map,slotConfig:slots,catalog:baseCatalog,pools,profiles,roomFeatures:features,derivedByNode,seed:slots.generation.seed});
const assignments=Object.values(plan.rooms).flatMap(r=>r.assignments).filter(a=>a.type==='loot');
assert.ok(assignments.length>=10,`Expected meaningful generated loot population, got ${assignments.length}`);
for(const assignment of assignments){
  const definition=catalog.items[assignment.contentId]||reusableDefinition(assignment.contentId);
  assert.ok(definition,`Missing definition for generated loot ${assignment.contentId}`);
  const guidance=lootGuidanceRows(assignment,definition,rules);
  assert.ok(guidance.length>=6,`Generated loot lacks guidance: ${assignment.nodeId}/${assignment.slotId}/${assignment.contentId}`);
  assert.ok(!guidance.some(([,text])=>/\b\d+\s*(D|Dukaten|Silber|Heller|Kreuzer)\b/i.test(String(text))),`Generated loot guidance leaked a fixed currency price: ${assignment.contentId}`);
}

console.log(`dsa41-loot: OK (${lootDefinitions.length} loot definitions; ${assignments.length} generated loot assignments; no automatic currency prices)`);
