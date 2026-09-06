import fs from 'node:fs';
import assert from 'node:assert/strict';
import {applyExpansions} from '../js/map-expansion.js';
import {buildAdj,initialSharedState,beginMove} from '../js/navigation-model.js';

const read=p=>JSON.parse(fs.readFileSync(new URL(p,import.meta.url),'utf8'));
const map=applyExpansions(read('../data/maps.json').maps[0],read('../data/selem-expansion.json'),read('../data/selem-secrets.json'));
const adj=buildAdj(map);

function edgeTo(from,to){
  const edge=Object.values(adj.get(from)||{}).find(candidate=>candidate.to===to);
  assert.ok(edge,`Dry run: missing physical edge ${from} -> ${to}.`);
  return edge;
}

function travel(state,to){
  const from=state.node,edge=edgeTo(from,to);
  let result=beginMove(map,state,edge.dir);
  assert.equal(result.ok,true,`Dry run: ${from} -> ${to} rejected (${result.error||'unknown'}).`);
  state=result.state;
  let guard=0;
  while(state.transit){
    assert.ok(++guard<128,`Dry run: transit guard exceeded on ${from} -> ${to}.`);
    result=beginMove(map,state,state.transit.dir);
    assert.equal(result.ok,true,`Dry run: transit ${from} -> ${to} failed (${result.error||'unknown'}).`);
    state=result.state;
  }
  assert.equal(state.node,to,`Dry run: ${from} -> ${to} ended at ${state.node}.`);
  return state;
}

function followCanonical(state,target){
  let guard=0;
  while(state.node!==target){
    assert.ok(++guard<map.canonicalPath.length+5,`Dry run: canonical guard exceeded before ${target}.`);
    const index=map.canonicalPath.indexOf(state.node);
    assert.ok(index>=0&&index<map.canonicalPath.length-1,`Dry run: ${state.node} is not a usable canonical-path node.`);
    state=travel(state,map.canonicalPath[index+1]);
  }
  return state;
}

let state=initialSharedState(map);
assert.equal(state.node,'A01');
assert.equal(state.bandStep,0);

// Begin normally, then make a genuine wrong turn and walk it back.
state=travel(state,'A02');
state=travel(state,'A03');
assert.equal(state.bandStep,2);
state=travel(state,'A04');
assert.equal(state.bandStep,3,'Dry run: wrong turn at A03 must consume the active band symbol.');
state=travel(state,'A03');
assert.equal(state.bandStep,2,'Dry run: exact backtracking from A04 must restore the wrong band decision.');
assert.equal(state.decisionHistory.length,2);

// Continue the authored route to B09.
state=followCanonical(state,'B09');
assert.equal(state.bandStep,14,'Dry run: B09 should be reached after 14 canonical band decisions.');
const beforeDepthExcursion=state.bandStep;
const beforeDepthHistory=state.decisionHistory.length;

// Deliberately leave the black-band route through the old pump room and explore deep into optional level D.
const depthRoute=['B14','D01','D02','D03','D04','D05','D06','D07','D08','D09','D14'];
const depthBreadcrumb=['B09'];
for(const to of depthRoute){state=travel(state,to);depthBreadcrumb.push(to)}
assert.equal(state.node,'D14');
assert.ok(state.visited.includes('D06')&&state.visited.includes('D14'),'Dry run: optional Unter Alt-Elem excursion did not reach its major locations.');
assert.ok(state.bandStep>=beforeDepthExcursion,'Dry run: optional exploration unexpectedly rewound the band while moving forward.');

// Return on the exact same physical route. Every off-route band decision must unwind cleanly.
for(let i=depthBreadcrumb.length-2;i>=0;i--)state=travel(state,depthBreadcrumb[i]);
assert.equal(state.node,'B09');
assert.equal(state.bandStep,beforeDepthExcursion,'Dry run: returning from Unter Alt-Elem must restore the pre-excursion band position.');
assert.equal(state.decisionHistory.length,beforeDepthHistory,'Dry run: returning from Unter Alt-Elem left stale band decisions behind.');

// Finish the complete authored story route including Nottel and Sahira's room.
state=followCanonical(state,map.goal);
assert.equal(state.node,'C15');
assert.equal(state.bandStep,25);
assert.equal(state.decisionHistory.length,25);
for(const id of ['A06','B12','C03','C10','C12','C14','C15'])assert.ok(state.visited.includes(id),`Dry run: mandatory scene ${id} was not visited.`);
assert.ok(state.visited.includes('B14')&&state.visited.includes('D01'),'Dry run: relocated optional D entrance was not exercised.');

console.log(`playability-dry-run: OK (${state.visited.length} locations visited; wrong turn recovered; B14 -> D14 -> B09 recovered; 25/25 band decisions; C15 reached)`);
