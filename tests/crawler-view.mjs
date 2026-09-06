import assert from 'node:assert/strict';
import fs from 'node:fs';
import {rotateFacing,relativeExitSide,traceSightline,FACING_ORDER} from '../js/crawler-view.js';

const maps=JSON.parse(fs.readFileSync(new URL('../data/maps.json',import.meta.url),'utf8')).maps;
const map=maps[0];
const DIRS={N:{opp:'S'},NE:{opp:'SW'},E:{opp:'W'},SE:{opp:'NW'},S:{opp:'N'},SW:{opp:'NE'},W:{opp:'E'},NW:{opp:'SE'},UP:{opp:'DOWN'},DOWN:{opp:'UP'}};

assert.deepEqual(FACING_ORDER,['N','NE','E','SE','S','SW','W','NW']);
assert.equal(rotateFacing('N',1),'NE');
assert.equal(rotateFacing('N',-1),'NW');
assert.equal(rotateFacing('SE',4),'NW');
assert.equal(rotateFacing('NW',1),'N');

assert.equal(relativeExitSide('N','N'),'front');
assert.equal(relativeExitSide('N','NE'),'right');
assert.equal(relativeExitSide('N','E'),'right');
assert.equal(relativeExitSide('N','NW'),'left');
assert.equal(relativeExitSide('N','W'),'left');
assert.equal(relativeExitSide('N','S'),'back');

const start=map.start;
const first=map.solution[0];
const sight=traceSightline(map,DIRS,start,first,4);
assert.ok(sight.length>=1,'Sightline must contain the current node.');
assert.equal(sight[0].node,start);
assert.ok(sight[0].exits[first],'The first solution direction must be visible as a forward exit from the start.');
assert.ok(sight.length<=4,'Sightline depth must be bounded.');

console.log('crawler-view: OK');
