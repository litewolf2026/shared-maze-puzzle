import assert from 'node:assert/strict';
import {initialSharedState,beginMove,normalizeSharedState} from '../js/navigation-model.js';

const map={
  gridSizeMeters:3,displayUnitsPerGridCell:1,
  start:'A',goal:'D',solution:['E','S'],
  nodes:[
    {id:'A',x:0,y:0,kind:'junction'},
    {id:'B',x:3,y:0,kind:'room'},
    {id:'C',x:6,y:0,kind:'deadend',decision:false},
    {id:'D',x:3,y:3,kind:'goal'}
  ],
  edges:[['A','E','B'],['B','E','C'],['B','S','D']]
};

let s=initialSharedState(map);
assert.equal(s.bandStep,0);

let r=beginMove(map,s,'E');
assert.ok(r.ok);s=r.state;
assert.equal(s.bandStep,1,'Leaving decision A consumes one band symbol.');
assert.ok(s.transit,'A->B is multiple grid cells.');
assert.equal(s.transit.progress,1);

r=beginMove(map,s,'E');s=r.state;
assert.equal(s.bandStep,1,'Continuing along corridor does not consume band.');
assert.equal(s.transit.progress,2);

r=beginMove(map,s,'E');s=r.state;
assert.equal(s.node,'B');
assert.equal(s.bandStep,1);
assert.equal(s.transit,null);

r=beginMove(map,s,'S');s=r.state;
assert.equal(s.bandStep,2,'Leaving room B through chosen exit consumes next band symbol.');
assert.ok(s.transit);

while(s.transit){r=beginMove(map,s,'S');s=r.state}
assert.equal(s.node,'D');
assert.equal(s.bandStep,2);

// Rewind D -> B. D is goal but traversal back along previous edge is a rewind, never a new decision.
r=beginMove(map,s,'N');s=r.state;
while(s.transit){r=beginMove(map,s,'N');s=r.state}
assert.equal(s.node,'B');
assert.equal(s.bandStep,1,'Returning to the prior decision restores the symbol used to leave B.');

// Wrong branch B -> C consumes at B, but C itself is not a decision.
r=beginMove(map,s,'E');s=r.state;
assert.equal(s.bandStep,2);
while(s.transit){r=beginMove(map,s,'E');s=r.state}
assert.equal(s.node,'C');
assert.equal(s.bandStep,2);
r=beginMove(map,s,'W');s=r.state;
while(s.transit){r=beginMove(map,s,'W');s=r.state}
assert.equal(s.node,'B');
assert.equal(s.bandStep,1,'Backtracking a dead end restores exactly the wrong decision.');

const normalized=normalizeSharedState({...s,step:99,history:[]},map);
assert.equal(normalized.step,normalized.bandStep,'Legacy step mirrors bandStep.');
assert.deepEqual(normalized.history,normalized.decisionHistory,'Legacy history mirrors decision history.');

console.log('navigation-model: OK');
