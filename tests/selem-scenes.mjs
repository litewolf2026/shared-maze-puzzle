import fs from 'node:fs';
import assert from 'node:assert/strict';
import {applyExpansions} from '../js/map-expansion.js';

const read=p=>JSON.parse(fs.readFileSync(new URL(p,import.meta.url),'utf8'));
const map=applyExpansions(read('../data/maps.json').maps[0],read('../data/selem-expansion.json'),read('../data/selem-secrets.json'));
const index=read('../data/content/selem-scenes.json');
const slots=read('../data/content/selem-slots.json');
const sceneParts=index.files.map(path=>JSON.parse(fs.readFileSync(new URL(`../${path.replace(/^\.\//,'')}`,import.meta.url),'utf8')));
const scenes={};
for(const part of sceneParts){
  assert.ok(['A','B','C','D'].includes(part.zone),`Unexpected scene zone ${part.zone}`);
  for(const [id,scene] of Object.entries(part.scenes||{})){
    assert.ok(!scenes[id],`Duplicate authored scene ${id}`);
    scenes[id]={...scene,zone:part.zone};
  }
}

const SCENE_KINDS=new Set(['room','lens','prison','goal','deadend','gate','glyph']);
const sceneNodes=map.nodes.filter(n=>SCENE_KINDS.has(n.kind));
const expectedIds=sceneNodes.map(n=>n.id).sort();
const authoredIds=Object.keys(scenes).sort();
assert.equal(map.nodes.length,106);
assert.equal(sceneNodes.length,54);
assert.deepEqual(authoredIds,expectedIds,'Authored scene layer must cover exactly all 54 scene-like locations.');

const allowedHeroes=new Set(['Norel','Glacia','Quin','Grambosch','Rastafan']);
const allowedPolicies=new Set(['ambient','authored_priority','authored_only']);
let authoredOnly=0,authoredPriority=0,ambient=0;
for(const [id,scene] of Object.entries(scenes)){
  assert.ok(scene.playerArrival?.trim().length>=20,`${id} needs meaningful playerArrival text.`);
  assert.ok(scene.gmPurpose?.trim().length>=20,`${id} needs meaningful gmPurpose text.`);
  assert.ok(Array.isArray(scene.beats)&&scene.beats.length>=1,`${id} needs at least one GM beat.`);
  assert.ok(Array.isArray(scene.clues),`${id} clues must be an array.`);
  assert.ok(Array.isArray(scene.heroHooks),`${id} heroHooks must be an array.`);
  assert.ok(allowedPolicies.has(scene.randomPolicy),`${id} has unsupported randomPolicy ${scene.randomPolicy}.`);
  for(const hero of scene.heroHooks)assert.ok(allowedHeroes.has(hero),`${id} references unknown hero ${hero}.`);
  if(id.startsWith('D'))assert.notEqual(scene.critical,true,`${id}: optional Under Alt-Elem scenes must not become critical path.`);

  const budget=slots.rooms?.[id]?.maxProfileAssignmentsPerRoom;
  if(scene.randomPolicy==='authored_only'){
    authoredOnly++;
    assert.equal(budget,0,`${id} is authored_only and must suppress generated profile content.`);
  }else if(scene.randomPolicy==='authored_priority'){
    authoredPriority++;
    assert.equal(budget,1,`${id} is authored_priority and must allow at most one generated profile assignment.`);
  }else ambient++;
}

for(const id of ['A06','B12','C03','C10','C12','C14','C15']){
  assert.equal(scenes[id]?.critical,true,`${id} must remain a canonical critical scene.`);
  assert.equal(scenes[id]?.signature,true,`${id} must remain a signature scene.`);
}
for(const id of ['D08','D10','D12'])assert.equal(scenes[id]?.signature,true,`${id} should remain an optional signature scene.`);
assert.equal(slots.rooms.C26?.slots?.[0]?.fixed,'discovery_recursive_route_notes','C26 needs fixed Sahira memory evidence instead of generic pool-only content.');
assert.equal(slots.rooms.D10?.slots?.[0]?.fixed,'encounter_exhausted_explorer','D10 needs a fixed lost-person encounter instead of generic pool-only content.');

const sparseNodes=map.nodes.filter(n=>!SCENE_KINDS.has(n.kind));
assert.equal(sparseNodes.length,52,'Transit/scene classification changed; review authored-scene policy intentionally.');
console.log(`selem-scenes: ${authoredIds.length}/${sceneNodes.length} authored; policies ${authoredOnly} authored-only / ${authoredPriority} authored-priority / ${ambient} ambient; ${sparseNodes.length} transit locations outside scene layer`);
console.log('signature:',authoredIds.filter(id=>scenes[id].signature).join(', '));
