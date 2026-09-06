function clone(v){return v==null?v:structuredClone(v)}
function arr(v){return Array.isArray(v)?v:[]}

export function hazardProfileFor(assignment,definition={},rules={},explorationRules={}){
  if(!assignment||assignment.type!=='hazard')return null;
  const id=assignment.contentId||definition.id;
  const profileId=rules.bindings?.[id];
  if(!profileId)return null;
  const profile=rules.profiles?.[profileId];
  if(!profile)return null;
  const check=profile.check?rules.checks?.[profile.check]||null:null;
  const level=Number(profile.difficultyLevel??assignment.discoverDifficulty??0);
  const difficulty=explorationRules.difficultyScale?.[String(level)]||null;
  const impact=Number.isFinite(Number(profile.impactTier))?rules.projectImpactDamage?.[String(profile.impactTier)]||null:null;
  const fallback=profile.officialFallback?rules.officialRules?.[profile.officialFallback]||null:null;
  return {
    id:profileId,
    label:profile.label||profileId,
    check:check?{...clone(check),modifier:Number(difficulty?.modifier??0),difficultyLevel:level,difficultyLabel:difficulty?.label||null}:null,
    failure:profile.failure||'',
    projectConvention:Boolean(profile.projectConvention),
    impact:impact?{...clone(impact),tier:Number(profile.impactTier)}:null,
    officialFallback:profile.officialFallback||null,
    officialRule:fallback?clone(fallback):null,
    source:profile.officialFallback?rules.sources?.[profile.officialFallback]||null:null
  };
}

export function formatHazardCheck(guidance){
  const c=guidance?.check;if(!c)return '';
  const attrs=arr(c.attributes).join('/');
  const mod=Number(c.modifier||0),modText=mod>0?` +${mod}`:mod<0?` ${mod}`:' +0';
  const be=c.effectiveEncumbrance?` · eBE ${c.effectiveEncumbrance}`:'';
  return `${c.name}${attrs?` (${attrs})`:''}${modText}${be}`;
}

export function formatOfficialFallback(guidance){
  const key=guidance?.officialFallback,r=guidance?.officialRule;if(!key||!r)return '';
  if(key==='fall')return `${r.damage}; Rüstung schützt nicht. ${r.mitigation?.check==='body_control'?'Körperbeherrschung ':''}${r.mitigation?.modifier||''}; ${r.mitigation?.effect||''}`.trim();
  if(key==='drowning')return `Nach Ende der Schwimm-Ausdauer: ${r.afterEndurance}; gelungen ${r.success}, misslungen ${r.failure}; bei AU 0: ${r.atZeroEndurance}.`;
  if(key==='suffocation')return `Luft anhalten: ${r.holdBreath}; danach ${r.afterHold}; gelungen ${r.success}, misslungen ${r.failure}; bei AU 0: ${r.atZeroEndurance}.`;
  if(key==='waterCombat')return `Knietief AT ${signed(r.kneeDeep?.AT)}/PA ${signed(r.kneeDeep?.PA)}, hüfttief AT ${signed(r.hipDeep?.AT)}/PA ${signed(r.hipDeep?.PA)}, schultertief AT ${signed(r.shoulderDeep?.AT)}/PA ${signed(r.shoulderDeep?.PA)}, unter Wasser AT ${signed(r.underwater?.AT)}/PA ${signed(r.underwater?.PA)}.`;
  return JSON.stringify(r);
}

function signed(v){const n=Number(v||0);return n>=0?`+${n}`:String(n)}

export function hazardGuidanceRows(assignment,definition,rules,explorationRules){
  const g=hazardProfileFor(assignment,definition,rules,explorationRules);if(!g)return [];
  const rows=[];
  if(g.check)rows.push(['Regelprobe',formatHazardCheck(g)]);
  if(g.failure)rows.push(['Fehlschlag',g.failure]);
  if(g.impact)rows.push(['Projekt-Schaden',`${g.impact.damage}${g.impact.armorApplies?' · Rüstung schützt':' · Rüstung schützt nicht'} · Stufe ${g.impact.tier}`]);
  const official=formatOfficialFallback(g);if(official)rows.push(['Offizielle Folgeregel',official]);
  rows.push(['Einordnung',g.projectConvention?'Projektkonvention, wo das Regelwerk keine universelle Einzelregel vorgibt.':'DSA-Regelprofil bzw. direkte Regelanwendung.']);
  if(g.source)rows.push(['Quelle',g.source]);
  return rows;
}
