import fs from 'node:fs';
import assert from 'node:assert/strict';
import {applyExpansions} from '../js/map-expansion.js';
import {rotateFacing,relativeExitSide,traceSightline,FACING_ORDER} from '../js/crawler-view-v3.js';
import {classifyExits} from '../js/crawler-geometry-overlay.js';

const readJson=p=>JSON.parse(fs.readFileSync(new URL(p,import.meta.url),'utf8'));
const readText=p=>fs.readFileSync(new URL(p,import.meta.url),'utf8');
const map=applyExpansions(readJson('../data/maps.json').maps[0],readJson('../data/selem-expansion.json'),readJson('../data/selem-secrets.json'));
const renderer=readText('../js/crawler-view-v3.js');
const css=readText('../css/crawler-v3.css');
const geometryOverlay=readText('../js/crawler-geometry-overlay.js');
const geometryCss=readText('../css/crawler-geometry-fix.css');
const index=readText('../index.html');
const controller=readText('../js/exploration-controller-v3.js');
const DIRS={N:{opp:'S'},NE:{opp:'SW'},E:{opp:'W'},SE:{opp:'NW'},S:{opp:'N'},SW:{opp:'NE'},W:{opp:'E'},NW:{opp:'SE'},UP:{opp:'DOWN'},DOWN:{opp:'UP'}};

assert.deepEqual(FACING_ORDER,['N','NE','E','SE','S','SW','W','NW']);
assert.equal(rotateFacing('N',1),'NE');
assert.equal(relativeExitSide('N','W'),'left');
assert.ok(traceSightline(map,DIRS,map.start,map.solution[0],4).length>=1);
for(const [from,dir,to] of map.edges.filter(([,dir])=>FACING_ORDER.includes(dir))){
  const sight=traceSightline(map,DIRS,from,dir,2);
  assert.equal(sight[0]?.exits?.[dir],to,`${from}/${dir}: declared open corridor must be forward-visible when facing ${dir}.`);
}

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
assert.match(css,/\.v3-distance-dark\{fill:url\(#v3Void\);opacity:\.18;pointer-events:none\}/,'Long visible corridors must fade into depth instead of ending in an opaque false wall.');

const visibility=classifyExits({N:'front',NE:'front-right',W:'left',SW:'rear-left',UP:'up',DOWN:'down'},'N');
assert.equal(visibility.front,true,'A real forward exit must classify as visually open.');
assert.deepEqual(visibility.right,['NE'],'Front-right exits must remain visible as a turn.');
assert.deepEqual(visibility.left,['W'],'Side exits must remain visible as a turn.');
assert.deepEqual(visibility.rear,['SW'],'Rear exits must not be falsely painted into the forward field of view.');
assert.equal(visibility.up,true);assert.equal(visibility.down,true);
for(const hook of ['visibleAdj','drawFrontCutout','drawTurnMouth','drawVerticalExit','queueMicrotask'])assert.ok(geometryOverlay.includes(hook),`Missing geometry visibility hook ${hook}.`);
assert.match(geometryOverlay,/\.v3-end-wall,\.v3-end-rock/,'Geometry fix must repair only a renderer end wall when a visible path contradicts it.');
assert.match(geometryCss,/\.vertical button\.available/,'Available AUF/AB controls must receive a strong vertical-exit treatment.');
for(const cls of ['v31-front-cutout','v31-turn-mouth','v31-vertical-exit','v31-stairwell'])assert.ok(geometryCss.includes(`.${cls}`),`Missing geometry visibility style ${cls}.`);
assert.match(index,/crawler-geometry-fix\.css\?v=20260906-geometry1/,'Geometry visibility stylesheet must be cache-busted.');
assert.match(index,/crawler-geometry-overlay\.js\?v=20260906-geometry1/,'Geometry visibility overlay must be active.');
assert.ok(map.edges.some(([from,dir,to])=>from==='B14'&&dir==='DOWN'&&to==='D01'),'B14 must provide the optional DOWN access to D01 / Unter Alt-Elem.');
assert.equal(map.edges.some(([from,dir,to])=>from==='C14'&&dir==='DOWN'&&to==='D01'),false,'C14 / Sahiras Kammer must not connect directly to Unter Alt-Elem.');

console.log('crawler-v3: OK (all horizontal exits forward-visible, long sightlines remain open, explicit vertical exits, relocated D-level access, compact UI)');
