# Shared Maze Puzzle – Selem

Gemeinsames Browser-Dungeonrätsel für die DSA-Kampagne in Selem. Mehrere Spieler teilen denselben Gruppenstand über Supabase, können sich in der Crawleransicht aber unabhängig umsehen und große Räume lokal erkunden.

## Spielmodell V2

- **3-m-Raster:** Ein physischer Bewegungsabschnitt entspricht ungefähr 3×3 Metern.
- **Logische Orte statt Rasterknoten:** Räume, Kreuzungen und besondere Orte bleiben Graphknoten. Die Verbindung dazwischen kann aus mehreren 3-m-Transitabschnitten bestehen.
- **Schwarzes Band:** Die 25 Zeichen kodieren absolute Himmelsrichtungen. Ein Zeichen wird nur beim Verlassen eines echten Entscheidungspunktes verbraucht.
- **Transit:** Schritte durch einen bereits gewählten Gang verbrauchen kein weiteres Bandzeichen.
- **Rückweg:** Wird ein falscher Ast vollständig bis zum ursprünglichen Entscheidungspunkt zurückgegangen, wird genau das dort verbrauchte Zeichen wieder freigegeben.
- **Persönlicher Blick:** N/NO/O/SO/S/SW/W/NW, lokal pro Gerät, in 45°-Schritten.
- **Gemeinsame Bewegung:** Die Gruppe besitzt einen gemeinsamen Dungeonstandort und wählt Ausgänge über absolute Richtungen.
- **Raumerkundung:** Große Räume besitzen ein lokales Erkundungsraster. Individuelle Heldenpositionen bleiben auf dem Gerät; gefundene Raumdetails werden gemeinsam synchronisiert.

## Dungeon

Die V2-Erweiterung enthält **103 logische Orte auf vier Ebenen**: Obere Ruinen, Tiefes Alt-Elem, Die vergessene Tiefe und Unter Alt-Elem. Der ursprüngliche 25-Entscheidungen-Sollweg von A01 bis C15 bleibt unverändert; Ebene D ist vollständig optional.

## Risiko und Inhalte

Nebenräume tragen narrative Tags wie `water`, `memory`, `lost_people`, `old_elem`, `demonic`, `alchemy` oder `machinery`. `js/content-model.js` berechnet die kürzeste Graphdistanz zum Sollweg. Daraus entsteht eine Grundgefahr, die `dangerFloor` anheben kann. Loot bleibt mit `lootTier` bewusst authored. Begegnungspools liegen in `data/encounter-pools.json`, gemeinsam entdeckbare Details in `data/room-features.json`.

## Autoritative Daten und Supabase

`data/maps.json` bleibt die Basis des ursprünglichen Dungeons; `data/selem-expansion.json` wird deterministisch darübergelegt. Supabase validiert Graphkanten, Pfadkontinuität, Transit, Bandentscheidungen, Entscheidungsknoten, Bandlänge und Zielzustand. CI prüft zusätzlich Frontend-/Backend-Graphparität und Bandknoten-Parität.

## Wichtige Dateien

- `js/app-v2.js` – gemeinsame Spielsteuerung und Supabase-Synchronisation
- `js/navigation-model.js` – 3-m-Transit, Entscheidungen, Rückwege
- `js/crawler-view.js` – Pseudo-3D-Gang- und Raumrenderer
- `js/exploration-controller.js` – persönlicher Blick und lokale Raumerkundung
- `js/map-expansion.js` – deterministischer Merge der Erweiterung
- `js/content-model.js` – Distanz/Risiko/Inhaltsmetadaten
- `js/gm-route-v2.js` – SL-Pfad, Namen, IDs und Abweichungsanzeige
- `data/selem-expansion.json` – zusätzliche 48 Orte und Ebene D
- `data/room-features.json` – untersuchbare Raumdetails
- `data/encounter-pools.json` – thematische Begegnungspools

## Tests

GitHub Actions validiert Syntax, Datenreferenzen, Richtungsgeometrie, Frontend-/Backend-Parität, eindeutigen 25er-Sollweg, alle 325 Sollort-Paare gegen neue gleich kurze/kürzere Umwege, Fehlabbiegungen, Crawler-Blickrichtungen, Transit/Rückweg, die 103-Orte-Erweiterung, Risiko-/Contentmodell und Raumerkundungsfeatures.

## Lokal testen

```bash
python -m http.server 8080
```

Dann `http://localhost:8080` öffnen. Ohne Raumfragment startet die Anwendung als lokaler Probelauf. Private Raum-, Spieler- und SL-Tokens gehören niemals ins Repository.
