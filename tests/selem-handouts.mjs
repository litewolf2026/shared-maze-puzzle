import assert from 'node:assert/strict';
import fs from 'node:fs';
import {applyExpansions} from '../js/map-expansion.js';
import {enrichMapContent} from '../js/content-model.js';
import {generateContentPlan,materializeRoomState,applyContentAction,contentVisibleToPlayer} from '../js/content-engine.js';
import {REUSABLE_CONTENT_PACK} from '../js/reusable-content-pack.js';
import {scenarioContentPack,scenarioHandoutIds} from '../js/scenario-content-pack.js';

const read=p=>JSON.parse(fs.readFileSync(new URL(p,import.meta.url),'utf8'));
const map=applyExpansions(read('../data/maps.json').maps[0],read('../data/selem-expansion.json'),read('../data/selem-secrets.json'));
const slots=read('../data/content/selem-slots.json'),catalog=read('../data/content/catalog.json'),pools=read('../data/content/pools.json'),profiles=read('../data/content/profiles.json'),roomFeatures=read('../data/room-features.json').features;
const handouts=read('../data/content/selem-handouts.json');
const derivedByNode=Object.fromEntries(enrichMapContent(map).map(x=>[x.id,x]));
const plan=generateContentPlan({map,slotConfig:slots,catalog,pools,profiles,roomFeatures,derivedByNode,seed:slots.generation.seed});
const pack=scenarioContentPack('selem-01');

const expected={
  A06:'a06-empty-lens',B12:'b12-black-gate',C03:'c03-relief-variants',C10:'c10-nottel-notes',C12:'c12-lost-way-glyph',C14:'c14-sahira-protocol',C15:'c15-time-anchor-network'
};
assert.equal(handouts.scenario,'selem-01');assert.equal(Object.keys(handouts.handouts).length,7);
assert.deepEqual(new Set(scenarioHandoutIds('selem-01')),new Set(Object.values(expected)));
assert.equal(pack.version,2,'Selem scenario pack must advertise the handout expansion.');

for(const [nodeId,id] of Object.entries(expected)){
  const definition=handouts.handouts[id];assert.ok(definition,`Missing handout definition ${id}.`);assert.equal(definition.sourceNode,nodeId);assert.ok(definition.title&&definition.caption&&definition.asset);
  const assetPath=`../${definition.asset.replace(/^\.\//,'')}`;const svg=fs.readFileSync(new URL(assetPath,import.meta.url),'utf8');assert.match(svg,/<svg\b/);assert.match(svg,/<title\b/);assert.doesNotMatch(svg,/<script\b/i,`${id} SVG must stay static.`);
  const assignment=(plan.rooms[nodeId]?.assignments||[]).find(a=>a.mechanics?.handoutId===id);assert.ok(assignment,`${nodeId} does not materialize ${id}.`);
  assert.equal(assignment.type,'discovery');assert.equal(assignment.hidden,true);assert.equal(assignment.source,'fixed');assert.equal(assignment.additiveOnUpgrade,true);assert.equal(assignment.state,'unresolved');
  assert.equal(REUSABLE_CONTENT_PACK.items[assignment.contentId],undefined,`${id} leaked into reusable core.`);
}

// A hidden handout is GM-controlled: players cannot reveal it, but once the GM does it becomes player-visible.
let state=materializeRoomState({roomState:{}},plan,'A06').state;let handout=state.roomState.A06.content.assignments.find(a=>a.slotId==='handout-a06');
assert.equal(contentVisibleToPlayer(handout,state,'A06'),false);
let r=applyContentAction(state,'A06','handout-a06','discover',{isGm:false});assert.equal(r.ok,false);assert.equal(r.error,'CONTENT_ACTION_FORBIDDEN');
r=applyContentAction(state,'A06','handout-a06','discover',{isGm:true});assert.equal(r.ok,true);state=r.state;handout=state.roomState.A06.content.assignments.find(a=>a.slotId==='handout-a06');assert.equal(handout.state,'discovered');assert.equal(contentVisibleToPlayer(handout,state,'A06'),true);

// Existing materialized C10 content gains only the additive handout; established actor/content states survive untouched.
const old=structuredClone(plan.rooms.C10);old.planVersion=5;old.assignments=old.assignments.filter(a=>a.slotId!=='handout-c10');const actor=old.assignments.find(a=>a.slotId==='actor-nottel');actor.state='triggered';actor.runtime={actorStatus:'with_party'};
const upgraded=materializeRoomState({roomState:{C10:{content:old}}},plan,'C10');assert.equal(upgraded.changed,true);const upgradedAssignments=upgraded.state.roomState.C10.content.assignments;
assert.equal(upgradedAssignments.find(a=>a.slotId==='actor-nottel').state,'triggered');assert.equal(upgradedAssignments.find(a=>a.slotId==='actor-nottel').runtime.actorStatus,'with_party');assert.equal(upgradedAssignments.find(a=>a.slotId==='handout-c10').state,'unresolved');

const controller=fs.readFileSync(new URL('../js/selem-handout-controller.js',import.meta.url),'utf8');assert.match(controller,/mechanics\?\.handoutId/);assert.match(controller,/state==='unresolved'/);assert.match(controller,/maze-state/);
const index=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');assert.match(index,/handouts\.css/);assert.match(index,/selem-handout-controller\.js/);

console.log('selem-handouts: OK (7 authored SVG handouts; GM reveal -> synchronized player collection; additive upgrade preserved)');
