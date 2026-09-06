function clone(v){return v==null?v:structuredClone(v)}

export function encounterProfileFor(assignment,definition={},rules={}){
  if(!assignment||assignment.type!=='encounter')return null;
  const id=assignment.contentId||definition.id,archetypeId=rules.bindings?.[id];
  if(!archetypeId)return null;
  const archetype=rules.archetypes?.[archetypeId];if(!archetype)return null;
  const threat=rules.threatScale?.[String(archetype.threatTier)]||null;
  return {id:archetypeId,...clone(archetype),threat:threat?clone(threat):null,projectConvention:Boolean(rules.projectPolicy?.archetypesAreProjectConvention)};
}

export function encounterGuidanceRows(assignment,definition,rules){
  const g=encounterProfileFor(assignment,definition,rules);if(!g)return [];
  const rows=[];
  rows.push(['Archetyp',g.label]);
  rows.push(['Bedrohung',`${g.threatTier} · ${g.threat?.label||'nicht eingestuft'}`]);
  if(g.defaultDisposition)rows.push(['Grundhaltung',g.defaultDisposition]);
  if(g.opening)rows.push(['Einstieg',g.opening]);
  if(Array.isArray(g.escalation)&&g.escalation.length)rows.push(['Eskalation',g.escalation.map((x,i)=>`${i+1}. ${x}`).join(' → ')]);
  if(g.retreat)rows.push(['Rückzug',g.retreat]);
  if(Array.isArray(g.gmLevers)&&g.gmLevers.length)rows.push(['SL-Hebel',g.gmLevers.join(' · ')]);
  if(Array.isArray(g.informationTags)&&g.informationTags.length)rows.push(['Informationswert',g.informationTags.join(', ')]);
  rows.push(['Einordnung','Projektarchetyp; konkrete AT/PA/LeP/RS-Werte werden erst nach belastbarer Helden-Kalibrierung ergänzt.']);
  return rows;
}

export function encounterThreatTier(assignment,definition,rules){return encounterProfileFor(assignment,definition,rules)?.threatTier??null}
