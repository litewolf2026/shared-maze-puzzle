import assert from 'node:assert/strict';
import fs from 'node:fs';
import {difficultyFor,discoveryCheckFor,dangerWarningFor,mechanicalCheckFor,checksForAssignment,formatCheck,playerInvestigationMode} from '../js/dsa41-exploration.js';

const rules=JSON.parse(fs.readFileSync(new URL('../data/rules/dsa41-exploration.json',import.meta.url),'utf8'));
assert.equal(rules.system,'DSA4.1');
assert.deepEqual(rules.checks.senses.attributes,['KL','IN','IN']);
assert.deepEqual(rules.checks.senses.alternate.attributes,['KL','IN','FF']);
assert.deepEqual(rules.checks.danger_instinct.attributes,['KL','IN','IN']);
assert.deepEqual(rules.checks.fine_mechanics.attributes,['KL','FF','FF']);
assert.equal(rules.checks.senses.hiddenRoll,true);
assert.equal(rules.checks.danger_instinct.warningOnly,true);
assert.equal(rules.projectPolicy.difficultyMappingIsProjectConvention,true);

assert.deepEqual([0,1,2,3,4].map(x=>difficultyFor(rules,x).modifier),[0,0,3,7,12]);
assert.equal(difficultyFor(rules,0).requiresCheck,false);
assert.equal(difficultyFor(rules,1).requiresCheck,true);

const visible={type:'discovery',hidden:false,state:'unresolved',discoverDifficulty:0,placement:['table']};
assert.equal(discoveryCheckFor(visible,{},rules),null);
assert.equal(playerInvestigationMode(visible,{},rules).mode,'direct');

const subtle={type:'discovery',hidden:false,state:'unresolved',discoverDifficulty:2,placement:['wall']};
const search=discoveryCheckFor(subtle,{},rules);
assert.equal(search.name,'Sinnenschärfe');assert.equal(search.modifier,3);assert.equal(search.hiddenRoll,true);
assert.equal(playerInvestigationMode(subtle,{},rules).mode,'check');
assert.match(formatCheck(search),/Sinnenschärfe \+3 \(KL\/IN\/IN\)/);
assert.match(formatCheck(search),/Tasten: KL\/IN\/FF/);
assert.match(formatCheck(search),/verdeckt/);

const hidden={type:'secret',hidden:true,state:'unresolved',discoverDifficulty:3,placement:['wall_niche']};
assert.equal(playerInvestigationMode(hidden,{},rules).mode,'hidden');
assert.equal(discoveryCheckFor(hidden,{},rules).modifier,7);

const hazard={type:'hazard',hidden:true,state:'unresolved',discoverDifficulty:2,placement:['floor']};
const warning=dangerWarningFor(hazard,{},rules);
assert.equal(warning.name,'Gefahreninstinkt');assert.equal(warning.modifier,0);assert.equal(warning.requiresPossession,true);assert.equal(warning.warningOnly,true);
assert.match(formatCheck(warning),/nur mit Gabe/);

const mechanism={type:'secret_connection',hidden:true,state:'discovered',discoverDifficulty:3,placement:['secret_connection_slot']};
const mechanical=mechanicalCheckFor(mechanism,{},rules);
assert.equal(mechanical.name,'Feinmechanik');assert.deepEqual(mechanical.attributes,['KL','FF','FF']);assert.equal(mechanical.modifier,null);
assert.match(formatCheck(mechanical,{includeAlternate:false}),/Feinmechanik nach SL \(KL\/FF\/FF\)/);

const nonMechanical={type:'secret',hidden:true,state:'discovered',placement:['wall_niche']};
assert.equal(mechanicalCheckFor(nonMechanical,{},rules),null);
const all=checksForAssignment(hazard,{},rules);assert.ok(all.discovery&&all.warning);assert.equal(all.mechanical,null);
console.log('dsa41-exploration: OK (Sinnenschärfe, Gefahreninstinkt, Feinmechanik, project modifiers)');
