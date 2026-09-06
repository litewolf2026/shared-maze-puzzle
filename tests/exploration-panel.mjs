import fs from 'node:fs';
import assert from 'node:assert/strict';

const read=p=>fs.readFileSync(new URL(p,import.meta.url),'utf8');
const index=read('../index.html');
const css=read('../css/exploration-panel.css');
const js=read('../js/exploration-panel.js');

assert.match(index,/exploration-panel\.css/,'Readable exploration panel stylesheet is not loaded.');
assert.match(index,/exploration-panel\.js/,'Exploration panel controller is not loaded.');
assert.ok(index.indexOf('exploration-controller-v3.js')<index.indexOf('exploration-panel.js'),'Panel enhancement must load after the exploration controller.');

assert.match(css,/personal-control-panel/,'Permanent movement/facing window styling is missing.');
assert.match(css,/exploration-details-panel/,'Independent findings/detail window styling is missing.');
assert.match(css,/resize:both/,'Detail window must remain freely resizable.');
assert.match(css,/max-width:560px/,'Detail window needs a bounded large desktop size.');
assert.match(css,/text-overflow:ellipsis/,'Long discovery titles need compact ellipsis handling.');
assert.match(css,/font-size:15px/,'Discovery prose must have a readable desktop size.');
assert.match(css,/is-collapsed/,'Detail window needs a compact collapsed state.');

assert.match(js,/maze-control-panel-v2/,'Control-window preferences need a stable local storage key.');
assert.match(js,/maze-detail-panel-v2/,'Detail-window preferences need a stable local storage key.');
assert.match(js,/URLSearchParams/,'Layout storage must be scoped to the current player link/room.');
assert.match(js,/params\.get\('play'\)/,'Player-link scope is missing.');
assert.match(js,/params\.get\('room'\)/,'Room scope is missing.');
assert.match(js,/maze-ui-client-v1/,'Browser-local player/client scope is missing.');
assert.match(js,/personal-control-panel/,'Controller must keep the control window separate.');
assert.match(js,/explorationDetailsPanel/,'Controller must create a separate detail window.');
assert.match(js,/detailBody\.append\(featureList\)/,'Findings must move into the independent detail window.');
assert.match(js,/pointerdown/,'Both floating windows need drag interaction.');
assert.match(js,/ResizeObserver/,'Manual detail-window resize persistence is missing.');
assert.match(js,/data-detail-size/,'Detail-window size presets are missing.');
assert.match(js,/if\(!original\.hidden\)original\.hidden=true/,'Search proxy must not repeatedly mutate hidden inside its own observer callback.');
assert.match(js,/if\(detailPanel\.hidden===roomEnabled\)detailPanel\.hidden=!roomEnabled/,'Detail visibility updates must be idempotent.');
assert.doesNotMatch(js,/maze-content-action|maze-move|update_room_state|supabase/i,'Local window chrome must never mutate shared maze state.');

console.log('exploration-panel: OK (per-player split windows + observer-loop guard)');
