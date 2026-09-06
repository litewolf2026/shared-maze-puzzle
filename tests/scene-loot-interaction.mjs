import fs from 'node:fs';
import assert from 'node:assert/strict';

const readText=p=>fs.readFileSync(new URL(p,import.meta.url),'utf8');
const js=readText('../js/scene-loot-interaction.js');
const css=readText('../css/inventory.css');
const index=readText('../index.html');

assert.match(js,/a\.type==='loot'&&a\.state==='discovered'/,'Only discovered loot may become directly pickable in the scene.');
assert.match(js,/maze-content-action/,'Scene pickup must use the shared content action channel.');
assert.match(js,/action:'take'/,'Scene pickup must persist through the canonical take action.');
assert.match(js,/v3-feature-marker\.scene-loot-takeable/,'Scene pickup must bind to rendered crawler feature markers.');
assert.match(js,/MutationObserver/,'Scene markers must be redecorated after crawler rerenders.');
assert.match(js,/tabindex/,'Pickable scene loot must remain keyboard accessible.');
assert.match(js,/Ins Gruppeninventar nehmen/,'Pickup confirmation must name the inventory action clearly.');
assert.match(css,/\.v3-feature-marker\.scene-loot-takeable\{[^}]*pointer-events:all/s,'Discovered loot markers must become clickable despite the renderer default.');
assert.match(css,/\.scene-loot-card\{/,'Direct scene pickup needs a dedicated compact confirmation card.');
assert.match(index,/scene-loot-interaction\.js\?v=20260906-inv2/,'Direct scene loot interaction must be loaded with a cache-busted build.');
assert.match(index,/inventory\.css\?v=20260906-inv2/,'Scene pickup styles must be cache-busted.');

console.log('scene-loot-interaction: OK (discovered loot markers are directly clickable and persist through shared take action)');
