const SELEM_STORY_PACK={
  id:'selem-authored-content-v2',
  version:5,
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

    selem_fledermauskolonie:{
      id:'selem_fledermauskolonie',scope:'selem-01',type:'encounter',label:'Fledermauskolonie',rarity:'uncommon',
      requires:{tagsAny:['old_elem','grave','stale_air','vermin','water']},placement:{features:['ceiling','room','corridor','rubble']},
      mechanics:{species:'Fledermaus',source:'Zoo-Botanica Aventurica',sourceKind:'official',stance:'flight',repeatable:false,effectTags:['fauna','cave','noise']},
      description:'Mehrere Dutzend gewöhnliche Fledermäuse hängen in Spalten und unter Vorsprüngen. Werden sie aufgescheucht, versuchen sie in erster Linie zu fliehen; gefährlich wird der Schwarm vor allem, wenn Licht, Lärm oder enge Wände die Tiere in Panik zwischen die Helden treiben.'
    },
    selem_riesenspringegel:{
      id:'selem_riesenspringegel',scope:'selem-01',type:'encounter',label:'Riesenspringegel',rarity:'rare',
      requires:{tagsAny:['water','vermin'],minDanger:1},placement:{features:['water','floor','ledge','room']},
      mechanics:{species:'Riesenspringegel',source:'Zoo-Botanica Aventurica',sourceKind:'official',stance:'ambush',repeatable:false,occurrence:'10 oder mehr',effectTags:['fauna','swamp','parasite']},
      description:'Unterarmlange, schleimigschwarze Egel reagieren auf Erschütterungen und schnellen aus nassen Spalten oder flachem Wasser. Wo sie vorkommen, treten sie typischerweise in einer größeren Gruppe auf; ihr Ziel ist Festbeißen und Blutsaugen, nicht ein Kampf bis zum letzten Tier.'
    },
    selem_bleichmuraene:{
      id:'selem_bleichmuraene',scope:'selem-01',type:'encounter',label:'Bleichmuräne',rarity:'uncommon',
      requires:{tagsAny:['water'],minDanger:1},placement:{features:['water','ledge','room']},
      mechanics:{species:'Muräne',regionalName:'Bleichmuräne',source:'Zoo-Botanica Aventurica (Muräne); Selemer Bezeichnung/Farbvariante',sourceKind:'official_base_regional_variant',stance:'territorial',repeatable:false,effectTags:['fauna','water','venom']},
      description:'Eine bleich gefärbte Muräne hat sich in einer überfluteten Spalte oder unter versunkenem Mauerwerk festgesetzt. Sie verteidigt ihren Unterschlupf mit dem für Muränen typischen bissigen Verhalten; Blut und Biss sind nicht harmlos.'
    },
    selem_grubenwurm:{
      id:'selem_grubenwurm',scope:'selem-01',type:'encounter',label:'Grubenwurm',rarity:'very_rare',
      requires:{tagsAny:['water','vermin'],minDanger:2},placement:{features:['water','rubble','floor','room']},
      mechanics:{species:'Grubenwurm',source:'Zoo-Botanica Aventurica',sourceKind:'official',stance:'buried',repeatable:false,occurrence:'einzeln',effectTags:['fauna','swamp','ambush','stench']},
      description:'Ein Grubenwurm hat sich halb im Schlamm eingegraben. Blubbernde Gase und ein abscheulicher Aasgeruch sind die besseren Warnzeichen als seine Kontur; wird das Tier überrascht, reagiert es aus nächster Nähe heftig, scheut aber grelles Licht und Feuer.'
    },
    selem_morfu:{
      id:'selem_morfu',scope:'selem-01',type:'encounter',label:'Morfu',rarity:'unique',unique:true,
      requires:{levels:[-3],tagsAny:['water'],minDanger:4},placement:{features:['water','ledge','room']},
      mechanics:{species:'Morfu',source:'Zoo-Botanica Aventurica',sourceKind:'official',stance:'stationary_predator',repeatable:false,occurrence:'einzeln',effectTags:['fauna','swamp','venom','alchemy'],researchHook:'Für Norel als seltenes Untersuchungsobjekt interessant: Hornsplitter, Gift und ungewöhnliche Sinneswahrnehmung. Keine konkrete Rezeptwirkung wird im Crawler behauptet.'},
      description:'Im flachen schwarzen Wasser liegt ein einzelnes Morfu: langsam, bleich, warzenübersät und auf Wärme sowie Erschütterungen reagierend. Wird es aufgestört, ist die Begegnung sofort ernst; das Tier verfolgt fliehende Gegner jedoch nicht. Für einen Alchimisten ist bereits eine sichere Probe oder Dokumentation wertvoller als ein unnötiger Nahkontakt.'
    },
    selem_sumpfranzen:{
      id:'selem_sumpfranzen',scope:'selem-01',type:'encounter',label:'Rotte Sumpfranzen',rarity:'unique',unique:true,
      requires:{kinds:['room'],tagsAny:['water']},placement:{features:['room','water','rubble','ledge']},
      mechanics:{species:'Sumpfranze',source:'Zoo-Botanica Aventurica',sourceKind:'official_with_scenario_adaptation',stance:'watchful_pack',repeatable:false,occurrence:'2W6',effectTags:['fauna','swamp','group'],adaptation:'Die ZBA beschreibt gefährliche Rotten besonders bei Nahrungsknappheit im Winter. In Selem ersetzt die abgeschlossene, nahrungsarme Kaverne diesen Druck; dies ist eine Szenarioanpassung.'},
      description:'Hinter einem eingebrochenen Rand der Treidelhalle öffnet sich eine brackige Naturkaverne. Dort hält sich eine Rotte Sumpfranzen auf: zunächst feige und abwartend, bei gemeinsamem Mut aber schnell kampflustiger. Gerät die Gruppe klar ins Hintertreffen, flieht sie geschlossen in die sumpfigen Spalten.'
    }
  },
  poolPatches:{
    ambient_encounters:{remove:['encounter_vermin','encounter_cave_creatures'],add:['selem_fledermauskolonie']},
    water_encounters:{remove:['encounter_vermin','encounter_cave_creatures'],add:['selem_bleichmuraene','selem_riesenspringegel','selem_grubenwurm','selem_fledermauskolonie']},
    reusable_encounters:{remove:['encounter_scavenger_swarm','encounter_water_predator'],add:['selem_fledermauskolonie','selem_bleichmuraene','selem_riesenspringegel','selem_grubenwurm']}
  },
  rooms:{
    C10:{slots:[{id:'actor-nottel',type:'encounter',fixed:'selem_nottel_witness',placement:['bed','wall','door'],additiveOnUpgrade:true}]},
    C15:{slots:[
      {id:'actor-sahira',type:'encounter',fixed:'selem_sahira_antagonist',placement:['altar','glyph','floor'],additiveOnUpgrade:true},
      {id:'actor-nachzehrer',type:'encounter',fixed:'selem_nachzehrer',placement:['glyph','altar','room'],additiveOnUpgrade:true},
      {id:'ritual-sahira-rewrite',type:'event',fixed:'selem_sahira_rewrite_ritual',placement:['altar','glyph','floor'],additiveOnUpgrade:true}
    ]},
    B31:{slots:[{id:'encounter-sumpfranzen',type:'encounter',fixed:'selem_sumpfranzen',placement:['room','water','rubble'],additiveOnUpgrade:true}]},
    D06:{slots:[{id:'encounter-morfu',type:'encounter',fixed:'selem_morfu',placement:['water','ledge','room'],additiveOnUpgrade:true}]}
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
export function mergeScenarioPools(base,scenarioId){
  const pack=scenarioContentPack(scenarioId),out=structuredClone(base);if(!pack)return out;
  out.pools=out.pools||{};
  for(const [poolId,patch] of Object.entries(pack.poolPatches||{})){
    const pool=out.pools[poolId];if(!pool)throw new Error(`Scenario pool patch references missing pool ${poolId}.`);
    const remove=new Set(patch.remove||[]),entries=(pool.entries||[]).filter(id=>!remove.has(id));
    for(const id of patch.add||[])if(!entries.includes(id))entries.push(id);
    out.pools[poolId]={...pool,entries};
  }
  return out;
}
export function scenarioRoomConfig(scenarioId,nodeId){return structuredClone(scenarioContentPack(scenarioId)?.rooms?.[nodeId]||null)}
export function scenarioActorIds(scenarioId){return Object.values(scenarioContentPack(scenarioId)?.items||{}).filter(x=>x.mechanics?.actorId).map(x=>x.mechanics.actorId)}
