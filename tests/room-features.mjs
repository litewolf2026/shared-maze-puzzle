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
assert.ok(count>=35,`Expected broad spatial feature coverage, got ${count}.`);
for(const nodeId of ['A06','A08','A12','B07','B14','B17','C07','C10','C11','C14','C15','D08','D12'])assert.ok(features[nodeId]?.length,`Authored key room ${nodeId} lacks spatial features.`);
assert.ok(features.C14.some(f=>f.id==='desk')&&features.C14.some(f=>f.id==='chest'),'Sahiras room needs both desk and chest anchors.');
assert.ok(features.D12.some(f=>f.id==='sealed_wall'),'D12 needs a spatial anchor for the prepared secret connection.');
console.log(`room-features: OK (${count} spatial discoverables across ${Object.keys(features).length} rooms)`);
