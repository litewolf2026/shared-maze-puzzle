const SELEM_STORY_PACK={
  id:'selem-core-actors-v1',
  version:3,
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
    },
    selem_sahira_rewrite_ritual:{
      id:'selem_sahira_rewrite_ritual',scope:'selem-01',type:'event',label:'Sahiras Umschreibungsritual',rarity:'unique',unique:true,
      requires:{kinds:['goal']},placement:{features:['altar','glyph','floor','room']},
      mechanics:{ritualId:'sahira-rewrite',effectTags:['ritual','time','memory'],outcomes:[
        {id:'destabilized',label:'Ritual destabilisiert',from:['triggered'],next:'triggered',terminal:false},
        {id:'control_recovered',label:'Sahira gewinnt Teilkontrolle zurück',from:['triggered'],next:'triggered',terminal:false},
        {id:'broken',label:'Ritual gebrochen',from:['triggered'],next:'resolved',terminal:true},
        {id:'aborted',label:'Ritual abgebrochen',from:['triggered'],next:'resolved',terminal:true},
        {id:'partial_rewrite',label:'Teilbehauptung setzt sich vorläufig durch',from:['triggered'],next:'resolved',terminal:true}
      ]},
      description:'Das Ritual versucht nicht, die gesamte Vergangenheit neu zu schreiben. Es soll einen engen historischen Knoten widerspruchsfrei machen: Maruban habe das Auge nie aus der Fassung genommen. Linien, Fokus, Komponenten, Sahiras Konzentration und belastbare Gegenanker sind reale Angriffspunkte.'
    },
    selem_finale_own_anchor:{
      id:'selem_finale_own_anchor',scope:'selem-01',type:'discovery',label:'Eigener unabhängiger Zeitanker',rarity:'unique',unique:true,hidden:true,
      requires:{kinds:['goal']},placement:{features:['floor','room','altar']},
      mechanics:{finaleAnchorId:'hero-created'},
      description:'SL-Marker: Die Helden haben einen zusätzlichen, von Erinnerung unabhängigen Anker geschaffen oder gesichert. Der Marker ist kein automatischer Siegwert.'
    },

    selem_handout_a06:{id:'selem_handout_a06',scope:'selem-01',type:'discovery',label:'Handout: Leere grüne Fassung',rarity:'unique',unique:true,hidden:true,requires:{kinds:['lens']},placement:{features:['lens','floor','room']},mechanics:{handoutId:'a06-empty-lens'},description:'Spielerhandout zur leeren Fassung und den materiellen Entnahmespuren.'},
    selem_handout_b12:{id:'selem_handout_b12',scope:'selem-01',type:'discovery',label:'Handout: Schwarzes Tor',rarity:'unique',unique:true,hidden:true,requires:{kinds:['gate']},placement:{features:['door','gate','wall']},mechanics:{handoutId:'b12-black-gate'},description:'Spielerhandout zu alten und jüngeren Nutzungsschichten am Schwarzen Tor.'},
    selem_handout_c03:{id:'selem_handout_c03',scope:'selem-01',type:'discovery',label:'Handout: Drei Fassungen des Reliefs',rarity:'unique',unique:true,hidden:true,requires:{kinds:['room']},placement:{features:['glyph','wall','room']},mechanics:{handoutId:'c03-relief-variants'},description:'Vergleichsblatt mit drei beinahe identischen Fassungen desselben Reliefs.'},
    selem_handout_c10:{id:'selem_handout_c10',scope:'selem-01',type:'discovery',label:'Handout: Nottels Notizen',rarity:'unique',unique:true,hidden:true,requires:{kinds:['prison']},placement:{features:['bed','wall','floor']},mechanics:{handoutId:'c10-nottel-notes'},description:'Nottels nummerierte Richtungs- und Geräuschlisten mit ausdrücklich unsicheren Erinnerungen.'},
    selem_handout_c12:{id:'selem_handout_c12',scope:'selem-01',type:'discovery',label:'Handout: Zeichen des verlorenen Weges',rarity:'unique',unique:true,hidden:true,requires:{kinds:['glyph']},placement:{features:['glyph','threshold','wall']},mechanics:{handoutId:'c12-lost-way-glyph'},description:'Abzeichnung des Zeichens des verlorenen Weges an der Schwelle.'},
    selem_handout_c14:{id:'selem_handout_c14',scope:'selem-01',type:'discovery',label:'Handout: Sahiras Richtungsprotokoll',rarity:'unique',unique:true,hidden:true,requires:{kinds:['room']},placement:{features:['table','shelf','floor']},mechanics:{handoutId:'c14-sahira-protocol'},description:'Sahiras Arbeitsprotokoll mit absoluten Richtungen, gestrichenen Erinnerungsaussagen und enger Zielbehauptung.'},
    selem_handout_c15:{id:'selem_handout_c15',scope:'selem-01',type:'discovery',label:'Handout: Netz der Zeitanker',rarity:'unique',unique:true,hidden:true,requires:{kinds:['goal']},placement:{features:['altar','floor','room']},mechanics:{handoutId:'c15-time-anchor-network'},description:'Arbeitsblatt zum Ordnen unabhängiger Zeitanker im Finale.'}
  },
  rooms:{
    A06:{slots:[{id:'handout-a06',type:'discovery',fixed:'selem_handout_a06',placement:['lens','floor'],additiveOnUpgrade:true}]},
    B12:{slots:[{id:'handout-b12',type:'discovery',fixed:'selem_handout_b12',placement:['door','gate','wall'],additiveOnUpgrade:true}]},
    C03:{slots:[{id:'handout-c03',type:'discovery',fixed:'selem_handout_c03',placement:['glyph','wall'],additiveOnUpgrade:true}]},
    C10:{slots:[
      {id:'actor-nottel',type:'encounter',fixed:'selem_nottel_witness',placement:['bed','wall','door'],additiveOnUpgrade:true},
      {id:'handout-c10',type:'discovery',fixed:'selem_handout_c10',placement:['bed','wall','floor'],additiveOnUpgrade:true}
    ]},
    C12:{slots:[{id:'handout-c12',type:'discovery',fixed:'selem_handout_c12',placement:['glyph','threshold','wall'],additiveOnUpgrade:true}]},
    C14:{slots:[{id:'handout-c14',type:'discovery',fixed:'selem_handout_c14',placement:['table','shelf','floor'],additiveOnUpgrade:true}]},
    C15:{slots:[
      {id:'actor-sahira',type:'encounter',fixed:'selem_sahira_antagonist',placement:['altar','glyph','floor'],additiveOnUpgrade:true},
      {id:'actor-nachzehrer',type:'encounter',fixed:'selem_nachzehrer',placement:['glyph','altar','room'],additiveOnUpgrade:true},
      {id:'ritual-sahira-rewrite',type:'event',fixed:'selem_sahira_rewrite_ritual',placement:['altar','glyph','floor'],additiveOnUpgrade:true},
      {id:'finale-own-anchor',type:'discovery',fixed:'selem_finale_own_anchor',placement:['floor','room'],additiveOnUpgrade:true},
      {id:'handout-c15',type:'discovery',fixed:'selem_handout_c15',placement:['altar','floor','room'],additiveOnUpgrade:true}
    ]}
  }
};

export const SCENARIO_CONTENT_PACKS=Object.freeze({'selem-01':SELEM_STORY_PACK});

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
export function scenarioHandoutIds(scenarioId){return Object.values(scenarioContentPack(scenarioId)?.items||{}).filter(x=>x.mechanics?.handoutId).map(x=>x.mechanics.handoutId)}
