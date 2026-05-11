# World Generation Architecture Plan

This document expands the terrain and world-generation cleanup direction from `docs/architecture-cleanup-roadmap.md`.

The core idea is that the world should not be generated as isolated rooms that happen to touch. Generation should operate at several scales:

1. The world as a whole.
2. The biome map as a whole.
3. Multi-room regions and structures.
4. Individual room terrain.
5. Safety validation after every layer has projected into the room.

The player still experiences one room at a time, but the generator should know about larger shapes: mountains, villages, forests, oceans, rivers, castles, roads, shorelines, and transition zones.

## Goals

- Make terrain generation safe, readable, testable, and extensible.
- Support structures that span multiple rooms.
- Ensure every room entrance gives the player enough lead-up space to react.
- Keep early-game geography somewhat learnable and memorable.
- Allow later-world geography to be seeded, randomized, and surprising.
- Move from one monolithic `roomGenerator.ts` script to a staged world-generation pipeline.
- Encode generation intent, not just tile placement.
- Prepare for persistent world state later, where generated content can be reproduced but changed content is saved.

## Current Problems

`src/world/roomGenerator.ts` currently handles too many concepts in one place:

- base floors and blockers;
- random obstacles;
- oceans and shores;
- dense forest rooms and forest thresholds;
- cross-room rivers;
- ocean ships;
- villages;
- quest houses;
- lakes;
- ladders;
- spawn protection;
- temperature reliefs;
- biome color and metadata.

This made rapid prototyping easy, but it makes larger features difficult. A mountain, castle, or multi-room village cannot be cleanly expressed as "room A rolls some obstacles, room B rolls some obstacles." Those features need world-space intent first, then room-local projection.

## Guiding Model

Generation should happen as layered intent:

```text
World seed
  -> world plan
  -> biome map
  -> region plans
  -> multi-room structure stamps
  -> room projection
  -> safety validation
  -> final room snapshot
```

Each layer should add information without needing to know every detail of every later system.

For example:

- A biome map says room `12,-4,0` is forest.
- A regional pass says this 5x5 cluster is a mountain.
- A structure pass says a broken road crosses these rooms.
- A room projection pass turns the overlap into tiles.
- A safety pass checks that entrances and exits are fair.

## Fairness And Safety Rule

Every entrance into a room must give the player enough lead-up space to understand the situation and decide what to do next.

This is a fairness rule, not just a collision rule. It is not enough for the entry tile itself to be passable. The player should not cross a boundary believing they are entering a safe line, then discover that three tiles later they are trapped, drowned, blocked, or killed by terrain they could not reasonably anticipate.

Bad shape:

```text
-> . . . | . x x
```

The player crosses the boundary, then immediately faces a barrier trap. They have no useful decision window.

Target shape:

```text
-> . . . | . . . . . . . x
```

After crossing into a room, the player should have a safe approach corridor. The exact length can vary by biome, difficulty, speed, and tile size, but the working guideline is:

- hard run-up: at least 5 tiles of immediately safe movement after crossing;
- soft run-up: preferably 7-10 tiles of readable approach before the player is forced into danger, a turn, or a decision;
- visual/readability run-up: hazards and barriers should begin communicating themselves before they become lethal or blocking.

The first invariant should be simple:

- every traversable border crossing must map to traversable space on the neighbor side;
- every entrance should provide at least a 5 tile hard-safe corridor;
- every entrance should try to provide a 7-10 tile soft-readable corridor before a forced turn, blocker, water hazard, or lethal tile;
- special transitions such as forest edges and beaches should still preserve this approach space;
- if an entrance cannot satisfy safety rules, the generator should either carve it safe or close both sides consistently.

This applies to normal room borders, forest thresholds, beaches, rivers, villages, castle walls, mountain chokepoints, and future generated structures.

## Boundary Connective Tissue

Cross-room terrain must feel continuous. A boundary, wall, hazard, or transition that starts near the edge of one room should usually continue, echo, or clearly resolve in the neighboring room.

Bad connective tissue:

```text
room A: . . . # # |
room B: . . . . x x x
```

The player reads the first room as safe because the danger or blockage does not communicate across the boundary. Then they cross and encounter an abrupt trap.

Better connective tissue:

```text
room A: . . # # # |
room B: # # # . . . .
```

or:

```text
room A: . . ~ ~ beach |
room B: beach beach . . ~ ~
```

The exact tiles can change, but the idea should carry across. Forest density, beaches, cliffs, mountain rock, castle walls, roads, rivers, and moats should all project from world-space features so their edge behavior is shared by both rooms.

This is why multi-room structures are not optional polish. They are the fairness mechanism. The player needs terrain to telegraph danger and topology before the room transition, not after.

## Generation Layers

### 1. World Plan Layer

The world plan owns high-level generation rules.

Responsibilities:

- world seed;
- generation version;
- starter-region policy;
- special anchors;
- broad difficulty curve;
- global landmark placement;
- global constraints such as "home room is always safe."

The world plan should be deterministic for a given seed and generation version.

### 2. Starter Geography Layer

The first floor around the player can remain somewhat structured.

This is desirable because it gives players a mental map:

- the forest is generally in a known direction;
- the hot place is generally in a known direction;
- the ocean is generally in a known direction;
- the early safe biome surrounds the origin;
- dangerous areas are discoverable without being totally chaotic.

A practical model:

- keep a structured radius of roughly 20-30 rooms around the origin;
- preserve broad directional identities for early biomes;
- allow variation inside those areas;
- beyond the starter radius, transition into seeded randomized biome regions.

This gives the best of both worlds: early learnability and later exploration.

### 3. Biome Map Layer

The biome map chooses the biome for each room.

Short-term:

- keep existing coordinate-threshold biomes;
- wrap the current logic behind a `BiomeMap` interface;
- avoid changing gameplay while the generator is split.

Long-term:

- generate seeded biome regions;
- use Voronoi cells, noise, region growth, or another deterministic region method;
- assign biome rules such as rarity, minimum size, preferred neighbors, hazard density, and transition style;
- cache biome decisions by room coordinate;
- support special anchors and starter-region constraints.

Biome definitions should eventually describe more than color:

- base terrain;
- transition behavior;
- spawn tables;
- hazard rules;
- structure preferences;
- sound/music;
- visual palette;
- safety policy.

### 4. Region Intent Layer

Regions describe areas larger than a room but smaller than the whole world.

Examples:

- mountain region;
- forest maze pocket;
- beach shelf;
- village territory;
- castle grounds;
- ruined road corridor;
- swamp basin;
- faction territory;
- treasure route;
- danger pocket.

Regions should carry intent tags. For example:

```typescript
type RegionIntent =
  | "safe-path"
  | "danger-pocket"
  | "gated-route"
  | "shortcut"
  | "village"
  | "castle"
  | "mountain"
  | "biome-transition"
  | "landmark"
  | "dead-end-challenge";
```

Intent lets later stages place content coherently. A room inside a village territory can prefer roads, houses, lanterns, NPCs, and market structures. A mountain center can prefer dense blockers. A castle outer ring can prefer exterior walls.

### 5. Multi-Room Structure Layer

Multi-room structures should be generated as world-space stamps, then projected into each room.

This matters because a river, castle wall, road, mountain, or village should not be a lucky accident created by each room independently.

Structure stamps should include:

- stable id;
- type;
- anchor coordinate;
- footprint;
- generation seed;
- local parameters;
- room coverage;
- projection rules;
- safety requirements;
- optional lifecycle or persistence hooks.

Examples:

```typescript
interface WorldStructureStamp {
  id: string;
  type: "river" | "mountain" | "village" | "collapsed-castle" | "road" | "shipwreck";
  anchor: RoomCoord;
  footprint: RoomRect;
  seed: string;
  tags: string[];
}
```

The room generator should ask, "Which stamps affect this room?" and project their local slice.

## Desired Multi-Room Features

### Seeded Rivers

Current rivers are cross-room, but their placement is too predictable. They should become randomized structure stamps.

Desired behavior:

- seeded and deterministic;
- variable length;
- variable direction;
- optional bends;
- bridges or shallow crossings;
- biome-aware width and hazard behavior;
- projected consistently across every touched room;
- safe crossing approaches where bridges exist.

### Mountains

A mountain should affect a larger region, such as a 5x5 room area.

Desired behavior:

- sparse blockers at the outer ring;
- denser blockers closer to the center;
- peak/core room has the highest density;
- paths or passes can cut through the mountain;
- caves, shrines, mines, or treasure pockets can appear inside;
- biome and elevation can affect visuals and hazards;
- entrances into each mountain room still satisfy lead-up safety.

Example density model for a 5x5 mountain:

```text
1 1 2 1 1
1 2 3 2 1
2 3 5 3 2
1 2 3 2 1
1 1 2 1 1
```

The center has the most blockers, but it should never become an unfair instant-death maze at room edges.

### Multi-Room Villages

Villages should be able to occupy more than one room.

Desired behavior:

- village center or square;
- surrounding houses;
- roads or paths between rooms;
- shop rooms;
- NPC homes;
- lanterns, wells, signs, walls, gardens, or fences;
- biome-specific village styles;
- possible faction or reputation ownership later;
- stable village id and name;
- map marker support;
- safe entrances and roads.

A village can be generated as a cluster:

```text
[fields] [house]  [road]
[house]  [square] [shop]
[road]   [well]   [house]
```

Each room remains playable as Snake, but the village reads as one connected place.

### Multi-Room Collapsed Castles

Collapsed castles should be layered by depth from the outside inward.

Possible structure:

1. Outer grounds.
2. Exterior walls.
3. Moat, ditch, or broken bridge.
4. Interior walls and courtyards.
5. Broken keep or central ruin.

Desired behavior:

- exterior walls in the outer zone;
- interior walls or moat deeper in;
- final broken castle room or rooms at the center;
- optional gates, bridges, collapsed passages, treasure rooms, bosses, or quest hooks;
- consistent cross-room walls;
- visible progression as the player moves inward;
- safe entry corridors even when walls create chokepoints.

The castle should be a structure stamp with rings:

```text
outer ring: scattered rubble and wall fragments
middle ring: moat, gatehouses, interior walls
center: broken castle/keep landmark
```

### Oceans And Beaches

Ocean transitions should become a general biome-transition model, not a one-off.

Desired behavior:

- ocean rooms can remain mostly water;
- shore/beach bands appear at biome boundaries;
- beaches should be randomized barriers or shelves, not identical strips everywhere;
- beach terrain must give the player run-up before dangerous water;
- boats, docks, bridges, reefs, wrecks, or shallow water can appear as transition affordances;
- ocean hazards should be readable before they are lethal.

The player should understand they are approaching danger before they drown.

### Forest And Other Biome Transitions

The current forest transition is a useful prototype. It creates edge behavior that helps sell the biome boundary.

This should expand into a general transition system:

- forest edges create dense trees, mouths, and corridors;
- ocean edges create beaches, docks, or shallow water;
- hot biome edges create ash fields, cracked stone, heat shimmer, or cooling shelters;
- cold/depth edges create frost, cave mouths, warmth sources, or shadow bands;
- garden edges create vines, thorns, flowers, or soft blockers.

Transitions are not just visual. They should also handle safety, hazard onboarding, and traversal affordances.

## Room Archetypes

Most current normal rooms are variations of "place a few rectangular or rectangular-ish blockers near the center, sometimes with connective barriers near the edge." That is a useful default, but the generator should grow a vocabulary of room archetypes.

Room archetypes are not biomes. They are layout patterns that biomes can weight, skin, modify, or reject.

For example:

- Verdigris Basin can prefer open fields, fork rooms, pillar fields, and soft loops.
- Ember Waste can prefer sparse arenas, broken symmetry, heat-shelter pockets, and chokes.
- Moonlit Parish can prefer roads, courtyards, shrines, and wall fragments.
- Sable Depths can prefer narrow roads, danger pockets, and shelter-to-shelter routes.
- Gloam Garden can prefer loops, pockets, thickets, and organic blocker clusters.
- Elderwood Maze can remain its own intentionally maze-heavy special case.
- Sunken Ocean can prefer islands, bridges, beaches, docks, ships, and reefs.

The forest is a good reminder that not every biome should be made from the same set of gentle layouts. Some biomes should have strong identity. A dense forest that is almost a total maze is fun because it is allowed to be extreme, as long as its entrances and transitions are fair.

### Open Field

Mostly empty, low obstacle density.

Use for:

- early safe rooms;
- recovery rooms after dense terrain;
- enemy arenas;
- NPC encounters;
- apple and treasure readability.

Fairness notes:

- edges should remain clear;
- avoid random isolated blockers directly after entrances.

### Pillar Field

Scattered small blockers, such as 1x1, 2x2, or tiny irregular clusters.

Use for:

- normal biome variation;
- combat movement;
- light tactical routing.

Fairness notes:

- pillar density should not create accidental one-tile traps near entrances;
- pillars near borders should be mirrored, continued, or softened across neighbors.

### Soft Loop

Obstacles form a ring, partial ring, or multiple reconnecting routes.

Use for:

- snake body management;
- chase and escape patterns;
- garden, ruin, and parish layouts.

Fairness notes:

- loops should have more than one exit;
- do not force the player into a loop immediately after crossing a border.

### Fork Room

The entrance path splits into two or three visible directions.

Use for:

- exploration choice;
- route variety;
- treasure or danger pockets.

Fairness notes:

- the fork should happen after the hard run-up;
- each branch should be readable enough that the choice feels intentional.

### Fair Choke Point

A narrow passage or compressed route.

Use for:

- tension in any normal biome;
- mountain passes;
- castle gates;
- road cuts;
- boss or enemy setup.

Fairness notes:

- a choke point should be visible before the player commits;
- it should not begin immediately on room entry;
- it should usually be at least 2-3 tiles wide unless it is optional or very short;
- escape or reversal space should exist on at least one side;
- if the choke is part of a cross-room structure, both rooms must agree on it.

Choke points are fun when the player says "I am entering the pass." They are unfair when the player says "I crossed a boundary and the map removed my choices."

### One-Side-Blocked Room

One direction is mostly or completely blocked by terrain, wall, cliff, ocean, forest, castle wall, or mountain.

Use for:

- edge of a region;
- mountain sides;
- castle walls;
- dense forest borders;
- biome boundaries;
- controlled pathing without invisible rules.

Fairness notes:

- the blocked side must be communicated in the neighboring room too;
- if a side is closed, matching crossings should be closed consistently;
- the room should still have enough routes to avoid feeling like a dead-end trap unless the intent is explicitly a dead-end challenge;
- safe entrances from open sides still need hard and soft run-up.

### Four-Corners Cluster

A multi-room layout where the corners of a 3x3 neighborhood carry related terrain, leaving the center and/or cross-axis routes readable.

Example:

```text
[corner] [path]   [corner]
[path]   [center] [path]
[corner] [path]   [corner]
```

Use for:

- normal biome variety;
- ruins;
- gardens;
- castle outskirts;
- mountain foothills;
- villages with surrounding houses or fields.

This should not be generated by one room alone. The surrounding 3x3 neighborhood needs to know the cluster exists so each room projects the correct slice.

Fairness notes:

- corner blockers should not surprise the player immediately after crossing;
- paths through the cardinal neighbors should remain readable;
- the center room can be open, landmark-focused, or lightly blocked;
- if a corner mass touches a room edge, the neighboring room should continue or resolve that mass.

### Road Room

A safe path, road, trail, bridge approach, or desire line cuts through the room.

Use for:

- villages;
- castles;
- forest paths;
- mountain passes;
- beach approaches;
- route guidance through dangerous terrain.

Fairness notes:

- roads are excellent soft run-up tools;
- roads should continue across room boundaries when they touch edges;
- roads can make dangerous biomes readable without making them harmless.

### Bridge Or Crossing Room

A hazard such as water, moat, ravine, lava-like heat, dense trees, or rubble is crossed by a safe path.

Use for:

- oceans and beaches;
- castles and moats;
- rivers;
- mountain gaps;
- ruins.

Fairness notes:

- the crossing must be visible before the player reaches the hazard;
- both sides of the crossing need approach room;
- if the bridge spans rooms, it must be a structure stamp.

### Pocket Room

A main path remains safe, with optional side pockets containing rewards, NPCs, hazards, or shortcuts.

Use for:

- treasure routes;
- quest objects;
- shops or hermits;
- optional risk.

Fairness notes:

- the safe route should stay readable;
- risky pockets should be opt-in;
- rewards should not require blind commitment into an unsafe branch.

### Landmark Room

The room is organized around one obvious feature: shrine, tree, lake, tower, well, statue, shop, bridge, gate, ruin, or peak.

Use for:

- map memory;
- quest targets;
- biome identity;
- multi-room structure centers.

Fairness notes:

- landmark collision should be obvious;
- entrances should not point directly into lethal terrain around the landmark;
- landmark rooms are good candidates for extra safe space.

### Broken Symmetry

A roughly mirrored or formal layout that has been damaged.

Use for:

- castles;
- parish ruins;
- gardens;
- old roads;
- ritual spaces.

Fairness notes:

- symmetry helps readability;
- damage creates variety;
- broken sections should not create hidden traps at room boundaries.

### Threshold Room

A room that introduces the next biome, hazard, or structure before the player fully enters it.

Use for:

- forest edges;
- beaches;
- hot biome ash fields;
- cold cave mouths;
- mountain foothills;
- castle outskirts.

Fairness notes:

- threshold rooms are where soft run-up matters most;
- danger should be previewed before it becomes lethal;
- the transition should exist on both sides of the biome boundary.

## Archetype Selection

Room archetypes should eventually be selected from weighted tables.

Selection inputs:

- biome;
- region intent;
- nearby structure stamps;
- room coordinate;
- distance from starter area;
- neighboring room archetypes;
- safety constraints;
- desired difficulty;
- special quest or landmark needs.

A room should be allowed to know its local neighborhood when selecting an archetype. Some archetypes are inherently single-room patterns, but others require a 3x3 or larger cluster.

Cluster-aware archetypes:

- four-corners cluster;
- one-side-blocked edge;
- mountain foothill;
- village road grid;
- castle ring;
- beach shelf;
- forest threshold;
- river crossing;
- road bend.

The generator should avoid choosing cluster-aware archetypes as isolated room-local rolls. These patterns need shared context.

## Biome Archetype Pools

Each biome should define its own weighted archetype pool. A biome is not just a palette and hazard profile; it should have preferred room shapes.

These pools are not final balance, but they describe the design direction.

### Verdigris Basin

The default early biome should be readable, varied, and forgiving.

Likely archetypes:

- open field;
- pillar field;
- soft loop;
- fork room;
- pocket room;
- road room;
- small landmark room;
- occasional fair choke point.

The basin is a good place to teach the room vocabulary without making the player feel hunted by the map.

### Ember Waste

The hot biome should feel exposed, sharp, and dangerous without relying on instant terrain traps.

Likely archetypes:

- sparse arena;
- broken symmetry;
- heat-shelter pocket;
- road room with shelter nodes;
- fair choke point;
- one-side-blocked cliff or ash wall room;
- landmark room with cooling relief.

Ember rooms can be more hostile, but their danger should be readable early. Heat shelters and cooling reliefs are good soft-run-up anchors.

### Moonlit Parish

The parish can feel built, ceremonial, and partially ruined.

Likely archetypes:

- road room;
- courtyard;
- broken symmetry;
- landmark shrine;
- pillar field as graves, columns, or stones;
- pocket room;
- fair choke point as gate or wall break;
- one-side-blocked wall room.

This biome is a natural home for ruins, gates, roads, chapels, and faction or NPC content later.

### Sable Depths

The depths should feel constrained and dangerous, but still fair.

Likely archetypes:

- shelter-to-shelter route;
- narrow road;
- pocket room;
- fair choke point;
- one-side-blocked cave wall;
- landmark warmth room;
- sparse arena for dangerous encounters.

Because the depths can be cold and high danger, entrance fairness matters even more. The player should not cross into a room and lose all options before understanding the threat.

### Gloam Garden

The garden can be organic, loopy, and strange.

Likely archetypes:

- soft loop;
- organic pillar field;
- pocket room;
- fork room;
- threshold room;
- four-corners cluster;
- landmark room with tree, flower, pond, or ruin.

Garden rooms can support more organic shapes than rectangles, but the rules should still expose safe approaches and readable branches.

### Elderwood Maze

The forest can stay more extreme than other biomes.

Likely archetypes:

- dense maze;
- forest threshold;
- trail room;
- clearing;
- village clearing;
- river-through-forest;
- landmark grove;
- dead-end challenge when clearly intentional.

Clearings are important. They can be:

- empty breathing rooms;
- safe recovery rooms;
- village sites;
- NPC encounter sites;
- treasure or quest spaces;
- river crossings.

The forest should not become uniformly claustrophobic. A clearing is more powerful when it appears inside a biome that is normally dense.

### Sunken Ocean

Ocean rooms should have islands, crossings, and readable water danger.

Likely archetypes:

- island;
- island chain;
- beach threshold;
- dock or pier;
- bridge or crossing room;
- shipwreck room;
- reef room;
- open water;
- village island;
- landmark island.

An island is an archetype, not necessarily a structure. It defines the safe landmass shape. A structure can then be placed on the island: village, shrine, dock, ruin, quest house, market, or nothing.

### Home Hearth

Home Hearth should stay intentionally safe and legible.

Likely archetypes:

- home room;
- tutorial-safe open room;
- calm landmark room;
- light village or house interior.

## Archetypes Versus Structures

Archetypes and structures should be separate concepts.

An archetype answers:

- What is the room's navigational grammar?
- Where is open space?
- Where are the likely safe paths?
- Does the room contain loops, chokes, islands, roads, clearings, or pockets?
- What kind of border behavior does it expect?

A structure answers:

- What authored or semi-authored thing exists here?
- Does it have an identity, name, footprint, purpose, or persistence id?
- Does it span rooms?
- Does it add actors, shops, quest hooks, rewards, or special tiles?

Examples:

- Island archetype + no structure = a quiet island breathing room.
- Island archetype + village structure = ocean village.
- Island archetype + shrine structure = landmark island.
- Clearing archetype + no structure = forest breathing room.
- Clearing archetype + village structure = forest village.
- Road archetype + castle stamp = castle approach.
- Choke archetype + mountain stamp = mountain pass.
- Threshold archetype + ocean transition = beach.

This separation keeps the generator modular. We do not need a unique archetype for every possible combination like "forest village clearing with river." Instead:

```text
biome: elderwood-maze
archetype: clearing
structure stamps: village + river
transition rules: forest edge
safety rules: clearing entrances and river crossing
```

The room can then compose those pieces.

Some structures may request or force an archetype. For example:

- a village may request clearing, road, island, square, or courtyard archetypes;
- a castle may request road, choke, wall, courtyard, or broken symmetry archetypes;
- a river may request bridge/crossing support when it intersects a safe route;
- a mountain may request choke, one-side-blocked, pocket, or landmark peak archetypes.

But structures should not be baked into archetypes by default.

## Room Projection Layer

The room projection layer takes all relevant world-level decisions and creates a `RoomSnapshot`.

Input:

- room id;
- grid config;
- biome map result;
- region intents affecting the room;
- structure stamps affecting the room;
- generation context;
- current generation version.

Output:

- tile layout;
- biome metadata;
- structures;
- portals;
- optional room-local entities or pickup candidates;
- generation debug metadata in dev builds.

The room projection should apply stages in a predictable order:

1. Create terrain canvas.
2. Apply biome base terrain.
3. Project cross-room structures.
4. Apply transition bands.
5. Place room-local structures.
6. Place portals or traversal affordances.
7. Place entity spawn candidates.
8. Run safety validation and repair.
9. Emit `RoomSnapshot`.

## Safety Validation Layer

Safety validation should run after all terrain and structures are projected.

Initial invariants:

- border invariant: if a snake can exit one room at a cell, it can enter the neighbor at the matching cell;
- hard approach invariant: every entrance has at least 5 tiles of immediately navigable lead-up before a forced hazard or blocker;
- soft approach invariant: every entrance aims for 7-10 tiles of readable lead-up before a forced hazard, blocker, or turn;
- shore invariant: ocean transitions never place immediate drowning water across a biome boundary;
- forest invariant: forest mouths and corridors are open and have readable approach space;
- connective tissue invariant: near-edge barriers, hazards, and transitions are continued, echoed, or resolved across the neighboring room boundary;
- cross-room feature invariant: rivers, ships, blockers, roads, walls, moats, beaches, and bridges project consistently across all rooms they touch;
- spawn invariant: origin and safe rooms preserve configured spawn cells and nearby rows;
- portal invariant: ladders or portals never overwrite critical structures without reciprocal safety.

Safety repair can be simple at first:

- carve safe corridors;
- close unsafe border openings on both sides;
- move or remove a conflicting local obstacle;
- move pickup/entity spawn points away from hazard entrances;
- reject and regenerate a room when repair fails.

## Testing Plan

Tests are the first implementation step.

We need a small room-neighborhood fixture harness that can generate rooms around a target coordinate and compare their borders.

Useful test helpers:

- generate a single room;
- generate a 3x3 neighborhood;
- generate a 5x5 neighborhood;
- inspect border cells;
- classify passable and dangerous tiles;
- trace entrance approach corridors;
- project known structure stamps;
- snapshot debug layouts when a test fails.

First test categories:

1. Border matching.
2. Hard entrance approach space.
3. Soft entrance readability space.
4. Boundary connective tissue.
5. Ocean shore safety.
6. Forest threshold safety.
7. Cross-room river consistency.
8. Cross-room ship consistency.
9. One-side-blocked room consistency once room archetypes exist.
10. Four-corners cluster projection once cluster archetypes exist.
11. Fair choke point approach once choke archetypes exist.
12. Mountain density gradient once mountains exist.
13. Multi-room village road continuity once villages exist.
14. Castle ring projection once castles exist.
15. Seed reproducibility.

Tests should focus on invariants, not exact ASCII snapshots, except for small controlled fixtures.

## Seeding And Determinism

Generation should be seeded.

Important rule:

- generated content can be reproduced from seed and generation version;
- changed content must be saved.

Examples of generated content:

- biome regions;
- mountain stamp placement;
- village stamp placement;
- castle stamp placement;
- base terrain;
- unmodified roads, walls, rivers, beaches, and forests.

Examples of changed content:

- trees burned or cleared;
- walls eaten;
- bridges destroyed;
- shops opened or robbed;
- NPCs moved or killed;
- boats moved;
- faction state changed;
- quest structures altered;
- player-built or player-cleared paths.

Room generation should avoid consuming a global RNG stream in ways that make previous exploration order change future rooms. Prefer deterministic per-room and per-structure hashing:

```text
hash(worldSeed, generationVersion, roomId, stageId, localSalt)
hash(worldSeed, generationVersion, structureId, projectionRoomId, localSalt)
```

This makes generation stable regardless of the order rooms are visited.

## Proposed Module Shape

Initial mechanical split:

```text
src/world/generation/
  biomeMap.ts
  generationTypes.ts
  terrainCanvas.ts
  roomGenerationPipeline.ts
  stages/
    baseTerrainStage.ts
    oceanStage.ts
    forestStage.ts
    crossRoomFeatureStage.ts
    transitionBandStage.ts
    structureStage.ts
    portalStage.ts
    safetyValidationStage.ts
  structures/
    riverStamp.ts
    mountainStamp.ts
    villageStamp.ts
    collapsedCastleStamp.ts
```

Short-term compatibility:

- keep `RoomGenerator` as the public class used by `WorldService`;
- move implementation behind it gradually;
- preserve current output where possible during the mechanical split;
- add tests before changing generated behavior intentionally.

## Modularity Principles

The redesign should make generation modular without turning it into a giant inheritance tree.

Useful boundaries:

- biome map decides biome identity;
- biome definitions provide weights, terrain preferences, hazards, transitions, and spawn preferences;
- archetype selection decides navigational grammar;
- structure stamps decide authored or semi-authored places;
- transition bands decide how neighboring biomes meet;
- safety validation decides whether the final projection is fair;
- persistence records changed generated content later, not every generated tile by default.

Rules of thumb:

- A biome should not directly hand-place every tile.
- A room archetype should not secretly own a whole village, castle, or questline.
- A structure should not ignore the room's entrance safety rules.
- A transition should not be a one-off hidden inside a biome-specific generator.
- A random roll should be deterministic from seed, coordinate, stage, and structure id.
- Cross-room decisions should happen before room-local projection.
- Room-local generation should be a projection of larger intent, not the source of all intent.

The target is composable generation:

```text
Biome + Archetype + Structures + Transitions + Safety = RoomSnapshot
```

For example:

```text
sunken-ocean + island + village stamp + beach transition + safety = island village room
elderwood-maze + clearing + river stamp + forest transition + safety = forest river clearing
moonlit-parish + broken symmetry + castle stamp + road transition + safety = ruined outer wall
```

This keeps new content small. Adding a new structure should not require editing every biome. Adding a new biome should not require rewriting every structure. Adding a new archetype should not require special collision code.

## Phase Plan

### Phase 0: Document And Freeze Intent

- Write down this plan.
- Keep `architecture-cleanup-roadmap.md` as the broad architecture document.
- Use this file as the detailed world-generation plan.

### Phase 1: Generation Test Harness

- Add room generation fixture helpers.
- Add border invariant tests.
- Add approach corridor tests.
- Add ocean shore tests.
- Add forest threshold tests.
- Add cross-room river and ship projection tests.

This phase gives confidence before code movement.

### Phase 2: Mechanical Split Of Current Generator

- Extract layout mutation helpers into `terrainCanvas`.
- Extract ocean logic.
- Extract dense forest logic.
- Extract cross-room barriers/rivers.
- Extract structure placement for villages, quest houses, lakes, ladders, and reliefs.
- Keep public behavior stable unless tests reveal current bugs that must be fixed.

### Phase 3: BiomeMap Interface

- Wrap current coordinate-threshold biome logic behind a `BiomeMap`.
- Keep starter geography behavior intact.
- Add generation context with seed and version.
- Stop direct calls to `getBiomeForRoom` from unrelated generation internals where possible.

### Phase 4: Structure Stamps

- Introduce world-space structure stamps.
- Convert rivers first because they already span rooms.
- Convert ships next.
- Add randomized seeded rivers.
- Add debug tooling to inspect which stamps affect a room.

### Phase 5: Transition Band System

- Generalize forest and ocean transitions.
- Add biome-biome transition definitions.
- Make beach, forest edge, hot edge, cold edge, and garden edge transitions data-driven.
- Enforce transition-specific safety.

### Phase 6: Mountains

- Add 5x5 mountain structure stamp.
- Implement density gradient by distance from center.
- Add pass/path generation through the region.
- Add mountain-specific safety tests.

### Phase 7: Multi-Room Villages

- Promote villages from single-room placement to village stamps.
- Add roads, square, houses, shops, and NPC home positions across multiple rooms.
- Preserve single-room villages as a small-village variant if useful.
- Add continuity tests for village roads and entrances.

### Phase 8: Collapsed Castles

- Add collapsed castle stamp with outer, middle, and center rings.
- Add exterior wall projection.
- Add moat/interior wall projection.
- Add broken keep center.
- Add safe gates and bridge affordances.
- Add tests for ring consistency and safe approaches.

### Phase 9: Seeded Randomized Biome Regions

- Keep starter geography stable within the early radius.
- Generate seeded randomized regions outside or blended beyond that radius.
- Add biome rarity, size, preferred-neighbor, and transition rules.
- Add tests for stability and minimum region expectations.

### Phase 10: Persistence Boundary

- Define which generated structures are reproducible from seed.
- Define room override format for changed tiles.
- Add `WorldSnapshot` later when save architecture is ready.
- Ensure generated content and changed content have stable ids.

## Open Design Questions

- What is the exact safe entrance length: 8, 10, or biome-specific?
- Should dangerous biomes reduce safety later, or should entrance safety be universal?
- Should the starter geography remain fixed forever, or should it be one possible world template?
- Should mountains block travel, gate travel, or simply create texture and challenge?
- How large can villages become before they stop feeling good for snake movement?
- Should castles be rare landmarks, quest destinations, or repeatable structure types?
- Should biome transitions be pair-specific, biome-specific, or both?
- Should generated structures reserve room space before local structures are placed?
- How much exact generated output should tests snapshot versus invariant-check?
- Which archetypes are allowed in each biome?
- Which archetypes are single-room rolls, and which require 3x3 or larger cluster planning?
- How often should normal biomes get choke points without making the map feel hostile or cramped?
- Should the forest stay fully special-case, or should parts of it eventually be expressed through archetypes plus stronger biome weights?

## Success Criteria

The world-generation cleanup is working when:

- new terrain types do not require editing movement, renderer, generator, scene, and save code manually;
- room entrances are safe and test-covered;
- cross-room structures project consistently;
- rivers are seeded and variable;
- beaches and forest edges are generated as transition bands;
- mountains, villages, and castles can span multiple rooms;
- early geography remains readable;
- later geography can be surprising;
- generated rooms reproduce from seed and generation version;
- changed terrain has an obvious persistence path;
- `roomGenerator.ts` is an orchestration wrapper, not the place every terrain idea goes to live forever.
