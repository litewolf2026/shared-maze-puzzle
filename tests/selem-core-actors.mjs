import assert from 'node:assert/strict';
import fs from 'node:fs';
import {applyExpansions} from '../js/map-expansion.js';
import {enrichMapContent} from '../js/content-model.js';
import {generateContentPlan,materializeRoomState,applyContentAction} from '../js/content-engine.js';
import {actorStatus,outcomeOptions} from '../js/content-outcomes.js';
import {REUSABLE_CONTENT_PACK} from '../js/reusable-content-pack.js';
import {scenarioContentPack,scenarioActorIds} from '../js/scenario-content-pack.js';

const read=p=>JSON.parse(fs.readFileSync(new URL(p,import.meta.url),'utf8'));
const map=applyExpansions(read('../data/maps.json').maps[0],read('../data/selem-expansion.json'),read('../data/selem-secrets.json'));
const slots=read('../data/content/selem-slots.json'),catalog=read('../data/content/catalog.json'),pools=read('../data/content/pools.json'),profiles=read('../data/content/profiles.json'),roomFeatures=read('../data/room-features.json').features;
const derivedByNode=Object.fromEntries(enrichMapContent(map).map(x=>[x.id,x]));
const plan=generateContentPlan({map,slotConfig:slots,catalog,pools,profiles,roomFeatures,derivedByNode,seed:slots.generation.seed});
const pack=scenarioContentPack('selem-01');

assert.equal(pack.id,'selem-core-actors-v1');
assert.deepEqual(new Set(scenarioActorIds('selem-01')),new Set(['nottel','sahira','nachzehrer']));
for(const id of Object.keys(pack.items))assert.equal(REUSABLE_CONTENT_PACK.items[id],undefined,`${id} leaked into reusable core content.`);
for(const pool of Object.values(REUSABLE_CONTENT_PACK.pools))for(const id of Object.keys(pack.items))assert.equal(pool.entries.includes(id),false,`${id} leaked into reusable pool.`);

const c10=plan.rooms.C10.assignments.find(x=>x.slotId==='actor-nottel');
const sahira=plan.rooms.C15.assignments.find(x=>x.slotId==='actor-sahira');
const nachzehrer=plan.rooms.C15.assignments.find(x=>x.slotId==='actor-nachzehrer');
assert.equal(c10.contentId,'selem_nottel_witness');assert.equal(c10.additiveOnUpgrade,true);assert.equal(c10.state,'unresolved');
assert.equal(sahira.contentId,'selem_sahira_antagonist');assert.equal(nachzehrer.contentId,'selem_nachzehrer');
assert.equal(plan.uniqueContent.includes('selem_nottel_witness'),true);assert.equal(plan.uniqueContent.includes('selem_sahira_antagonist'),true);assert.equal(plan.uniqueContent.includes('selem_nachzehrer'),true);

let state={roomState:{}};state=materializeRoomState(state,plan,'C10').state;
let r=applyContentAction(state,'C10','actor-nottel','trigger',{isGm:false});assert.equal(r.ok,false,'Player may not trigger Nottel state.');
r=applyContentAction(state,'C10','actor-nottel','trigger',{isGm:true});assert.equal(r.ok,true);state=r.state;let a=state.roomState.C10.content.assignments.find(x=>x.slotId==='actor-nottel');assert.equal(a.state,'triggered');
assert.ok(outcomeOptions(a).some(x=>x.id==='joins_party'));
r=applyContentAction(state,'C10','actor-nottel','outcome:joins_party',{isGm:true});assert.equal(r.ok,true);state=r.state;a=state.roomState.C10.content.assignments.find(x=>x.slotId==='actor-nottel');assert.equal(a.state,'triggered');assert.equal(actorStatus(a),'with_party');
r=applyContentAction(state,'C10','actor-nottel','outcome:secured',{isGm:true});assert.equal(r.ok,true);state=r.state;a=state.roomState.C10.content.assignments.find(x=>x.slotId==='actor-nottel');assert.equal(a.state,'resolved');assert.equal(actorStatus(a),'secured');assert.equal(a.runtime.outcomes.length,2);

state=materializeRoomState(state,plan,'C15').state;
r=applyContentAction(state,'C15','actor-sahira','trigger',{isGm:true});state=r.state;
r=applyContentAction(state,'C15','actor-sahira','outcome:negotiating',{isGm:true});assert.equal(r.ok,true);state=r.state;a=state.roomState.C15.content.assignments.find(x=>x.slotId==='actor-sahira');assert.equal(a.state,'triggered');assert.equal(actorStatus(a),'negotiating');
r=applyContentAction(state,'C15','actor-sahira','outcome:ritual_broken',{isGm:true});assert.equal(r.ok,true);state=r.state;a=state.roomState.C15.content.assignments.find(x=>x.slotId==='actor-sahira');assert.equal(a.state,'resolved');assert.equal(actorStatus(a),'ritual_broken');

r=applyContentAction(state,'C15','actor-nachzehrer','trigger',{isGm:true});state=r.state;
r=applyContentAction(state,'C15','actor-nachzehrer','outcome:repelled',{isGm:true});assert.equal(r.ok,true);state=r.state;a=state.roomState.C15.content.assignments.find(x=>x.slotId==='actor-nachzehrer');assert.equal(a.state,'triggered');assert.equal(actorStatus(a),'repelled');
r=applyContentAction(state,'C15','actor-nachzehrer','outcome:bound',{isGm:true});assert.equal(r.ok,true);state=r.state;a=state.roomState.C15.content.assignments.find(x=>x.slotId==='actor-nachzehrer');assert.equal(a.state,'resolved');assert.equal(actorStatus(a),'bound');

const playerOutcome=applyContentAction(materializeRoomState({roomState:{}},plan,'C15').state,'C15','actor-sahira','outcome:defeated',{isGm:false});assert.equal(playerOutcome.ok,false);assert.equal(playerOutcome.error,'CONTENT_OUTCOME_REQUIRES_GM');

console.log('selem-core-actors: OK (Nottel, Sahira and Nachzehrer are unique persistent scenario actors with GM-authoritative outcomes)');
