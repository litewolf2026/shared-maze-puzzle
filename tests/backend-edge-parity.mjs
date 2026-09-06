import fs from 'node:fs';
import assert from 'node:assert/strict';
import {applyExpansions} from '../js/map-expansion.js';

const maps=JSON.parse(fs.readFileSync(new URL('../data/maps.json',import.meta.url),'utf8')).maps;
const expansion=JSON.parse(fs.readFileSync(new URL('../data/selem-expansion.json',import.meta.url),'utf8'));
const secrets=JSON.parse(fs.readFileSync(new URL('../data/selem-secrets.json',import.meta.url),'utf8'));
const map=applyExpansions(maps[0],expansion,secrets);
const baseSql=fs.readFileSync(new URL('../supabase/migrations/20260905_authoritative_route_validation.sql',import.meta.url),'utf8');
const fixSql=fs.readFileSync(new URL('../supabase/migrations/20260906_direction_semantics_fix.sql',import.meta.url),'utf8');
const expansionSql=fs.readFileSync(new URL('../supabase/migrations/20260906_selem_expansion_edges.sql',import.meta.url),'utf8');
const safetySql=fs.readFileSync(new URL('../supabase/migrations/20260906_expansion_route_safety_fix.sql',import.meta.url),'utf8');
const hiddenSql=fs.readFileSync(new URL('../supabase/migrations/20260906_hidden_connections.sql',import.meta.url),'utf8');
const moreHiddenSql=fs.readFileSync(new URL('../supabase/migrations/20260906_additional_hidden_rooms.sql',import.meta.url),'utf8');
const routeSql=fs.readFileSync(new URL('../supabase/migrations/20260906_canonical_story_route.sql',import.meta.url),'utf8');
const cavernSql=fs.readFileSync(new URL('../supabase/migrations/20260906_drowned_cavern.sql',import.meta.url),'utf8');
const relocateSql=fs.readFileSync(new URL('../supabase/migrations/20260906_relocate_under_alt_elem_entrance.sql',import.meta.url),'utf8');
const OPP={N:'S',NE:'SW',E:'W',SE:'NW',S:'N',SW:'NE',W:'E',NW:'SE',UP:'DOWN',DOWN:'UP'};

function edgeArray(sql,label){const match=sql.match(/\$edges\$(\[[\s\S]*?\])\$edges\$::jsonb/);assert.ok(match,`Could not find edge JSON in ${label}.`);return JSON.parse(match[1])}
const backend=new Map();
const put=(a,d,b)=>backend.set(`${a}|${d}`,b);
const del=(a,d,b)=>{if(backend.get(`${a}|${d}`)===b)backend.delete(`${a}|${d}`)};
function putWithReverse([a,d,b]){put(a,d,b);const r=OPP[d];if(r&&!backend.has(`${b}|${r}`))put(b,r,a)}
function applyDeleteSql(sql){for(const m of sql.matchAll(/from_node='([^']+)'\s+and dir='([^']+)'\s+and to_node='([^']+)'/g))del(m[1],m[2],m[3])}
function applyValuesSql(sql){for(const m of sql.matchAll(/\('selem-01','([^']+)','([^']+)','([^']+)'\)/g))put(m[1],m[2],m[3])}

edgeArray(baseSql,'authoritative migration').forEach(putWithReverse);
applyDeleteSql(fixSql);applyValuesSql(fixSql);
edgeArray(expansionSql,'expansion migration').forEach(([a,d,b])=>{put(a,d,b);const r=OPP[d];if(r)put(b,r,a)});
applyDeleteSql(safetySql);applyValuesSql(safetySql);
applyValuesSql(hiddenSql);applyValuesSql(moreHiddenSql);
applyDeleteSql(routeSql);applyValuesSql(routeSql);
applyValuesSql(cavernSql);
applyDeleteSql(relocateSql);applyValuesSql(relocateSql);

const frontend=new Map();
for(const [a,d,b] of map.edges){frontend.set(`${a}|${d}`,b);const r=OPP[d];if(r&&!frontend.has(`${b}|${r}`))frontend.set(`${b}|${r}`,a)}
assert.deepEqual([...backend.entries()].sort(),[...frontend.entries()].sort(),'Supabase maze_edges migrations drift from fully expanded frontend graph');
for(const [key,target] of [['A23|E','A31'],['A31|W','A23'],['B33|S','B35'],['B35|N','B33'],['D12|W','D13'],['D13|E','D12']])assert.equal(frontend.get(key),target,`Missing hidden edge ${key}`);
for(const [key,target] of [['A05|SW','A06'],['A06|SW','A07'],['C09|SE','C10'],['C10|SE','C12'],['C12|S','C14'],['C14|S','C15'],['C14|NE','C26']])assert.equal(frontend.get(key),target,`Missing canonical story-route edge ${key}`);
for(const [key,target] of [['D09|E','D14'],['D14|W','D09']])assert.equal(frontend.get(key),target,`Missing drowned-cavern edge ${key}`);
assert.equal(frontend.get('B14|DOWN'),'D01','Under Alt-Elem must descend from the old pump chamber.');
assert.equal(frontend.get('D01|UP'),'B14','Under Alt-Elem return route must lead back to the old pump chamber.');
assert.equal(frontend.has('C14|DOWN'),false,'Sahira\'s room must not be the entrance to Under Alt-Elem.');
console.log(`backend-edge-parity: OK (${frontend.size} directed edges, hidden rooms, canonical story route, relocated D entrance and drowned cavern included)`);
