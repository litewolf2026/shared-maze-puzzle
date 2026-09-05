# Shared Maze Puzzle

Generische, gemeinsam gespielte Online-Wegsuche für Rollenspielrunden. Die erste feste Szenariofassung ist **Selem – Das schwarze Band**.

## V1

- große handgebaute Untergrundkarte mit drei Ebenen und 55 Orten
- Datenmodell aus Karte (`data/maps.json`), Chiffre (`data/ciphers.json`) und Szenario (`data/scenarios.json`)
- schwarzes Band als Punktschrift-Codezeile
- Uhr-/Kompasssteuerung für 8 Richtungen plus AUF/AB
- falsche Wege sind echte Wege; ein Codeschritt wird nur bei einer tatsächlich möglichen Bewegung verbraucht
- Fog of War, Weg-Historie, gemeinsamer Gruppenmarker
- Live-Synchronisation für alle verbundenen Browser
- persistenter Raumzustand auch nach Reload/Reconnect
- optimistische Versionsprüfung gegen gleichzeitige widersprüchliche Klicks
- SL-Zugang mit Undo, Reset und lokaler Kartenaufdeckung

## Spielprinzip

Die Codezeile gibt nur die nächste Richtungsentscheidung vor. Läuft die Gruppe vorher falsch, kann ein späteres Zeichen eine Richtung verlangen, die am aktuellen Ort gar nicht existiert. Dann wird kein Zeichen verbraucht: Die Gruppe muss herausfinden, an welcher früheren Weggabelung sie falsch lag.

## Architektur

```text
GitHub Pages
    │
    ├── data/maps.json       Karten/Graphen
    ├── data/ciphers.json    Chiffren
    ├── data/scenarios.json  Kombinationen
    │
    └── Supabase
          ├── Postgres: persistenter Raumzustand
          ├── RPC: tokengeprüfte Zustandsänderungen
          └── Realtime Broadcast: Live-Updates
```

Die Tabelle `maze_rooms` ist für `anon`/`authenticated` direkt gesperrt. Browser greifen ausschließlich über tokenprüfende `SECURITY DEFINER`-RPCs zu. Spieler- und SL-Token werden nur als SHA-256-Hash gespeichert. Der Realtime-Kanal verwendet zusätzlich ein zufälliges Channel-Secret.

Der Browser enthält nur die Supabase-Projekt-URL und den **publishable key**. Niemals `service_role`- oder Secret-Keys ins Repository schreiben.

## Raumlinks

Zugangsdaten liegen im URL-Fragment und werden dadurch beim normalen Seitenaufruf nicht an GitHub Pages gesendet:

```text
#room=XXXXXXXX&token=SPIELER_TOKEN
```

Ein SL-Link verwendet den SL-Token. Optional kann er zusätzlich `play=SPIELER_TOKEN` enthalten; dann kann die Spielleitung aus dem Panel direkt den Spielerlink kopieren.

## Lokal testen

Einen statischen Server starten, z. B.:

```bash
python -m http.server 8080
```

Dann `http://localhost:8080` öffnen. Ohne Raumfragment startet die Anwendung bewusst als lokaler Probelauf.

## Supabase

Das produktive V1-Backend läuft in einem eigenen Supabase-Projekt in `eu-central-1`. Die versionierte Datenbankdefinition liegt unter `supabase/migrations/`.

## Tests

```bash
node tests/validate.mjs
node tests/deviations.mjs
```

Die Tests prüfen unter anderem, dass der definierte Lösungsweg tatsächlich am Ziel endet und dass einzelne Fehlabbiegungen nicht versehentlich ebenfalls die Lösung ergeben.

## Erweiterung

Weitere Karten und Chiffren können später hinzugefügt und per `scenario` kombiniert bzw. zufällig ausgewählt werden. Geplante nächste Ausbaustufe: Raumerzeugung über eine geschützte SL-/Admin-Oberfläche, mehrere Karten, mehrere Chiffren und Seed-basierte Auswahl.
