import fs from 'node:fs';
import assert from 'node:assert/strict';
import {applyContentAction} from '../js/content-engine.js';

const readText=p=>fs.readFileSync(new URL(p,import.meta.url),'utf8');
const inventoryJs=readText('../js/inventory-controller.js');
const explorationJs=readText('../js/exploration-controller-v3.js');
const inventoryCss=readText('../css/inventory.css');
const migration=readText('../supabase/migrations/20260906_player_loot_inventory.sql');
const index=readText('../index.html');

const discoveredLoot={
  roomState:{A01:{content:{assignments:[{
    slotId:'loot-test',contentId:'loot_test',type:'loot',label:'Testfund',state:'discovered',description:'Ein Testfund.'
  }]}}}
};
const taken=applyContentAction(discoveredLoot,'A01','loot-test','take',{isGm:false});
assert.equal(taken.ok,true,'A player must be able to take already discovered loot.');
assert.equal(taken.state.roomState.A01.content.assignments[0].state,'taken');

const unresolved=structuredClone(discoveredLoot);unresolved.roomState.A01.content.assignments[0].state='unresolved';
assert.equal(applyContentAction(unresolved,'A01','loot-test','take',{isGm:false}).ok,false,'Unresolved loot must not be takeable.');
const discovery=structuredClone(discoveredLoot);discovery.roomState.A01.content.assignments[0].type='discovery';
assert.equal(applyContentAction(discovery,'A01','loot-test','take',{isGm:false}).ok,false,'Non-loot discoveries must not enter inventory through take.');

assert.match(explorationJs,/Ins Gruppeninventar nehmen/,'Discovered loot must expose a player-facing pickup action.');
assert.match(inventoryJs,/assignment\.type!=='loot'\|\|assignment\.state!=='taken'/,'Inventory must be derived from taken loot assignments rather than duplicate state.');
assert.match(inventoryJs,/maze-state/,'Inventory must rerender from shared state updates.');
assert.match(inventoryCss,/\.inventory-bar/,'Inventory bar styling is missing.');
assert.match(migration,/v_old_state='discovered'\s+and v_new_state='taken'\s+and v_type='loot'/s,'Backend must authorize only discovered loot pickup for players.');
assert.match(index,/inventory\.css\?v=20260906-inv2/,'Inventory stylesheet must be loaded.');
assert.match(index,/inventory-controller\.js\?v=20260906-inv1/,'Inventory controller must be loaded.');

console.log('inventory: OK (player discovered-loot pickup, derived persistent group inventory, backend authority guard)');
