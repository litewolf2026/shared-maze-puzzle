import assert from 'node:assert/strict';
import fs from 'node:fs';
import {applyExpansions} from '../js/map-expansion.js';
import {enrichMapContent} from '../js/content-model.js';
import {generateContentPlan} from '../js/content-engine.js';
import {REUSABLE_CONTENT_PACK} from '../js/reusable-content-pack.js';
import {scenarioContentPack} from '../js/scenario-content-pack.js';

const read=p=>JSON.parse(fs.readFileSync(new URL(p,import.meta.url),'utf8'));
const map=applyExpansions(read('../data/maps.json').maps[0],read('../data/selem-expansion.json'),read('../data/selem-secrets.json'));
const slots=read('../data/content/selem-slots.json'),catalog=read('../data/content/catalog.json'),pools=read('../data/content/pools.json'),profiles=read('../data/content/profiles.json'),roomFeatures=read('../data/room-features.json').features;
const derivedByNode=Object.fromEntries(enrichMapContent(map).map(x=>[x.id,x]));
const plan=generateContentPlan({map,slotConfig:slots,catalog,pools,profiles,roomFeatures,derivedByNode,seed:slots.generation.seed});
const pack=scenarioContentPack('selem-01');

assert.equal(pack.id,'selem-authored-content-v2');
for(const id of Object.keys(pack.items))assert.equal(REUSABLE_CONTENT_PACK.items[id],undefined,`${id} leaked into reusable core content.`);
for(const pool of Object.values(REUSABLE_CONTENT_PACK.pools))for(const id of Object.keys(pack.items))assert.equal(pool.entries.includes(id),false,`${id} leaked into reusable pool.`);

const expected=[
  ['C10','actor-nottel','selem_nottel_witness','Nottel'],
  ['C15','actor-sahira','selem_sahira_antagonist','Sahira'],
  ['C15','actor-nachzehrer','selem_nachzehrer','Nachzehrer']
];
for(const [nodeId,slotId,contentId,label] of expected){
  const assignment=plan.rooms[nodeId].assignments.find(x=>x.slotId===slotId);assert.ok(assignment,`${label} must remain present in ${nodeId}.`);
  assert.equal(assignment.contentId,contentId);assert.equal(assignment.type,'encounter');assert.equal(assignment.additiveOnUpgrade,true);assert.ok(assignment.description);
  assert.equal(plan.uniqueContent.includes(contentId),true,`${label} must remain unique.`);
}

const c15Ritual=plan.rooms.C15.assignments.find(x=>x.slotId==='ritual-sahira-rewrite');assert.ok(c15Ritual,'Sahiras ritual remains authored room content.');assert.equal(c15Ritual.type,'event');

const controller=fs.readFileSync(new URL('../js/content-controller.js',import.meta.url),'utf8');
for(const id of ['selem_nottel_witness','selem_sahira_antagonist','selem_nachzehrer','selem_sahira_rewrite_ritual'])assert.match(controller,new RegExp(id),`${id} must be table-managed in the content panel.`);
assert.match(controller,/Am Spieltisch ausspielen/);assert.match(controller,/weder Status noch Ergebnis/);

const index=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
assert.doesNotMatch(index,/actor-status-controller|finale-status-controller|actor-status\.css|finale-status\.css/);

console.log('selem-core-actors: OK (Nottel, Sahira and Nachzehrer remain authored encounters; outcome handling stays at the game table)');
