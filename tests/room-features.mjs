import fs from 'node:fs';
import assert from 'node:assert/strict';
import {applyExpansions} from '../js/map-expansion.js';

const read=p=>JSON.parse(fs.readFileSync(new URL(p,import.meta.url),'utf8'));
const base=read('../data/maps.json').maps[0];
const map=applyExpansions(base,read('../data/selem-expansion.json'),read('../data/selem-secrets.json'));
const features=read('../data/room-features.json').features;
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
assert.ok(count>=40,`Expected broad spatial feature coverage, got ${count}.`);
for(const nodeId of ['A06','A08','A12','A23','A31','B07','B14','B17','B33','B35','C07','C10','C11','C14','C15','D08','D12','D13'])assert.ok(features[nodeId]?.length,`Authored key room ${nodeId} lacks spatial features.`);
assert.ok(features.C14.some(f=>f.id==='desk')&&features.C14.some(f=>f.id==='chest'),'Sahiras room needs both desk and chest anchors.');
assert.ok(features.D12.some(f=>f.id==='sealed_wall'),'D12 needs a spatial anchor for the prepared secret connection.');
assert.ok(features.A23.some(f=>f.tags?.includes('secret_connection_slot')),'A23 needs a prepared secret-connection anchor.');
assert.ok(features.B33.some(f=>f.tags?.includes('secret_connection_slot')),'B33 needs a prepared secret-connection anchor.');
console.log(`room-features: OK (${count} spatial discoverables across ${Object.keys(features).length} rooms, hidden rooms included)`);
