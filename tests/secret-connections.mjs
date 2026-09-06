import assert from 'node:assert/strict';
import fs from 'node:fs';
import {applyExpansions} from '../js/map-expansion.js';
import {buildAdj,visibleAdj,availableDirections,beginMove,initialSharedState} from '../js/navigation-model.js';
import {buildCrawlerAdj} from '../js/crawler-view.js';
import {enrichMapContent} from '../js/content-model.js';
import {generateContentPlan,materializeRoomState,applyContentAction} from '../js/content-engine.js';
import {openSecretConnection,secretConnectionStatus} from '../js/secret-connections.js';

const read=p=>JSON.parse(fs.readFileSync(new URL(p,import.meta.url),'utf8'));
const base=read('../data/maps.json').maps[0],exp=read('../data/selem-expansion.json'),secrets=read('../data/selem-secrets.json');
const map=applyExpansions(base,exp,secrets);
const catalog=read('../data/content/catalog.json'),pools=read('../data/content/pools.json'),profiles=read('../data/content/profiles.json'),slots=read('../data/content/selem-slots.json'),roomFeatures=read('../data/room-features.json').features;
const derivedByNode=Object.fromEntries(enrichMapContent(map).map(x=>[x.id,x]));
const plan=generateContentPlan({map,slotConfig:slots,catalog,pools,profiles,roomFeatures,derivedByNode,seed:slots.generation.seed});
const DIRS={N:{opp:'S'},NE:{opp:'SW'},E:{opp:'W'},SE:{opp:'NW'},S:{opp:'N'},SW:{opp:'NE'},W:{opp:'E'},NW:{opp:'SE'},UP:{opp:'DOWN'},DOWN:{opp:'UP'}};

assert.equal(map.nodes.length,104,'Secret overlay should add exactly one prepared room.');
assert.ok(map.nodes.some(n=>n.id==='D13'&&n.name==='Versiegeltes Werkmeisterarchiv'));
assert.equal(buildAdj(map).get('D12').W.to,'D13');
assert.equal(buildAdj(map).get('D13').E.to,'D12');

let state=initialSharedState(map);state.node='D12';state.bandStep=25;state.step=25;
state=materializeRoomState(state,plan,'D12').state;
const secret=state.roomState.D12.content.assignments.find(a=>a.slotId==='secret-connection-authored');
assert.ok(secret&&secret.type==='secret_connection','D12 must materialize the authored secret connection.');
assert.equal(secret.state,'unresolved');
assert.equal(secretConnectionStatus(state,'D12',secret.slotId).opened,false);
assert.equal(availableDirections(map,state).includes('W'),false,'Locked hidden direction leaked into movement wheel.');
assert.equal(visibleAdj(map,state).get('D12').W,undefined,'Locked hidden edge leaked into visible graph.');
assert.equal(buildCrawlerAdj(map,DIRS,state).get('D12').W,undefined,'Locked hidden edge leaked into crawler.');
let move=beginMove(map,state,'W');assert.equal(move.ok,false);assert.equal(move.error,'LOCKED_EXIT');

let reveal=applyContentAction(state,'D12',secret.slotId,'discover',{isGm:true});assert.equal(reveal.ok,true);state=reveal.state;
assert.equal(secretConnectionStatus(state,'D12',secret.slotId).discovered,true);
assert.equal(secretConnectionStatus(state,'D12',secret.slotId).opened,false);
assert.equal(availableDirections(map,state).includes('W'),false,'Discovery alone must not open the passage.');
assert.equal(buildCrawlerAdj(map,DIRS,state).get('D12').W,undefined,'Discovered-but-closed passage leaked into crawler.');
let playerOpen=openSecretConnection(state,'D12',secret.slotId,{isGm:false});assert.equal(playerOpen.ok,false);assert.equal(playerOpen.error,'CONTENT_ACTION_FORBIDDEN');

let opened=openSecretConnection(state,'D12',secret.slotId,{isGm:true});assert.equal(opened.ok,true);state=opened.state;
assert.equal(secretConnectionStatus(state,'D12',secret.slotId).opened,true);
assert.equal(availableDirections(map,state).includes('W'),true,'Opened passage missing from movement wheel.');
assert.equal(visibleAdj(map,state).get('D12').W.to,'D13');
assert.equal(buildCrawlerAdj(map,DIRS,state).get('D12').W,'D13','Opened passage missing from crawler.');

move=beginMove(map,state,'W');assert.equal(move.ok,true);state=move.state;
while(state.transit){const r=beginMove(map,state,'W');assert.equal(r.ok,true);state=r.state}
assert.equal(state.node,'D13');assert.equal(state.bandStep,25,'Post-band secret exploration must not consume imaginary band symbols.');
assert.equal(availableDirections(map,state).includes('E'),true,'Return through opened passage must remain possible.');

const resolved=applyContentAction(state,'D12',secret.slotId,'resolve',{isGm:true});assert.equal(resolved.ok,true);state=resolved.state;
assert.equal(secretConnectionStatus(state,'D12',secret.slotId).opened,true,'Resolved opened passage must stay physically open.');
assert.equal(availableDirections(map,state).includes('E'),true);

// The prepared secret room must not alter the protected 25-step route.
const adj=buildAdj(map),queue=[[map.start,0]],dist=new Map([[map.start,0]]),ways=new Map([[map.start,1]]);
for(let qi=0;qi<queue.length;qi++){const [id,d]=queue[qi];for(const edge of Object.values(adj.get(id)||{})){const nd=d+1;if(!dist.has(edge.to)){dist.set(edge.to,nd);ways.set(edge.to,ways.get(id));queue.push([edge.to,nd])}else if(dist.get(edge.to)===nd)ways.set(edge.to,ways.get(edge.to)+ways.get(id))}}
assert.equal(dist.get(map.goal),25);assert.equal(ways.get(map.goal),1);

const sql=fs.readFileSync(new URL('../supabase/migrations/20260906_hidden_connections.sql',import.meta.url),'utf8');
assert.match(sql,/\('selem-01','D12','W','D13'\)/);
assert.match(sql,/\('selem-01','D13','E','D12'\)/);
assert.match(sql,/secret-connection-authored/);
assert.match(sql,/maze_edge_is_available/);
assert.match(sql,/required_states/);
assert.match(sql,/maze_player_unlock_states_unchanged/,'Player-state transition guard is missing.');
assert.match(sql,/SECRET_STATE_REQUIRES_GM/,'Player RPC must reject forged secret unlock transitions.');
assert.match(sql,/v_new<>\'unresolved\'/,'First player materialization may only create unresolved secret state.');

const app=fs.readFileSync(new URL('../js/app-v2.js',import.meta.url),'utf8');
assert.match(app,/selem-secrets\.json/,'Runtime does not load the secret overlay.');
assert.match(app,/applyExpansions\(base,exp,secrets\)/,'Runtime does not apply the secret overlay.');
assert.match(app,/visibleAdj\(map,state\)/,'Automap is not filtering hidden topology.');
assert.match(app,/openSecretConnection/,'GM open action is not wired to the authoritative app.');
const exploration=fs.readFileSync(new URL('../js/exploration-controller.js',import.meta.url),'utf8');
assert.match(exploration,/sharedState:shared/,'Crawler is not receiving shared unlock state.');

console.log('secret-connections: OK (hidden -> discovered -> opened -> traversable; runtime + player forgery guarded)');
