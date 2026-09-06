const SELEM_ACTORS={
  id:'selem-core-actors-v1',
  version:1,
  items:{
    selem_nottel_witness:{
      id:'selem_nottel_witness',scope:'selem-01',type:'encounter',label:'Nottel',rarity:'unique',unique:true,
      requires:{kinds:['prison']},placement:{features:['bed','wall','door','room']},
      mechanics:{actorId:'nottel',stance:'wary',effectTags:['witness','time_anchor'],outcomes:[
        {id:'joins_party',label:'Begleitet die Gruppe',from:['triggered'],next:'triggered',terminal:false,actorStatus:'with_party'},
        {id:'secured',label:'An sicherem Ort zurückgelassen',from:['triggered'],next:'resolved',terminal:true,actorStatus:'secured'},
        {id:'evacuated',label:'Aus dem Untergrund gebracht',from:['triggered'],next:'resolved',terminal:true,actorStatus:'evacuated'}
      ]},
      description:'Nottel ist erschöpft und wütend, aber handlungsfähig. Ihre Stärke ist nicht perfekte Erinnerung, sondern dass sie gelernt hat, Beobachtung und Erinnerung getrennt festzuhalten.'
    },
    selem_sahira_antagonist:{
      id:'selem_sahira_antagonist',scope:'selem-01',type:'encounter',label:'Sahira',rarity:'unique',unique:true,
      requires:{kinds:['goal']},placement:{features:['altar','glyph','floor','room']},
      mechanics:{actorId:'sahira',stance:'controlled',effectTags:['cult','ritual','social_or_combat'],outcomes:[
        {id:'negotiating',label:'Verhandlung läuft',from:['triggered'],next:'triggered',terminal:false,actorStatus:'negotiating'},
        {id:'ritual_broken',label:'Ritual gebrochen – Sahira handlungsfähig',from:['triggered'],next:'resolved',terminal:true,actorStatus:'ritual_broken'},
        {id:'surrendered',label:'Gibt auf / wird festgesetzt',from:['triggered'],next:'resolved',terminal:true,actorStatus:'surrendered'},
        {id:'defeated',label:'Besiegt',from:['triggered'],next:'resolved',terminal:true,actorStatus:'defeated'},
        {id:'escaped',label:'Entkommt',from:['triggered'],next:'resolved',terminal:true,actorStatus:'escaped'}
      ]},
      description:'Sahira arbeitet methodisch gegen dieselbe Erinnerungsunsicherheit, die sie anderen zumutet. Sie will einen engen historischen Knoten umschreiben: Maruban soll das Auge nie aus der Fassung genommen haben.'
    },
    selem_nachzehrer:{
      id:'selem_nachzehrer',scope:'selem-01',type:'encounter',label:'Nachzehrer',rarity:'unique',unique:true,
      requires:{kinds:['goal']},placement:{features:['glyph','altar','room','floor']},
      mechanics:{actorId:'nachzehrer',stance:'predatory',effectTags:['demonic','memory','ritual'],outcomes:[
        {id:'bound',label:'Gebunden / von seinen Ankern getrennt',from:['triggered'],next:'resolved',terminal:true,actorStatus:'bound'},
        {id:'driven_off',label:'Vertrieben',from:['triggered'],next:'resolved',terminal:true,actorStatus:'driven_off'},
        {id:'destroyed',label:'Vernichtet',from:['triggered'],next:'resolved',terminal:true,actorStatus:'destroyed'},
        {id:'escaped',label:'Entkommt / bleibt als Gefahr bestehen',from:['triggered'],next:'resolved',terminal:true,actorStatus:'escaped'},
        {id:'repelled',label:'Vorläufig zurückgedrängt',from:['triggered'],next:'triggered',terminal:false,actorStatus:'repelled'}
      ]},
      description:'Der Nachzehrer greift konkrete autobiographische Inhalte an: Namen, Bindungen und erlebte Szenen. Er löscht nicht pauschal Persönlichkeit oder sämtliche Erinnerung und ist nicht identisch mit dem Zeichen des verlorenen Weges.'
    }
  },
  rooms:{
    C10:{slots:[{id:'actor-nottel',type:'encounter',fixed:'selem_nottel_witness',placement:['bed','wall','door'],additiveOnUpgrade:true}]},
    C15:{slots:[
      {id:'actor-sahira',type:'encounter',fixed:'selem_sahira_antagonist',placement:['altar','glyph','floor'],additiveOnUpgrade:true},
      {id:'actor-nachzehrer',type:'encounter',fixed:'selem_nachzehrer',placement:['glyph','altar','room'],additiveOnUpgrade:true}
    ]}
  }
};

export const SCENARIO_CONTENT_PACKS=Object.freeze({'selem-01':SELEM_ACTORS});

export function scenarioContentPack(scenarioId){return SCENARIO_CONTENT_PACKS[scenarioId]||null}
export function scenarioDefinition(id,scenarioId=null){
  if(scenarioId)return scenarioContentPack(scenarioId)?.items?.[id]||null;
  for(const pack of Object.values(SCENARIO_CONTENT_PACKS)){if(pack.items?.[id])return pack.items[id]}
  return null;
}
export function mergeScenarioCatalog(base,scenarioId){
  const pack=scenarioContentPack(scenarioId);if(!pack)return structuredClone(base);
  const out=structuredClone(base),items=out.items||(out.items={});
  for(const [id,item] of Object.entries(pack.items||{})){if(items[id])throw new Error(`Scenario content ${id} collides with base catalog.`);items[id]=structuredClone(item)}
  return out;
}
export function scenarioRoomConfig(scenarioId,nodeId){return structuredClone(scenarioContentPack(scenarioId)?.rooms?.[nodeId]||null)}
export function scenarioActorIds(scenarioId){return Object.values(scenarioContentPack(scenarioId)?.items||{}).filter(x=>x.mechanics?.actorId).map(x=>x.mechanics.actorId)}
