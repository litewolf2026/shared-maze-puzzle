# Shared Maze Puzzle

Generische, gemeinsam gespielte Online-Wegsuche für Rollenspielrunden. Die erste feste Szenariofassung ist **Selem – Das schwarze Band**.

## V1

- große handgebaute Untergrundkarte mit drei Ebenen und 55 Orten
- Datenmodell aus Karte (`data/maps.json`), Chiffre (`data/ciphers.json`) und Szenario (`data/scenarios.json`)
- schwarzes Band als Punktschrift-Codezeile
- Uhr-/Kompasssteuerung für 8 Richtungen plus AUF/AB
- falsche Wege sind echte Wege; ein Codeschritt wird nur bei einer tatsächlich möglichen Bewegung verbraucht
- Fog of War, Weg-Historie, Undo/Reset und SL-Aufdeckung
- optionaler gemeinsamer Live-Spielstand via Supabase Realtime

## Lokal testen

Einfach einen statischen Server starten, z. B.:

```bash
python -m http.server 8080
```

Dann `http://localhost:8080` öffnen.

## Supabase

Die App erwartet optional eine Tabelle `maze_rooms` und Realtime auf dieser Tabelle. `config.js` enthält URL und **publishable key**. Niemals Service-Role-Schlüssel ins Frontend schreiben.

Schema:

```sql
create table if not exists public.maze_rooms (
  room_id text primary key,
  scenario_id text not null,
  state jsonb not null default '{}'::jsonb,
  client_id text,
  updated_at timestamptz not null default now()
);
```

Für eine private Spielrunde kann eine sehr einfache RLS-Regel über eine nicht erratbare `room_id` ergänzt werden; für eine öffentliche Veröffentlichung sollte ein sauberer Raumtoken-/Auth-Mechanismus verwendet werden.

## Erweiterung

Weitere Karten und Chiffren können später hinzugefügt und per `scenario` kombiniert bzw. zufällig ausgewählt werden. Das Datenmodell ist bereits darauf vorbereitet.
