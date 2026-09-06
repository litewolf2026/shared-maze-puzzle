import fs from 'node:fs';
import assert from 'node:assert/strict';
import {applyExpansion} from '../js/map-expansion.js';

const maps=JSON.parse(fs.readFileSync(new URL('../data/maps.json',import.meta.url),'utf8')).maps;
const expansion=JSON.parse(fs.readFileSync(new URL('../data/selem-expansion.json',import.meta.url),'utf8'));
const map=applyExpansion(maps[0],expansion);
const baseSql=fs.readFileSync(new URL('../supabase/migrations/20260905_authoritative_route_validation.sql',import.meta.url),'utf8');
const fixSql=fs.readFileSync(new URL('../supabase/migrations/20260906_direction_semantics_fix.sql',import.meta.url),'utf8');
const expansionSql=fs.readFileSync(new URL('../supabase/migrations/20260906_selem_expansion_edges.sql',import.meta.url),'utf8');
const OPP={N:'S',NE:'SW',E:'W',SE:'NW',S:'N',SW:'NE',W:'E',NW:'SE',UP:'DOWN',DOWN:'UP'};

function edgeArray(sql,label){
  const match=sql.match(/\$edges\$(\[[\s\S]*?\])\$edges\$::jsonb/);
  assert.ok(match,`Could not find edge JSON in ${label}.`);
  return JSON.parse(match[1]);
}

const backend=new Map();
const put=(a,d,b)=>backend.set(`${a}|${d}`,b);
const del=(a,d,b)=>{if(backend.get(`${a}|${d}`)===b)backend.delete(`${a}|${d}`)};
function putWithReverse([a,d,b]){put(a,d,b);const r=OPP[d];if(r&&!backend.has(`${b}|${r}`))put(b,r,a)}

edgeArray(baseSql,'authoritative migration').forEach(putWithReverse);
for(const m of fixSql.matchAll(/from_node='([^']+)'\s+and dir='([^']+)'\s+and to_node='([^']+)'/g))del(m[1],m[2],m[3]);
for(const m of fixSql.matchAll(/\('selem-01','([^']+)','([^']+)','([^']+)'\)/g))put(m[1],m[2],m[3]);
edgeArray(expansionSql,'expansion migration').forEach(([a,d,b])=>{put(a,d,b);const r=OPP[d];if(r)put(b,r,a)});

const frontend=new Map();
for(const [a,d,b] of map.edges){frontend.set(`${a}|${d}`,b);const r=OPP[d];if(r&&!frontend.has(`${b}|${r}`))frontend.set(`${b}|${r}`,a)}

assert.deepEqual([...backend.entries()].sort(),[...frontend.entries()].sort(),'Supabase maze_edges migrations drift from expanded frontend graph');
console.log(`backend-edge-parity: OK (${frontend.size} directed edges, expansion included)`);
