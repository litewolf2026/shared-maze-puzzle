# Reusable dungeon content system

The content system separates **where content may occur** from **what the content is**.

## Layers

1. `data/content/catalog.json` – reusable content definitions.
2. `data/content/pools.json` – weighted candidate sets by content type.
3. Scenario slot files such as `data/content/selem-slots.json` – legal placement opportunities in a concrete dungeon.
4. `js/content-engine.js` – deterministic resolver and persistent-room-state helpers.

## Content types

- `loot` – items, valuables, alchemica, equipment, artifacts.
- `hazard` – structural, environmental, magical or demonic danger.
- `encounter` – people, animals, enemies or phenomena with encounter semantics.
- `discovery` – documents, traces, corpses, maps, lore and clues.
- `secret` – hidden niches, containers and mechanisms that do not change the graph.
- `secret_connection` – prepared graph-level hidden passages. These require an authored `secret_connection_slot`; the generator may never invent arbitrary geometry.
- `event` – local atmospheric or stateful events such as memory loss or time echoes.

## Deterministic generation

A content plan is generated from:

`map + derived danger/distance + catalog + pools + scenario slots + seed`

The resolver sorts rooms and slots before resolving them. A fixed seed therefore creates the same complete plan on every client and after every reload.

Authored unique content is reserved before random pools resolve. This prevents a unique artifact from being selected randomly before its deliberately authored placement is processed.

## Authored and pooled slots

A slot can force a specific item:

```json
{"id":"loot-1","type":"loot","fixed":"loot_old_elem_component"}
```

or draw from a reusable pool:

```json
{"id":"hazard-1","type":"hazard","pool":"environment_hazards","placement":["water","floor"]}
```

Pools never override item requirements. Tags, room kind, dungeon level, danger, solution distance and placement features can all filter candidates.

## Persistence model

`generateContentPlan()` creates the deterministic plan. `materializeRoomState()` copies only one reached room into the shared room state. Once materialized, the room content is not rerolled. `updateContentState()` changes the state of an assignment, e.g. from `unresolved` to `discovered`, `triggered`, `taken`, `disabled` or another scenario-defined state.

The runtime integration should materialize content only when a party actually reaches a location. A future per-instance seed may derive from a room/campaign instance identifier, giving different groups different dungeon populations while keeping each group's world stable.

## Dramaturgy

Critical story rooms should use authored slots or no random slots at all. Random pools are intended for optional exploration, environmental variation and replayability. The black-band route and its mandatory story beats remain protected from uncontrolled generation.

## Hidden rooms

Hidden graph branches are never created in arbitrary coordinates. A map author must first provide a legal `secret_connection_slot`. A `secret_connection` content result may later activate that prepared connection. This keeps procedural generation from producing impossible topology.
