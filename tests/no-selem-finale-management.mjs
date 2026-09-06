import assert from 'node:assert/strict';
import fs from 'node:fs';
import {scenarioContentPack} from '../js/scenario-content-pack.js';

const exists=p=>fs.existsSync(new URL(p,import.meta.url));
for(const path of [
  '../js/actor-status-controller.js',
  '../js/finale-status.js',
  '../js/finale-status-controller.js',
  '../css/actor-status.css',
  '../css/finale-status.css'
])assert.equal(exists(path),false,`${path} must stay removed; actor/finale outcomes are handled at the game table.`);

const index=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
assert.doesNotMatch(index,/actor-status-controller|finale-status-controller|actor-status\.css|finale-status\.css/);

const controller=fs.readFileSync(new URL('../js/content-controller.js',import.meta.url),'utf8');
for(const id of ['selem_nottel_witness','selem_sahira_antagonist','selem_nachzehrer','selem_sahira_rewrite_ritual'])assert.match(controller,new RegExp(id));
assert.match(controller,/TABLE_MANAGED_CONTENT/);assert.match(controller,/Am Spieltisch ausspielen/);assert.match(controller,/continue/,'Table-managed entries must skip crawler action rendering.');

const pack=scenarioContentPack('selem-01');
assert.ok(pack.rooms.C10.slots.some(x=>x.fixed==='selem_nottel_witness'),'Nottel must remain in C10.');
assert.ok(pack.rooms.C15.slots.some(x=>x.fixed==='selem_sahira_antagonist'),'Sahira must remain in C15.');
assert.ok(pack.rooms.C15.slots.some(x=>x.fixed==='selem_nachzehrer'),'Nachzehrer must remain in C15.');
assert.ok(pack.rooms.C15.slots.some(x=>x.fixed==='selem_sahira_rewrite_ritual'),'The rewrite ritual must remain authored finale content.');

const scenes=JSON.parse(fs.readFileSync(new URL('../data/content/scenes/selem-c.json',import.meta.url),'utf8')).scenes;
assert.match(scenes.C10.playerArrival,/Nottel/,'Nottel must still appear in the authored player scene.');
assert.match(scenes.C15.gmPurpose,/Sahira/);assert.match(scenes.C15.gmPurpose,/Nachzehrer/);

console.log('no-selem-finale-management: OK (core encounters remain; actor/finale status and outcome UI stay outside the crawler)');
