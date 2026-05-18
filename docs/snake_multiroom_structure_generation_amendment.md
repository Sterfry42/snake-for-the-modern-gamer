# Snake for the Modern Gamer — Multi-Room Structure Generation Amendment

## Purpose

This amendment defines the correct architecture for **multi-room structures** in *Snake for the Modern Gamer*, using human towns as the first full test case.

The immediate motivation is the current town prototype: it proves that multi-room towns are exciting, but it also exposes the wrong implementation path. A town must not be a single generated anchor room that later mutates or overwrites neighboring rooms. A town may have an anchor coordinate, but that anchor must be part of a deterministic world-structure plan resolved before room content is generated.

The goal is to support towns now and future large structures later:

- human towns
- goblin fort-towns
- castles
- dungeons
- ruins
- multi-room shrines
- multi-room Snake McDonald's complexes
- corporate campuses
- boss arenas
- edge-spanning roads, walls, bridges, forests, rivers, and other cross-room features

The core requirement:

> Multi-room structures must be deterministic, coordinate-resolved, physical, generation-order independent, non-mutating, and safe at room boundaries.

Implementation may be simplified where necessary, but the requirements in this document are not optional. Reuse existing systems when appropriate. For example, hostile NPC outcomes may reuse relationship hostility, faction hostility, existing enemy spawning, or another suitable runtime layer. Shop stock may reuse village-market UI. Wanted consequences may reuse score/length economy. The implementation details can be pragmatic; the architectural rules cannot be weakened.

---

# 1. Existing Repository Context

The repository already has a staged room generation pipeline. The current generation order is:

1. biome map
2. base terrain
3. room archetype
4. cross-room features
5. room structures
6. random obstacles
7. portals
8. safety validation

This means there is already a natural place to resolve and apply multi-room structures. The correct town implementation should integrate into this pipeline instead of bypassing it through `WorldService` mutation.

Relevant existing files:

- `src/world/roomGenerator.ts`
- `src/world/generation/roomGenerationPipeline.ts`
- `src/world/generation/stages/currentRoomStages.ts`
- `src/world/generation/stages/crossRoomFeatureOperations.ts`
- `src/world/generation/stages/structureOperations.ts`
- `src/world/generation/types.ts`
- `src/world/worldService.ts`
- `src/world/types.ts`
- `src/world/town.ts`
- `src/game/snakeGame.ts`
- `src/game/saveManager.ts`

The current prototype in PR #57 adds a `town.ts` system with many useful parts: town data types, town room/district drawing helpers, wanted/guild logic, notices, rumors, residents, and UI integration. Those pieces are worth keeping or adapting. The parts that must be replaced are the late expansion and room-overwrite mechanics.

---

# 2. Non-Negotiable Requirements

## 2.1 No room overwrite

A generated room must never be replaced wholesale by a later multi-room structure expansion.

Bad pattern:

```ts
// Do not do this.
this.rooms.set(targetRoomId, generatedTownRoom);
```

This corrupts the world if `targetRoomId` already existed. It can erase:

- apples
- treasure
- powerups
- quest actors
- portals
- structures
- NPCs
- player-driven tile changes
- room-specific runtime state

The current town prototype's `expandTownCluster` approach must be removed or replaced.

## 2.2 No generation-order dependence

Generating room A before room B must not change what room B becomes.

The following must produce the same final world layout:

```txt
Generate gate -> generate market -> generate outside wall
Generate market -> generate outside wall -> generate gate
Generate outside wall -> generate gate -> generate market
```

This is especially important for towns because the player may approach the town from any direction.

## 2.3 Physical rooms only

Town districts are physical world rooms.

The player should not move through a fake town graph in a menu while remaining in the same coordinate room. The player's actual `currentRoomId` determines which district they are in.

Town UI may show interactions for the current district, but it must not implement a separate logical movement system.

Remove or avoid these concepts as primary movement mechanisms:

- `moveCurrentTownRoom(targetRoomId)`
- `town.currentRoomId` as a logical navigation state
- menu-only district traversal

Use physical room IDs instead:

```txt
12,8,0  = outskirts
13,8,0  = gate
14,8,0  = square
15,8,0  = market
14,9,0  = tavern
14,10,0 = back alley
15,10,0 = guild hideout
13,10,0 = residential
14,11,0 = exit
```

## 2.4 Anchors are allowed, but must be deterministic

A town may have an anchor coordinate. The problem is not the existence of anchors. The problem is using an anchor room as a trigger that later mutates the world.

Correct meaning of anchor:

> A stable coordinate used as the origin of a deterministic multi-room structure footprint.

Incorrect meaning of anchor:

> A generated room that creates neighboring rooms only after the player enters it.

## 2.5 Runtime state must be separate from generated geometry

Generated geometry answers:

- where the town is
- what rooms belong to it
- which room is the gate
- which room is the market
- where the walls are
- where the default NPCs begin
- what the deterministic town name/mood/laws are

Runtime state answers:

- whether the player opened a gate
- wanted level
- reputation
- guild discovered
- rumors created
- fines paid
- guild jobs completed or failed
- residents hostile/dead/married/divorced
- shop stock overrides
- temporary patrol events

Runtime state must be saved by `townId` and re-applied when the generated geometry is rendered.

## 2.6 Room boundary safety is mandatory

If a room edge can be crossed, that edge must have a safe run-up.

Minimum invariant:

> Every cross-room entrance/exit must reserve at least 5 traversable tiles inward from the boundary.

This applies to:

- ordinary room exits
- town gates
- town exits
- back roads
- guild entrances if cross-room
- river bridges
- forest mouths
- biome thresholds
- future dungeon/castle entrances

No structure may place walls, water, buildings, NPCs, decorative blockers, or random obstacles inside required run-up cells unless the structure also provides an alternate valid path.

## 2.7 Perimeter awareness is required

A player may encounter the outside of a town before finding the gate.

If a room is adjacent to a town footprint but not inside it, that room must render a town-facing exterior feature:

- wall
- fence
- gate approach
- road
- sign
- rooftops in the distance
- lanterns
- farms
- guard post
- sewer grate
- back road

This must not require the town interior to have been generated already.

## 2.8 Existing systems may be reused, but requirements remain

The implementation can reuse:

- village shop UI for town market UI
- score/length economy for fines, bribes, and purchases
- relationship hostility for hostile town residents
- faction alignment for town reputation
- existing enemy systems for guard/bounty hunter encounters
- existing flags for simple runtime state
- existing `ProtectedCells` for reserved run-up cells

But reuse must not weaken the requirements.

---

# 3. Explicit World Generation Identity

The current repository has an optional `config.rng.seed`, and several systems consume a shared RNG. Cross-room features create a world salt from that RNG. That is workable for a run, but it is fragile for long-term world layout stability.

A new explicit world-generation identity should be introduced.

## 3.1 Add world generation identity type

Suggested file:

```txt
src/world/generation/worldGenerationIdentity.ts
```

Suggested interface:

```ts
export interface WorldGenerationIdentity {
  seed: string;
  worldSalt: number;
  biomeSalt: number;
  riverSalt: number;
  barrierSalt: number;
  structureSalt: number;
  townSalt: number;
}
```

The names can change, but the concept should remain: world layout salts are explicit, named, stable, and saved.

## 3.2 Save it

Add to `GameSaveData` in `src/game/saveManager.ts`:

```ts
worldGeneration?: WorldGenerationIdentity;
```

New games create this once. Saved games restore it.

## 3.3 Do not let unrelated RNG rolls move world layout

This must be a hard rule:

> Adding a new random enemy roll, UI roll, quest roll, town event roll, music roll, or NPC dialogue roll must not move rivers, barriers, towns, biomes, or other persistent coordinate-based world features.

All world-layout decisions should use coordinate hashing with named salts, not mutable RNG sequence position.

## 3.4 Hashing pattern

Create shared helpers rather than duplicating hash functions in every operation class.

Suggested file:

```txt
src/world/generation/worldHash.ts
```

Suggested helpers:

```ts
export function hashWorldCoordinate(args: {
  x: number;
  y: number;
  z: number;
  salt: number;
  featureSalt?: number;
}): number;

export function positiveMod(value: number, modulo: number): number;

export function hashChance(hash: number, chancePercent: number): boolean;
```

Existing river/barrier hash code can be migrated later. The town system should use the new helper immediately.

---

# 4. Multi-Room Structure Resolver

Introduce a deterministic resolver responsible for answering structure questions about coordinates.

Suggested files:

```txt
src/world/generation/multiRoomStructures.ts
src/world/generation/townStructureResolver.ts
```

## 4.1 Core types

```ts
export type MultiRoomStructureKind =
  | 'humanTown'
  | 'futureDungeon'
  | 'futureCastle'
  | 'futureRuin';

export type StructureRoomRole =
  | 'inside'
  | 'adjacent'
  | 'approach';

export interface RoomCoordinate {
  x: number;
  y: number;
  z: number;
}

export interface MultiRoomStructurePlacement {
  id: string;
  kind: MultiRoomStructureKind;
  anchor: RoomCoordinate;
  seed: number;
  bounds: {
    left: number;
    top: number;
    width: number;
    height: number;
    z: number;
  };
}

export interface StructureRoomMembership {
  placement: MultiRoomStructurePlacement;
  role: StructureRoomRole;
  roomId: string;
}
```

For towns:

```ts
export type TownPhysicalDistrictKind =
  | 'outskirts'
  | 'gate'
  | 'square'
  | 'marketStreet'
  | 'tavernInterior'
  | 'residentialStreet'
  | 'backAlley'
  | 'guildHideout'
  | 'townExit';

export interface TownRoomMembership extends StructureRoomMembership {
  district?: TownPhysicalDistrictKind;
  adjacentSideFacingTown?: 'north' | 'south' | 'east' | 'west';
  isEntranceApproach?: boolean;
  isExitApproach?: boolean;
}
```

## 4.2 Resolver API

```ts
export class MultiRoomStructureResolver {
  constructor(
    private readonly identity: WorldGenerationIdentity,
    private readonly biomeMap: BiomeMap,
    private readonly grid: GridConfig,
  ) {}

  getTownMembership(roomId: string): TownRoomMembership | null;

  getTownAdjacency(roomId: string): TownRoomMembership | null;

  getMajorStructureMembership(roomId: string): StructureRoomMembership | null;
}
```

A single combined call is also fine:

```ts
getMembership(roomId: string): StructureRoomMembership[]
```

But the town implementation should have a clear way to ask:

1. Is this room inside a town footprint?
2. If yes, which physical district is it?
3. If no, is this room adjacent to a town?
4. If adjacent, which side faces the town?
5. Is this adjacency a gate/exit approach?

## 4.3 Search radius

A room must be able to discover structures whose anchor is nearby. Like rivers scan candidate anchors, towns should scan candidate town anchor chunks around the current coordinate.

For an MVP, a town footprint can be small and fixed. That allows a small candidate search.

Example:

```ts
for each candidate town chunk around current room:
  resolve candidate anchor
  resolve candidate footprint
  if current room inside footprint: return inside membership
  if current room adjacent to footprint: return adjacency membership
```

Do not store the answer in `WorldService.rooms` as the source of truth.

---

# 5. Generation Pipeline Integration

## 5.1 Where the resolver belongs

`RoomGenerator` currently owns generation operations and constructs staged operation classes. Add the multi-room structure resolver near the same level as biome map and cross-room features.

Suggested constructor flow:

```ts
this.worldGenerationIdentity = identity;
this.structureResolver = new MultiRoomStructureResolver(identity, this.biomeMap, config.grid);
this.crossRoomFeatureOperations = new CrossRoomFeatureOperations(this.biomeMap, identity);
this.structureOperations = new StructureOperations(config, rng, this.structureResolver);
```

Exact constructor signatures can differ, but the resolver must be available during generation.

## 5.2 Add context fields

Update `RoomGenerationContext` with structure membership information.

Suggested additions:

```ts
townMembership?: TownRoomMembership | null;
townAdjacency?: TownRoomMembership | null;
reservedEdgeAccess?: EdgeAccessPlan[];
protectedCells?: ReadonlySet<string>;
```

The existing `spawnGuard.protected` already protects cells. The implementation can either extend that system or introduce a more general `protectedCells` mechanism. Either is fine, as long as all stages respect it.

## 5.3 Add a structure-resolution stage

The current stages are:

- biome map
- base terrain
- room archetype
- cross-room features
- room structures
- random obstacles
- portals
- safety validation

For towns, add a stage after biome map and before content placement:

```txt
biome map
multi-room structure resolution
base terrain
room archetype
cross-room features
room structures
random obstacles
portals
safety validation
```

Reason:

- biome is needed to decide whether towns can exist
- structure membership should be known before terrain/structures/obstacles place blockers
- edge access plans must reserve run-up cells before obstacle placement

If adding a new stage is too much initially, `StructureOperations.place` may call the resolver directly. That is acceptable for an MVP only if the requirements still hold. The resolver still must be deterministic and non-mutating.

## 5.4 Town interior rendering

If `context.townMembership.role === 'inside'`, then normal random settlement placement should be skipped and the room should render its town district.

Suggested behavior:

```ts
if (context.townMembership?.role === 'inside') {
  renderTownDistrict(context, context.townMembership);
  return;
}
```

This replaces `WorldService.expandTownCluster`.

## 5.5 Town adjacency rendering

If `context.townMembership` is null but `context.townAdjacency` exists, render an exterior wall/fence/approach feature on the side facing town.

Example:

```ts
if (context.townAdjacency) {
  renderTownPerimeterApproach(context, context.townAdjacency);
}
```

The player should be able to see the wall before finding the gate.

## 5.6 Random structures should not overlap town footprints

`StructureOperations.placeSettlement` should not randomly place villages, quest houses, shrines, goblin camps, or other settlements in a room that is inside a major multi-room structure or reserved town adjacency.

Rules:

- inside town footprint: render town district only
- town perimeter/approach room: no large random settlement unless explicitly compatible
- ordinary room: current settlement logic can continue

---

# 6. Edge Access and Run-Up Safety

## 6.1 Edge access type

Create a shared type:

```ts
export interface EdgeAccessPlan {
  side: 'north' | 'south' | 'east' | 'west';
  open: boolean;
  openingCenter: number;
  openingWidth: number;
  runupDepth: number;
  reason:
    | 'normalExit'
    | 'townGate'
    | 'townExit'
    | 'townInteriorStreet'
    | 'riverBridge'
    | 'forestMouth'
    | 'structureDoor';
}
```

## 6.2 Shared reservation helper

Add helper:

```txt
src/world/generation/edgeAccess.ts
```

Suggested functions:

```ts
export function cellsForEdgeRunup(grid: GridConfig, plan: EdgeAccessPlan): ReadonlySet<string>;

export function mergeProtectedCells(...sets: Array<ReadonlySet<string> | undefined>): ReadonlySet<string>;

export function carveEdgeOpening(layout: string[][], grid: GridConfig, plan: EdgeAccessPlan, tile = '.'): void;

export function assertEdgeRunupClear(layout: string[][], grid: GridConfig, plan: EdgeAccessPlan): boolean;
```

## 6.3 Required invariant

Every open edge must pass this test:

> Starting at the edge opening, there must be at least 5 traversable cells inward from the boundary, and preferably a small width around that line.

For a gate on the east side, this means at least 5 clear cells extending westward from the east boundary.

## 6.4 Stages must respect protected cells

The following systems must not block reserved edge run-ups:

- base terrain additions
- room archetypes
- cross-room features
- town district rendering
- town perimeter rendering
- random obstacles
- random structures
- portals
- NPC placement
- apple/treasure/powerup placement where collision matters

If an existing system uses `ProtectedCells`, reuse it. If not, add support.

---

# 7. Town Placement Rules

## 7.1 Town anchor spacing

Towns should be selected on a chunk grid, not by one-off room chance.

Suggested constants:

```ts
const HUMAN_TOWN_ANCHOR_SPACING = 8;
const HUMAN_TOWN_CHANCE_PER_CHUNK = 0.18;
```

Exact numbers can be tuned.

## 7.2 Anchor selection algorithm

For each chunk:

1. Compute chunk coordinate from room coordinate.
2. Hash chunk coordinate with `townSalt`.
3. Decide if the chunk contains a town.
4. Pick anchor offset inside chunk.
5. Build the town footprint from that anchor.
6. Reject if invalid.

Invalid if:

- too close to origin/tutorial safe zone
- overlaps ocean unless a water-town variant exists
- overlaps dense forest unless a forest-town variant exists
- overlaps another major structure
- crosses incompatible biome boundaries without a transition design
- cannot satisfy edge run-up rules
- collides with reserved quest-critical structure space

## 7.3 Town footprint MVP

Use the current PR's intended physical shape, but make it resolver-driven.

Suggested 4x4-ish footprint:

```txt
[O] [G] [S] [M]
        [T]
    [R] [B] [H]
        [X]
```

Legend:

```txt
O = outskirts
G = gate
S = square
M = market street
T = tavern interior
R = residential street
B = back alley
H = guild hideout
X = town exit
```

Offsets from anchor:

```ts
const HUMAN_TOWN_DISTRICTS = {
  '0,0': 'outskirts',
  '1,0': 'gate',
  '2,0': 'square',
  '3,0': 'marketStreet',
  '2,1': 'tavernInterior',
  '1,2': 'residentialStreet',
  '2,2': 'backAlley',
  '3,2': 'guildHideout',
  '2,3': 'townExit',
} as const;
```

The exact shape can change, but all districts must be physical rooms.

## 7.4 Town ID

Town ID should be based on placement, not runtime generation order.

Example:

```ts
const townId = `human-town:${anchor.x},${anchor.y},${anchor.z}:${seed.toString(36)}`;
```

This ID is used for:

- runtime state
- shop stock
- relationship IDs
- guild jobs
- wanted level
- rumors
- music state
- map labels

---

# 8. Town Geometry and District Rendering

The current `src/world/town.ts` has useful district rendering code. It should be adapted so district rendering is called during normal room generation.

## 8.1 Replace full RoomSnapshot creation with context rendering

Current prototype function:

```ts
createTownDistrictRoom(args): RoomSnapshot
```

Preferred architecture:

```ts
renderTownDistrict(context: RoomGenerationContext, membership: TownRoomMembership): void
```

It should mutate the current generation context's canvas/layout, not create and insert other rooms into `WorldService`.

## 8.2 District responsibilities

### Outskirts

- road into town
- fences
- signs
- traveler NPC or flavor marker
- light civilization cues
- low danger

### Gate

- wall/gate visual
- guard NPCs
- law preview
- transition into town interior
- gate can close at high wanted

### Square

- central open area
- notice board
- legal/gossip center
- public proposal space
- wanted posters

### Market Street

- bigger shop stock
- gifts
- food
- flowers
- jewelry
- theft temptation

### Tavern Interior

- bartender NPC
- rumors
- rest/heal later
- relationship density
- music flavor

### Residential Street

- residents
- romance candidates
- homes
- break-in action
- house job targets

### Back Alley

- guild clue
- hiding
- fences
- suspicious NPCs
- shortcuts later
- higher crime potential

### Guild Hideout

- physically present, but access blocked until discovered
- jobs
- black market
- wanted reduction
- fake papers
- guild services

### Town Exit

- back road
- sewer or secret exit later
- guard blockade possible at high wanted

## 8.3 Perimeter rendering

Rooms adjacent to a town footprint should render town-facing perimeter features.

Examples:

- wall if adjacent to square/market/residential/guild
- fence/fields if adjacent to outskirts
- road/sign if adjacent to gate approach
- back road/sewer smell if adjacent to town exit

Perimeter rooms are still normal biome rooms, but with a visible structure edge.

## 8.4 Gate and exit openings

Only designated gate/exit approach sides should have openings. Other perimeter sides should be blocked by walls/fences.

This lets the player discover:

> There is a town here, but not an entrance on this side.

---

# 9. Town Runtime State

## 9.1 Runtime state shape

Create a runtime state type separate from town geometry.

Suggested file:

```txt
src/world/townRuntime.ts
```

Suggested type:

```ts
export interface TownRuntimeState {
  townId: string;
  wantedLevel: 0 | 1 | 2 | 3 | 4 | 5;
  suspicion: number;
  reputation: number;
  discoveredGuild: boolean;
  openedGates: string[];
  completedGuildJobs: string[];
  failedGuildJobs: string[];
  activeGuildJobId?: string;
  rumors: TownRumor[];
  noticesSeen: string[];
  stolenItemIds: string[];
  residents: Record<string, TownResidentRuntimeState>;
}

export interface TownResidentRuntimeState {
  hostile?: boolean;
  dead?: boolean;
  hidden?: boolean;
  relationshipId?: string;
}
```

## 9.2 Storage

Use a flag map or dedicated save field.

Acceptable MVP:

```ts
this.setFlag(`town.runtime.${townId}`, state);
```

Better long-term:

```ts
GameSaveData.towns?: Record<string, TownRuntimeState>;
```

Either is acceptable if the state is saved and loaded reliably.

## 9.3 Generated town data plus runtime state

When rendering a town room:

1. Resolve deterministic town geometry.
2. Generate deterministic base town data from `townId`/seed.
3. Load runtime state by `townId`.
4. Apply runtime state to rendered room.

Example:

```ts
const placement = townResolver.getTownMembership(roomId);
const baseTown = generateTownBaseData(placement);
const runtime = townRuntimeStore.get(baseTown.id);
const town = applyTownRuntime(baseTown, runtime);
renderTownDistrict(context, town, placement);
```

---

# 10. Town Residents and Relationships

## 10.1 Physical IDs required

Every town resident must have physical room IDs.

Do not store this as the relationship home room:

```txt
town-abc:residential
```

Store this:

```txt
13,10,0
```

Suggested resident fields:

```ts
interface TownResident {
  id: string;
  name: string;
  role: 'shopkeeper' | 'bartender' | 'guard' | 'resident' | 'thiefContact' | 'scribe';
  townId: string;
  factionId: string;
  homeRoomId: string; // physical room id
  workRoomId: string; // physical room id
  homeDistrict: TownPhysicalDistrictKind;
  workDistrict: TownPhysicalDistrictKind;
  x: number;
  y: number;
}
```

## 10.2 Relationship integration

Town residents can reuse existing relationship systems. The requirement is not to create a new relationship system. The requirement is that town residents behave correctly as relationship candidates.

Relationship profile should include:

- stable relationship ID
- display name
- species
- portrait
- physical home room ID
- faction
- personality, if relevant

Hostile relationship outcomes may use existing relationship hostility if suitable. If faction hostility is a better fit for guards/guild members, use faction hostility. If enemy spawning is easier for MVP, use enemy spawning. The requirement is that consequences resolve to physical rooms and do not generate bogus logical-room IDs.

## 10.3 Resident placement

Residents should appear only in their current physical district.

MVP: residents are always at work room during gameplay.

Future: schedules can move them between home/work/tavern/square.

---

# 11. Guild Access

The guild may physically occupy a room, but the entrance must be blocked until discovered.

## 11.1 Before discovery

Back alley should show clues:

- chalk mark
- suspicious cellar
- drain symbol
- overheard rumor
- hidden door text

But the guild room should not be freely accessible.

Possible MVP implementations:

1. Render guild room as sealed/empty until discovered.
2. Do not provide a traversable connection from back alley to guild until discovered.
3. Allow the room to exist but block the door tile.
4. If the player enters the guild coordinate by another route, show a locked/sealed exterior variant.

Any of these are acceptable if undiscovered guild services cannot be accessed accidentally.

## 11.2 Discovery triggers

Possible triggers:

- enter back alley with wanted level >= 1
- town mood is crime wave
- buy tavern rumor
- successfully steal something
- talk to suspicious NPC
- inspect graffiti
- high suspicion
- random chance after alley visits

## 11.3 After discovery

After discovery:

- alley entrance opens
- guild hideout renders active content
- black market/guild jobs become available
- guild services can interact with wanted level

---

# 12. Town Wanted System

Wanted should be town-local initially.

```ts
wantedByTownId[townId]
```

A major crime can later affect faction/global reputation, but MVP wanted level belongs to the town.

## 12.1 Wanted levels

```txt
0: normal
1: suspicious guards, mild price increases
2: patrol checks begin
3: active pursuit, some shops may close
4: lockdown, gates close, exits guarded
5: crisis, captain/bounty hunters/jail/exile/fight outcomes
```

## 12.2 Crimes

MVP crimes:

- theft
- break-in
- bite guard
- assault
- murder
- fake permit
- curfew violation
- guild job discovered

## 12.3 Economy

Using score or length is acceptable. The game already uses score as a broad currency-like resource.

Examples:

- fine costs score
- bribe costs score
- guild wanted reduction costs score
- severe consequence may cost length
- community service may cost time/actions instead

Do not introduce a new money system unless necessary.

## 12.4 Guards and patrols

MVP can use menu/popup patrols.

Future version should support physical guards:

- guard NPCs block routes
- exits close at wanted 4+
- captain spawns at wanted 5
- guild can hide the player
- relationship/faction hostility can drive guard behavior

---

# 13. Town Shops and Services

Town shops may reuse village shop UI. That is acceptable.

Requirements:

- town markets have larger stock than villages
- town shop stock is saved by `townId`
- black market stock is unlocked separately or flavored separately
- market/guild stock should not be keyed only by physical room ID if that would fragment town-wide inventory incorrectly

Suggested stock keys:

```ts
market.stock.town.${townId}
blackMarket.stock.town.${townId}
```

Town shop categories for future expansion:

- general store
- food stall
- florist
- jeweler
- tailor
- scribe
- clinic
- black market

MVP can represent all of these through a single larger market table.

---

# 14. Notices, Rumors, and Laws

## 14.1 Notice board

Town square and gate should expose the notice board.

Notice board can show:

- welcome notice
- town mood
- local law
- wanted level
- rumors
- jobs
- warnings
- relationship gossip
- guild hints

## 14.2 Laws

Every town should roll 2-4 laws.

Examples:

- No biting in the square.
- Market goods must be paid for before swallowing.
- Public proposals require a witness and a permit.
- Curfew after sundown.
- The Back Alley is not a shortcut.
- Apples may not be transported through the gate.
- No aggressive coiling near guards.
- Flowers must remain emotionally accounted for.

## 14.3 Rumors

Rumors should be mechanically useful where possible.

Rumors can:

- reveal the guild
- hint at a black market
- reveal a shop item
- warn of patrols
- identify a romance preference
- report a crime
- alter NPC reactions

---

# 15. Music Requirement

Passing through the gate into the town interior should start quiet, jaunty town music.

## 15.1 Trigger point

Music should begin when the player crosses from gate/outskirts into the protected interior, usually square or another interior district.

Do not trigger full town music merely because a perimeter wall is nearby.

Suggested behavior:

```ts
if (previousDistrict === 'gate' && currentDistrict === 'square') {
  music.crossfadeTo('town-jaunty-quiet');
}
```

## 15.2 Mood and wanted variations

MVP can play one quiet jaunty loop.

Future layering:

- normal: quiet jaunty melody
- festival: brighter jaunty layer
- curfew: muted/distant version
- crime wave: sneaky percussion
- wanted 3+: tense patrol layer
- back alley: thinner, suspicious variant
- guild: criminally jaunty version

Music is a requirement, but implementation can be simple at first.

---

# 16. Tests Required

Create tests before considering this complete.

Suggested file:

```txt
src/world/__tests__/multiRoomStructureGeneration.test.ts
```

## 16.1 No overwrite test

Generate a set of rooms around a town footprint in an order where non-anchor rooms are created first. Then generate the anchor/gate/square. Assert earlier rooms were not replaced wholesale.

## 16.2 Generation order independence test

Generate the same town-related rooms in multiple orders and compare stable room properties:

- layout
- biome ID
- town membership
- district kind
- perimeter side
- portal/opening shape

## 16.3 Physical town room test

For each district in a resolved town, assert it maps to a physical coordinate room ID.

## 16.4 No logical relationship home ID test

Town residents must not use logical town node IDs as relationship home room IDs.

Bad:

```txt
town-abc:square
```

Good:

```txt
14,8,0
```

## 16.5 Perimeter rendering test

For each room adjacent to a town footprint, assert that the side facing town includes the expected wall/fence/perimeter treatment.

## 16.6 Gate/exit opening test

Gate approach and town exit approach should have openings. Non-entrance perimeter sides should not.

## 16.7 Run-up invariant test

Every open edge created by a town must preserve at least 5 traversable cells inward from the boundary.

This test should eventually become shared across rivers, forests, and future structures.

## 16.8 Guild hidden access test

Before guild discovery:

- guild services unavailable
- guild door blocked or hidden
- guild district cannot be accidentally used as normal active guild

After discovery:

- guild access opens
- services become available

## 16.9 Save/load identity test

World-generation identity should survive save/load.

Test that a town resolved before saving resolves to the same town after loading.

## 16.10 RNG independence test

Adding unrelated RNG rolls should not move deterministic town placement.

This can be tested by creating two resolvers with the same `WorldGenerationIdentity` and different unrelated RNG histories. Town placements must match.

---

# 17. Migration Plan From Current PR

## Keep or adapt

- `TownStructure` concepts
- `TownRoomKind` / district concepts
- wanted level types
- town laws
- notices
- rumors
- thieves guild state
- guild jobs
- district rendering code
- town market UI concepts
- town reveal UI
- town music idea
- planning documents

## Remove or rewrite

- `WorldService.expandTownCluster`
- direct `this.rooms.set()` stamping of neighboring town rooms
- town perimeter mutation after expansion
- logical town menu movement
- `town.currentRoomId` as movement state
- relationship home IDs using logical town node IDs
- physical guild access before discovery

## Refactor current code path

Current prototype path:

```txt
Room generates town anchor
WorldService sees room.town
WorldService expands cluster
WorldService overwrites/stamps neighboring rooms
Scene uses town.currentRoomId for logical movement
```

Target path:

```txt
Room generation starts
Resolver checks if room is inside or adjacent to a town
Generation renders district/perimeter for current room only
Runtime state is loaded by townId
Scene shows interactions for current physical district
Player moves through normal room traversal
```

---

# 18. Acceptance Criteria

This work is acceptable when:

1. World generation identity exists, is explicit, and is saved.
2. Town placement is deterministic from world seed/salts and coordinates.
3. Town rooms are physical coordinate rooms.
4. No room is overwritten by town expansion.
5. Towns can be approached from any side.
6. Perimeter walls/fences render before the gate is discovered.
7. Gate and exit openings have valid run-up space.
8. Town UI only shows interactions for the physical current district.
9. Town residents use physical home/work room IDs.
10. Guild access is blocked until discovered.
11. Runtime town state is saved by `townId`.
12. Town shops can reuse existing shop UI but have town-sized stock.
13. Score/length may be used for fines, bribes, and town economy.
14. Passing through the gate starts quiet jaunty town music.
15. Tests prove order independence, no overwrites, physical IDs, perimeter rendering, run-up safety, and save/load stability.

---

# 19. Implementation Can Be Simplified, Requirements Cannot

The implementer may simplify implementation details.

Acceptable simplifications:

- Use fixed MVP town footprint before procedural town shapes.
- Use one human town variant before biome-specific variants.
- Use existing village shop UI for all town shops.
- Use score as money.
- Use existing relationship hostility for angry residents.
- Use existing faction alignment for town reputation if convenient.
- Use existing enemy systems for guards if physical patrols are added.
- Use flags for town runtime state before adding a dedicated save field.
- Use one quiet jaunty music track before mood-based layers.
- Render guild room as blocked/empty before discovery instead of building a complex hidden-door system.

Not acceptable:

- Overwriting generated rooms.
- Depending on generation order.
- Fake menu-only town movement.
- Logical town node IDs as resident home rooms.
- Towns that only exist after the player sees the anchor.
- Entrances without safe run-up space.
- Unsaved world-generation salts.
- Randomly moving towns because unrelated RNG calls changed.

---

# 20. Design North Star

The player should be able to wander through the world and encounter a town as a real place.

They might see a wall first. They might follow it to a gate. They might enter and hear quiet, jaunty music. They might read a law, steal a flower, get wanted, hear a rumor in a tavern, find a chalk mark in an alley, discover the guild, hide from guards, date the bartender, and leave by the back road.

At no point should the town feel like a sticker pasted over rooms the player already saw.

The town was always there.

The world knew before the player did.
