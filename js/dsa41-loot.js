function clone(v){return v==null?v:structuredClone(v)}

function definitionId(assignment,definition={}){return assignment?.contentId||definition?.id||null}
function mechanicsFor(assignment,definition={}){return definition?.mechanics||assignment?.mechanics||{}}
function profileIdFor(assignment,definition,rules){
  const id=definitionId(assignment,definition),mechanics=mechanicsFor(assignment,definition),category=mechanics?.category;
  if(id&&rules.itemProfiles?.[id])return rules.itemProfiles[id];
  if(category&&rules.categoryBindings?.[category])return rules.categoryBindings[category];
  const rarity=definition?.rarity||assignment?.rarity||'common';
  return rules.rarityFallback?.[rarity]||rules.rarityFallback?.common||null;
}

export function lootProfileFor(assignment,definition={},rules={}){
  if(!assignment||assignment.type!=='loot')return null;
  const profileId=profileIdFor(assignment,definition,rules);if(!profileId)return null;
  const profile=rules.profiles?.[profileId];if(!profile)return null;
  const mechanics=mechanicsFor(assignment,definition),rawValueTier=mechanics?.valueTier??profile.valueTier,valueTier=Number(rawValueTier),value=rules.valueScale?.[String(valueTier)]||null,portability=rules.portability?.[profile.portability]||null;
  return {
    id:profileId,
    ...clone(profile),
    valueTier:Number.isFinite(valueTier)?valueTier:null,
    value:value?clone(value):null,
    portabilityInfo:portability?clone(portability):null,
    source:mechanics?.source||null,
    priceReference:mechanics?.priceReference||null,
    qualityRoll:mechanics?.qualityRoll||null,
    projectConvention:Boolean(rules.projectPolicy?.valueScaleIsProjectConvention)
  };
}

function identificationText(g){
  const id=g?.identification;if(!id)return null;
  const expertise=Array.isArray(id.expertise)&&id.expertise.length?` · ${id.expertise.join(', ')}`:'';
  const level={none:'keine Fachidentifikation nötig',basic:'Grundprüfung/Fachblick sinnvoll',expert:'Fachkenntnis empfohlen',specialist:'Spezialistenprüfung vor Nutzung/Verwertung'}[id.level]||id.level||'Fachkenntnis';
  return `${level}${expertise}${id.note?` · ${id.note}`:''}`;
}

export function lootGuidanceRows(assignment,definition,rules){
  const g=lootProfileFor(assignment,definition,rules);if(!g)return [];
  const rows=[];
  rows.push(['Fundprofil',g.label]);
  rows.push(['Wertstufe',`${g.valueTier} · ${g.value?.label||'nicht eingestuft'}${g.value?.intent?` — ${g.value.intent}`:''}`]);
  rows.push(['Transport',`${g.portabilityInfo?.label||g.portability||'nicht eingestuft'}${g.portabilityInfo?.intent?` — ${g.portabilityInfo.intent}`:''}`]);
  const identification=identificationText(g);if(identification)rows.push(['Identifikation',identification]);
  if(g.primaryUse)rows.push(['Nutzung',g.primaryUse]);
  if(Array.isArray(g.relevance)&&g.relevance.length)rows.push(['Relevanz',g.relevance.join(', ')]);
  if(g.market)rows.push(['Verwertung',g.market]);
  if(g.preservation)rows.push(['Erhaltung',g.preservation]);
  if(g.caution)rows.push(['Achtung',g.caution]);
  if(g.qualityRoll)rows.push(['Qualität',g.qualityRoll]);
  if(g.priceReference)rows.push(['Preisreferenz',g.priceReference]);
  if(g.source)rows.push(['Quelle',g.source]);
  rows.push(['Einordnung','Projektbewertung ohne automatischen Marktpreis; konkrete Dukaten-/Silberwerte nur im jeweiligen Käufer-, Orts- und Zeitkontext festlegen.']);
  return rows;
}

export function lootValueTier(assignment,definition,rules){return lootProfileFor(assignment,definition,rules)?.valueTier??null}
