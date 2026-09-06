import fs from 'node:fs';
import assert from 'node:assert/strict';
import {applyExpansions} from '../js/map-expansion.js';
import {buildAdj,isDecisionNode} from '../js/navigation-model.js';

const read=p=>JSON.parse(fs.readFileSync(new URL(p,import.meta.url),'utf8'));
const base=read('../data/maps.json').maps[0];
const map=applyExpansions(base,read('../data/selem-expansion.json'),read('../data/selem-secrets.json'));
const decisionSql=fs.readFileSync(new URL('../supabase/migrations/20260906_authoritative_decision_nodes.sql',import.meta.url),'utf8');
const hiddenSql=fs.readFileSync(new URL('../supabase/migrations/20260906_hidden_connections.sql',import.meta.url),'utf8');
const routeSql=fs.readFileSync(new URL('../supabase/migrations/20260906_canonical_story_route.sql',import.meta.url),'utf8');
const forced=new Set();
for(const sql of [decisionSql,hiddenSql])for(const m of sql.matchAll(/\('selem-01','([^']+)'\)/g)){
  const id=m[1];if(map.nodes.some(n=>n.id===id))forced.add(id);
}
for(const m of routeSql.matchAll(/node_id\s+in\s+\(([^)]+)\)/g))for(const q of m[1].matchAll(/'([^']+)'/g))forced.delete(q[1]);
for(const m of routeSql.matchAll(/node_id='([^']+)'/g))forced.delete(m[1]);

const adj=buildAdj(map);
let decisions=0;
for(const node of map.nodes){
  const serverDecision=forced.has(node.id)||Object.keys(adj.get(node.id)||{}).length>=3;
  const clientDecision=isDecisionNode(map,node.id);
  assert.equal(clientDecision,serverDecision,`Decision-node drift at ${node.id}`);
  if(clientDecision)decisions++;
}
assert.equal(isDecisionNode(map,'A03'),true);
assert.equal(isDecisionNode(map,'A06'),false,'Mandatory lens scene must not consume a second band symbol.');
assert.equal(isDecisionNode(map,'C10'),false,'Mandatory Nottel scene must not consume a second band symbol.');
assert.equal(isDecisionNode(map,'C14'),true,'Sahira room remains a real choice hub, but is reached only after band 25/25.');
assert.equal(isDecisionNode(map,'A21'),false,'Pure side-corridor transit must not consume band.');
assert.equal(isDecisionNode(map,'A22'),true,'Leaving an explorable room must consume band.');
assert.equal(isDecisionNode(map,'A23'),false,'Secret continuation behind a consumed branch decision must not spend another band symbol.');
assert.equal(isDecisionNode(map,'A31'),false,'Secret dead-end room must not create another band decision on return.');
assert.equal(isDecisionNode(map,'B35'),false,'Secret maintenance room must not create another band decision on return.');
assert.equal(isDecisionNode(map,'D13'),true,'D13 remains an authored room decision; band is exhausted before it is reachable.');
assert.deepEqual(map.bandDecisionNodes.map(id=>isDecisionNode(map,id)),Array(25).fill(true),'All explicit black-band source nodes must remain decisions.');
console.log(`decision-parity: OK (${decisions} decision nodes / ${map.nodes.length} locations; A06 and C10 are authored transit rooms)`);
