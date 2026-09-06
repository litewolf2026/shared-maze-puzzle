import fs from 'node:fs';
import assert from 'node:assert/strict';

const readText=p=>fs.readFileSync(new URL(p,import.meta.url),'utf8');
const js=readText('../js/gm-ui-tools.js');
const routeJs=readText('../js/gm-route-v2.js');
const compactCss=readText('../css/gm-compact.css');
const workspaceCss=readText('../css/gm-workspace.css');
const index=readText('../index.html');

for(const id of ['C14','D06','D14','C15'])assert.ok(js.includes(`'${id}'`),`Missing GM preview target ${id}.`);
assert.match(js,/Grafiktest · lokale SL-Vorschau/,'GM preview must identify itself as a local preview.');
assert.match(js,/Gruppenstand bleibt unverändert/,'Preview must explicitly state that shared group state is untouched.');
assert.equal(js.includes('syncState('),false,'GM graphics preview must not call shared-state synchronization.');
assert.equal(js.includes('commit('),false,'GM graphics preview must not commit maze state.');
assert.match(js,/gm-preview-active/,'Preview mode class must exist.');
assert.match(js,/maze-gm-collapsed/,'GM collapse state should persist locally.');
assert.match(js,/gm-toolbox/,'GM correction tools must be grouped into a collapsible toolbox.');
assert.match(js,/Werkzeuge & Korrektur/,'GM toolbox must have a clear play-facing label.');
assert.match(routeJs,/gmToolbox \.gm-toolbox-body/,'GM route tools must mount inside the reorganized toolbox rather than a nested insertBefore target.');
for(const label of ["'Pfad'","'Namen'","'IDs'"])assert.ok(routeJs.includes(label),`Missing restored GM overlay control ${label}.`);
assert.match(routeJs,/gmOverlayTools/,'GM overlay controls need a stable toolbox hook.');
assert.match(compactCss,/\.gm-panel\{[^}]*max-height:/s,'GM panel must have a bounded height.');
assert.match(compactCss,/\.gm-panel\{[^}]*overflow-y:auto/s,'GM panel must scroll vertically.');
assert.match(compactCss,/\.gm-panel\.collapsed/,'GM panel must support a collapsed state.');
assert.match(workspaceCss,/\.gm-panel\{[^}]*width:382px/s,'Play-focused GM workspace must be wider for readable text.');
assert.match(workspaceCss,/\.gm-content-summary/,'Room content must use compact collapsible summaries.');
assert.match(workspaceCss,/\.gm-scene-focus/,'Scene purpose and clues must have a focused readable block.');
assert.match(workspaceCss,/\.gm-toolbox/,'Rarely used GM tools must be visually separated from play guidance.');
assert.match(workspaceCss,/body\.gm-preview-active|\.gm-preview-tools/,'Workspace must preserve preview UI styling.');
assert.match(index,/gm-compact\.css\?v=20260906-gm1/,'Compact GM base CSS must be loaded.');
assert.match(index,/gm-workspace\.css\?v=20260906-gm2/,'Play-focused GM workspace CSS must be loaded last.');
assert.match(index,/gm-ui-tools\.js\?v=20260906-gm2/,'Updated GM preview/toolbox module must be loaded.');
assert.match(index,/gm-route-v2\.js\?v=20260906-routefix2/,'Restored GM overlay controls must bypass stale browser module caches.');

console.log('gm-ui-tools: OK (wider readable workspace, collapsible correction toolbox, restored Pfad/Namen/IDs controls, focused scene guidance, local-only graphics preview)');
