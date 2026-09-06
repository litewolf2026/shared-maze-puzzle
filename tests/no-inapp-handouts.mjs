import assert from 'node:assert/strict';
import fs from 'node:fs';
import {scenarioContentPack} from '../js/scenario-content-pack.js';

const exists=p=>fs.existsSync(new URL(p,import.meta.url));
for(const path of [
  '../data/content/selem-handouts.json',
  '../css/handouts.css',
  '../js/selem-handout-controller.js',
  '../assets/handouts'
])assert.equal(exists(path),false,`${path} must stay removed; player handouts are distributed outside the app.`);

const pack=scenarioContentPack('selem-01');
assert.equal(Object.values(pack.items||{}).some(x=>x.mechanics?.handoutId),false,'Scenario content must not materialize in-app handouts.');
for(const room of Object.values(pack.rooms||{}))for(const slot of room.slots||[])assert.equal(String(slot.id).startsWith('handout-'),false,'Scenario room slots must not reintroduce handouts.');

const index=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
assert.doesNotMatch(index,/handouts\.css|selem-handout-controller|handoutButton|handoutOverlay/);
const scenes=fs.readFileSync(new URL('../js/selem-scene-controller.js',import.meta.url),'utf8');assert.doesNotMatch(scenes,/setpiece\.handout|Handout/);

console.log('no-inapp-handouts: OK (Discord/external delivery only; no handout assets, UI or content-state objects)');
