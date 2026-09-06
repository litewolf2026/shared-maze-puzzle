import fs from 'node:fs';
import assert from 'node:assert/strict';
import {applyExpansions} from '../js/map-expansion.js';

const readJson=p=>JSON.parse(fs.readFileSync(new URL(p,import.meta.url),'utf8'));
const readText=p=>fs.readFileSync(new URL(p,import.meta.url),'utf8');
const map=applyExpansions(readJson('../data/maps.json').maps[0],readJson('../data/selem-expansion.json'),readJson('../data/selem-secrets.json'));
const byId=new Map(map.nodes.map(n=>[n.id,n]));
const renderer=readText('../js/crawler-view.js');
const css=readText('../css/crawler.css');
const index=readText('../index.html');
const exploration=readText('../js/exploration-controller.js');

for(const [id,w,h,shape] of [['C15',15,15,'round_hall_complex'],['D06',14,11,'flooded_ruin_hall'],['D14',20,16,'vast_flooded_cavern']]){
  const node=byId.get(id);assert.ok(node,`Missing grand scene ${id}.`);
  assert.deepEqual([node.exploreGrid.w,node.exploreGrid.h],[w,h],`${id} lost its final authored footprint.`);
  assert.equal(node.geometry.shape,shape,`${id} lost its visual geometry identity.`);
  assert.ok(Array.isArray(node.terrain?.rows),`${id} must expose explicit terrain to the final renderer.`);
}

assert.match(renderer,/import \{terrainTypeAt\} from '\.\/room-terrain\.js'/,'Renderer must consume authored room terrain.');
assert.match(renderer,/const PALETTES=\{/,'Renderer must keep zone-specific A/B/C/D atmosphere.');
for(const hook of ["node.id==='C15'","node.id==='D06'","node.id==='D14'"])assert.ok(renderer.includes(hook),`Missing bespoke landmark hook ${hook}.`);
for(const marker of ['crawler-ritual-dais','crawler-projected-pillar','crawler-stalactite','function terrainClass','dataset.room'])assert.ok(renderer.includes(marker),`Renderer lost ${marker}.`);
assert.match(renderer,/crawler-terrain-\$\{type\}/,'Terrain cells must generate type-specific visual classes dynamically.');
assert.equal(/<image\b/i.test(renderer),false,'Final crawler must not embed raster/vector image elements.');
assert.equal(/\bfetch\s*\(|\bhref\s*=|\bxlink:href/i.test(renderer),false,'Final crawler must not load external visual assets.');
assert.match(renderer,/http:\/\/www\.w3\.org\/2000\/svg/,'Renderer should still use the standard SVG namespace.');

for(const cls of ['crawler-terrain-floor','crawler-terrain-bridge','crawler-terrain-deep_water','crawler-cavern-mouth','crawler-ritual-dais','crawler-lens-ring'])assert.ok(css.includes(`.${cls}`),`Missing final crawler style .${cls}.`);
assert.match(css,/@media\(prefers-reduced-motion:reduce\)/,'Atmospheric animation must respect reduced-motion preference.');

assert.match(index,/crawler\.css\?v=20260906-final1/,'Legacy final crawler stylesheet must remain cache-busted.');
assert.ok(/exploration-controller(?:-v3)?\.js\?v=20260906-(?:final1|v3|inv1)/.test(index),'An active cache-busted exploration controller is required.');
assert.match(exploration,/crawler-view\.js\?v=20260906-final1/,'Nested legacy crawler module import is not cache-busted.');
assert.match(exploration,/room-terrain\.js\?v=20260906-final1/,'Nested legacy terrain module import is not cache-busted.');

for(const forbidden of ['initiative','combat token','attack roll'])assert.equal(renderer.toLowerCase().includes(forbidden),false,`Crawler graphics must not grow combat-system behavior: ${forbidden}.`);

console.log('final-crawler-graphics: OK (legacy final renderer preserved while active controller may move to V3)');
