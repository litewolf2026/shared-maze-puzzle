import fs from 'node:fs';
import assert from 'node:assert/strict';
import {applyExpansions} from '../js/map-expansion.js';
import {buildAdj,initialSharedState,beginMove,isDecisionNode} from '../js/navigation-model.js';

const read=p=>JSON.parse(fs.readFileSync(new URL(p,import.meta.url),'utf8'));
const base=read('../data/maps.json').maps[0];
const map=applyExpansions(base,read('../data/selem-expansion.json'),read('../data/selem-secrets.json'));
const adj=buildAdj(map);

assert.equal(map.solution.length,25,'Black band must remain exactly 25 decisions.');
assert.equal(map.bandDecisionNodes.length,25,'Exactly 25 nodes must consume black-band symbols on the canonical route.');
assert.equal(map.canonicalPath.length,29,'Canonical physical path should contain 28 edges after inserting three mandatory scenes.');
assert.equal(map.canonicalPath[0],map.start);
assert.equal(map.canonicalPath.at(-1),map.goal);
assert.deepEqual(map.bandDecisionNodes,[
  'A01','A02','A03','A05','A07','A09','A10','A13','A15','B01',
  'B02','B03','B04','B08','B09','B10','B12','B15','C01','C02',
  'C03','C04','C08','C09','C12'
]);
for(const id of ['A06','C10','C14'])assert.ok(map.canonicalPath.includes(id),`${id} must be physically unavoidable on the canonical route.`);
assert.equal(isDecisionNode(map,'A06'),false,'A06 is an authored transit room, not another band decision.');
assert.equal(isDecisionNode(map,'C10'),false,'C10 is an authored transit room, not another band decision.');

let state=initialSharedState(map);
const observedDecisionDirs=[];
const checkpoints={};
for(let i=0;i<map.canonicalPath.length-1;i++){
  const from=map.canonicalPath[i],to=map.canonicalPath[i+1];
  assert.equal(state.node,from,`Canonical simulation drift before ${from}.`);
  const edge=Object.values(adj.get(from)||{}).find(e=>e.to===to);
  assert.ok(edge,`Missing canonical edge ${from} -> ${to}.`);
  const before=state.bandStep;
  let result=beginMove(map,state,edge.dir);
  assert.equal(result.ok,true,`${from} -> ${to} rejected: ${result.error||'unknown'}`);
  state=result.state;
  while(state.transit){
    result=beginMove(map,state,state.transit.dir);
    assert.equal(result.ok,true,`Transit ${from} -> ${to} failed: ${result.error||'unknown'}`);
    state=result.state;
  }
  assert.equal(state.node,to,`Canonical edge ended at ${state.node}, expected ${to}.`);
  if(state.bandStep>before)observedDecisionDirs.push(edge.dir);
  checkpoints[to]=state.bandStep;
}

assert.equal(state.node,map.goal);
assert.equal(state.bandStep,25);
assert.equal(state.decisionHistory.length,25);
assert.equal(state.pathHistory.length,28);
assert.deepEqual(observedDecisionDirs,map.solution,'Physical route must yield the unchanged 25 black-band directions.');
assert.deepEqual(state.decisionHistory.map(x=>x.from),map.bandDecisionNodes,'Decision history must be anchored at explicit band-decision nodes.');
assert.equal(checkpoints.A06,4,'A06 must be entered after consuming decision 4.');
assert.equal(checkpoints.A07,4,'Leaving A06 must not consume another symbol.');
assert.equal(checkpoints.C10,24,'C10 must be entered after consuming decision 24.');
assert.equal(checkpoints.C12,24,'Leaving C10 must not consume another symbol.');
assert.equal(checkpoints.C14,25,'C14 must be entered after consuming the final band symbol.');
assert.equal(checkpoints.C15,25,'Leaving C14 for the finale must not create a 26th symbol.');
for(const id of ['A06','C10','C14'])assert.ok(state.visited.includes(id),`${id} was not visited by canonical run.`);
console.log('canonical-story-route: OK (25 decisions / 28 physical edges; A06, C10, C14 mandatory without extra band symbols)');
