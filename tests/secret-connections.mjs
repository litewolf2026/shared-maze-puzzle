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

assert.equal(map.nodes.length,108,'Final overlay should contain the 104-location expansion (including A32), three prepared secret rooms and the optional drowned cavern.');
for(const [id,name] of [['A31','Verborgene Pilgerkammer'],['B35','Vergessener Wartungsraum'],['D13','Versiegeltes Werkmeisterarchiv']])assert.ok(map.nodes.some(n=>n.id===id&&n.name===name),`Missing secret room ${id}`);
for(const [from,dir,to] of [['A23','E','A31'],['A31','W','A23'],['B33','S','B35'],['B35','N','B33'],['D12','W','D13'],['D13','E','D12']])assert.equal(buildAdj(map).get(from)[dir].to,to,`Missing secret topology ${from}/${dir}/${to}`);

function advanceUntilArrived(state,dir){let next=state,guard=0;while(next.transit&&guard++<32){const r=beginMove(map,next,dir);assert.equal(r.ok,true);next=r.state}assert.ok(guard<32,'Secret transit did not terminate.');return next}

function lifecycle({nodeId,slotId,dir,target,bandStep,expectedBandAfterMove}){
  let state=initialSharedState(map);state.node=nodeId;state.bandStep=bandStep;state.step=bandStep;
  state=materializeRoomState(state,plan,nodeId).state;
  const secret=state.roomState[nodeId].content.assignments.find(a=>a.slotId===slotId);
  assert.ok(secret&&secret.type==='secret_connection',`${nodeId} must materialize ${slotId}.`);
  assert.equal(secret.state,'unresolved');
  assert.equal(secretConnectionStatus(state,nodeId,slotId).opened,false);
  assert.equal(availableDirections(map,state).includes(dir),false,`${nodeId}/${dir} leaked into movement wheel while locked.`);
  assert.equal(visibleAdj(map,state).get(nodeId)[dir],undefined,`${nodeId}/${dir} leaked into visible graph while locked.`);
  assert.equal(buildCrawlerAdj(map,DIRS,state).get(nodeId)[dir],undefined,`${nodeId}/${dir} leaked into crawler while locked.`);
  let move=beginMove(map,state,dir);assert.equal(move.ok,false);assert.equal(move.error,'LOCKED_EXIT');

  let reveal=applyContentAction(state,nodeId,slotId,'discover',{isGm:true});assert.equal(reveal.ok,true);state=reveal.state;
  assert.equal(secretConnectionStatus(state,nodeId,slotId).discovered,true);
  assert.equal(secretConnectionStatus(state,nodeId,slotId).opened,false);
  assert.equal(availableDirections(map,state).includes(dir),false,'Discovery alone must not open the passage.');
  let playerOpen=openSecretConnection(state,nodeId,slotId,{isGm:false});assert.equal(playerOpen.ok,false);assert.equal(playerOpen.error,'CONTENT_ACTION_FORBIDDEN');

  let opened=openSecretConnection(state,nodeId,slotId,{isGm:true});assert.equal(opened.ok,true);state=opened.state;
  assert.equal(secretConnectionStatus(state,nodeId,slotId).opened,true);
  assert.equal(availableDirections(map,state).includes(dir),true,`${nodeId}/${dir} missing after opening.`);
  assert.equal(visibleAdj(map,state).get(nodeId)[dir].to,target);
  assert.equal(buildCrawlerAdj(map,DIRS,state).get(nodeId)[dir],target);

  move=beginMove(map,state,dir);assert.equal(move.ok,true);state=advanceUntilArrived(move.state,dir);
  assert.equal(state.node,target);assert.equal(state.bandStep,expectedBandAfterMove,`${nodeId} secret traversal used the wrong band semantics.`);
  const backDir=DIRS[dir].opp;assert.equal(availableDirections(map,state).includes(backDir),true,'Return through opened passage must remain possible.');
  const resolved=applyContentAction(state,nodeId,slotId,'resolve',{isGm:true});assert.equal(resolved.ok,true);state=resolved.state;
  assert.equal(secretConnectionStatus(state,nodeId,slotId).opened,true,'Resolved opened passage must stay physically open.');
  return state;
}

lifecycle({nodeId:'A23',slotId:'secret-pilgrim-room',dir:'E',target:'A31',bandStep:7,expectedBandAfterMove:7});
lifecycle({nodeId:'B33',slotId:'secret-maintenance-room',dir:'S',target:'B35',bandStep:12,expectedBandAfterMove:13});
lifecycle({nodeId:'D12',slotId:'secret-connection-authored',dir:'W',target:'D13',bandStep:25,expectedBandAfterMove:25});

// Prepared secret rooms and other optional overlay spaces must not shorten or duplicate the protected canonical physical route.
const adj=buildAdj(map),queue=[[map.start,0]],dist=new Map([[map.start,0]]),ways=new Map([[map.start,1]]);
for(let qi=0;qi<queue.length;qi++){const [id,d]=queue[qi];for(const edge of Object.values(adj.get(id)||{})){const nd=d+1;if(!dist.has(edge.to)){dist.set(edge.to,nd);ways.set(edge.to,ways.get(id));queue.push([edge.to,nd])}else if(dist.get(edge.to)===nd)ways.set(edge.to,ways.get(edge.to)+ways.get(id))}}
const canonicalPhysicalEdges=(map.canonicalPath?.length||1)-1;
assert.equal(canonicalPhysicalEdges,28,'Canonical story route length changed unexpectedly.');
assert.equal(dist.get(map.goal),canonicalPhysicalEdges,'An optional overlay detour shortened the canonical physical route.');
assert.equal(ways.get(map.goal),1,'Optional overlay topology created a second equally short physical route.');
assert.equal(map.solution.length,25,'Black-band decision count must remain independent from physical route length.');

const sql=fs.readFileSync(new URL('../supabase/migrations/20260906_hidden_connections.sql',import.meta.url),'utf8');
const moreSql=fs.readFileSync(new URL('../supabase/migrations/20260906_additional_hidden_rooms.sql',import.meta.url),'utf8');
assert.match(sql,/\('selem-01','D12','W','D13'\)/);assert.match(sql,/secret-connection-authored/);
assert.match(moreSql,/\('selem-01','A23','E','A31'\)/);assert.match(moreSql,/secret-pilgrim-room/);
assert.match(moreSql,/\('selem-01','B33','S','B35'\)/);assert.match(moreSql,/secret-maintenance-room/);
assert.match(sql,/maze_edge_is_available/);assert.match(sql,/required_states/);
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

console.log(`secret-connections: OK (three hidden rooms + optional D14 + A32 collapsed branch; canonical physical route remains unique at ${canonicalPhysicalEdges} edges / ${map.solution.length} band decisions)`);
