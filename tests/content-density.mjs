import fs from 'node:fs';
import assert from 'node:assert/strict';
import {applyExpansion} from '../js/map-expansion.js';
import {enrichMapContent} from '../js/content-model.js';
import {generateContentPlan} from '../js/content-engine.js';

const read=p=>JSON.parse(fs.readFileSync(new URL(p,import.meta.url),'utf8'));
const map=applyExpansion(read('../data/maps.json').maps[0],read('../data/selem-expansion.json'));
const catalog=read('../data/content/catalog.json'),pools=read('../data/content/pools.json'),profiles=read('../data/content/profiles.json'),slots=read('../data/content/selem-slots.json');
const derivedByNode=Object.fromEntries(enrichMapContent(map).map(x=>[x.id,x]));
const plan=generateContentPlan({map,slotConfig:slots,catalog,pools,profiles,derivedByNode,seed:slots.generation.seed});
const density=Object.entries(plan.rooms).map(([id,r])=>({id,total:r.assignments.length,pooled:r.assignments.filter(a=>a.source!=='fixed').length,fixed:r.assignments.filter(a=>a.source==='fixed').length})).sort((a,b)=>b.total-a.total||a.id.localeCompare(b.id));
const top=density.slice(0,8);
const max=Math.max(...density.map(x=>x.total),0);
assert.ok(max<=8,`Room content is too dense: ${top.map(x=>`${x.id}=${x.total}`).join(', ')}`);
console.log(`content-density: OK (max ${max}; densest ${top.map(x=>`${x.id}:${x.total}`).join(' | ')})`);
