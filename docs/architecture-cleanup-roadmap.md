# Architecture Cleanup Roadmap

This game has grown from a modular snake framework into a feature-heavy prototype. The main problem is not the amount of content; it is that newer mechanics bypass the original feature/system boundaries. Collision, world generation, death handling, skill effects, biome behavior, entities, and UI orchestration now each have several partially overlapping implementations.

The goal of this roadmap is to get back to a shape where new mechanics can be added as small, testable modules instead of edits across `snakeGame.ts`, `snakeState.ts`, `roomGenerator.ts`, `snakeScene.ts`, and renderer code.

## Current Diagnosis

The largest structural issues are:

- `src/game/snakeGame.ts` is acting as the main simulation, feature coordinator, item pickup handler, biome hazard runner, enemy resolver, quest bridge, save-facing state bag, and death debugger.
- `src/systems/snakeState.ts` owns movement but also handles wall eating, water drowning, boss collision, portal handling, ghost traversal, invulnerability, terra shields, self collision, and death position tracking.
- `src/world/roomGenerator.ts` has become a monolithic generation script for rooms, biomes, rivers, lakes, oceans, shores, ships, dense forest mazes, transition bands, villages, houses, ladders, blockers, safety corridors, and feature-specific exceptions.
- `src/world/biomes.ts` uses hardcoded coordinate thresholds. That made fast prototyping easy, but it conflicts with the desired direction of randomized worlds and biome regions.
- `src/scenes/snakeScene.ts` owns too much gameplay-adjacent orchestration: death cutscenes, angel dialogue, drowning animations, input, renderer setup, debug logging, save UI, encounter UI, and HUD behavior.
- Collision behavior is split across tile checks, entity checks, item checks, enemy checks, boss checks, and special feature flags. There is no single answer to "what happens when the snake enters this cell?"
- Content registries exist for some domains, like apples, items, features, quests, and skills, but newer content such as ocean hazards, forest behavior, ships, sharks, angel death branches, and biome transition rules are not using equivalent registries.
- The skill tree still reflects older assumptions. Several perk effects are just string flags consumed opportunistically by unrelated systems, and the tree does not clearly map onto the current game domains.
- Older artifacts, especially scene-level quest files under `src/scenes/`, appear to overlap with newer quest definitions under `src/quests/definitions/`.

## Priority Plan

| Priority | Area | Problem | Target Shape | First Steps |
| --- | --- | --- | --- | --- |
| P0 | Collision | Wall, water, self, boss, enemy, item, portal, and feature collision are resolved in different places. | One collision pipeline that asks every relevant system for an interaction result before mutating final state. | Add `CollisionSystem`, `TileRegistry`, and typed `CollisionResult`. Move water, wall, self, boss, portal, and enemy contact rules behind it. |
| P0 | World safety | Entrances, exits, shores, forest bands, blockers, rivers, and cross-room structures can violate traversal expectations. | Generation invariants that prove room borders match their neighbors before rooms are accepted. | Add tests for all four room borders: every open crossing cell must map to an open receiving cell with an 8-10 tile approach corridor where required. |
| P0 | Generation | `roomGenerator.ts` has too many feature-specific stages and exceptions. | A staged world generation pipeline with independent feature stamps. | Split into stages: biome map, base terrain, cross-room features, transition bands, structures, entities, and safety postprocess. |
| P1 | Biomes | Biomes are fixed by coordinate thresholds. | Seeded randomized biome regions with stable room results. | Replace hardcoded coordinate rules with a `BiomeMap` built from seeded regions, noise, or Voronoi cells. Keep special anchors only when needed. |
| P1 | Feature modules | New mechanics are not using the original feature architecture. | Features declare hooks, flags, content, rendering needs, and save data in one place. | Extend feature hooks for collision, generation, death dialogue, entity spawning, and rendering registration. Move water/ocean/forest/angel into feature-style modules over time. |
| P1 | Simulation state | `SnakeGame` exposes a loose string flag bag and coordinates many unrelated domains. | A typed game state with domain services and event dispatch. | Replace common string flags with typed state slices. Add a lightweight event bus for `apple:eaten`, `player:died`, `room:entered`, `item:pickedUp`, and `quest:progressed`. |
| P1 | Systemic actors | Enemies, NPCs, bosses, sharks, and town characters are separate concepts even though they are all world actors. | One actor model with disposition, faction, behavior, capabilities, memory, and role. | Introduce `ActorDefinition`, `ActorState`, and `ActorSystem`. Treat enemies as actors that start hostile. |
| P1 | Persistence | Current saves store the player run but intentionally exclude world state, actors, apples, bosses, and generated rooms. | Versioned persistence that can store player state, world state, actor state, and server-owned shared state separately. | Define snapshot boundaries: `WorldSnapshot`, `RunSnapshot`, `SnakeSnapshot`, `ActorSnapshot`, and `FeatureSnapshot`. |
| P1 | Skill tree | Perks are static, old, and loosely connected to current systems. | Skill tree perks are declarative effects over typed domains. | Audit every perk. Remove dead effects, rename unclear ones, and group skills into current domains: traversal, survival, combat, world shaping, faith, and exploration. |
| P2 | Scene/UI | Gameplay state, cutscenes, debug logging, and UI panels are mixed into `snakeScene.ts`. | Scene coordinates input/rendering while cutscenes, dialogue, and debug overlays are separate controllers. | Extract `DeathCutsceneController`, `DialogueController`, and `DeathDebugReporter`. Keep `snakeScene.ts` as orchestration glue. |
| P2 | Rendering | Tile/entity rendering has many direct special cases. | Renderers consume registered tile/entity definitions. | Add sprite metadata to tile/entity registries. Let water, ships, blockers, apples, enemies, and special structures register draw behavior. |
| P2 | Save data | Save behavior depends on broad state snapshots and many flags. | Versioned save schema with migrations. | Define save schema versions. Add migrations when flags or system ownership changes. |
| P3 | Legacy artifacts | There are old scene-level quest files and possibly outdated docs/tests. | One source of truth for quests and current mechanics. | Confirm whether `src/scenes/eatApples.ts`, `hungerTimer.ts`, `reachLength.ts`, and `surviveNoEat.ts` are still used. Delete or migrate once verified. |

## Proposed Core Architecture

The game should revolve around a small number of explicit contracts:

- `GameState`: the authoritative state of the current run.
- `WorldService`: retrieves generated rooms and biome data, but does not inject unrelated treasure or powerup side effects directly.
- `WorldGenerationPipeline`: builds rooms through deterministic stages.
- `CollisionSystem`: resolves attempted movement into a typed result.
- `ActorSystem`: owns moving actors such as enemies, sharks, bosses, town NPCs, wandering NPCs, shopkeepers, faction members, bullets, and future creatures.
- `FeatureRegistry`: lets optional features hook into generation, collision, events, UI, and save data.
- `EventBus`: publishes gameplay events so quests, skills, achievements, cutscenes, and UI do not need to be hardwired into the main step loop.
- `RendererRegistry`: maps tile/entity/content definitions to draw functions.

The target is not a large engine rewrite. The target is a clear route for adding a mechanic without editing five unrelated files.

## Systemic Design Direction

The long-term design goal is not only cleaner code. It is systemic game design: model things as much as possible, then let shared rules create non-hardcoded crossover.

The important shift is:

> Stop modeling things by which code path created them. Model them by what they are, what properties they have, and what rules can act on them.

For example, a shark should not be "a special enemy with water logic." It should be an aquatic actor with hostile disposition, predator behavior, faction or species relationships, water movement capability, and rules that make it hunt vulnerable actors in water. A shopkeeper should not need a separate one-off interaction system. It should be an actor with a home, inventory, trade behavior, faction ties, and a disposition toward the player.

Systems that should converge around shared models:

- enemies, NPCs, bosses, sharks, shopkeepers, guards, wandering travelers, and future faction members should become `Actor`s;
- blockers, water, boats, house walls, trees, torches, ladders, furniture, bridges, and future terrain should become tiles or structures with properties;
- swimming, warmth, light, hostility, drowning, blessing, fear, hunger, and curses should become statuses or rule inputs rather than one-off checks;
- apples, treasure, equipment, shop goods, quest objects, and world pickups should use common item and affordance rules where possible;
- death dialogue, quests, achievements, score summaries, and angel reactions should read from shared event history instead of bespoke flags.

## Actors, NPCs, And Factions

Enemies and NPCs should probably be the same underlying type. "Enemy" should mean an actor whose current disposition and behavior make it dangerous.

An actor should have:

- `identity`: display name, species, role, tags, and optional unique profile;
- `faction`: town, cult, angelic host, forest spirits, merchants, sharks, bandits, unaffiliated, or future groups;
- `disposition`: hostile, wary, neutral, friendly, loyal, afraid, or enraged;
- `behavior`: wander, patrol, hunt, flee, guard, trade, quest-give, sleep, return-home, follow, or ambush;
- `capabilities`: swim, fly, attack, talk, trade, open doors, use items, resist cold, survive water, or cross blockers;
- `memory`: harmed by player, helped by player, insulted, traded with, witnessed death, saw theft, faction relation changes;
- `home`: town, room, biome, faction camp, shop, patrol route, or wandering range;
- `inventory`: items for trading, stealing, dropping, equipping, or quest use.

This enables:

- shopkeepers who can become hostile if attacked;
- town guards who defend shopkeepers because of faction relations;
- wandering NPCs who behave differently from home/town NPCs;
- sharks that attack swimmers but ignore other aquatic actors;
- angels that start divine/neutral, then become hostile through dialogue choices;
- factions that remember repeated player choices across a run or persistent world.

## Properties, Affordances, And Rules

Tiles, structures, items, and actors should expose properties and affordances that rules can consume.

Useful tile and structure properties:

- `solid`
- `swimmable`
- `flammable`
- `natural`
- `constructed`
- `blocksVision`
- `blocksMovement`
- `providesWarmth`
- `providesLight`
- `providesSurface`
- `isShelter`
- `isHoly`
- `isShop`
- `isHome`

Useful actor and item affordances:

- `canSwim`
- `canTrade`
- `canAttack`
- `canTalk`
- `canOpenDoors`
- `keepsWarm`
- `lightsArea`
- `protectsFromDrowning`
- `countsAsBoat`
- `countsAsFood`
- `provokesFaction`

This is what allows ideas like torches keeping the player warm without adding a "torch exception" to the temperature system. The temperature system should ask whether nearby tiles, carried items, equipped items, actors, or structures provide warmth.

## Rule Engine

A small rule layer would let systems declare interactions in a readable way.

Example rules:

- when an actor enters water without `canSwim` or `providesSurface`, apply drowning;
- when an actor attacks a shopkeeper, lower merchant faction reputation and alert nearby guards;
- when the player carries or stands near something with `providesWarmth`, reduce cold exposure;
- when an angel is insulted repeatedly, set disposition to hostile and spawn the angel boss behavior;
- when a structure provides a crossing surface, movement treats water below as passable;
- when a player dies, death dialogue queries death reason plus journey history.

This does not need to be a complicated rules DSL at first. It can start as typed rule objects or ordered functions registered by systems.

## Collision Redesign

Collision should become a single pipeline:

1. Build an `AttemptedMove` with current head, target position, target room, local tile, active equipment, active skills, and relevant entities.
2. Ask tile rules for a result.
3. Ask entity rules for a result.
4. Ask active feature hooks for modifications.
5. Choose the highest-priority result.
6. Apply the result once.
7. Emit events such as `player:moved`, `player:died`, `item:pickedUp`, or `boss:hit`.

Example results:

- `pass`
- `blocked`
- `death`
- `consume-item`
- `enter-portal`
- `damage-player`
- `damage-entity`
- `transform-tile`
- `defer-to-feature`

This would remove the current ambiguity where water death, wall death, enemy death, boss death, and item pickup each live in different code paths.

## Generation Redesign

Generation should move from "one room script decides everything" to a world-level pipeline:

1. `BiomeMapStage`: chooses the biome for each room from seeded randomized regions.
2. `BaseTerrainStage`: fills default floors, water, trees, blockers, or biome base material.
3. `CrossRoomFeatureStage`: places rivers, shipwrecks, roads, castle walls, ravines, and similar multi-room structures.
4. `TransitionBandStage`: creates biome-aware borders such as shorelines, forest edges, and safe entry corridors.
5. `StructureStage`: places houses, quest houses, villages, boats, ruins, and special landmarks.
6. `EntitySpawnStage`: places sharks, apples, special apples, enemies, NPCs, and biome-specific actors.
7. `SafetyValidationStage`: verifies exits, entrances, border matching, spawn safety, and minimum approach distance.

The forest, ocean, rivers, and ships are the proof that room-local generation is no longer enough. These features should be generated from world-space stamps that can cover many rooms, then projected into each room.

Generation should also encode intent, not just random placement. A room or region can be marked as a safe path, danger pocket, gated route, shortcut, faction territory, treasure route, biome transition, landmark, or dead-end challenge. That intent lets systems place content coherently without hardcoding every crossover.

## Randomized Biomes

Biomes should be generated from the seed instead of fixed coordinates. A practical first version:

- Generate large biome regions using deterministic seeded points.
- Assign each room to the nearest region, with optional noise to roughen borders.
- Allow biome rules to specify preferred neighbors, rarity, minimum size, and transition type.
- Keep special biome constraints declarative: ocean wants broad contiguous regions; dense forest wants maze generation and transition bands; safe starter biomes want lower hazard density.
- Cache biome decisions by room coordinate so generation remains stable.

This keeps the "infinite map" feel while making exploration less predictable.

## Skill Tree Rework

The skill tree should be treated as content that must match current mechanics, not as a historical artifact.

Recommended domains:

- `Traversal`: swimming, bridge use, ghost movement, safe crossing, river handling, ocean survival.
- `Survival`: lives, hearts, drowning resistance, temperature resistance, recovery, death bargain effects.
- `Combat`: boss damage, shark handling, enemy avoidance, bullets, hostile NPC interactions.
- `World Shaping`: wall eating, terra shield, terrain carving, blocker manipulation, structure interaction.
- `Faith`: angel interactions, resurrection branches, taunting consequences, divine bargains.
- `Exploration`: biome reveal, map awareness, special apples, treasure, quest discovery.

Every perk should declare:

- typed effect keys instead of raw string flags,
- which systems consume those effects,
- whether it is saved,
- whether it changes collision, generation, entity behavior, UI, or scoring.

Dead or unclear perks should be removed before new perks are added.

The skill tree should also support systemic effects. A perk should ideally grant a capability, property, rule modifier, actor relationship, or generation affordance, not just flip a string flag. For example:

- a swimming perk grants `canSwim`;
- a torch perk grants or enhances `providesWarmth`;
- a holy perk changes angel faction disposition or death dialogue options;
- a terrain perk modifies collision rules for natural blockers;
- a trading perk changes shopkeeper prices through actor disposition or faction reputation.

## Content Registry Gaps

The following should become registered content rather than hardcoded behavior:

- Tile types: floor, blocker, water, boat, furniture, house wall, ladder, shore, special terrain.
- Death reasons: wall, self, water, boss, angel boss, enemy, bullet, temperature, quest failure.
- Biome definitions: base terrain, transition behavior, spawn tables, hazard rules, music, visual palette.
- Entity definitions: enemy, shark, boss, bullet, NPC hostile.
- Structure definitions: ship, bridge, village, quest house, ruin, castle wall.
- Dialogue branches: angel death branches, boss taunts, biome-specific death commentary.
- Actor roles: shopkeeper, guard, wanderer, hostile predator, boss, quest giver, faction member.
- Factions: relations, default dispositions, reputation effects, territory rules, and hostility triggers.
- Status effects: wet, cold, warm, blessed, cursed, hunted, afraid, poisoned, protected, starving.
- Rule definitions: drowning, warmth, faction aggression, theft, trade, actor memory, death commentary.

Registries should not just hold display data. They should also expose the hooks needed by systems.

## Persistence And Multiplayer Direction

The current save system stores a JSON save in `localStorage`. It saves the snake, score, quests, inventory, equipment, player stats, flags, and character choices. It intentionally does not save generated rooms, apples, enemies, bosses, or other dynamic world state.

That is acceptable for a local singleplayer prototype, but it is not enough for the long-term goal where a player can choose either:

- singleplayer local world;
- multiplayer connection to a personal server;
- shared worlds with friends;
- persistent world state that survives disconnects.

The architecture should eventually separate snapshots by ownership:

- `WorldSnapshot`: seed, biome map version, generated room overrides, structures, changed tiles, discovered rooms, world events;
- `RunSnapshot`: score, elapsed time, quest progress, journey log, death history, difficulty modifiers;
- `SnakeSnapshot`: body, direction, room, health, lives, equipment, statuses, skills, inventory;
- `ActorSnapshot`: actor id, room, position, faction, disposition, behavior state, inventory, memory, health;
- `FeatureSnapshot`: feature-specific state with versioned ownership;
- `ServerSnapshot`: authoritative multiplayer state, connected players, shared actors, shared world changes, and server clock.

For multiplayer, the server should eventually become authoritative over world state, actor state, and collision outcomes. Clients can predict movement for feel, but the server should decide the durable result. Designing singleplayer state with clear snapshots now will make that transition much less painful later.

Persistence should be JSON-friendly at first, but versioned. Every saved domain should have:

- a schema version;
- a migration path;
- a clear owner system;
- stable ids for actors, structures, rooms, and features;
- a boundary between deterministic generated content and modified persistent content.

The important rule: generated content can be reproduced from the seed, but changed content must be saved. If a player burns trees, opens a shop, kills a boss, angers a faction, moves a boat, or clears a path, that belongs in persistent world state.

## Testing Priorities

The first tests should protect the bugs that are currently hardest to reason about:

- Border invariant: if a snake can exit one room at a cell, it can enter the neighbor at the matching cell.
- Approach invariant: dense forest entrances provide at least 8-10 open tiles before a forced turn or blocker.
- Shore invariant: ocean transitions never place immediate drowning water across a biome boundary.
- Cross-room feature invariant: rivers, ships, and blocker clusters project consistently across all rooms they touch.
- Collision priority tests: swimming beats water death, invulnerability beats enemy damage, angel boss death overrides normal game over text, and boss contact is resolved once.
- Save/load compatibility tests for flags and equipment effects.
- Actor rule tests: hostile actors attack, neutral actors do not, faction changes alter behavior, shopkeepers can trade before becoming hostile.
- Property rule tests: torches or other warmth providers affect cold exposure without hardcoded item checks.
- Persistence tests: generated rooms reproduce from seed, while modified tiles and actor states survive save/load.

Death debug logging is useful and should stay, but it should become a debug reporter or overlay rather than scene-level console code.

## First Three PRs

1. Add generation invariant tests and a small room-neighborhood fixture harness.

   This should happen before large refactors. It locks down the border behavior that keeps causing surprise deaths.

2. Introduce a collision result pipeline while keeping old behavior wired through adapters.

   Start with wall, water, self, boss, and enemy contact. Once those are centralized, item pickup and portal handling can follow.

3. Split `roomGenerator.ts` into staged modules without changing output intentionally.

   The first split should be mechanical: base terrain, water/ocean, forest, cross-room features, structures, and safety validation. After that, randomized biomes become much easier.

4. Add the first systemic actor model behind the existing enemy/NPC behavior.

   Do not rewrite all AI immediately. Create the data model first, then adapt current enemies, sharks, bosses, and NPCs into actors one category at a time.

5. Define versioned snapshot types before expanding save/load.

   The current save system is useful, but future multiplayer needs persistence boundaries now: world, run, snake, actor, feature, and server state.

## Success Criteria

The cleanup is working when:

- adding a new terrain type does not require touching movement, renderer, scene, generator, and save code manually;
- adding a new biome requires a biome definition plus generation hooks, not coordinate thresholds in `biomes.ts`;
- collision rules can be read in one place;
- cross-room structures are generated from world-space stamps;
- skill effects are typed and traceable to the systems that consume them;
- death dialogue branches are registered by death reason and run context;
- enemies, NPCs, bosses, shopkeepers, and sharks are represented by the same actor model;
- systemic properties like warmth, swimming, hostility, faction reputation, and trade can interact without bespoke code paths;
- save data has versioned domains for player, world, actor, and feature state;
- old quest and scene artifacts have either been removed or clearly marked as active.
