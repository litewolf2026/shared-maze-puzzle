import fs from 'node:fs';
import assert from 'node:assert/strict';
import {applyExpansions} from '../js/map-expansion.js';
import {rotateFacing,relativeExitSide,traceSightline,FACING_ORDER} from '../js/crawler-view-v3.js';

const readJson=p=>JSON.parse(fs.readFileSync(new URL(p,import.meta.url),'utf8'));
const readText=p=>fs.readFileSync(new URL(p,import.meta.url),'utf8');
const map=applyExpansions(readJson('../data/maps.json').maps[0],readJson('../data/selem-expansion.json'),readJson('../data/selem-secrets.json'));
const renderer=readText('../js/crawler-view-v3.js');
const css=readText('../css/crawler-v3.css');
const index=readText('../index.html');
const controller=readText('../js/exploration-controller-v3.js');
const DIRS={N:{opp:'S'},NE:{opp:'SW'},E:{opp:'W'},SE:{opp:'NW'},S:{opp:'N'},SW:{opp:'NE'},W:{opp:'E'},NW:{opp:'SE'},UP:{opp:'DOWN'},DOWN:{opp:'UP'}};

assert.deepEqual(FACING_ORDER,['N','NE','E','SE','S','SW','W','NW']);
assert.equal(rotateFacing('N',1),'NE');
assert.equal(relativeExitSide('N','W'),'left');
assert.ok(traceSightline(map,DIRS,map.start,map.solution[0],4).length>=1);

for(const scene of ['cavern','waterhall','chamber','corridor'])assert.ok(renderer.includes(`'${scene}'`),`Missing Crawler V3 scene family ${scene}.`);
for(const id of ['A06','B12','C10','C12','C14','C15','D06','D12','D14'])assert.ok(renderer.includes(`node.id==='${id}'`),`Missing authored V3 landmark ${id}.`);
for(const cls of ['crawler-terrain-floor','crawler-terrain-bridge','crawler-terrain-shallow_water','crawler-terrain-deep_water','crawler-terrain-rubble','crawler-terrain-blocked'])assert.ok(css.includes(`.${cls}`),`Missing V3 terrain style ${cls}.`);
for(const hook of ['v3Stone','v3FloorSlabs','v3RockFace','v3Torch','v3Vignette','drawTerrainPlane','drawRoomExits'])assert.ok(renderer.includes(hook),`Missing layered V3 renderer hook ${hook}.`);
assert.equal(renderer.includes('feTurbulence'),false,'Crawler V3 must not use full-scene turbulence/noise as material texture.');
assert.equal(/<image\b/i.test(renderer),false,'Crawler V3 must remain procedural SVG without embedded images.');
assert.match(index,/crawler-v3\.css\?v=20260906-v3/,'Crawler V3 stylesheet must be cache-busted.');
assert.match(index,/exploration-controller-v3\.js\?v=20260906-v3/,'Crawler V3 controller must be active.');
assert.match(controller,/crawler-view-v3\.js\?v=20260906-v3/,'Crawler V3 controller must load the V3 renderer directly.');
assert.match(css,/body\.view-crawler \.main\{grid-template-columns:minmax\(0,1fr\) 252px/,'Crawler V3 must give more width to the scene on desktop.');
assert.match(css,/@media\(prefers-reduced-motion:reduce\)/,'Crawler V3 atmosphere must respect reduced-motion preference.');

console.log('crawler-v3: OK (layered painterly renderer, core scene families, nine authored landmarks, compact UI, no noise-as-texture)');
