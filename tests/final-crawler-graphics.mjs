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
assert.equal(/<image\b|https?:\/\//i.test(renderer),false,'Final crawler must remain self-contained procedural SVG, not embed external image assets.');

for(const cls of ['crawler-terrain-floor','crawler-terrain-bridge','crawler-terrain-deep_water','crawler-cavern-mouth','crawler-ritual-dais','crawler-lens-ring'])assert.ok(css.includes(`.${cls}`),`Missing final crawler style .${cls}.`);
assert.match(css,/@media\(prefers-reduced-motion:reduce\)/,'Atmospheric animation must respect reduced-motion preference.');

assert.match(index,/crawler\.css\?v=20260906-final1/,'Final crawler stylesheet is not cache-busted.');
assert.match(index,/exploration-controller\.js\?v=20260906-final1/,'Final exploration module is not cache-busted.');
assert.match(exploration,/crawler-view\.js\?v=20260906-final1/,'Nested crawler module import is not cache-busted.');
assert.match(exploration,/room-terrain\.js\?v=20260906-final1/,'Nested terrain module import is not cache-busted.');

for(const forbidden of ['initiative','combat token','attack roll'])assert.equal(renderer.toLowerCase().includes(forbidden),false,`Crawler graphics must not grow combat-system behavior: ${forbidden}.`);

console.log('final-crawler-graphics: OK (zone atmosphere, terrain projection, bespoke C15/D06/D14 landmarks, cache-busted procedural SVG)');
