const SELEM_STORY_PACK={
  id:'selem-authored-content-v2',
  version:6,
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
    selem_nottel_guard:{
      id:'selem_nottel_guard',scope:'selem-01',type:'encounter',label:'Kultwächter vor Nottels Zelle',rarity:'unique',unique:true,
      requires:{kinds:['prison'],tagsAll:['cult','lost_people']},placement:{features:['door','guard_post','room']},
      mechanics:{stance:'guarding',repeatable:false,effectTags:['cult','guard','social_or_combat'],reinforcementHint:'Bei offenem Alarm versucht der Wächter, Verstärkung aus dem nahen Kultistenlager C11 zu rufen.'},
      description:'Ein einzelner Kultist hält unmittelbar an Nottels verriegelter Seitenkammer Wache. Er trägt den Schlüssel zur Zellentür und rechnet mit Fluchtversuchen, nicht mit einer Heldengruppe aus dem Inneren der Anlage. Bei Lärm versucht er, die Kultisten im nahen Lager zu alarmieren.'
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
    },

    // Konkretes Alltags-Loot aus der Aventurischen Preisliste. `unique` meint hier nur:
    // derselbe konkrete Fund wird innerhalb dieses generierten Dungeons nicht mehrfach gesetzt.
    selem_gear_sturmlaterne_oel:{id:'selem_gear_sturmlaterne_oel',scope:'selem-01',type:'loot',label:'Sturmlaterne, Öl',rarity:'uncommon',unique:true,requires:{tagsAny:['old_elem','machinery','cult','lost_people','pilgrim']},placement:{features:['shelf','crate','wall_niche','workbench','floor','rubble']},mechanics:{category:'gear',portable:true,source:'Aventurische Preisliste',priceReference:'12 S',listWeight:30},description:'Eine robuste ölbetriebene Sturmlaterne. Das Metall ist angelaufen, doch Brenner, Bügel und Verschluss sind noch brauchbar.'},
    selem_gear_zunderdose_wasserdicht:{id:'selem_gear_zunderdose_wasserdicht',scope:'selem-01',type:'loot',label:'Zunderdose, wasserdicht',rarity:'uncommon',unique:true,requires:{tagsAny:['old_elem','cult','lost_people','pilgrim','water']},placement:{features:['shelf','crate','wall_niche','camp','floor']},mechanics:{category:'gear',portable:true,source:'Aventurische Preisliste',priceReference:'7 S',listWeight:10},description:'Eine verschraubte wasserdichte Zunderdose. Der Inhalt ist trocken geblieben und tatsächlich noch nutzbar.'},
    selem_gear_feldflasche_5:{id:'selem_gear_feldflasche_5',scope:'selem-01',type:'loot',label:'Feldflasche, 5 Schank',rarity:'common',unique:true,requires:{tagsAny:['cult','lost_people','pilgrim','old_elem']},placement:{features:['crate','camp','shelf','bedroll','floor']},mechanics:{category:'gear',portable:true,source:'Aventurische Preisliste',priceReference:'3 S',listWeight:12},description:'Eine kleine Feldflasche für fünf Schank. Sie riecht abgestanden, ist aber dicht und nach Reinigung problemlos weiterzuverwenden.'},
    selem_gear_brotbeutel:{id:'selem_gear_brotbeutel',scope:'selem-01',type:'loot',label:'Brotbeutel',rarity:'common',unique:true,requires:{tagsAny:['cult','lost_people','pilgrim']},placement:{features:['crate','camp','shelf','bedroll']},mechanics:{category:'gear',portable:true,source:'Aventurische Preisliste',priceReference:'5 H',listWeight:8},description:'Ein einfacher Brotbeutel aus festem Tuch. Der ursprüngliche Inhalt ist unbrauchbar, der Beutel selbst nicht.'},
    selem_gear_kletterseil_10:{id:'selem_gear_kletterseil_10',scope:'selem-01',type:'loot',label:'Kletterseil, 10 Schritt',rarity:'uncommon',unique:true,requires:{tagsAny:['old_elem','machinery','structural','water']},placement:{features:['crate','workbench','machinery','floor','rubble']},mechanics:{category:'gear',portable:true,source:'Aventurische Preisliste',priceReference:'10 S',listWeight:35},description:'Zehn Schritt ordentlich aufgewickeltes Kletterseil. Feucht und schmutzig, aber ohne erkennbare Fäulnis.'},
    selem_gear_duenne_kette_5:{id:'selem_gear_duenne_kette_5',scope:'selem-01',type:'loot',label:'Dünne Kette, 5 Schritt',rarity:'uncommon',unique:true,requires:{tagsAny:['old_elem','machinery','cult']},placement:{features:['crate','workbench','machinery','wall_niche','floor']},mechanics:{category:'gear',portable:true,source:'Aventurische Preisliste',priceReference:'2 D',listWeight:100},description:'Fünf Schritt dünne Kette, ordentlich zusammengenommen und nur oberflächlich angerostet. Sie lässt sich noch zuverlässig belasten.'},
    selem_gear_papier_10:{id:'selem_gear_papier_10',scope:'selem-01',type:'loot',label:'Papier, 10 Bögen',rarity:'uncommon',unique:true,requires:{tagsAny:['writings','cult','memory','lost_people']},placement:{features:['table','desk','shelf','wall_niche','crate']},mechanics:{category:'writing',portable:true,source:'Aventurische Preisliste',priceReference:'3 S',listWeight:3},description:'Zehn noch brauchbare Papierbögen, zwischen zwei Brettern trocken gehalten. Einige Ränder sind fleckig, die Schreibflächen aber frei.'},
    selem_gear_tinte:{id:'selem_gear_tinte',scope:'selem-01',type:'loot',label:'Tinte',rarity:'common',unique:true,requires:{tagsAny:['writings','cult','memory','lost_people']},placement:{features:['table','desk','shelf','crate']},mechanics:{category:'writing',portable:true,source:'Aventurische Preisliste',priceReference:'2 S',listWeight:4},description:'Ein kleines, fest verschlossenes Tintengefäß. Der Inhalt ist zäh geworden, lässt sich aber mit etwas Wasser wieder brauchbar machen.'},
    selem_gear_schreibkreide:{id:'selem_gear_schreibkreide',scope:'selem-01',type:'loot',label:'Schreibkreide',rarity:'common',unique:true,requires:{tagsAny:['writings','cult','memory','old_elem']},placement:{features:['table','desk','shelf','floor','wall_niche']},mechanics:{category:'writing',portable:true,source:'Aventurische Preisliste',priceReference:'4 H',listWeight:1},description:'Mehrere kurze Stücke Schreibkreide in einem Stoffwickel. Unspektakulär – und in einem Labyrinth mit unzuverlässiger Erinnerung ausgesprochen nützlich.'},
    selem_gear_stundenglas:{id:'selem_gear_stundenglas',scope:'selem-01',type:'loot',label:'Stundenglas',rarity:'uncommon',unique:true,requires:{tagsAny:['old_elem','machinery','memory','writings']},placement:{features:['table','shelf','workbench','wall_niche','machine']},mechanics:{category:'instrument',portable:true,source:'Aventurische Preisliste',priceReference:'3 D',listWeight:10},description:'Ein kleines Stundenglas in einer schützenden Fassung. Das Glas ist unbeschädigt und der feine Sand läuft noch gleichmäßig.'},
    selem_gear_tagebuch:{id:'selem_gear_tagebuch',scope:'selem-01',type:'loot',label:'Tagebuch, Papier',rarity:'uncommon',unique:true,requires:{tagsAny:['writings','cult','memory','lost_people']},placement:{features:['table','desk','shelf','wall_niche','bedroll']},mechanics:{category:'writing',portable:true,source:'Aventurische Preisliste',priceReference:'35 S',listWeight:20},description:'Ein kleines gebundenes Papiertagebuch. Nur wenige Seiten sind beschrieben; der größte Teil ist trocken und unbenutzt geblieben.'},
    selem_gear_zirkel:{id:'selem_gear_zirkel',scope:'selem-01',type:'loot',label:'Zirkel',rarity:'uncommon',unique:true,requires:{tagsAny:['old_elem','machinery','writings','cult']},placement:{features:['table','desk','shelf','workbench','wall_niche']},mechanics:{category:'instrument',portable:true,source:'Aventurische Preisliste',priceReference:'15 S',listWeight:4},description:'Ein kleiner Metallzirkel mit noch leichtgängiger Stellschraube. An den Spitzen haften Reste dunkler Kreide.'},
    selem_gear_duftoel:{id:'selem_gear_duftoel',scope:'selem-01',type:'loot',label:'Duftöl',rarity:'common',unique:true,requires:{tagsAny:['cult','pilgrim']},placement:{features:['altar','shrine','shelf','crate','wall_niche']},mechanics:{category:'gear',portable:true,source:'Aventurische Preisliste',priceReference:'1 S',listWeight:10},description:'Ein kleines Fläschchen Duftöl, offenbar für Lampen oder kultische Räucherungen verwendet. Der schwere Geruch hat die Jahre besser überstanden als das Etikett.'},
    selem_gear_oellampe:{id:'selem_gear_oellampe',scope:'selem-01',type:'loot',label:'Öllampe',rarity:'common',unique:true,requires:{tagsAny:['old_elem','cult','pilgrim','lost_people','memory']},placement:{features:['shelf','table','camp','wall_niche','floor']},mechanics:{category:'gear',portable:true,source:'Aventurische Preisliste',priceReference:'3 S',listWeight:15},description:'Eine einfache Öllampe. Der Docht muss ersetzt werden, doch der Behälter ist dicht und die Lampe ohne großen Aufwand wieder verwendbar.'},
    selem_gear_armbeutel:{id:'selem_gear_armbeutel',scope:'selem-01',type:'loot',label:'Armbeutel',rarity:'common',unique:true,requires:{tagsAny:['pilgrim','cult','lost_people']},placement:{features:['bedroll','camp','shelf','floor','wall_niche']},mechanics:{category:'gear',portable:true,source:'Aventurische Preisliste',priceReference:'7 S',listWeight:20},description:'Ein kleiner Armbeutel aus kräftigem Leder. Die Schnalle ist grün angelaufen, Riemen und Nähte halten jedoch.'},
    selem_gear_bronzeflasche:{id:'selem_gear_bronzeflasche',scope:'selem-01',type:'loot',label:'Bronzeflasche, 1 Schank',rarity:'uncommon',unique:true,requires:{tagsAny:['old_elem','machinery','cult','pilgrim']},placement:{features:['shelf','crate','workbench','wall_niche','altar']},mechanics:{category:'gear',portable:true,source:'Aventurische Preisliste',priceReference:'8 S',listWeight:50},description:'Eine kleine Bronzeflasche für einen Schank. Innen riecht sie nur noch metallisch; der Schraubverschluss sitzt erstaunlich sauber.'},
    selem_erased_offering_names:{id:'selem_erased_offering_names',scope:'selem-01',type:'discovery',label:'Abgeschabte Namen am Opferstein',rarity:'unique',unique:true,requires:{tagsAny:['grave','cult','old_elem']},placement:{features:['altar','wall','grave']},discover:{difficulty:1},description:'Am alten Opferstein wurden Namen bewusst abgeschabt. In den tiefsten Ritzungen bleiben einzelne Zeichen erhalten; hier wurde Erinnerung ganz materiell aus dem Stein entfernt, lange bevor die heutigen Phänomene einsetzten.'},

    selem_alchemy_alraune_glas:{id:'selem_alchemy_alraune_glas',scope:'selem-01',type:'loot',label:'Alraune im Glas',rarity:'uncommon',requires:{tagsAny:['alchemy']},placement:{features:['shelf','jars','workbench','crate']},mechanics:{category:'alchemy_ingredient',valueTier:1,portable:true,source:'Wege der Alchimie · Tabelle 4 Zutaten',priceReference:'8 S für eingelegte Alraune laut Aventurischer Preisliste'},description:'Eine vollständig eingelegte Alraunenwurzel in einem dicht verschlossenen Glas. Für einen Alchimisten ist sie deutlich interessanter als ihr bloßer Verkaufswert.'},
    selem_alchemy_brabaker_vitriol:{id:'selem_alchemy_brabaker_vitriol',scope:'selem-01',type:'loot',label:'Brabaker Vitriol',rarity:'uncommon',requires:{tagsAny:['alchemy']},placement:{features:['shelf','jars','workbench','crate']},mechanics:{category:'alchemy_ingredient',valueTier:2,portable:true,source:'Wege der Alchimie · Tabelle 4 Zutaten',priceReference:'6 D laut Aventurischer Preisliste'},description:'Ein kleines, sauber versiegeltes Gefäß mit Brabaker Vitriol; Beschriftung und Lagerung sind noch lesbar genug, dass der Inhalt fachkundig bestimmt werden kann.'},
    selem_alchemy_feuerschlick_alge:{id:'selem_alchemy_feuerschlick_alge',scope:'selem-01',type:'loot',label:'Feuerschlick-Alge',rarity:'rare',requires:{tagsAny:['alchemy']},placement:{features:['shelf','jars','workbench']},mechanics:{category:'alchemy_ingredient',valueTier:2,portable:true,source:'Wege der Alchimie · Tabelle 4 Zutaten'},description:'Ein konserviertes Bündel Feuerschlick-Alge in einem alten Laborgefäß. Der Fund ist selten genug, dass Norel ihn eher als Zutat oder Forschungsobjekt denn als gewöhnliche Handelsware betrachten dürfte.'},
    selem_alchemy_goldstaub:{id:'selem_alchemy_goldstaub',scope:'selem-01',type:'loot',label:'Kleine Phiole Goldstaub',rarity:'rare',requires:{tagsAny:['alchemy']},placement:{features:['shelf','wall_niche','workbench','crate']},mechanics:{category:'alchemy_ingredient',valueTier:2,portable:true,source:'Wege der Alchimie · Tabelle 4 Zutaten'},description:'Nur eine kleine Menge feinsten Goldstaubs, sorgfältig trocken gelagert. Wertvoll, aber keineswegs ein Schatzfund, der den ganzen Dungeon bezahlt.'},
    selem_alchemy_zinnober:{id:'selem_alchemy_zinnober',scope:'selem-01',type:'loot',label:'Zinnober',rarity:'uncommon',requires:{tagsAny:['alchemy']},placement:{features:['shelf','jars','workbench','crate']},mechanics:{category:'alchemy_ingredient',valueTier:1,portable:true,source:'Wege der Alchimie · Tabelle 4 Zutaten'},description:'Ein kleines Tongefäß mit rotem Zinnober, als alchimistische Zutat beschriftet und trocken genug erhalten, um noch brauchbar zu sein.'},
    selem_alchemy_diamantsplitter:{id:'selem_alchemy_diamantsplitter',scope:'selem-01',type:'loot',label:'Diamantsplitter',rarity:'rare',requires:{tagsAny:['alchemy','old_elem']},placement:{features:['shelf','wall_niche','workbench','crate']},mechanics:{category:'alchemy_ingredient',valueTier:2,portable:true,source:'Wege der Alchimie · Tabelle 4 Zutaten',priceReference:'Rohdiamant 15 S pro Karat laut Aventurischer Preisliste; tatsächliche Splittermenge hier klein'},description:'Ein paar ungeschliffene Diamantsplitter in einem gepolsterten Kästchen. Sie sind als Arbeitsmaterial, nicht als Schmuckstein, abgelegt worden.'},
    selem_alchemy_unauer_salzlake:{id:'selem_alchemy_unauer_salzlake',scope:'selem-01',type:'loot',label:'Unauer Salzlake',rarity:'uncommon',requires:{tagsAny:['alchemy']},placement:{features:['shelf','jars','workbench','crate']},mechanics:{category:'alchemy_ingredient',valueTier:2,portable:true,source:'Wege der Alchimie · Tabelle 4 Zutaten',priceReference:'5 D laut Aventurischer Preisliste'},description:'Eine fest verschlossene Flasche Unauer Salzlake. Der Inhalt wirkt unspektakulär, ist aber als alchimistische Grundzutat deutlich wertvoller als gewöhnliche Salzlösung.'},
    selem_alchemy_rosenquarz:{id:'selem_alchemy_rosenquarz',scope:'selem-01',type:'loot',label:'Kleiner ungeschliffener Rosenquarz',rarity:'uncommon',requires:{tagsAny:['alchemy','old_elem']},placement:{features:['shelf','wall_niche','workbench','crate']},mechanics:{category:'alchemy_ingredient',valueTier:1,portable:true,source:'Wege der Alchimie · Tabelle 4 Zutaten',priceReference:'26 S pro Karat geschliffen laut Aventurischer Preisliste; ungeschliffen höchstens etwa die Hälfte'},description:'Ein kleiner ungeschliffener Rosenquarz, offenbar als alchimistische Zutat und nicht als Schmuckstein vorgesehen.'},
    selem_alchemy_schwefelquell:{id:'selem_alchemy_schwefelquell',scope:'selem-01',type:'loot',label:'Gratenfelser Schwefelquell',rarity:'uncommon',requires:{tagsAny:['alchemy']},placement:{features:['shelf','jars','workbench','crate']},mechanics:{category:'alchemy_ingredient',valueTier:1,portable:true,source:'Wege der Alchimie · Tabelle 4 Zutaten',priceReference:'2 D laut Aventurischer Preisliste'},description:'Ein kleines, dichtes Gefäß mit Gratenfelser Schwefelquell. Geruch und Beschriftung lassen kaum Zweifel an der Substanz.'},

    selem_alchemy_wundpulver:{id:'selem_alchemy_wundpulver',scope:'selem-01',type:'loot',label:'Wundpulver',rarity:'common',requires:{tagsAny:['alchemy']},placement:{features:['shelf','wall_niche','workbench','crate']},mechanics:{category:'alchemy_elixir',valueTier:1,portable:true,source:'Wege der Alchimie · Tabelle 2 Alchimistische Beute',qualityRoll:'Qualität bei Bedarf mit 3W6 nach WdA Tabelle 3 bestimmen'},description:'Eine einzelne brauchbar versiegelte Portion Wundpulver. Die konkrete Qualität ist nicht auf dem Behälter vermerkt und wird erst bei Analyse oder Verwendung festgelegt.'},
    selem_alchemy_heiltrank:{id:'selem_alchemy_heiltrank',scope:'selem-01',type:'loot',label:'Heiltrank',rarity:'uncommon',requires:{tagsAny:['alchemy']},placement:{features:['shelf','wall_niche','workbench','crate']},mechanics:{category:'alchemy_elixir',valueTier:2,portable:true,source:'Wege der Alchimie · Tabelle 2 Alchimistische Beute',qualityRoll:'Qualität bei Bedarf mit 3W6 nach WdA Tabelle 3 bestimmen',priceReference:'10 D laut Aventurischer Preisliste'},description:'Eine einzelne versiegelte Portion Heiltrank. Sie ist ein guter Fund, aber bewusst keine Kiste voller Heilmittel; Qualität und Haltbarkeit sind fachkundig zu prüfen.'},
    selem_alchemy_antidot:{id:'selem_alchemy_antidot',scope:'selem-01',type:'loot',label:'Antidot',rarity:'rare',requires:{tagsAny:['alchemy']},placement:{features:['shelf','wall_niche','workbench','crate']},mechanics:{category:'alchemy_elixir',valueTier:2,portable:true,source:'Wege der Alchimie · Tabelle 2 Alchimistische Beute',qualityRoll:'Qualität bei Bedarf mit 3W6 nach WdA Tabelle 3 bestimmen'},description:'Eine einzelne, sorgfältig versiegelte Dosis Antidot. Ohne Analyse ist weder die Qualität noch die konkrete Verwendbarkeit gegen ein bestimmtes Gift sicher.'},
    selem_alchemy_schlaftrunk:{id:'selem_alchemy_schlaftrunk',scope:'selem-01',type:'loot',label:'Schlaftrunk',rarity:'uncommon',requires:{tagsAny:['alchemy']},placement:{features:['shelf','wall_niche','workbench','crate']},mechanics:{category:'alchemy_elixir',valueTier:2,portable:true,source:'Wege der Alchimie · Tabelle 2 Alchimistische Beute',qualityRoll:'Qualität bei Bedarf mit 3W6 nach WdA Tabelle 3 bestimmen'},description:'Eine kleine versiegelte Dosis Schlaftrunk. Der Inhalt ist als alchimistisches Erzeugnis erkennbar, die Qualität jedoch nicht ohne Weiteres.'},
    selem_alchemy_stinktoepfchen:{id:'selem_alchemy_stinktoepfchen',scope:'selem-01',type:'loot',label:'Stinktöpfchen',rarity:'common',requires:{tagsAny:['alchemy','cult']},placement:{features:['shelf','crate','workbench','wall_niche']},mechanics:{category:'alchemy_elixir',valueTier:1,portable:true,source:'Wege der Alchimie · Tabelle 2 Beifang',qualityRoll:'Qualität bei Bedarf mit 3W6 nach WdA Tabelle 3 bestimmen'},description:'Ein kleines, fest verschlossenes Stinktöpfchen – kein großer Schatz, aber ein sehr aventurischer Verbrauchsgegenstand, den findige Helden durchaus gebrauchen können.'}
  },
  poolPatches:{
    ambient_encounters:{remove:['encounter_vermin','encounter_cave_creatures'],add:['selem_fledermauskolonie']},
    water_encounters:{remove:['encounter_vermin','encounter_cave_creatures'],add:['selem_bleichmuraene','selem_riesenspringegel','selem_grubenwurm','selem_fledermauskolonie']},
    reusable_encounters:{remove:['encounter_scavenger_swarm','encounter_water_predator'],add:['selem_fledermauskolonie','selem_bleichmuraene','selem_riesenspringegel','selem_grubenwurm']},
    minor_loot:{remove:['loot_old_elem_tools'],add:['selem_gear_sturmlaterne_oel','selem_gear_zunderdose_wasserdicht','selem_gear_feldflasche_5','selem_gear_oellampe','selem_gear_armbeutel']},
    pilgrim_loot:{add:['selem_gear_feldflasche_5','selem_gear_brotbeutel','selem_gear_zunderdose_wasserdicht','selem_gear_oellampe','selem_gear_armbeutel']},
    cult_loot:{add:['selem_gear_feldflasche_5','selem_gear_brotbeutel','selem_gear_zunderdose_wasserdicht','selem_gear_papier_10','selem_gear_tinte','selem_gear_schreibkreide','selem_gear_duftoel','selem_gear_oellampe']},
    old_elem_minor_loot:{remove:['loot_old_elem_tools'],add:['selem_gear_sturmlaterne_oel','selem_gear_zunderdose_wasserdicht','selem_gear_kletterseil_10','selem_gear_duenne_kette_5','selem_gear_stundenglas','selem_gear_zirkel','selem_gear_oellampe','selem_gear_bronzeflasche']},
    deep_old_elem_loot:{remove:['loot_old_elem_tools'],add:['selem_gear_sturmlaterne_oel','selem_gear_kletterseil_10','selem_gear_duenne_kette_5','selem_gear_stundenglas','selem_gear_zirkel','selem_gear_bronzeflasche']},
    reusable_salvage_loot:{remove:['loot_service_tools','loot_salvage_metal'],add:['selem_gear_sturmlaterne_oel','selem_gear_zunderdose_wasserdicht','selem_gear_feldflasche_5','selem_gear_brotbeutel','selem_gear_kletterseil_10','selem_gear_duenne_kette_5','selem_gear_papier_10','selem_gear_tinte','selem_gear_schreibkreide','selem_gear_stundenglas','selem_gear_tagebuch','selem_gear_zirkel','selem_gear_duftoel','selem_gear_oellampe','selem_gear_armbeutel','selem_gear_bronzeflasche']},
    general_discoveries:{remove:['discovery_erased_names']},
    old_elem_discoveries:{remove:['discovery_erased_names']},
    memory_discoveries:{remove:['discovery_erased_names']},
    grave_discoveries:{remove:['discovery_erased_names']},
    alchemy_loot:{remove:['loot_alchemy_vial','loot_alchemy_residue'],add:['selem_alchemy_alraune_glas','selem_alchemy_brabaker_vitriol','selem_alchemy_feuerschlick_alge','selem_alchemy_goldstaub','selem_alchemy_zinnober','selem_alchemy_diamantsplitter','selem_alchemy_unauer_salzlake','selem_alchemy_rosenquarz','selem_alchemy_schwefelquell','selem_alchemy_wundpulver','selem_alchemy_heiltrank','selem_alchemy_antidot','selem_alchemy_schlaftrunk','selem_alchemy_stinktoepfchen']}
  },
  rooms:{
    A08:{slots:[{id:'discovery-grave',type:'discovery',fixed:'selem_erased_offering_names',placement:['altar','wall','grave']}]},
    A14:{slots:[
      {id:'reusable-loot',type:'loot',fixed:'selem_gear_oellampe',placement:['shelf','wall_niche','floor']},
      {id:'reusable-encounter',type:'encounter',pool:'reusable_encounters',placement:['room','ceiling','rubble'],chance:0}
    ]},
    A20:{slots:[{id:'loot-old-elem',type:'loot',fixed:'selem_gear_sturmlaterne_oel',placement:['wall_niche','rubble']}]},
    A27:{slots:[{id:'reusable-secret',type:'secret',pool:'reusable_secrets',placement:['wall','wall_niche','floor'],chance:0}]},
    A28:{slots:[{id:'reusable-transit-event',type:'event',pool:'reusable_events',placement:['corridor','room'],chance:0}]},
    A29:{slots:[{id:'reusable-secret',type:'secret',pool:'reusable_secrets',placement:['wall','wall_niche','floor'],chance:0}]},
    B05:{slots:[{id:'loot-old-elem',type:'loot',fixed:'selem_gear_zunderdose_wasserdicht',placement:['wall_niche','shelf']}]},
    B07:{slots:[{id:'loot-old-elem',type:'loot',fixed:'selem_gear_duftoel',placement:['shrine','altar','shelf']}]},
    B14:{slots:[{id:'reusable-loot',type:'loot',fixed:'selem_gear_kletterseil_10',placement:['machine','machinery','floor']}]},
    B16:{slots:[{id:'reusable-transit-event',type:'event',pool:'reusable_events',placement:['corridor','room'],chance:0}]},
    B17:{slots:[{id:'discovery-memory',type:'discovery',pool:'memory_discoveries',placement:['wall','floor','table'],chance:0}]},
    B24:{slots:[
      {id:'loot-machinery',type:'loot',fixed:'selem_gear_stundenglas',placement:['machine','machinery','shelf']},
      {id:'loot-old-elem',type:'loot',pool:'old_elem_minor_loot',placement:['wall_niche','machinery'],chance:0},
      {id:'reusable-encounter',type:'encounter',pool:'reusable_encounters',placement:['room','ceiling','rubble'],chance:0}
    ]},
    B27:{slots:[{id:'discovery-memory',type:'discovery',fixed:'discovery_abandoned_pack',placement:['camp','floor','crate']}]},
    B29:{slots:[{id:'loot-machinery',type:'loot',fixed:'selem_gear_zirkel',placement:['workbench','wall_niche']}]},
    B35:{slots:[{id:'loot-service-tools',type:'loot',fixed:'selem_gear_duenne_kette_5',placement:['workbench']}]},
    C10:{slots:[
      {id:'actor-nottel',type:'encounter',fixed:'selem_nottel_witness',placement:['bed','wall','door'],additiveOnUpgrade:true},
      {id:'guard-nottel',type:'encounter',fixed:'selem_nottel_guard',placement:['door','room'],additiveOnUpgrade:true}
    ]},
    C15:{slots:[
      {id:'actor-sahira',type:'encounter',fixed:'selem_sahira_antagonist',placement:['altar','glyph','floor'],additiveOnUpgrade:true},
      {id:'actor-nachzehrer',type:'encounter',fixed:'selem_nachzehrer',placement:['glyph','altar','room'],additiveOnUpgrade:true},
      {id:'ritual-sahira-rewrite',type:'event',fixed:'selem_sahira_rewrite_ritual',placement:['altar','glyph','floor'],additiveOnUpgrade:true}
    ]},
    C24:{slots:[{id:'loot-authored',type:'loot',fixed:'selem_gear_tagebuch',placement:['wall_niche','shelf'],hidden:true,lockedBy:'secret-authored'}]},
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
