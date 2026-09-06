import fs from 'node:fs';
import assert from 'node:assert/strict';

const readText=p=>fs.readFileSync(new URL(p,import.meta.url),'utf8');
const js=readText('../js/gm-ui-tools.js');
const css=readText('../css/gm-compact.css');
const index=readText('../index.html');

for(const id of ['C14','D06','D14','C15'])assert.ok(js.includes(`'${id}'`),`Missing GM preview target ${id}.`);
assert.match(js,/Grafiktest · lokale SL-Vorschau/,'GM preview must identify itself as a local preview.');
assert.match(js,/Gruppenstand bleibt unverändert/,'Preview must explicitly state that shared group state is untouched.');
assert.equal(js.includes('syncState('),false,'GM graphics preview must not call shared-state synchronization.');
assert.equal(js.includes('commit('),false,'GM graphics preview must not commit maze state.');
assert.match(js,/gm-preview-active/,'Preview mode class must exist.');
assert.match(js,/maze-gm-collapsed/,'GM collapse state should persist locally.');
assert.match(css,/\.gm-panel\{[^}]*max-height:/s,'GM panel must have a bounded height.');
assert.match(css,/\.gm-panel\{[^}]*overflow-y:auto/s,'GM panel must scroll vertically.');
assert.match(css,/\.gm-panel\.collapsed/,'GM panel must support a collapsed state.');
assert.match(css,/body\.gm-preview-active \.movement-card\{[^}]*pointer-events:none/s,'Shared group movement must be disabled while inspecting a local graphics preview.');
assert.match(index,/gm-compact\.css\?v=20260906-gm1/,'Compact GM CSS must be loaded.');
assert.match(index,/gm-ui-tools\.js\?v=20260906-gm1/,'GM preview tool must be loaded.');

console.log('gm-ui-tools: OK (compact collapsible panel, scrollable workspace, local-only C14/D06/D14/C15 graphics preview)');
