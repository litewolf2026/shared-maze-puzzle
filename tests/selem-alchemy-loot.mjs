import assert from 'node:assert/strict';
import fs from 'node:fs';
import {applyExpansions} from '../js/map-expansion.js';
import {enrichMapContent} from '../js/content-model.js';
import {generateContentPlan} from '../js/content-engine.js';
import {mergeScenarioPools,scenarioContentPack} from '../js/scenario-content-pack.js';

const read=p=>JSON.parse(fs.readFileSync(new URL(p,import.meta.url),'utf8'));
const map=applyExpansions(read('../data/maps.json').maps[0],read('../data/selem-expansion.json'),read('../data/selem-secrets.json'));
const slots=read('../data/content/selem-slots.json'),catalog=read('../data/content/catalog.json'),pools=read('../data/content/pools.json'),profiles=read('../data/content/profiles.json'),roomFeatures=read('../data/room-features.json').features;
const derivedByNode=Object.fromEntries(enrichMapContent(map).map(x=>[x.id,x]));
const plan=generateContentPlan({map,slotConfig:slots,catalog,pools,profiles,roomFeatures,derivedByNode,seed:slots.generation.seed});
const pack=scenarioContentPack('selem-01');

const ingredientIds=[
  'selem_alchemy_alraune_glas','selem_alchemy_brabaker_vitriol','selem_alchemy_feuerschlick_alge','selem_alchemy_goldstaub','selem_alchemy_zinnober','selem_alchemy_diamantsplitter','selem_alchemy_unauer_salzlake','selem_alchemy_rosenquarz','selem_alchemy_schwefelquell'
];
const elixirIds=['selem_alchemy_wundpulver','selem_alchemy_heiltrank','selem_alchemy_antidot','selem_alchemy_schlaftrunk','selem_alchemy_stinktoepfchen'];
const curated=[...ingredientIds,...elixirIds];

assert.equal(pack.version>=6,true,'Scenario pack must carry the curated alchemy-loot revision.');
for(const id of curated){
  const item=pack.items[id];assert.ok(item,`${id} missing from Selem scenario content.`);assert.equal(item.type,'loot');assert.equal(item.scope,'selem-01');assert.match(item.mechanics?.source||'',/Wege der Alchimie/);assert.equal(Number.isFinite(Number(item.mechanics?.valueTier)),true);assert.equal('AT' in (item.mechanics||{}),false);assert.equal('PA' in (item.mechanics||{}),false);assert.equal('LeP' in (item.mechanics||{}),false);
}
for(const id of ingredientIds)assert.equal(pack.items[id].mechanics.category,'alchemy_ingredient');
for(const id of elixirIds){assert.equal(pack.items[id].mechanics.category,'alchemy_elixir');assert.match(pack.items[id].mechanics.qualityRoll,/3W6.*Tabelle 3/);}
assert.ok(ingredientIds.length>elixirIds.length,'Ingredients should remain more common in the curated pool than finished elixirs.');

const merged=mergeScenarioPools(pools,'selem-01');const alchemy=merged.pools.alchemy_loot.entries;
assert.equal(alchemy.includes('loot_alchemy_vial'),false);assert.equal(alchemy.includes('loot_alchemy_residue'),false);
for(const id of curated)assert.equal(alchemy.includes(id),true,`${id} missing from Selem alchemy pool.`);
for(const forbidden of ['orichalcum','theriak','unverwundbar','unsichtbarkeit','zaubertrank'])assert.equal(alchemy.some(id=>id.toLowerCase().includes(forbidden)),false,`High-value ${forbidden} must not enter routine Selem loot.`);

const a27=plan.rooms.A27?.assignments?.find(a=>a.slotId==='loot-alchemy');assert.ok(a27,'A27 must use the curated alchemy pool.');assert.equal(curated.includes(a27.contentId),true,`A27 rolled non-curated content ${a27.contentId}.`);
for(const room of Object.values(plan.rooms))for(const a of room.assignments||[])if(a.source==='alchemy_loot')assert.equal(curated.includes(a.contentId),true,`Generated Selem alchemy loot ${a.contentId} is not curated.`);

for(const id of ['selem_alchemy_alraune_glas','selem_alchemy_brabaker_vitriol','selem_alchemy_unauer_salzlake','selem_alchemy_rosenquarz','selem_alchemy_schwefelquell','selem_alchemy_heiltrank'])assert.ok(pack.items[id].mechanics.priceReference,`${id} should expose the available Aventurische-Preisliste reference.`);

console.log(`selem-alchemy-loot: OK (${ingredientIds.length} ingredients + ${elixirIds.length} restrained finished alchimica; WdA tables, no high-power treasure pool)`);
