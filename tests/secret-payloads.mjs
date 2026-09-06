import assert from 'node:assert/strict';
import fs from 'node:fs';
import {applyExpansions} from '../js/map-expansion.js';
import {enrichMapContent} from '../js/content-model.js';
import {generateContentPlan,materializeRoomState,applyContentAction,contentVisibleToPlayer,contentDependencySatisfied} from '../js/content-engine.js';
import {openSecretContent,secretContentStatus} from '../js/secret-connections.js';

const read=p=>JSON.parse(fs.readFileSync(new URL(p,import.meta.url),'utf8'));
const map=applyExpansions(read('../data/maps.json').maps[0],read('../data/selem-expansion.json'),read('../data/selem-secrets.json'));
const catalog=read('../data/content/catalog.json'),pools=read('../data/content/pools.json'),profiles=read('../data/content/profiles.json'),slots=read('../data/content/selem-slots.json'),roomFeatures=read('../data/room-features.json').features;
const derivedByNode=Object.fromEntries(enrichMapContent(map).map(x=>[x.id,x]));
const plan=generateContentPlan({map,slotConfig:slots,catalog,pools,profiles,roomFeatures,derivedByNode,seed:slots.generation.seed});

assert.equal(plan.version,5,'Scenario actor upgrade raises the content plan to v5 without changing payload semantics.');
assert.ok(plan.contentPacks.includes('selem-core-actors-v1'),'Plan v5 should include the Selem scenario actor pack.');
assert.deepEqual(map.nodes.find(n=>n.id==='A25').exploreGrid,{w:3,h:3},'A25 should be locally explorable after secret overlay.');

function assignments(nodeId){return plan.rooms[nodeId]?.assignments||[]}
const a25Secret=assignments('A25').find(a=>a.slotId==='secret-false-back');
const a25Loot=assignments('A25').find(a=>a.slotId==='loot-false-back');
assert.ok(a25Secret&&a25Loot,'A25 must contain both secret and payload.');
assert.deepEqual(a25Secret.reveals,['loot-false-back']);
assert.equal(a25Loot.lockedBy,'secret-false-back');
assert.equal(a25Secret.anchor?.anchorId,'false_back');
assert.equal(a25Loot.anchor?.anchorId,'false_back');
assert.equal(a25Loot.contentId,'loot_pilgrim_coins');

const c24Secret=assignments('C24').find(a=>a.slotId==='secret-authored');
const c24Loot=assignments('C24').find(a=>a.slotId==='loot-authored');
assert.ok(c24Secret&&c24Loot);assert.deepEqual(c24Secret.reveals,['loot-authored']);assert.equal(c24Loot.lockedBy,'secret-authored');

let state={roomState:{}};state=materializeRoomState(state,plan,'A25').state;
let secret=state.roomState.A25.content.assignments.find(a=>a.slotId==='secret-false-back');
let loot=state.roomState.A25.content.assignments.find(a=>a.slotId==='loot-false-back');
assert.equal(contentDependencySatisfied(state,'A25',loot),false);
assert.equal(contentVisibleToPlayer(loot,state,'A25'),false,'Locked payload must not leak before parent secret is opened.');
let direct=applyContentAction(state,'A25','loot-false-back','discover',{isGm:true});assert.equal(direct.ok,false);assert.equal(direct.error,'CONTENT_LOCKED_BY_SECRET');

let reveal=applyContentAction(state,'A25','secret-false-back','discover',{isGm:true});assert.equal(reveal.ok,true);state=reveal.state;
secret=state.roomState.A25.content.assignments.find(a=>a.slotId==='secret-false-back');loot=state.roomState.A25.content.assignments.find(a=>a.slotId==='loot-false-back');
assert.equal(secret.state,'discovered');assert.equal(loot.state,'unresolved');assert.equal(contentVisibleToPlayer(loot,state,'A25'),false,'Discovery alone must not reveal payload.');

let playerOpen=openSecretContent(state,'A25','secret-false-back',{isGm:false});assert.equal(playerOpen.ok,false);assert.equal(playerOpen.error,'CONTENT_ACTION_FORBIDDEN');
let opened=openSecretContent(state,'A25','secret-false-back',{isGm:true});assert.equal(opened.ok,true);state=opened.state;
secret=state.roomState.A25.content.assignments.find(a=>a.slotId==='secret-false-back');loot=state.roomState.A25.content.assignments.find(a=>a.slotId==='loot-false-back');
assert.equal(secret.state,'opened');assert.deepEqual(opened.revealed,['loot-false-back']);assert.equal(loot.state,'discovered');assert.equal(contentDependencySatisfied(state,'A25',loot),true);assert.equal(contentVisibleToPlayer(loot,state,'A25'),true,'Opened secret must reveal its payload.');
assert.equal(secretContentStatus(state,'A25','secret-false-back').opened,true);

let taken=applyContentAction(state,'A25','loot-false-back','take',{isGm:true});assert.equal(taken.ok,true);state=taken.state;assert.equal(state.roomState.A25.content.assignments.find(a=>a.slotId==='loot-false-back').state,'taken');
let resolved=applyContentAction(state,'A25','secret-false-back','resolve',{isGm:true});assert.equal(resolved.ok,true);assert.equal(resolved.assignment.state,'resolved');

// A pre-v4 materialized room still gains the dependency metadata under plan v5 without changing gameplay state.
const legacySecret={...a25Secret,state:'discovered'};delete legacySecret.reveals;const legacyLoot={...a25Loot,state:'unresolved'};delete legacyLoot.lockedBy;
const legacy={roomState:{A25:{content:{generated:true,planVersion:3,assignments:[legacySecret,legacyLoot]}}}};
const upgraded=materializeRoomState(legacy,plan,'A25');assert.equal(upgraded.changed,true);const upgradedAssignments=upgraded.state.roomState.A25.content.assignments;
assert.deepEqual(upgradedAssignments.find(a=>a.slotId==='secret-false-back').reveals,['loot-false-back']);assert.equal(upgradedAssignments.find(a=>a.slotId==='loot-false-back').lockedBy,'secret-false-back');assert.equal(upgradedAssignments.find(a=>a.slotId==='secret-false-back').state,'discovered');assert.equal(upgradedAssignments.find(a=>a.slotId==='loot-false-back').state,'unresolved');assert.equal(upgraded.state.roomState.A25.content.planVersion,5);

// Broken dependency graphs fail during plan generation instead of producing runtime ghosts.
const badSlots={generation:{useReusableCore:false},rooms:{A25:{slots:[{id:'secret',type:'secret',fixed:'secret_false_back',reveals:['missing']}]}}};
assert.throws(()=>generateContentPlan({map,slotConfig:badSlots,catalog,pools,profiles,roomFeatures,derivedByNode,seed:'bad'}),/reveals missing payload/);

const sql=fs.readFileSync(new URL('../supabase/migrations/20260906_secret_payload_metadata.sql',import.meta.url),'utf8');assert.match(sql,/'reveals'/);assert.match(sql,/'lockedBy'/);assert.match(sql,/v_old \? 'reveals'/);assert.match(sql,/v_old \? 'lockedBy'/);

console.log('secret-payloads: OK (plan v5 preserves secret -> open -> payload reveal, dependency validation and legacy dependency backfill)');
