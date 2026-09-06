import fs from 'node:fs';
import assert from 'node:assert/strict';
import {applyExpansion} from '../js/map-expansion.js';
import {distanceFromSolution,deriveNodeContent,enrichMapContent} from '../js/content-model.js';

const base=JSON.parse(fs.readFileSync(new URL('../data/maps.json',import.meta.url),'utf8')).maps[0];
const expansion=JSON.parse(fs.readFileSync(new URL('../data/selem-expansion.json',import.meta.url),'utf8'));
const map=applyExpansion(base,expansion);
const distances=distanceFromSolution(map);

assert.equal(distances.get(map.start),0);
assert.equal(distances.get(map.goal),0);
assert.ok((distances.get('D08')??0)>=1,'Deep optional areas must be off the solution route.');
const d08=deriveNodeContent(map,map.nodes.find(n=>n.id==='D08'),distances);
assert.equal(d08.dangerTier,4);
assert.equal(d08.lootTier,4);
assert.ok(d08.tags.includes('old_elem'));

const pathNode=deriveNodeContent(map,map.nodes.find(n=>n.id==='A03'),distances);
assert.equal(pathNode.distanceFromSolution,0);
assert.equal(pathNode.dangerTier,0);
assert.equal(pathNode.lootCeiling,0);

const all=enrichMapContent(map);
assert.equal(all.length,103);
assert.ok(all.every(x=>x.dangerTier>=0&&x.dangerTier<=4));
console.log('content-model: OK');
