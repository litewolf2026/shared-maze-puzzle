import assert from 'node:assert/strict';
import fs from 'node:fs';
import {applyExpansions} from '../js/map-expansion.js';
import {enrichMapContent} from '../js/content-model.js';
import {generateContentPlan,materializeRoomState,applyContentAction} from '../js/content-engine.js';
import {finaleSignals,ritualStatus,finaleAnchorRows} from '../js/finale-status.js';
import {scenarioContentPack} from '../js/scenario-content-pack.js';

const read=p=>JSON.parse(fs.readFileSync(new URL(p,import.meta.url),'utf8'));
const map=applyExpansions(read('../data/maps.json').maps[0],read('../data/selem-expansion.json'),read('../data/selem-secrets.json'));
const slots=read('../data/content/selem-slots.json'),catalog=read('../data/content/catalog.json'),pools=read('../data/content/pools.json'),profiles=read('../data/content/profiles.json'),roomFeatures=read('../data/room-features.json').features;
const derivedByNode=Object.fromEntries(enrichMapContent(map).map(x=>[x.id,x]));
const plan=generateContentPlan({map,slotConfig:slots,catalog,pools,profiles,roomFeatures,derivedByNode,seed:slots.generation.seed});
const pack=scenarioContentPack('selem-01');

assert.equal(pack.version,4,'Handout removal should leave the finale story pack at v4.');
const ritualDef=pack.items.selem_sahira_rewrite_ritual;assert.ok(ritualDef);assert.equal(ritualDef.type,'event');assert.equal(ritualDef.unique,true);assert.equal(ritualDef.mechanics.ritualId,'sahira-rewrite');
const ritualPlan=plan.rooms.C15.assignments.find(a=>a.slotId==='ritual-sahira-rewrite');assert.ok(ritualPlan);assert.equal(ritualPlan.contentId,'selem_sahira_rewrite_ritual');assert.equal(ritualPlan.source,'fixed');assert.equal(ritualPlan.additiveOnUpgrade,true);assert.equal(ritualPlan.state,'unresolved');
assert.equal(plan.rooms.C15.assignments.filter(a=>a.mechanics?.ritualId==='sahira-rewrite').length,1,'Ritual must exist exactly once.');
assert.equal(Object.values(pack.items).some(x=>x.mechanics?.handoutId),false,'Scenario pack must not contain in-app handouts.');

let state={roomState:{}};
for(const node of ['A06','C10','C14','C15'])state=materializeRoomState(state,plan,node).state;
let model=finaleSignals(state);assert.equal(model.available,true);assert.equal(model.ritual.id,'unresolved');assert.equal(model.anchorCount,0);assert.equal(model.historicalChain,false);assert.equal(model.ritualStopped,false);assert.equal(model.nachzehrerControlled,false);assert.equal(model.success,undefined,'Finale model must not expose an automatic victory flag.');

// Players cannot start or resolve the GM-owned ritual.
let r=applyContentAction(state,'C15','ritual-sahira-rewrite','trigger',{isGm:false});assert.equal(r.ok,false);assert.equal(r.error,'CONTENT_ACTION_FORBIDDEN');
r=applyContentAction(state,'C15','ritual-sahira-rewrite','trigger',{isGm:true});assert.equal(r.ok,true);state=r.state;assert.equal(ritualStatus(state).id,'triggered');
r=applyContentAction(state,'C15','ritual-sahira-rewrite','outcome:destabilized',{isGm:true});assert.equal(r.ok,true);state=r.state;assert.equal(ritualStatus(state).id,'destabilized');assert.equal(ritualStatus(state).terminal,false);
r=applyContentAction(state,'C15','ritual-sahira-rewrite','outcome:control_recovered',{isGm:true});assert.equal(r.ok,true);state=r.state;assert.equal(ritualStatus(state).id,'control_recovered');
r=applyContentAction(state,'C15','ritual-sahira-rewrite','outcome:broken',{isGm:true});assert.equal(r.ok,true);state=r.state;assert.equal(ritualStatus(state).id,'broken');assert.equal(ritualStatus(state).terminal,true);assert.equal(finaleSignals(state).ritualStopped,true);

// Counter-anchors now use existing story evidence / actor state, not handout objects.
r=applyContentAction(state,'A06','story-green-lens','discover',{isGm:true});assert.equal(r.ok,true);state=r.state;
r=applyContentAction(state,'C10','actor-nottel','trigger',{isGm:true});assert.equal(r.ok,true);state=r.state;
r=applyContentAction(state,'C14','story-sahira-notes','discover',{isGm:true});assert.equal(r.ok,true);state=r.state;
model=finaleSignals(state);assert.equal(model.anchorCount,3);assert.equal(model.anchors.length,3);assert.equal(model.historicalChain,true,'A06 evidence + active Nottel testimony should form the minimum documented sequence chain.');
assert.equal(finaleAnchorRows(state).every(a=>a.secured),true);

// Nachzehrer remains an independent axis of the finale; binding it flips only its own success signal.
r=applyContentAction(state,'C15','actor-nachzehrer','trigger',{isGm:true});assert.equal(r.ok,true);state=r.state;assert.equal(finaleSignals(state).nachzehrerControlled,false);
r=applyContentAction(state,'C15','actor-nachzehrer','outcome:bound',{isGm:true});assert.equal(r.ok,true);state=r.state;model=finaleSignals(state);assert.equal(model.nachzehrerControlled,true);assert.ok(model.signals.every(s=>s.met),'All three authored success signals should now be visible, without creating an automatic victory state.');assert.equal(model.success,undefined);

// A partial rewrite is explicitly local pressure, not a total-retcon success state.
let partial=materializeRoomState({roomState:{}},plan,'C15').state;partial=applyContentAction(partial,'C15','ritual-sahira-rewrite','trigger',{isGm:true}).state;partial=applyContentAction(partial,'C15','ritual-sahira-rewrite','outcome:partial_rewrite',{isGm:true}).state;assert.equal(ritualStatus(partial).id,'partial_rewrite');assert.equal(finaleSignals(partial).ritualStopped,false);assert.equal(finaleSignals(partial).success,undefined);

// Previously materialized C15 content gains the ritual additively and keeps actor state/runtime.
const old=structuredClone(plan.rooms.C15);old.planVersion=5;old.assignments=old.assignments.filter(a=>a.slotId!=='ritual-sahira-rewrite');const sahira=old.assignments.find(a=>a.slotId==='actor-sahira');sahira.state='triggered';sahira.runtime={actorStatus:'negotiating',lastOutcome:'negotiating'};
const upgraded=materializeRoomState({roomState:{C15:{content:old}}},plan,'C15');assert.equal(upgraded.changed,true);const upgradedAssignments=upgraded.state.roomState.C15.content.assignments;assert.equal(upgradedAssignments.find(a=>a.slotId==='ritual-sahira-rewrite').state,'unresolved');assert.equal(upgradedAssignments.find(a=>a.slotId==='actor-sahira').runtime.actorStatus,'negotiating');

const controller=fs.readFileSync(new URL('../js/finale-status-controller.js',import.meta.url),'utf8');assert.match(controller,/kein Siegwert/);assert.match(controller,/partial_rewrite/);assert.doesNotMatch(controller,/handoutId|Handout|Zeitanker-Netz noch nicht/);
const index=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');assert.match(index,/finale-status\.css/);assert.match(index,/finale-status-controller\.js/);assert.doesNotMatch(index,/handouts\.css|selem-handout-controller/);

console.log('selem-finale-state: OK (persistent ritual, story-evidence anchors, independent Nachzehrer axis, no in-app handouts or automatic victory/total-retcon)');
