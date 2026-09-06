import assert from 'node:assert/strict';
import fs from 'node:fs';
import {applyExpansions} from '../js/map-expansion.js';

const read=p=>JSON.parse(fs.readFileSync(new URL(p,import.meta.url),'utf8'));
const base=read('../data/maps.json').maps[0];
const expansion=read('../data/selem-expansion.json');
const finalOverlay=read('../data/selem-secrets.json');
const map=applyExpansions(base,expansion,finalOverlay);
const sceneFiles=['selem-a.json','selem-b.json','selem-c.json','selem-d.json'];
const sceneIds=sceneFiles.flatMap(file=>Object.keys(read(`../data/content/scenes/${file}`).scenes||{}));
const byId=new Map(map.nodes.map(n=>[n.id,n]));

assert.equal(map.gridSizeMeters,3,'Selem room geometry must use the established 3 m exploration grid.');
assert.equal(sceneIds.length,55,'The geometry contract targets exactly the 55 authored scene locations.');
assert.equal(new Set(sceneIds).size,55,'Authored scene ids must be unique.');

for(const id of sceneIds){
  const node=byId.get(id);assert.ok(node,`Missing scene node ${id}.`);
  const grid=node.exploreGrid;assert.ok(Number.isInteger(grid?.w)&&grid.w>=3,`${id} needs an explicit exploration width.`);assert.ok(Number.isInteger(grid?.h)&&grid.h>=3,`${id} needs an explicit exploration depth.`);
  assert.ok(node.geometry?.shape,`${id} needs an authored geometry shape.`);
  assert.ok(Number.isFinite(Number(node.geometry?.ceilingM))&&Number(node.geometry.ceilingM)>=2.5,`${id} needs a plausible authored ceiling height.`);
  const widthM=grid.w*map.gridSizeMeters,depthM=grid.h*map.gridSizeMeters;
  assert.ok(widthM>=9&&depthM>=9,`${id} is below the agreed scene-space minimum.`);
}

const geometryNodes=map.nodes.filter(n=>n.geometry);
assert.equal(geometryNodes.length,55,'Only authored scene locations should carry detailed room geometry in this pass; transit remains abstract.');

const expected={
  A06:[18,15],B12:[18,9],B31:[24,18],C10:[15,15],C12:[18,12],C14:[18,18],C15:[45,45],D03:[24,21],D06:[42,33],D12:[18,18],D13:[18,15],D14:[60,48]
};
for(const [id,[w,d]] of Object.entries(expected)){
  const n=byId.get(id);assert.deepEqual([n.exploreGrid.w*3,n.exploreGrid.h*3],[w,d],`${id} has the wrong authored footprint.`);
}
assert.equal(byId.get('C15').geometry.shape,'round_hall_complex');
assert.equal(byId.get('C15').geometry.ceilingM,10);
assert.equal(byId.get('D06').geometry.shape,'flooded_ruin_hall');
assert.equal(byId.get('D06').geometry.ceilingM,12);
assert.equal(byId.get('D14').geometry.shape,'vast_flooded_cavern');
assert.equal(byId.get('D14').geometry.ceilingM,22);
assert.equal(byId.get('B31').geometry.shape,'large_hall');
assert.equal(byId.get('C11').geometry.ceilingM,2.5,'The low cult sleeping chamber should remain noticeably cramped.');

const summary=Object.fromEntries(['A','B','C','D'].map(zone=>{
  const rows=sceneIds.filter(id=>id.startsWith(zone)).map(id=>{const n=byId.get(id);return n.exploreGrid.w*n.exploreGrid.h*9});
  return [zone,{rooms:rows.length,minM2:Math.min(...rows),maxM2:Math.max(...rows)}];
}));
console.log('selem-room-geometry: OK',JSON.stringify(summary));
