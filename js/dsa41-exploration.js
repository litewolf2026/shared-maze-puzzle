const MECHANICAL_TOKENS=new Set(['machine','machinery','mechanism','lens','secret_connection_slot','lock','valve','workbench']);
const WARNING_TYPES=new Set(['hazard']);

function arr(v){return Array.isArray(v)?v:[]}
function hasAny(values,set){return arr(values).some(x=>set.has(x))}
function clone(v){return structuredClone(v)}

export function difficultyFor(rules,level=0){
  const key=String(Math.max(0,Math.min(4,Number(level)||0)));
  return clone(rules.difficultyScale?.[key]||{requiresCheck:false,modifier:0,label:'offensichtlich'});
}

export function discoveryCheckFor(assignment,definition,rules){
  if(!assignment)return null;
  const difficulty=difficultyFor(rules,assignment.discoverDifficulty||0);
  if(!difficulty.requiresCheck)return null;
  const check=clone(rules.checks?.senses);if(!check)return null;
  return {...check,modifier:difficulty.modifier,difficultyLevel:Number(assignment.discoverDifficulty||0),difficultyLabel:difficulty.label,reason:assignment.hidden?'verborgenen Inhalt entdecken':'Detail sicher wahrnehmen'};
}

export function dangerWarningFor(assignment,definition,rules){
  if(!assignment||!WARNING_TYPES.has(assignment.type)||['taken','resolved','disabled'].includes(assignment.state))return null;
  const check=clone(rules.checks?.danger_instinct);if(!check)return null;
  return {...check,modifier:0,reason:'unmittelbar drohende Gefahr erahnen'};
}

export function mechanicalCheckFor(assignment,definition,rules){
  if(!assignment||!['secret','secret_connection','hazard'].includes(assignment.type))return null;
  const placement=[...arr(assignment.placement),...arr(assignment.anchor?.tags),...arr(definition?.placement?.features)];
  if(!hasAny(placement,MECHANICAL_TOKENS))return null;
  const check=clone(rules.checks?.fine_mechanics);if(!check)return null;
  return {...check,modifier:null,reason:'Mechanismus nach dem Entdecken untersuchen oder bedienen',gmModifier:true};
}

export function checksForAssignment(assignment,definition,rules){
  const discovery=discoveryCheckFor(assignment,definition,rules),warning=dangerWarningFor(assignment,definition,rules),mechanical=mechanicalCheckFor(assignment,definition,rules);
  return {discovery,warning,mechanical};
}

export function formatCheck(check,{includeAlternate=true}={}){
  if(!check)return '';
  const mod=check.modifier==null?' nach SL':check.modifier>0?` +${check.modifier}`:check.modifier<0?` ${check.modifier}`:'';
  const attrs=arr(check.attributes).join('/');let text=`${check.name}${mod} (${attrs})`;
  if(includeAlternate&&check.alternate?.attributes?.length)text+=` · ${check.alternate.label}: ${check.alternate.attributes.join('/')}`;
  if(check.hiddenRoll)text+=' · verdeckt';
  if(check.requiresPossession)text+=' · nur mit Gabe';
  return text;
}

export function playerInvestigationMode(assignment,definition,rules){
  const discovery=discoveryCheckFor(assignment,definition,rules);
  if(assignment?.hidden&&assignment.state==='unresolved')return {mode:'hidden',check:discovery};
  if(discovery&&assignment?.state==='unresolved')return {mode:'check',check:discovery};
  return {mode:'direct',check:null};
}
