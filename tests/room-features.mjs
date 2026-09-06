import fs from 'node:fs';
import assert from 'node:assert/strict';
import {applyExpansion} from '../js/map-expansion.js';

const base=JSON.parse(fs.readFileSync(new URL('../data/maps.json',import.meta.url),'utf8')).maps[0];
const expansion=JSON.parse(fs.readFileSync(new URL('../data/selem-expansion.json',import.meta.url),'utf8'));
const map=applyExpansion(base,expansion);
const features=JSON.parse(fs.readFileSync(new URL('../data/room-features.json',import.meta.url),'utf8')).features;
const byId=new Map(map.nodes.map(n=>[n.id,n]));
const seen=new Set();
let count=0;
for(const [nodeId,list] of Object.entries(features)){
  const node=byId.get(nodeId);assert.ok(node,`Feature room ${nodeId} does not exist.`);
  const grid=node.exploreGrid||({goal:{w:7,h:7},prison:{w:4,h:4}}[node.kind])||{w:5,h:5};
  for(const f of list){
    const key=`${nodeId}:${f.id}`;assert.ok(!seen.has(key),`Duplicate feature ${key}`);seen.add(key);count++;
    assert.ok(Number.isInteger(f.x)&&Number.isInteger(f.y),`${key} lacks integer grid position.`);
    assert.ok(f.x>=0&&f.x<grid.w&&f.y>=0&&f.y<grid.h,`${key} lies outside ${grid.w}x${grid.h}.`);
    assert.ok(f.label&&f.description,`${key} lacks player-facing text.`);
  }
}
assert.ok(count>=15,'Expected a useful initial set of discoverable room features.');
console.log(`room-features: OK (${count} discoverables)`);
