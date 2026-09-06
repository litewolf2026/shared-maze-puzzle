import assert from 'node:assert/strict';
import fs from 'node:fs';
import {applyExpansion} from '../js/map-expansion.js';
import {enrichMapContent} from '../js/content-model.js';
import {generateContentPlan,assignContentAnchor,contentVisibleToPlayer,applyContentAction,materializeRoomState} from '../js/content-engine.js';

const read=p=>JSON.parse(fs.readFileSync(new URL(p,import.meta.url),'utf8'));
const map=applyExpansion(read('../data/maps.json').maps[0],read('../data/selem-expansion.json'));
const catalog=read('../data/content/catalog.json'),pools=read('../data/content/pools.json'),profiles=read('../data/content/profiles.json'),slots=read('../data/content/selem-slots.json'),roomFeatures=read('../data/room-features.json').features;
const derivedByNode=Object.fromEntries(enrichMapContent(map).map(x=>[x.id,x]));
const args={map,slotConfig:slots,catalog,pools,profiles,roomFeatures,derivedByNode,seed:slots.generation.seed};
const a=generateContentPlan(args),b=generateContentPlan(args);
assert.deepEqual(a,b,'Same seed must include identical spatial anchors.');

const sahira=a.rooms.C14.assignments.find(x=>x.contentId==='selem_sahira_notes');
assert.ok(sahira?.anchor,'Sahiras notes need a room anchor.');
assert.equal(sahira.anchor.kind,'feature');
assert.ok(['desk','chest'].includes(sahira.anchor.anchorId),`Unexpected Sahira anchor ${sahira.anchor.anchorId}`);
const cache=a.rooms.C14.assignments.find(x=>x.contentId==='selem_sahira_personal_cache');
assert.ok(cache.anchor&&cache.hidden,'Sahira cache must stay hidden and spatially anchored.');
const secretPassage=a.rooms.D12.assignments.find(x=>x.type==='secret_connection');
assert.equal(secretPassage?.anchor?.kind,'feature','D12 secret connection must use the authored wall feature.');
assert.equal(secretPassage?.anchor?.anchorId,'sealed_wall','D12 secret connection drifted away from the sealed wall.');

const syntheticNode={id:'R',kind:'room',z:0,tags:['test'],exploreGrid:{w:6,h:4}};
const syntheticAssignment={slotId:'loot',placement:['floor']};
const virtual1=assignContentAnchor(syntheticAssignment,syntheticNode,{},'seed');
const virtual2=assignContentAnchor(syntheticAssignment,syntheticNode,{},'seed');
assert.deepEqual(virtual1,virtual2,'Virtual anchor must be deterministic.');
assert.equal(virtual1.kind,'virtual');assert.ok(virtual1.x>=0&&virtual1.x<6&&virtual1.y>=0&&virtual1.y<4);
const abstract=assignContentAnchor(syntheticAssignment,{id:'X',kind:'junction',z:0,tags:[]},{},'seed');
assert.equal(abstract,null,'Non-explorable nodes keep abstract content.');

const hidden={type:'secret',hidden:true,state:'unresolved'};
assert.equal(contentVisibleToPlayer(hidden),false,'Unresolved hidden content must never leak to players.');
assert.equal(contentVisibleToPlayer({...hidden,state:'discovered'}),true,'GM-revealed hidden content becomes player-visible.');
assert.equal(contentVisibleToPlayer({type:'event',hidden:false,state:'unresolved'}),false,'Untriggered events stay invisible.');
assert.equal(contentVisibleToPlayer({type:'event',hidden:false,state:'triggered'}),true,'Triggered events become visible.');
assert.equal(contentVisibleToPlayer({type:'loot',hidden:false,state:'unresolved'}),true,'Visible loot may be inspected by a nearby player.');

let state={roomState:{C14:{content:{generated:true,assignments:[structuredClone(cache),structuredClone(sahira)]}}}};
let r=applyContentAction(state,'C14',cache.slotId,'discover',{isGm:false});
assert.equal(r.ok,false,'Player may not reveal hidden content.');
r=applyContentAction(state,'C14',cache.slotId,'discover',{isGm:true});
assert.equal(r.ok,true);state=r.state;assert.equal(r.assignment.state,'discovered');
r=applyContentAction(state,'C14',cache.slotId,'take',{isGm:true});assert.equal(r.ok,true);assert.equal(r.assignment.state,'taken');

state={roomState:{C14:{content:{generated:true,assignments:[structuredClone(sahira)]}}}};
r=applyContentAction(state,'C14',sahira.slotId,'discover',{isGm:false});assert.equal(r.ok,true,'Player may inspect visible discovery.');assert.equal(r.assignment.state,'discovered');
r=applyContentAction(r.state,'C14',sahira.slotId,'discover',{isGm:false});assert.equal(r.ok,false,'Repeated discovery must be idempotently rejected.');

let empty={roomState:{}};const materialized=materializeRoomState(empty,a,'C14');assert.equal(materialized.changed,true);assert.ok(materialized.state.roomState.C14.content.assignments.every(x=>x.anchor));
const legacyAssignment=structuredClone(sahira);delete legacyAssignment.anchor;legacyAssignment.state='discovered';delete legacyAssignment.origin;
const legacy={roomState:{C14:{content:{generated:true,seed:a.seed,assignments:[legacyAssignment]}}}};
const upgraded=materializeRoomState(legacy,a,'C14');assert.equal(upgraded.changed,true,'Legacy materialized content should gain current spatial metadata.');
const upgradedAssignment=upgraded.state.roomState.C14.content.assignments[0];assert.ok(upgradedAssignment.anchor,'Legacy assignment did not gain anchor.');assert.equal(upgradedAssignment.state,'discovered','Anchor upgrade must preserve gameplay state.');assert.equal(upgradedAssignment.origin,sahira.origin,'Origin should be backfilled without rerolling content.');
const stable=materializeRoomState(upgraded.state,a,'C14');assert.equal(stable.changed,false,'Upgraded materialized content must be idempotent.');

console.log(`spatial-content: OK (${Object.values(a.rooms).flatMap(r=>r.assignments).filter(x=>x.anchor).length} anchored assignments)`);
