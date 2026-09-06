import assert from 'node:assert/strict';
import {initialSharedState,beginMove,normalizeSharedState} from '../js/navigation-model.js';

const map={
  gridSizeMeters:3,displayUnitsPerGridCell:1,
  start:'A',goal:'D',solution:['E','S'],
  nodes:[
    {id:'A',x:0,y:0,kind:'junction'},
    {id:'B',x:3,y:0,kind:'room'},
    {id:'C',x:6,y:0,kind:'deadend',decision:false},
    {id:'D',x:3,y:3,kind:'goal'},
    {id:'E',x:6,y:3,kind:'room'}
  ],
  edges:[['A','E','B'],['B','E','C'],['B','S','D'],['D','E','E']]
};

let s=initialSharedState(map);assert.equal(s.bandStep,0);
let r=beginMove(map,s,'E');assert.ok(r.ok);s=r.state;assert.equal(s.bandStep,1,'Leaving decision A consumes one band symbol.');assert.ok(s.transit);assert.equal(s.transit.progress,1);
r=beginMove(map,s,'E');s=r.state;assert.equal(s.bandStep,1,'Continuing along corridor does not consume band.');assert.equal(s.transit.progress,2);
r=beginMove(map,s,'E');s=r.state;assert.equal(s.node,'B');assert.equal(s.bandStep,1);assert.equal(s.transit,null);
r=beginMove(map,s,'S');s=r.state;assert.equal(s.bandStep,2,'Leaving room B through chosen exit consumes next band symbol.');assert.ok(s.transit);
while(s.transit){r=beginMove(map,s,'S');s=r.state}
assert.equal(s.node,'D');assert.equal(s.bandStep,2);

// The black band is exhausted, but physical exploration must continue.
r=beginMove(map,s,'E');assert.ok(r.ok,'Movement after the final band symbol must remain possible.');s=r.state;
assert.equal(s.bandStep,2,'Post-band decisions do not consume nonexistent symbols.');assert.equal(s.decisionHistory.length,2);assert.equal(r.event,'POST_BAND_DECISION');
while(s.transit){r=beginMove(map,s,'E');s=r.state}
assert.equal(s.node,'E');assert.equal(s.bandStep,2);

// Return through the post-band edge: still 2/2. Then return over the last band edge: restore 1/2.
r=beginMove(map,s,'W');s=r.state;while(s.transit){r=beginMove(map,s,'W');s=r.state}
assert.equal(s.node,'D');assert.equal(s.bandStep,2,'Returning over a post-band edge does not restore a symbol because none was consumed.');
r=beginMove(map,s,'N');s=r.state;while(s.transit){r=beginMove(map,s,'N');s=r.state}
assert.equal(s.node,'B');assert.equal(s.bandStep,1,'Returning over the last band decision restores its symbol.');

// Wrong branch B -> C consumes at B, but C itself is not a decision.
r=beginMove(map,s,'E');s=r.state;assert.equal(s.bandStep,2);while(s.transit){r=beginMove(map,s,'E');s=r.state}
assert.equal(s.node,'C');assert.equal(s.bandStep,2);r=beginMove(map,s,'W');s=r.state;while(s.transit){r=beginMove(map,s,'W');s=r.state}
assert.equal(s.node,'B');assert.equal(s.bandStep,1,'Backtracking a dead end restores exactly the wrong decision.');

const normalized=normalizeSharedState({...s,step:99,history:[]},map);assert.equal(normalized.step,normalized.bandStep,'V2 state keeps bandStep authoritative over compatibility aliases.');assert.deepEqual(normalized.history,normalized.decisionHistory,'Legacy history mirrors decision history.');

// A genuine V1 payload has only step/history, not the V2 fields. Defaults must not mask it.
const legacyHistory=[{from:'A',dir:'E',to:'B',step:0}];
const legacy=normalizeSharedState({node:'B',step:1,history:legacyHistory,visited:['A','B']},map);
assert.equal(legacy.bandStep,1,'Legacy step must import as bandStep.');
assert.deepEqual(legacy.decisionHistory,legacyHistory,'Legacy history must import as decisionHistory.');
assert.deepEqual(legacy.pathHistory,legacyHistory,'Legacy history must import as pathHistory until a scenario migration expands it.');
assert.equal(legacy.step,1);assert.deepEqual(legacy.history,legacyHistory);
console.log('navigation-model: OK (including genuine V1 state import)');
