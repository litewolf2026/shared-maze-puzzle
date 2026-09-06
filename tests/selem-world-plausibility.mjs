import assert from 'node:assert/strict';
import fs from 'node:fs';
import {applyExpansions} from '../js/map-expansion.js';
import {enrichMapContent} from '../js/content-model.js';
import {generateContentPlan} from '../js/content-engine.js';

const read=p=>JSON.parse(fs.readFileSync(new URL(p,import.meta.url),'utf8'));
const base=read('../data/maps.json').maps[0];
const map=applyExpansions(base,read('../data/selem-expansion.json'),read('../data/selem-secrets.json'));
const slots=read('../data/content/selem-slots.json');
const catalog=read('../data/content/catalog.json');
const pools=read('../data/content/pools.json');
const profiles=read('../data/content/profiles.json');
const roomFeatures=read('../data/room-features.json').features;
const derivedByNode=Object.fromEntries(enrichMapContent(map).map(x=>[x.id,x]));
const plan=generateContentPlan({map,slotConfig:slots,catalog,pools,profiles,roomFeatures,derivedByNode,seed:slots.generation.seed});

const sceneFiles=['../data/content/scenes/selem-a.json','../data/content/scenes/selem-b.json','../data/content/scenes/selem-c.json','../data/content/scenes/selem-d.json'];
const scenes=Object.assign({},...sceneFiles.map(path=>read(path).scenes));
const SCENE_KINDS=new Set(['room','lens','prison','goal','deadend','gate','glyph']);
const sceneNodes=map.nodes.filter(n=>SCENE_KINDS.has(n.kind));
const transitNodes=map.nodes.filter(n=>!SCENE_KINDS.has(n.kind));

assert.equal(map.nodes.length,108,'Plausibility audit must classify the complete 108-location dungeon.');
assert.equal(sceneNodes.length,55);
assert.equal(transitNodes.length,53);
for(const node of sceneNodes)assert.ok(scenes[node.id],`${node.id} is a scene-like location without authored world context.`);
for(const node of map.nodes)assert.ok(SCENE_KINDS.has(node.kind)||transitNodes.some(t=>t.id===node.id),`${node.id} escaped scene/transit classification.`);

const assignments=nodeId=>plan.rooms[nodeId]?.assignments||[];
const has=(nodeId,predicate)=>assignments(nodeId).some(predicate);

assert.ok(has('B10',a=>a.slotId==='cult-alarm-line'&&a.contentId==='hazard_tripwire_alarm'&&a.type==='hazard'),'B10 Wächtergang needs a concrete alarm/watch function.');
assert.ok(has('C10',a=>a.contentId==='selem_nottel_witness'),'C10 must contain Nottel.');
assert.ok(has('C10',a=>a.contentId==='selem_nottel_guard'&&a.type==='encounter'),'C10 must contain Nottel’s guard.');
assert.equal(assignments('C10').filter(a=>a.contentId==='selem_nottel_guard').length,1,'C10 should have one authored cell guard, not a random guard stack.');
assert.ok(has('C11',a=>a.contentId==='encounter_cult_scout_pair'),'C11 cult quarters need actual occupants.');
assert.ok(has('C11',a=>a.contentId==='selem_cult_roster'),'C11 must retain the roster/work-duty evidence.');
assert.equal(slots.rooms.C11.maxProfileAssignmentsPerRoom,0,'C11 occupancy must be authored rather than random extra cult spawns.');
assert.equal(assignments('A23').some(a=>a.type==='loot'),false,'A23 secret-setup room should not distract with random surface loot; its reward is the hidden chamber.');

for(const forbidden of ['loot_old_elem_tools','loot_service_tools','loot_salvage_metal']){
  const all=Object.values(plan.rooms).flatMap(r=>r.assignments||[]);
  assert.equal(all.some(a=>a.contentId===forbidden),false,`Generic tool/salvage loot returned: ${forbidden}`);
}
assert.ok(has('B29',a=>a.label==='Zirkel'),'B29 should expose the concrete surviving Zirkel.');
assert.ok(has('B35',a=>a.label==='Dünne Kette, 5 Schritt'),'B35 should expose the concrete chain instead of generic tools.');

for(const [nodeId,room] of Object.entries(plan.rooms)){
  if(!nodeId.startsWith('D'))continue;
  for(const a of room.assignments||[])if(a.type==='encounter')assert.equal(/cult/i.test(a.contentId),false,`${nodeId} should not become a second permanently occupied cult level.`);
}

assert.match(scenes.B12.gmPurpose,/B10/,'B12 should explain how the Wächtergang alarm affects the controlled cult area.');
assert.match(scenes.B12.gmPurpose,/C11/,'B12 should connect alarm consequences to the existing cult quarters, not spawn extras.');
assert.match(scenes.C10.gmPurpose,/Wächter/,'C10 scene text must acknowledge the guard.');
assert.match(scenes.C11.gmPurpose,/zwei Kultisten/i,'C11 scene text must define the two present cultists.');
assert.match(scenes.C17.gmPurpose,/patrouill/i,'C17 must explain why the long-lost man was not found by routine cult traffic.');
assert.doesNotMatch(scenes.C22.playerArrival,/blankgeschab|abgeschab.*nam/i,'C22 must not repeat the scraped-name motif from A08.');
assert.match(scenes.C22.playerArrival,/Besitzzeichen/i,'C22 should use the distinct ownership-symbol coping strategy.');
assert.match(scenes.D05.gmPurpose,/nichts nachträglich abgekratzt/i,'D05 must be an original burial convention, not another erased-name scene.');
assert.match(scenes.D10.gmPurpose,/Lastenträger/i,'D10 needs a concrete origin for the lost person.');
assert.match(scenes.D10.gmPurpose,/B14/,'D10 must connect recent D-level use to the old pump descent at B14.');
assert.match(scenes.C14.gmPurpose,/getrennt/i,'C14 must remain spatially separate from optional Under Alt-Elem.');

const cultCore=['B10','B11','B12','C10','C11','C14','C15'];
console.log(`selem-world-plausibility: OK (${map.nodes.length} locations = ${sceneNodes.length} authored scene spaces + ${transitNodes.length} intentionally sparse transit locations)`);
console.log('cult-core:',cultCore.map(id=>`${id}:${assignments(id).map(a=>a.label).join(' / ')||'scene-only'}`).join(' | '));
console.log('deep-level:',Object.keys(plan.rooms).filter(id=>id.startsWith('D')).sort().map(id=>`${id}:${assignments(id).filter(a=>a.type==='encounter').map(a=>a.label).join(',')||'no fixed cult occupancy'}`).join(' | '));
