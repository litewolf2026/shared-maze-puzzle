import fs from 'node:fs';
import assert from 'node:assert/strict';

const maps=JSON.parse(fs.readFileSync(new URL('../data/maps.json',import.meta.url),'utf8')).maps;
const map=maps[0];
const baseSql=fs.readFileSync(new URL('../supabase/migrations/20260905_authoritative_route_validation.sql',import.meta.url),'utf8');
const fixSql=fs.readFileSync(new URL('../supabase/migrations/20260906_direction_semantics_fix.sql',import.meta.url),'utf8');
const OPP={N:'S',NE:'SW',E:'W',SE:'NW',S:'N',SW:'NE',W:'E',NW:'SE',UP:'DOWN',DOWN:'UP'};

const match=baseSql.match(/\$edges\$(\[[\s\S]*?\])\$edges\$::jsonb/);
assert.ok(match,'Could not find base maze edge JSON in authoritative migration.');
const baseEdges=JSON.parse(match[1]);
const backend=new Map();
const put=(a,d,b)=>backend.set(`${a}|${d}`,b);
const del=(a,d,b)=>{if(backend.get(`${a}|${d}`)===b)backend.delete(`${a}|${d}`)};
for(const [a,d,b] of baseEdges){put(a,d,b);const r=OPP[d];if(r&&!backend.has(`${b}|${r}`))put(b,r,a)}

for(const m of fixSql.matchAll(/from_node='([^']+)'\s+and dir='([^']+)'\s+and to_node='([^']+)'/g))del(m[1],m[2],m[3]);
for(const m of fixSql.matchAll(/\('selem-01','([^']+)','([^']+)','([^']+)'\)/g))put(m[1],m[2],m[3]);

const frontend=new Map();
for(const [a,d,b] of map.edges){frontend.set(`${a}|${d}`,b);const r=OPP[d];if(r&&!frontend.has(`${b}|${r}`))frontend.set(`${b}|${r}`,a)}

assert.deepEqual([...backend.entries()].sort(),[...frontend.entries()].sort(),'Supabase maze_edges migrations drift from data/maps.json');
console.log(`backend-edge-parity: OK (${frontend.size} directed edges)`);
