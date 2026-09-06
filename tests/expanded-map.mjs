import fs from 'node:fs';
import assert from 'node:assert/strict';
import {applyExpansion} from '../js/map-expansion.js';

const base=JSON.parse(fs.readFileSync(new URL('../data/maps.json',import.meta.url),'utf8')).maps[0];
const expansion=JSON.parse(fs.readFileSync(new URL('../data/selem-expansion.json',import.meta.url),'utf8'));
const map=applyExpansion(base,expansion);
const OPP={N:'S',NE:'SW',E:'W',SE:'NW',S:'N',SW:'NE',W:'E',NW:'SE',UP:'DOWN',DOWN:'UP'};
const vec={N:[0,-1],NE:[1,-1],E:[1,0],SE:[1,1],S:[0,1],SW:[-1,1],W:[-1,0],NW:[-1,-1]};

assert.equal(map.nodes.length,103,'Expanded map must contain 103 logical locations.');
assert.equal(map.levels.length,4,'Expanded map must contain four levels.');
assert.equal(map.gridSizeMeters,3);
assert.ok(map.nodes.some(n=>n.id==='D12'&&n.z===-3));

const adj=new Map(map.nodes.map(n=>[n.id,{}]));
for(const [a,d,b] of map.edges){
  assert.ok(adj.has(a)&&adj.has(b),`Bad expansion edge ${a}/${b}`);
  const existing=adj.get(a)[d];
  assert.ok(!existing||existing===b,`Conflicting direction ${a}/${d}: ${existing} vs ${b}`);
  adj.get(a)[d]=b;
  const r=OPP[d],reverseExisting=r?adj.get(b)[r]:null;
  assert.ok(!reverseExisting||reverseExisting===a,`Conflicting reverse direction ${b}/${r}: ${reverseExisting} vs ${a}`);
  if(r&&!reverseExisting)adj.get(b)[r]=a;
}
let cur=map.start;const solutionNodes=[cur];
for(const d of map.solution){cur=adj.get(cur)?.[d];assert.ok(cur,`Solution broken at ${solutionNodes.at(-1)} / ${d}`);solutionNodes.push(cur)}
assert.equal(cur,map.goal);assert.equal(map.solution.length,25);

for(const [a,d,b] of expansion.edges){
  if(!vec[d])continue;
  const na=map.nodes.find(n=>n.id===a),nb=map.nodes.find(n=>n.id===b);if(na.z!==nb.z)continue;
  const dx=nb.x-na.x,dy=nb.y-na.y,[vx,vy]=vec[d];
  assert.ok(dx*vx+dy*vy>0,`Expansion direction ${a} ${d} ${b} points backwards.`);
}

const q=[[map.start,0]],dist=new Map([[map.start,0]]),ways=new Map([[map.start,1]]);
for(let qi=0;qi<q.length;qi++){
  const [n,d]=q[qi];for(const to of Object.values(adj.get(n)||{})){
    const nd=d+1;if(!dist.has(to)){dist.set(to,nd);ways.set(to,ways.get(n));q.push([to,nd])}
    else if(dist.get(to)===nd)ways.set(to,ways.get(to)+ways.get(n));
  }
}
assert.equal(dist.get(map.goal),25,'Expansion created a shorter/longer shortest route.');
assert.equal(ways.get(map.goal),1,'Expansion created another shortest route to the goal.');
assert.ok(solutionNodes.every(id=>map.nodes.find(n=>n.id===id)?.z!==-3));
console.log('expanded-map: OK (103 nodes, 4 levels, unique 25-step band route)');
