import assert from 'node:assert/strict';
import fs from 'node:fs';
import {applyExpansions} from '../js/map-expansion.js';
import {enrichMapContent} from '../js/content-model.js';
import {generateContentPlan} from '../js/content-engine.js';

const read=p=>JSON.parse(fs.readFileSync(new URL(p,import.meta.url),'utf8'));
const base=read('../data/maps.json').maps[0];
const map=applyExpansions(base,read('../data/selem-expansion.json'),read('../data/selem-secrets.json'));
const catalog=read('../data/content/catalog.json');
const pools=read('../data/content/pools.json');
const profiles=read('../data/content/profiles.json');
const slots=read('../data/content/selem-slots.json');
const derivedByNode=Object.fromEntries(enrichMapContent(map).map(x=>[x.id,x]));
const plan=generateContentPlan({map,slotConfig:slots,catalog,pools,profiles,derivedByNode,seed:slots.generation.seed});
const all=Object.values(plan.rooms).flatMap(r=>r.assignments);

for(const id of ['loot_old_elem_tools','loot_service_tools','loot_salvage_metal']){
  assert.equal(all.some(a=>a.contentId===id),false,`Selem must not generate generic tool/salvage loot: ${id}`);
}

const guard=plan.rooms.C10?.assignments.find(a=>a.slotId==='guard-nottel');
assert.ok(guard,'C10 must contain a guard for Nottel.');
assert.equal(guard.contentId,'selem_nottel_guard');
assert.equal(guard.type,'encounter');
assert.ok(plan.rooms.C10.assignments.some(a=>a.contentId==='selem_nottel_witness'),'C10 must still contain Nottel.');

const erased=all.filter(a=>['discovery_erased_names','selem_erased_offering_names'].includes(a.contentId));
assert.equal(erased.length,1,'The erased-name motif should occur exactly once in Selem.');
assert.equal(erased[0].nodeId,'A08','The single erased-name clue belongs in the old sacrifice chamber.');

const priceLoot=all.filter(a=>a.type==='loot'&&a.mechanics?.source==='Aventurische Preisliste');
assert.ok(priceLoot.length>=8,`Expected broad concrete price-list loot coverage, got ${priceLoot.length}.`);
const labels=priceLoot.map(a=>a.label);
assert.equal(new Set(labels).size,labels.length,'Concrete price-list loot must not repeat within the generated Selem dungeon.');

const expected=new Map([
  ['A14','Öllampe'],
  ['A20','Sturmlaterne, Öl'],
  ['B05','Zunderdose, wasserdicht'],
  ['B07','Duftöl'],
  ['B14','Kletterseil, 10 Schritt'],
  ['B24','Stundenglas'],
  ['B29','Zirkel'],
  ['B35','Dünne Kette, 5 Schritt'],
  ['C24','Tagebuch, Papier']
]);
for(const [nodeId,label] of expected){
  assert.ok(plan.rooms[nodeId]?.assignments.some(a=>a.type==='loot'&&a.label===label),`${nodeId} should contain concrete price-list loot: ${label}`);
}

const priceSummary=priceLoot
  .map(a=>`${a.nodeId}:${a.label}${a.mechanics?.priceReference?` (${a.mechanics.priceReference})`:''}`)
  .sort((a,b)=>a.localeCompare(b,undefined,{numeric:true}));
console.log(`selem-content-diversity: OK (${priceLoot.length} distinct price-list finds; Nottel guarded; erased-name motif unique; generic tool loot absent)`);
console.log(`price-list-finds: ${priceSummary.join(' | ')}`);
