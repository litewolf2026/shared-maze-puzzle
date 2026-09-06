import fs from 'node:fs';
import assert from 'node:assert/strict';
import {applyExpansion} from '../js/map-expansion.js';
import {buildAdj,isDecisionNode} from '../js/navigation-model.js';

const base=JSON.parse(fs.readFileSync(new URL('../data/maps.json',import.meta.url),'utf8')).maps[0];
const expansion=JSON.parse(fs.readFileSync(new URL('../data/selem-expansion.json',import.meta.url),'utf8'));
const map=applyExpansion(base,expansion);
const sql=fs.readFileSync(new URL('../supabase/migrations/20260906_authoritative_decision_nodes.sql',import.meta.url),'utf8');
const insertBlock=sql.match(/insert into public\.maze_forced_decision_nodes\(scenario_id,node_id\) values([\s\S]*?)on conflict do nothing;/i)?.[1]||'';
const forced=new Set([...insertBlock.matchAll(/\('selem-01','([^']+)'\)/g)].map(m=>m[1]));
const adj=buildAdj(map);
let decisions=0;
for(const node of map.nodes){
  const serverDecision=forced.has(node.id)||Object.keys(adj.get(node.id)||{}).length>=3;
  const clientDecision=isDecisionNode(map,node.id);
  assert.equal(clientDecision,serverDecision,`Decision-node drift at ${node.id}`);
  if(clientDecision)decisions++;
}
assert.equal(isDecisionNode(map,'A03'),true);
assert.equal(isDecisionNode(map,'A21'),false,'Pure side-corridor transit must not consume band.');
assert.equal(isDecisionNode(map,'A22'),true,'Leaving an explorable room must consume band.');
console.log(`decision-parity: OK (${decisions} decision nodes / ${map.nodes.length} locations)`);
