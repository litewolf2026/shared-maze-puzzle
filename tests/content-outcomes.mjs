import assert from 'node:assert/strict';
import fs from 'node:fs';
import {outcomeOptions,applyContentOutcome,outcomeLabel} from '../js/content-outcomes.js';
import {applyContentAction} from '../js/content-engine.js';

function stateWith(assignment){return {roomState:{R:{content:{generated:true,assignments:[structuredClone(assignment)]}}}}}
function get(state){return state.roomState.R.content.assignments[0]}

const repeatHazard={slotId:'h',contentId:'h',type:'hazard',label:'Gefahr',hidden:true,state:'discovered',mechanics:{once:false}};
let state=stateWith(repeatHazard);
let options=outcomeOptions(get(state));
assert.deepEqual(options.map(x=>x.id),['avoided','neutralized']);
let r=applyContentOutcome(state,'R','h','avoided',{isGm:false});assert.equal(r.ok,false);assert.equal(r.error,'CONTENT_OUTCOME_REQUIRES_GM');
r=applyContentOutcome(state,'R','h','avoided',{isGm:true});assert.equal(r.ok,true);state=r.state;
assert.equal(get(state).state,'discovered');assert.equal(outcomeLabel(get(state)),'Umgangen');assert.equal(get(state).runtime.outcomes.length,1);
r=applyContentAction(state,'R','h','trigger',{isGm:true});assert.equal(r.ok,true);state=r.state;
assert.equal(get(state).state,'triggered');
options=outcomeOptions(get(state));assert.deepEqual(options.map(x=>x.id),['avoided','neutralized','suffered']);
r=applyContentAction(state,'R','h','outcome:suffered',{isGm:true});assert.equal(r.ok,true);state=r.state;
assert.equal(get(state).state,'discovered','Repeatable hazard remains after its effect.');assert.equal(get(state).runtime.outcomes.length,2);assert.equal(get(state).runtime.outcomes[1].sequence,2);

const oneShot={...repeatHazard,slotId:'one',state:'triggered',mechanics:{once:true}};
r=applyContentAction(stateWith(oneShot),'R','one','outcome:suffered',{isGm:true});assert.equal(r.ok,true);assert.equal(r.assignment.state,'resolved','One-shot hazard resolves after effect occurs.');
const neutralized={...repeatHazard,slotId:'neutral',state:'discovered'};
r=applyContentAction(stateWith(neutralized),'R','neutral','outcome:neutralized',{isGm:true});assert.equal(r.ok,true);assert.equal(r.assignment.state,'disabled');

const encounter={slotId:'e',contentId:'e',type:'encounter',label:'Begegnung',hidden:false,state:'triggered',mechanics:{stance:'alert'}};
state=stateWith(encounter);assert.deepEqual(outcomeOptions(get(state)).map(x=>x.id),['peaceful','defeated','escaped','party_withdrew']);
r=applyContentAction(state,'R','e','outcome:party_withdrew',{isGm:true});assert.equal(r.ok,true);state=r.state;assert.equal(get(state).state,'discovered');
r=applyContentAction(state,'R','e','trigger',{isGm:true});assert.equal(r.ok,true);state=r.state;
r=applyContentAction(state,'R','e','outcome:peaceful',{isGm:true});assert.equal(r.ok,true);assert.equal(r.assignment.state,'resolved');assert.equal(r.assignment.runtime.outcomes.length,2);

const event={slotId:'v',contentId:'v',type:'event',label:'Ereignis',hidden:false,state:'triggered',mechanics:{trigger:'gm'}};
r=applyContentAction(stateWith(event),'R','v','outcome:observed',{isGm:true});assert.equal(r.ok,true);assert.equal(r.assignment.state,'resolved');
r=applyContentAction(stateWith(event),'R','v','outcome:not-real',{isGm:true});assert.equal(r.ok,false);assert.equal(r.error,'CONTENT_OUTCOME_UNKNOWN');
const unresolvedEvent={...event,state:'unresolved'};r=applyContentAction(stateWith(unresolvedEvent),'R','v','outcome:observed',{isGm:true});assert.equal(r.ok,false);assert.equal(r.error,'CONTENT_OUTCOME_INVALID_STATE');

const sql=fs.readFileSync(new URL('../supabase/migrations/20260906_content_outcome_authority.sql',import.meta.url),'utf8');
assert.match(sql,/maze_player_content_transitions_allowed/);
assert.match(sql,/CONTENT_STATE_REQUIRES_GM/);
assert.match(sql,/v_old_state='unresolved'/);
assert.match(sql,/v_new_state='discovered'/);
assert.match(sql,/v_type in \('loot','discovery'\)/);
assert.match(sql,/not v_hidden/);
assert.match(sql,/r\.assignment \? 'runtime'/,'Fresh player materialization must reject forged runtime outcome data.');

console.log('content-outcomes: OK (hazard, encounter, event outcomes + GM authority policy)');
