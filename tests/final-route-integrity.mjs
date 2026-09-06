import fs from 'node:fs';
import assert from 'node:assert/strict';
import {applyExpansions} from '../js/map-expansion.js';
import {buildAdj,initialSharedState,beginMove} from '../js/navigation-model.js';
import {canonicalRouteAudit,routeProgressStatus} from '../js/canonical-route.js';

const read=p=>JSON.parse(fs.readFileSync(new URL(p,import.meta.url),'utf8'));
const map=applyExpansions(read('../data/maps.json').maps[0],read('../data/selem-expansion.json'),read('../data/selem-secrets.json'));
const audit=canonicalRouteAudit(map);

assert.equal(audit.ok,true,audit.errors.join(' '));
assert.equal(map.nodes.length,107,'Final Selem graph must contain 107 locations.');
assert.equal(audit.path.length,29,'Canonical physical route must contain 29 locations / 28 edges.');
assert.equal(audit.physical.length,28,'Canonical physical route must contain 28 physical edges.');
assert.equal(audit.decisions.length,25,'Black band must contain exactly 25 decisions.');
assert.equal(new Set(audit.path).size,audit.path.length,'Canonical physical route must not loop through the same location twice.');
assert.deepEqual(audit.decisions.map(d=>d.dir),map.solution,'Band symbols and canonical decision exits diverged.');
assert.deepEqual(audit.decisions.map(d=>d.from),map.bandDecisionNodes,'Band-decision source nodes diverged from the canonical route.');

for(const [step,from,dir,to] of [[4,'A05','SW','A06'],[24,'C09','SE','C10'],[25,'C12','S','C14']]){
  const d=audit.decisions[step-1];assert.deepEqual([d.step,d.from,d.dir,d.to],[step,from,dir,to],`Inserted mandatory scene broke band decision ${step}.`);
}
for(const [from,to] of [['A06','A07'],['C10','C12'],['C14','C15']])assert.ok(audit.physical.some(e=>e.from===from&&e.to===to),`Mandatory zero-band transit ${from} -> ${to} is missing.`);

const vec={N:[0,-1],NE:[1,-1],E:[1,0],SE:[1,1],S:[0,1],SW:[-1,1],W:[-1,0],NW:[-1,-1]};
const byId=new Map(map.nodes.map(n=>[n.id,n]));
for(const [from,dir,to] of map.edges){
  if(!vec[dir])continue;const a=byId.get(from),b=byId.get(to);if(!a||!b||Number(a.z)!==Number(b.z))continue;
  const [vx,vy]=vec[dir],dx=b.x-a.x,dy=b.y-a.y;
  assert.ok(dx*vx+dy*vy>0,`Map edge ${from} ${dir} ${to} points opposite to its declared direction.`);
}

let state=initialSharedState(map);let status=routeProgressStatus(map,state);assert.equal(status.ok,true,'Start state must be on the canonical route.');
const adj=buildAdj(map);
for(const edge of audit.physical){
  assert.equal(state.node,edge.from,`Simulation drift before ${edge.from}.`);
  let result=beginMove(map,state,edge.dir);assert.equal(result.ok,true,`${edge.from}/${edge.dir}/${edge.to} was rejected.`);state=result.state;
  status=routeProgressStatus(map,state);assert.equal(status.ok,true,`GM route validator rejected canonical transit ${edge.from} -> ${edge.to}.`);
  while(state.transit){result=beginMove(map,state,state.transit.dir);assert.equal(result.ok,true);state=result.state;status=routeProgressStatus(map,state);assert.equal(status.ok,true,`GM route validator rejected canonical corridor progress toward ${edge.to}.`)}
  assert.equal(state.node,edge.to);status=routeProgressStatus(map,state);assert.equal(status.ok,true,`GM route validator rejected canonical arrival ${edge.to}.`);
}
assert.equal(state.node,map.goal);assert.equal(state.bandStep,25);assert.equal(routeProgressStatus(map,state).kind,'complete');

const broken=structuredClone(state);broken.decisionHistory[3]={...broken.decisionHistory[3],to:'A07'};
assert.equal(routeProgressStatus(map,broken).kind,'decision-divergence','GM route validator must detect the old A05 -> A07 shortcut model as wrong.');

console.log('final-route-integrity: OK (107 locations; 25 band decisions; 28 physical canonical edges; direction geometry and GM route progress validated)');
