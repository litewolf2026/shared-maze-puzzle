import fs from 'node:fs';
import assert from 'node:assert/strict';
import {applyExpansions} from '../js/map-expansion.js';
import {terrainTypeAt,terrainWalkable,roomStartPosition,validateRoomTerrain,terrainCounts} from '../js/room-terrain.js';

const read=p=>JSON.parse(fs.readFileSync(new URL(p,import.meta.url),'utf8'));
const map=applyExpansions(read('../data/maps.json').maps[0],read('../data/selem-expansion.json'),read('../data/selem-secrets.json'));
const byId=new Map(map.nodes.map(n=>[n.id,n]));
const terrainIds=map.nodes.filter(n=>n.terrain?.rows).map(n=>n.id).sort();
assert.deepEqual(terrainIds,['C15','D06','D14'],'Only the three grand spaces should use explicit cell terrain before the graphics pass.');

for(const id of terrainIds){
  const node=byId.get(id),result=validateRoomTerrain(node);assert.equal(result.ok,true,`${id}: ${result.error||'invalid terrain'}`);
  const start=roomStartPosition(node);assert.ok(start,`${id} has no room start.`);assert.equal(terrainWalkable(node,start.x,start.y),true,`${id} starts on blocked terrain.`);
  assert.ok(Object.values(terrainCounts(node)).reduce((a,b)=>a+b,0)===node.exploreGrid.w*node.exploreGrid.h,`${id} terrain does not cover its whole grid.`);
}

const c15=byId.get('C15'),d06=byId.get('D06'),d14=byId.get('D14');
assert.equal(terrainTypeAt(c15,7,0),'bridge');
assert.equal(terrainWalkable(c15,7,0),true);
assert.equal(terrainTypeAt(c15,0,0),'blocked');
assert.ok((terrainCounts(c15).deep_water||0)>20,'C15 should contain meaningful water channels around the ritual complex.');

const d06Counts=terrainCounts(d06),d06Cells=d06.exploreGrid.w*d06.exploreGrid.h;
assert.ok((d06Counts.deep_water||0)/d06Cells>0.5,'D06 should be mostly flooded.');
assert.equal(roomStartPosition(d06).x,0);

const d14Counts=terrainCounts(d14),d14Cells=d14.exploreGrid.w*d14.exploreGrid.h;
assert.ok((d14Counts.deep_water||0)/d14Cells>0.5,'D14 should be predominantly deep water.');
assert.ok((d14Counts.bridge||0)>=16,'D14 needs broken causeways between dry islands.');
assert.equal(roomStartPosition(d14).x,0);
assert.equal(terrainWalkable(d14,4,7),true,'Western causeway should be walkable.');
assert.equal(terrainWalkable(d14,4,8),false,'Adjacent deep water should not be normal room movement.');

console.log('room-terrain: OK',JSON.stringify(Object.fromEntries(terrainIds.map(id=>[id,terrainCounts(byId.get(id))]))));
