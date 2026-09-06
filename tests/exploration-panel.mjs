import fs from 'node:fs';
import assert from 'node:assert/strict';

const read=p=>fs.readFileSync(new URL(p,import.meta.url),'utf8');
const index=read('../index.html');
const css=read('../css/exploration-panel.css');
const js=read('../js/exploration-panel.js');

assert.match(index,/exploration-panel\.css/,'Readable exploration panel stylesheet is not loaded.');
assert.match(index,/exploration-panel\.js/,'Exploration panel controller is not loaded.');
assert.ok(index.indexOf('exploration-controller-v3.js')<index.indexOf('exploration-panel.js'),'Panel enhancement must load after the exploration controller.');

assert.match(css,/resize:both/,'Panel must remain freely resizable.');
assert.match(css,/max-width:520px/,'Panel needs a bounded large desktop size.');
assert.match(css,/text-overflow:ellipsis/,'Long discovery titles need compact ellipsis handling.');
assert.match(css,/font-size:15px/,'Discovery prose must have a readable desktop size.');
assert.match(css,/panel-tab-controls/,'Controls tab styling missing.');
assert.match(css,/panel-tab-details/,'Details tab styling missing.');

assert.match(js,/maze-exploration-panel-v1/,'Local panel preferences need a stable storage key.');
assert.match(js,/localStorage/,'Panel position, size and tab must persist locally.');
assert.match(js,/data-panel-tab/,'Panel tabs are missing.');
assert.match(js,/data-panel-size/,'Panel size presets are missing.');
assert.match(js,/pointerdown/,'Panel drag interaction is missing.');
assert.match(js,/ResizeObserver/,'Manual resize persistence is missing.');
assert.doesNotMatch(js,/maze-content-action|maze-move|update_room_state|supabase/i,'Local panel chrome must never mutate shared maze state.');

console.log('exploration-panel: OK (local tabs + drag + resize + readable detail pane)');
