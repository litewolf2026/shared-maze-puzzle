import fs from 'node:fs';
import assert from 'node:assert/strict';

const read=p=>JSON.parse(fs.readFileSync(new URL(p,import.meta.url),'utf8'));
const index=read('../data/content/selem-scenes.json');
assert.ok(index.setpiecesFile,'Scene index must reference the key setpiece file.');
const setpieceData=JSON.parse(fs.readFileSync(new URL(`../${index.setpiecesFile.replace(/^\.\//,'')}`,import.meta.url),'utf8'));
const setpieces=structuredClone(setpieceData.setpieces||{});
if(index.setpieceOverridesFile){
  const overrideData=JSON.parse(fs.readFileSync(new URL(`../${index.setpieceOverridesFile.replace(/^\.\//,'')}`,import.meta.url),'utf8'));
  for(const [id,patch] of Object.entries(overrideData.setpieces||{})){
    assert.ok(setpieces[id],`Setpiece override ${id} must reference a base setpiece.`);
    setpieces[id]={...setpieces[id],...patch};
  }
}
const expected=['A06','B12','C03','C10','C12','C14','C15'];
assert.deepEqual(Object.keys(setpieces).sort(),[...expected].sort(),'Exactly the seven canonical critical scenes should carry mandatory setpiece guidance.');

for(const id of expected){
  const s=setpieces[id];
  assert.ok(s.title?.trim(),`${id} needs a setpiece title.`);
  assert.ok(s.objective?.trim().length>=30,`${id} needs a meaningful objective.`);
  assert.ok(Array.isArray(s.facts)&&s.facts.length>=2,`${id} needs at least two secured facts.`);
  assert.ok(Array.isArray(s.unknowns)&&s.unknowns.length>=1,`${id} must state what remains unknown.`);
  assert.ok(Array.isArray(s.phases)&&s.phases.length>=2,`${id} needs at least two playable phases.`);
  for(const phase of s.phases){
    assert.ok(phase.title?.trim(),`${id} has an untitled phase.`);
    assert.ok(phase.gm?.trim().length>=30,`${id}/${phase.title} needs GM direction.`);
    assert.ok(Array.isArray(phase.choices)&&phase.choices.length>=2,`${id}/${phase.title} needs real player options.`);
    assert.ok(Array.isArray(phase.consequences)&&phase.consequences.length>=1,`${id}/${phase.title} needs consequences.`);
  }
  assert.ok(s.handoff?.trim().length>=30,`${id} needs a handoff into the next part of the adventure.`);
}

assert.ok(setpieces.C10.phases.length>=3,'Nottel rescue must cover securing, evidence work and what happens with her afterwards.');
assert.ok(setpieces.C12.phases.length>=3,'Lost-way threshold must cover evidence, Satinav echo and countermeasure choice.');
assert.ok(setpieces.C15.phases.length>=4,'Finale must have confrontation, Nachzehrer pressure, ritual break and aftermath.');
assert.ok(setpieces.C15.successSignals?.length>=3,'Finale must define multiple success signals.');
assert.ok(setpieces.C15.failurePressure?.length>=3,'Finale failure must create pressure without a single automatic total-retcon result.');
assert.equal(Object.keys(setpieces).some(id=>id.startsWith('D')),false,'Optional Under Alt-Elem must not become a mandatory key setpiece chain.');
const c14Text=JSON.stringify(setpieces.C14);
assert.equal(c14Text.includes('Unter Alt-Elem erkunden'),false,'Sahira setpiece must not offer Under Alt-Elem as a room action.');
assert.equal(c14Text.includes('Der Abstieg nach Unter Alt-Elem'),false,'Sahira setpiece must not describe the deep entrance as part of C14.');

console.log(`selem-setpieces: OK (${expected.length} canonical key scenes, ${expected.reduce((n,id)=>n+setpieces[id].phases.length,0)} playable phases; external handout delivery is outside the app)`);
