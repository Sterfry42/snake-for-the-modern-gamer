# Seeded Biome Generation, Sub-Biomes, Climate Rules, and Transition Safety

## Implementation Requirements and Design Specification

## 1. Purpose

This document defines the full product requirements for replacing the current mostly coordinate-authored biome system in **Snake for the Modern Gamer** with a hybrid authored/procedural seeded biome generation system.

This is not an MVP request. This is a full product-quality world-generation pass.

The desired final result is a world that:

- Preserves the existing authored starter biome layout on level `z = 0`.
- Allows seeded structures, barriers, rivers, towns, landmarks, and local room dressing to vary between seeds, even inside the stable starter biome region.
- Generates procedural biome regions outside the starter region and on most nonzero `z` levels.
- Uses seed-stable deterministic generation rather than incidental RNG state.
- Supports biome families, sub-biomes, and tags.
- Supports climate-aware placement.
- Supports altitude and depth influencing biome likelihood.
- Prevents nonsensical biome adjacency, such as hot desert directly beside freezing/cold biome, unless explicitly allowed by a special transition.
- Centralizes room-to-room transition rules.
- Guarantees that crossing from one room into another is safe by construction.
- Includes a comprehensive test suite proving deterministic generation, biome stability, biome variability, compatibility, transition safety, and run-up safety.

The most important gameplay requirement is:

> The player must never die, crash, or become trapped because one room exposes a natural exit and the neighboring room generated a wall, tree, water tile, hazard, or obstacle at the corresponding entry point.

This project should be treated as a complete world-generation refactor where necessary. Do not limit implementation to only the existing biome files if the correct solution requires changes across generation, safety, tests, structures, forests, oceans, rivers, barriers, portals, or supporting utilities.

---

## 2. Current Code Context

## 2.1 Important current files

The current system is distributed across these likely files:

```txt
src/world/biomes.ts
src/world/generation/biomeMap.ts
src/world/roomGenerator.ts
src/world/generation/worldGenerationIdentity.ts
src/world/generation/worldHash.ts
src/world/generation/stages/forestOperations.ts
src/world/generation/stages/oceanOperations.ts
src/world/generation/stages/crossRoomFeatureOperations.ts
src/world/generation/stages/structureOperations.ts
src/world/generation/stages/vegetationOperations.ts
src/world/generation/stages/safetyOperations.ts
src/world/__tests__/worldGenerationFairness.test.ts
```

The implementation should verify exact file names before editing, but these are the current architectural anchors.

## 2.2 Current biome selection

The current biome system is mostly coordinate-authored.

`CoordinateBiomeMap` currently delegates to:

```ts
getBiomeForRoom(roomId)
createBiomePalette(roomId)
```

The biome map is therefore not currently a proper seeded procedural system. It is primarily an ordered coordinate rule system.

Current conceptual behavior of `getBiomeForRoom(roomId)`:

```txt
roomId === '0,-1,0'
  -> home-hearth

x -4..2 and y -8..-5
  -> jade-peak-province

x -10..-5 and y -8..-3
  -> liberty-badlands

z <= -1 OR y >= 2
  -> sable-depths

y <= -9
  -> sunken-ocean

x >= 3 and y -6..-1
  -> elderwood-maze

x >= 6
  -> moonlit-parish

x <= -3
  -> ember-waste

y <= -3
  -> gloam-garden

otherwise
  -> verdigris-basin
```

This creates some useful authored structure, but it also creates problems:

- Some biomes are finite authored regions.
- Some biomes become infinite coordinate strips.
- Negative depth mostly collapses to `sable-depths`.
- Positive depth mostly behaves like surface coordinates.
- Hot/cold adjacency is not controlled by a climate model.
- Forest and ocean boundaries require special local handling.
- The model does not scale cleanly into procedural seeded biome regions.

The new system should preserve the intended starter biome layout while replacing the larger-world behavior with proper seeded generation.

## 2.3 Current room generation pipeline

`RoomGenerator` owns the biome map and generation stage objects.

Current conceptual generation flow:

```txt
1. Create generation context.
2. Resolve biome map.
3. Resolve multi-room structures.
4. Apply biome base terrain.
5. Apply room archetype.
6. Place random obstacles.
7. Place cross-room features.
8. Place room structures.
9. Place portals.
10. Validate safety.
11. Place vegetation.
```

This is a good foundation, but the new system requires transition contracts to be resolved earlier.

The new pipeline should resolve edge transition contracts before biome terrain, obstacles, barriers, rivers, structures, portals, or vegetation can place unsafe tiles.

## 2.4 Current world identity

`WorldGenerationIdentity` already exists and should be used as the deterministic foundation.

It contains:

```ts
seed: string;
worldSalt: number;
biomeSalt: number;
riverSalt: number;
barrierSalt: number;
structureSalt: number;
townSalt: number;
```

The new implementation should use these salts directly.

Required salt ownership:

```txt
identity.biomeSalt
  biome regions, climate tie-breaks, variant selection

identity.riverSalt
  river placement, river shape, bridge placement

identity.barrierSalt
  cross-room barrier placement and shape

identity.structureSalt
  local structures, camps, houses, landmarks

identity.townSalt
  towns, town membership, town adjacency, town structures

identity.worldSalt
  general fallback only
```

Important rule:

> Generation must not depend on incidental constructor RNG order when deterministic coordinate hashing with the correct salt can be used.

The same seed and coordinate should always resolve to the same biome, structure decision, river decision, barrier decision, town decision, and transition contract regardless of whether neighboring rooms were generated first.

## 2.5 Current forest transition behavior

Dense forest currently has special logic:

- Dense forest rooms fill the room with `#`.
- Dense forest rooms resolve exits based on neighboring biomes.
- Dense forest rooms carve entrance mouths and corridors.
- Non-forest rooms adjacent to dense forest draw forest threshold bands.
- Forest refuses exits toward ocean.
- Forest randomly opens or closes exits toward other forest rooms.
- Forest generally opens exits toward non-forest/non-ocean rooms.

This is useful behavior, but it is too biome-owned for procedural generation.

The new system should preserve the intended forest feel but move transition decisions into a shared transition contract layer.

Forest code should render the contract, not independently decide the contract.

## 2.6 Current ocean transition behavior

Ocean currently has special logic:

- Ocean rooms fill with water.
- Ocean detects neighboring non-ocean rooms.
- Ocean creates shore strips on sides adjacent to non-ocean rooms.
- Ships are only placed in deep ocean rooms.

This is useful, but it should become contract-driven.

Ocean code should render `shoreline`, `dock`, `bridge`, or `open-water` contracts rather than independently deciding transitions from local neighbor checks.

## 2.7 Current tests

The existing world generation fairness tests already provide useful patterns:

- Safe edge entries have a five-tile inward run-up.
- Same seed reproduces generated rooms.
- Structures avoid entrance run-up cleanup.
- Rivers are kept out of the starting neighborhood.
- Structures and cross-room features appear in broad generated areas.
- Adjacent cross-room barrier edges are mutually blocked or mutually passable.
- Archetypes appear across generated rooms.
- Ocean and dense forest report biome-owned archetypes.
- Liberty Badlands exists in its intended coordinate band.

These tests should be preserved, refactored, and expanded.

The new test suite should become stricter and more comprehensive.

---

## 3. Product Requirements

## 3.1 Hybrid authored/procedural biome model

The world should use two biome-generation modes:

```txt
1. Authored starter biome layout
2. Seeded procedural biome generation
```

### Authored starter biome layout

The starter biome layout should stay fixed across seeds.

Recommended starter region:

```txt
z = 0
x = -20..20
y = -20..20
```

Within this region:

- Biome IDs should be stable and authored.
- The player should experience the same intended starter biome layout regardless of world seed.
- Existing recognizable starter locations should remain in their expected places.
- The current starter biome map can be preserved, adjusted, or explicitly encoded as long as the intended starter layout stays stable.

However, within the starter region:

- Structures may vary by seed.
- Barriers may vary by seed.
- Rivers may vary by seed, subject to safety rules.
- Towns may vary by seed.
- Villages may vary by seed.
- Goblin camps may vary by seed.
- Quest houses may vary by seed.
- Optional landmarks may vary by seed.
- Vegetation and dressing may vary by seed where appropriate.
- Portals/ladders may vary by seed where appropriate.

Starter biome identity is fixed. Starter room contents can be seeded.

### Seeded procedural biome generation

Outside the starter biome region, and on most nonzero `z` levels, biomes should be procedural and seed-driven.

The procedural world should not become random one-room static. It should produce readable biome regions.

Target biome region sizes:

```txt
Most biome regions:
  approximately 5–12 rooms wide
  approximately 5–12 rooms tall

Larger biomes:
  ocean, major cave systems, deserts, badlands
  may exceed 12 rooms in one or both dimensions

Smaller biomes:
  rare magical pockets, landmarks, strange mini-biomes
  may be 3–6 rooms wide/tall
```

These sizes should be configurable by biome family or biome variant.

## 3.2 Full product, not MVP

This implementation should not stop once procedural biome IDs exist.

The complete product includes:

- Expanded biome definitions.
- Biome families.
- Sub-biome variants.
- Biome tags.
- Climate-aware procedural placement.
- Altitude/depth influence.
- Biome compatibility rules.
- Seeded region generation.
- Authored starter biome preservation.
- Seeded starter structures/features.
- Shared transition contracts.
- Forest transition refactor.
- Ocean transition refactor.
- Structure/barrier/river/vegetation transition safety.
- Portal/ladder landing safety.
- Broad deterministic tests.
- Broad safety tests.
- Transition-specific fixture tests.
- Documentation/comments explaining the model.

If implementation requires broad refactors, do them.

Do not preserve bad coupling simply to keep the diff small.

---

## 4. Biome Data Model

## 4.1 Biome families

Add biome families as broad gameplay categories.

Recommended type:

```ts
export type BiomeFamily =
  | 'forest'
  | 'desert'
  | 'ocean'
  | 'wetland'
  | 'mountain'
  | 'cave'
  | 'grassland'
  | 'town'
  | 'weird';
```

Purpose of biome families:

- Quest targeting.
- Broad spawn rules.
- Broad structure rules.
- Broad transition rules.
- Minimap grouping.
- Compatibility rules.
- Region generation rules.

Examples:

```txt
forest:
  temperate forest
  rainforest
  wintergreen forest
  elderwood maze

desert:
  ember waste
  liberty badlands
  ash steppe

ocean:
  sunken ocean
  warm coast
  frozen sea
  kelp graveyard

cave:
  sable depths
  ember caverns
  fungal grotto
  root-buried tunnels
```

## 4.2 Biome variants / sub-biomes

A biome variant is the actual room biome.

Examples:

```txt
verdigris-basin
gloam-garden
elderwood-maze
rainforest
wintergreen-forest
ember-waste
liberty-badlands
sunken-ocean
warm-coast
frozen-sea
sable-depths
ember-caverns
fungal-grotto
root-buried-tunnels
jade-peak-province
moonlit-parish
home-hearth
```

A quest may ask for a family:

```txt
"Go to the nearest forest."
```

This should accept:

```txt
temperate-forest
rainforest
wintergreen-forest
elderwood-maze
gloam-garden, if designated as forest/wetland/forest-like
```

A quest may also ask for a specific variant:

```txt
"Find the shrine in Elderwood Maze."
```

This should only accept:

```txt
elderwood-maze
```

## 4.3 Biome tags

Add tags for cross-cutting properties.

Recommended type:

```ts
export type BiomeTag =
  | 'hot'
  | 'warm'
  | 'temperate'
  | 'cold'
  | 'frigid'
  | 'dry'
  | 'wet'
  | 'humid'
  | 'underground'
  | 'high-altitude'
  | 'haunted'
  | 'magical'
  | 'civilized'
  | 'dangerous'
  | 'shore'
  | 'forest'
  | 'oceanic'
  | 'cave'
  | 'sparse'
  | 'dense'
  | 'starter'
  | 'special';
```

Examples:

```ts
'ember-waste': {
  family: 'desert',
  tags: ['hot', 'dry', 'dangerous'],
}

'liberty-badlands': {
  family: 'desert',
  tags: ['hot', 'dry', 'sparse'],
}

'moonlit-parish': {
  family: 'weird',
  tags: ['cold', 'haunted', 'magical'],
}

'elderwood-maze': {
  family: 'forest',
  tags: ['temperate', 'forest', 'dense', 'magical', 'dangerous'],
}

'rainforest': {
  family: 'forest',
  tags: ['hot', 'humid', 'wet', 'forest', 'dense'],
}

'wintergreen-forest': {
  family: 'forest',
  tags: ['cold', 'wet', 'forest', 'dense'],
}

'sunken-ocean': {
  family: 'ocean',
  tags: ['wet', 'oceanic'],
}

'sable-depths': {
  family: 'cave',
  tags: ['cold', 'underground', 'dangerous', 'cave'],
}

'ember-caverns': {
  family: 'cave',
  tags: ['hot', 'dry', 'underground', 'dangerous', 'cave'],
}
```

## 4.4 Expanded `BiomeDefinition`

Expand the current `BiomeDefinition`.

Recommended shape:

```ts
export interface BiomeDefinition {
  id: BiomeId;
  title: string;

  family: BiomeFamily;
  tags: BiomeTag[];
  countsAs?: BiomeFamily[];

  temperature: string;
  dangerLevel: number;
  temperatureHazard: 'hot' | 'cold' | null;
  temperatureRate: number;

  hue: number;
  saturation: number;
  lightness: number;
  tintVariance: number;
  accentColor: number;

  enemyFireBias: number;
  enemyMoveBias: number;

  animalSpawnChance: number;
  animalSpawnBias: Record<string, number>;

  vegetationDensity?: number;

  generation?: BiomeGenerationProfile;
  transition?: BiomeTransitionProfile;
}
```

## 4.5 `BiomeGenerationProfile`

Add generation metadata.

```ts
export interface BiomeGenerationProfile {
  minWidthRooms: number;
  maxWidthRooms: number;
  minHeightRooms: number;
  maxHeightRooms: number;

  baseWeight: number;

  idealTemperature: number; // -1 cold, +1 hot
  temperatureTolerance: number;

  idealMoisture: number; // -1 dry, +1 wet
  moistureTolerance: number;

  idealWeirdness?: number;
  weirdnessTolerance?: number;

  minZ?: number;
  maxZ?: number;

  allowedZ?: 'surface' | 'above' | 'below' | 'any';

  minDistanceFromOrigin?: number;
  maxDistanceFromOrigin?: number;

  allowedNeighborFamilies?: BiomeFamily[];
  forbiddenNeighborFamilies?: BiomeFamily[];

  allowedNeighborBiomes?: BiomeId[];
  forbiddenNeighborBiomes?: BiomeId[];

  rarity?: 'common' | 'uncommon' | 'rare' | 'legendary';
}
```

## 4.6 `BiomeTransitionProfile`

Add transition metadata.

```ts
export interface BiomeTransitionProfile {
  preferredTransitionKinds: TransitionKind[];
  blockedTransitionKinds?: TransitionKind[];
  allowsOpenEdges: boolean;
  requiresSpecialEdgeHandling: boolean;
}
```

Examples:

```ts
'elderwood-maze': {
  transition: {
    preferredTransitionKinds: ['forest-threshold', 'blocked'],
    allowsOpenEdges: false,
    requiresSpecialEdgeHandling: true,
  },
}

'sunken-ocean': {
  transition: {
    preferredTransitionKinds: ['shoreline', 'dock', 'open-water'],
    allowsOpenEdges: false,
    requiresSpecialEdgeHandling: true,
  },
}

'verdigris-basin': {
  transition: {
    preferredTransitionKinds: ['open', 'road', 'shoreline', 'forest-threshold'],
    allowsOpenEdges: true,
    requiresSpecialEdgeHandling: false,
  },
}
```

---

## 5. Biome Query Helpers

Add reusable helpers so gameplay code does not need to hardcode exact biome IDs everywhere.

Required helpers:

```ts
getBiomeDefinition(id: BiomeId): BiomeDefinition;

biomeHasTag(id: BiomeId, tag: BiomeTag): boolean;

biomeIsFamily(id: BiomeId, family: BiomeFamily): boolean;

biomeCountsAs(id: BiomeId, family: BiomeFamily): boolean;

getBiomesByFamily(family: BiomeFamily): BiomeDefinition[];

getBiomesWithTag(tag: BiomeTag): BiomeDefinition[];

getBiomeClimateClass(id: BiomeId): ClimateClass;
```

Future-facing helpers:

```ts
findNearestBiomeFamily(originRoomId: string, family: BiomeFamily): string | null;

findNearestBiomeWithTag(originRoomId: string, tag: BiomeTag): string | null;

findNearestBiomeVariant(originRoomId: string, biomeId: BiomeId): string | null;
```

These future helpers may not need to be fully wired into quests in this pass, but the data model should support them cleanly.

---

## 6. Climate Model

## 6.1 Climate fields

Procedural biome placement should be driven by climate.

Recommended type:

```ts
export interface ClimateSample {
  temperature: number; // -1 cold, 0 temperate, +1 hot
  moisture: number;    // -1 dry, 0 normal, +1 wet
  weirdness: number;   // -1 mundane, +1 strange/magical
  altitude: number;    // derived mostly from z > 0
  depth: number;       // derived mostly from z < 0
}
```

Climate should be deterministic for a seed and coordinate.

## 6.2 Climate sampling

Add a climate resolver.

Recommended file:

```txt
src/world/generation/climate.ts
```

Suggested API:

```ts
export function sampleClimateForRegion(args: {
  regionX: number;
  regionY: number;
  z: number;
  identity: WorldGenerationIdentity;
}): ClimateSample;
```

Climate should be smooth enough that neighboring regions tend to be related.

Avoid pure per-cell randomness that creates climate static.

Implementation options:

- Low-frequency hash sampling.
- Smoothed value noise.
- Site-based climate regions.
- Multi-scale deterministic coordinate hashing.

The exact implementation is flexible, but it must be deterministic and tested.

## 6.3 Altitude/depth influence

Vertical depth should influence climate.

Desired rule:

```txt
Higher z:
  more cold / high-altitude biomes

Lower z:
  more hot / underground / cave biomes
```

Suggested adjustment:

```ts
export function applyVerticalClimate(base: ClimateSample, z: number): ClimateSample {
  const altitude = Math.max(0, z);
  const depth = Math.max(0, -z);

  return {
    ...base,
    altitude,
    depth,
    temperature: clamp(base.temperature - altitude * 0.12 + depth * 0.10, -1, 1),
    weirdness: clamp(base.weirdness + depth * 0.05, -1, 1),
  };
}
```

This does not mean every high room is frozen or every deep room is lava. It means the probability shifts.

## 6.4 Required distribution behavior

At `z = 0`:

- Normal surface biomes dominate.
- Starter region remains authored.
- Procedural overworld should include forests, grasslands, deserts, oceans, wetlands, mountains, weird biomes, etc.

At `z > 0`:

- Cold, alpine, highland, mountain, wintergreen, Jade-like, Moonlit-like, frozen, and high-altitude biomes become more likely.
- Hot deserts become less likely.
- Ocean may become rarer or become frozen/highland lake variants.

At `z < 0`:

- Cave family biomes become more likely.
- Hot underground biomes become more likely as depth increases.
- Sable Depths remains possible and common, but should not be the only underground biome.
- Ember Caverns, Fungal Grotto, Root-Buried Tunnels, underground water pockets, and weird underground biomes should be possible.

---

## 7. Biome Compatibility Rules

## 7.1 Climate classes

Add climate classes.

```ts
export type ClimateClass =
  | 'hot'
  | 'warm'
  | 'temperate'
  | 'cold'
  | 'frigid'
  | 'wet'
  | 'special';
```

Each biome should resolve to one or more climate classes based on tags or generation profile.

## 7.2 Direct adjacency rules

Certain adjacency should be forbidden unless explicitly allowed by a special transition.

Default forbidden examples:

```txt
hot biome directly beside cold biome
hot biome directly beside frigid biome
frigid biome directly beside hot biome
desert directly beside frozen ocean
ember caverns directly beside frigid cave without transition
```

Allowed examples:

```txt
hot -> warm
warm -> temperate
temperate -> cold
cold -> frigid
desert -> grassland
forest -> grassland
forest -> wetland
ocean -> shore/land with shoreline contract
cave -> cave
cave -> surface with cave-mouth/ladder/shaft contract
```

## 7.3 Compatibility API

Recommended file:

```txt
src/world/generation/biomeCompatibility.ts
```

Suggested API:

```ts
export interface BiomeCompatibilityResult {
  compatible: boolean;
  reason?: string;
  requiresTransition?: TransitionKind;
  allowedException?: boolean;
}

export function getBiomeCompatibility(
  a: BiomeDefinition,
  b: BiomeDefinition,
): BiomeCompatibilityResult;
```

Potential helpers:

```ts
export function areBiomesCompatible(a: BiomeId, b: BiomeId): boolean;

export function getRequiredTransitionKind(a: BiomeId, b: BiomeId): TransitionKind | null;
```

## 7.4 Transition biomes and softening

The generator should avoid ugly direct borders by preferring transition regions.

Examples:

```txt
ember-waste -> verdigris-basin -> wintergreen-forest

liberty-badlands -> dry grassland -> jade-peak-province

sable-depths -> fungal-grotto -> ember-caverns

sunken-ocean -> warm-coast -> grassland
```

This can happen naturally through scoring or be enforced by compatibility repair.

The exact algorithm is flexible, but tests must prove that unacceptable hot/cold adjacency does not appear accidentally.

---

## 8. Seeded Procedural Biome Regions

## 8.1 Region-based generation

Procedural biomes should be generated as regions, not per-room random picks.

Recommended approach:

```txt
1. Divide the world into large region cells.
2. Generate deterministic biome sites inside/near those cells using biomeSalt.
3. Each site has:
   - center coordinate
   - target width
   - target height
   - climate sample
   - biome family
   - biome variant
   - priority/weight
4. For each room, inspect nearby sites.
5. Select the best site based on distance, size, climate compatibility, and deterministic tie-breaking.
```

Alternative algorithms are acceptable if they satisfy the same tests:

- Voronoi-style biome regions.
- Chunked flood-fill with deterministic seeds.
- Noise-generated climate plus biome bands.
- Hybrid authored/procedural patches.

Do not produce one-room biome static.

## 8.2 Region site shape

Suggested type:

```ts
export interface BiomeRegionSite {
  id: string;
  centerX: number;
  centerY: number;
  z: number;

  widthRooms: number;
  heightRooms: number;

  family: BiomeFamily;
  biomeId: BiomeId;

  climate: ClimateSample;

  priority: number;
}
```

## 8.3 Biome scoring

Suggested scoring:

```txt
score =
  baseWeight
  - distancePenalty
  - temperatureMismatchPenalty
  - moistureMismatchPenalty
  - weirdnessMismatchPenalty
  - zMismatchPenalty
  - adjacencyPenalty
  + rarityBonusOrPenalty
```

Candidate biomes with hard incompatibilities should be rejected.

## 8.4 Procedural biome determinism

The procedural biome system must be pure and deterministic.

Required property:

```txt
getBiomeForRoomId('100,50,0') with seed A
  always returns the same biome

getBiomeForRoomId('100,50,0') with seed B
  may return a different biome

Generation result must not depend on whether '99,50,0' was generated first.
```

## 8.5 Starter boundary interaction

At the edge of the starter biome radius, procedural regions must respect the authored biome layout.

Important:

- The starter biome layout does not change.
- Procedural biomes outside the starter zone should be compatible with starter edge biomes.
- If a procedural candidate would create forbidden adjacency against the authored starter edge, it must be rejected or converted into a compatible transition region.

This is especially important near:

- Starter ocean boundaries.
- Starter forest boundaries.
- Starter hot/cold boundaries.
- Starter mountain/highland boundaries.
- Starter weird/special biomes.

---

## 9. Shared Transition Contract System

## 9.1 Problem to solve

Current forest and ocean transition handling is biome-specific.

That creates a dangerous scaling problem:

```txt
Biome A says:
  "I have an exit here."

Biome B says:
  "I generated wall/water/tree/hazard there."

Result:
  Player crosses the zone edge and dies or becomes trapped.
```

With procedural biomes, this problem becomes much worse because many more biome-pair combinations become possible.

The solution is a shared transition contract.

## 9.2 Core rule

Every shared edge between two neighboring rooms must have exactly one deterministic transition contract.

Both rooms must render the same contract from opposite sides.

No biome should independently guess where its entrances are.

## 9.3 Directions and edge keys

Recommended types:

```ts
export type Direction = 'north' | 'south' | 'west' | 'east';

export interface RoomCoord {
  x: number;
  y: number;
  z: number;
}
```

Canonical edge keys:

```txt
Vertical edge between (x,y,z) and (x+1,y,z):
  edge:v:x,y:z

Horizontal edge between (x,y,z) and (x,y+1,z):
  edge:h:x,y:z
```

Exact string format is flexible, but it must be canonical.

Both sides must resolve to the same key.

## 9.4 Transition kinds

Recommended type:

```ts
export type TransitionKind =
  | 'open'
  | 'blocked'
  | 'forest-threshold'
  | 'shoreline'
  | 'open-water'
  | 'dock'
  | 'bridge'
  | 'cliff'
  | 'road'
  | 'cave-mouth'
  | 'ladder-shaft'
  | 'town-gate'
  | 'special';
```

## 9.5 Edge runs

An edge run defines a continuous passable or blocked span along an edge.

```ts
export interface EdgeRun {
  start: number;
  endExclusive: number;
}
```

For east/west edges, run indices map to `y`.

For north/south edges, run indices map to `x`.

## 9.6 `EdgeTransitionContract`

Recommended type:

```ts
export interface EdgeTransitionContract {
  key: string;

  orientation: 'vertical' | 'horizontal';

  roomA: RoomCoord;
  roomB: RoomCoord;

  biomeA: BiomeId;
  biomeB: BiomeId;

  kind: TransitionKind;

  passableRuns: EdgeRun[];
  blockedRuns: EdgeRun[];

  transitionDepth: number;
  minRunupTiles: number;

  requiresShore?: boolean;
  requiresForestMouth?: boolean;
  requiresBridge?: boolean;
  requiresDock?: boolean;
  requiresRoad?: boolean;

  allowOneWay?: false;
}
```

Default rule:

```txt
allowOneWay must be false.
```

One-way natural transitions should not exist unless there is a very explicit gameplay mechanic that handles them safely.

## 9.7 TransitionMap

Recommended file:

```txt
src/world/generation/transitionContracts.ts
```

Suggested API:

```ts
export interface TransitionMap {
  getEdgeContract(roomId: string, side: Direction): EdgeTransitionContract;
}

export class SeededTransitionMap implements TransitionMap {
  constructor(
    private readonly biomeMap: BiomeMap,
    private readonly identity: WorldGenerationIdentity,
  ) {}

  getEdgeContract(roomId: string, side: Direction): EdgeTransitionContract {
    const edge = canonicalizeEdge(roomId, side);

    const biomeA = this.biomeMap.getBiomeForRoomId(formatRoomId(edge.roomA));
    const biomeB = this.biomeMap.getBiomeForRoomId(formatRoomId(edge.roomB));

    return resolveEdgeTransition({
      edge,
      biomeA,
      biomeB,
      identity: this.identity,
    });
  }
}
```

## 9.8 Contract resolution logic

Contract resolution should consider:

- Biome family A.
- Biome family B.
- Biome tags A.
- Biome tags B.
- Biome compatibility.
- Climate class compatibility.
- Whether either biome requires special handling.
- Edge orientation.
- Edge hash.
- Seed salt.
- Starter zone special cases.
- Required run-up length.

Example contract rules:

```txt
same ordinary land family:
  open or road

forest -> ordinary land:
  forest-threshold

forest -> forest:
  forest-threshold or blocked, but not all forest component edges sealed

ocean -> land:
  shoreline, dock, or bridge

ocean -> ocean:
  open-water

ocean -> forest:
  blocked, dock, mangrove, or bridge

hot -> cold:
  incompatible, should not occur unless special

cave -> surface:
  cave-mouth, ladder-shaft, or blocked

town -> land:
  road or town-gate
```

## 9.9 Required safety outputs

Each transition contract should be able to produce room-local safety reservations.

Recommended helpers:

```ts
getRequiredPassableCellsForRoom(
  contract: EdgeTransitionContract,
  room: RoomCoord,
  grid: GridConfig,
): ReadonlySet<string>;

getRequiredBlockedCellsForRoom(
  contract: EdgeTransitionContract,
  room: RoomCoord,
  grid: GridConfig,
): ReadonlySet<string>;

getForbiddenStructureCellsForRoom(
  contract: EdgeTransitionContract,
  room: RoomCoord,
  grid: GridConfig,
): ReadonlySet<string>;

getForbiddenObstacleCellsForRoom(
  contract: EdgeTransitionContract,
  room: RoomCoord,
  grid: GridConfig,
): ReadonlySet<string>;
```

These sets should include:

- Passable edge cells.
- The required five-tile inward run-up.
- Transition-specific approach area.
- Bridge/dock/road continuation cells if applicable.
- Cells that structures, walls, water, vegetation, barriers, and hazards must not overwrite.

---

## 10. Transition-Specific Requirements

## 10.1 Universal passable edge rule

For every room:

```txt
If an edge tile is passable, then the next 5 inward cells must also be passable.
```

This is the five-tile run-up rule.

This must apply to every biome and every generated room.

Unsafe tiles include at least:

```txt
#
~
any lethal hazard
any collision-blocking object
any tile that immediately traps or kills the snake
```

If more unsafe tile types exist, centralize this in a helper.

Recommended helper:

```ts
isTileSafeForEntry(tile: string | undefined): boolean;
```

## 10.2 Universal adjacent edge rule

For every pair of adjacent rooms:

```txt
If Room A exposes a safe edge tile,
Room B must expose a safe opposite edge tile at the same index,
and Room B must have a safe five-tile inward run-up.

If Room B exposes a safe edge tile,
Room A must expose a safe opposite edge tile at the same index,
and Room A must have a safe five-tile inward run-up.
```

This rule is stricter than checking only wall mismatches. It must consider water and any other unsafe tile.

## 10.3 Forest to land

Expected contract:

```txt
forest-threshold
```

Requirements:

- Forest side carves an entrance mouth.
- Forest side carves a corridor inward from the entrance.
- Land side draws threshold/border dressing.
- Both sides use the same passable run.
- Both sides reserve the same five-tile run-up.
- No structures, obstacles, rivers, barriers, vegetation, or decorative blocking tiles may overwrite the passable run-up.

## 10.4 Forest to forest

Expected contract:

```txt
forest-threshold
blocked
```

Requirements:

- Some forest-to-forest edges may be blocked.
- Some forest-to-forest edges should be passable to create maze connectivity.
- Passable forest-to-forest edges must have matching openings.
- Forest regions must not become fully sealed unless intentionally generated as unreachable/blocked content.
- Any fully enclosed forest component should either be impossible or explicitly tested as intentional.

## 10.5 Forest to ocean

Expected contract:

```txt
blocked
dock
bridge
mangrove / special
```

Requirements:

- Default should avoid directly opening forest into lethal water.
- If passable, use dock/bridge/special transition.
- Both sides must provide safe passable entry and run-up.
- Ocean side must not place water at the corresponding safe forest exit.

## 10.6 Ocean to land

Expected contract:

```txt
shoreline
dock
bridge
```

Requirements:

- Ocean side creates shoreline/shallows/beach/dock/bridge on the transition edge.
- Land side reserves a dry matching approach.
- A land room should not expose a safe exit directly into water.
- If water exists at the ocean edge, the matching land edge should not be passable unless a bridge/dock contract makes it safe.
- Shoreline should look intentional, not just a flat unstyled strip where possible.

## 10.7 Ocean to ocean

Expected contract:

```txt
open-water
```

Requirements:

- Deep ocean can remain water.
- Ships/islands/docks must not create unsafe one-sided entrances.
- If the player can cross between ocean rooms through a passable structure, the opposite room must match safely.

## 10.8 Desert to grassland / temperate land

Expected contract:

```txt
open
road
dry-transition
```

Requirements:

- Direct adjacency is allowed.
- Optional transition dressing can include scrub, dry grass, sand, cracked earth.
- No special safety issue beyond universal edge rules.

## 10.9 Hot to cold

Expected behavior:

```txt
Usually forbidden.
```

Hot and cold/frigid biomes should not directly border accidentally.

Examples of bad borders:

```txt
ember-waste -> wintergreen-forest
ember-waste -> moonlit-parish
liberty-badlands -> frozen-sea
ember-caverns -> frigid-depths
```

If a special hot/cold border is intentionally desired, it must use an explicit special transition kind and have tests.

Example special transition:

```txt
steam-rift
volcanic-glacier-edge
magic-boundary
```

These should be rare and explicit.

## 10.10 Cave to surface

Expected contracts:

```txt
cave-mouth
ladder-shaft
blocked
ruins-entrance
```

Requirements:

- Cave/surface transition must be explicit.
- Entry cells must be safe.
- Landing cells must be safe.
- Five-tile run-up applies where natural edge crossing exists.
- Vertical portals/ladders must guarantee a safe landing and recovery area.

## 10.11 Town to any biome

Expected contracts:

```txt
road
town-gate
dock
bridge
blocked
```

Requirements:

- Towns should integrate with transition contracts.
- Town perimeters cannot create one-sided blocked edges.
- Roads/gates should provide matching openings.
- Town structures must respect required transition cells.

---

## 11. Generation Pipeline Requirements

The generation pipeline should be refactored to make transition contracts first-class.

Recommended pipeline:

```txt
1. Parse room coordinate.
2. Resolve biome.
3. Resolve neighboring biomes.
4. Resolve edge transition contracts for north/south/east/west.
5. Build transition reservation sets.
6. Resolve multi-room structures/town membership.
7. Apply biome base terrain.
8. Render transition base features.
9. Apply room archetype.
10. Place random obstacles while respecting reservations.
11. Place cross-room barriers/rivers while respecting reservations.
12. Place structures while respecting reservations.
13. Place portals/ladders with safe landing rules.
14. Validate room safety.
15. Place vegetation while respecting reservations.
16. Final validate transition contracts and edge run-ups.
```

The exact pipeline class structure may differ, but the data dependencies should follow this order.

## 11.1 `RoomGenerationContext` additions

Add transition information to `RoomGenerationContext`.

Recommended additions:

```ts
interface RoomGenerationContext {
  roomId: string;
  grid: GridConfig;

  palette: RoomGenerationPalette;

  edgeContracts: Record<Direction, EdgeTransitionContract>;

  requiredPassableCells: ReadonlySet<string>;
  requiredBlockedCells: ReadonlySet<string>;

  forbiddenStructureCells: ReadonlySet<string>;
  forbiddenObstacleCells: ReadonlySet<string>;
  forbiddenVegetationCells: ReadonlySet<string>;

  // Existing fields...
}
```

## 11.2 Respecting reservations

Every terrain/feature stage must respect the relevant reservation sets.

Required:

- Biome base terrain must not permanently block required passable cells.
- Archetypes must preserve required passable cells.
- Obstacles must not place on forbidden obstacle cells.
- Structures must not place on forbidden structure cells.
- Rivers must not overwrite required passable cells unless bridged by contract.
- Barriers must not create one-sided blocked edges.
- Vegetation must not block required passable cells.
- Portals must not land the player in unsafe cells.

---

## 12. Seeded Feature Requirements

## 12.1 Cross-room barriers

Barriers must be deterministic and contract-aware.

Requirements:

- Same seed and coordinate always produce same barrier.
- Different seeds may produce different barriers.
- Barriers must not block required transition passable runs.
- Barriers must not create safe-to-unsafe edge mismatches.
- If a barrier blocks an edge, both sides must agree.
- Barriers must be suppressed or reshaped near required run-ups.

## 12.2 Rivers

Rivers must be deterministic and contract-aware.

Requirements:

- Same seed and coordinate always produce same river.
- Different seeds may produce different rivers.
- Rivers must avoid starting neighborhood restrictions.
- Rivers must not create unbridged unsafe room entries.
- Rivers must not overwrite required transition passable runs.
- If a river crosses a required route, a bridge must exist or the river must be moved.
- River segments spanning rooms must align across room boundaries.

## 12.3 Towns

Towns must be deterministic and contract-aware.

Requirements:

- Town membership should use `townSalt`.
- Town borders/perimeters must not create one-sided blocked edges.
- Town gates/roads must use transition contracts.
- Town structures must respect forbidden cells.
- Towns should be compatible with their biome family and tags unless intentionally special.

## 12.4 Local structures

Structures must accept forbidden cells and margins.

Requirements:

- Quest houses, villages, camps, diners, monuments, shrines, stands, pools, and other structures must not block required transition cells.
- Structures should not rely on cleanup stages to erase important pieces.
- Structure placement should fail or move if it cannot fit safely.
- Structure tests should confirm they respect edge run-up reservations.

## 12.5 Vegetation

Vegetation must be transition-aware.

Requirements:

- Vegetation cannot block required passable cells.
- Dense vegetation must not overwrite transition corridors.
- Biome-specific vegetation density should respect safety reservations.
- Vegetation should be allowed to decorate near transitions without breaking them.

## 12.6 Portals and ladders

Portals/ladders must guarantee destination safety.

Requirements:

- Destination room ID must be deterministic.
- Destination tile must be safe.
- Destination local recovery area must be safe.
- Vertical movement must respect depth biome rules.
- Same seed reproduces portal placements/destinations.
- Portal destination safety must not depend on whether the destination room was generated before the source room.

---

## 13. Starter Region Requirements

## 13.1 Starter biome stability

Within:

```txt
z = 0
x = -20..20
y = -20..20
```

Biome IDs must be fixed across seeds.

Test all coordinates in that range.

Recommended fixture strategy:

- Generate canonical starter biome fixture using a known seed or explicit starter map.
- For many other seeds, compare every starter coordinate’s biome ID against the canonical fixture.

## 13.2 Starter feature variability

Within the same starter region:

- Seed A and Seed B should produce the same biome IDs.
- Seed A and Seed B may produce different room layouts/features.

The test should not require every room to differ. It should assert that across the whole starter region, at least one seeded feature differs.

Feature comparison candidates:

- Layout.
- Portals.
- Villages.
- Goblin camps.
- Quest houses.
- Town membership.
- Rivers.
- Cross-room barriers.
- Optional structures.

## 13.3 Starter safety

The starter area must remain safe.

Requirements:

- Origin room remains safe.
- Starting neighborhood remains free of unfair rivers/barriers.
- Any passable edge has five-tile run-up.
- Adjacent room edges match safely.
- Forest and ocean starter boundaries use transition contracts.
- Structures cannot block transition exits.

---

## 14. Procedural Region Requirements

## 14.1 Outside starter region

Outside starter radius, procedural biome generation applies.

This includes:

```txt
z = 0 and outside starter radius
z > 0, except any explicitly authored vertical starter region
z < 0, except any explicitly authored vertical starter region
```

## 14.2 Patch size

Most procedural biome patches should be readable regions.

Success ranges:

```txt
Common region:
  target width/height: 5–12 rooms

Large region:
  ocean/cave/desert: 10–20 rooms possible

Small rare region:
  3–6 rooms possible
```

Tests should not demand exact sizes for every component, but should catch:

- 1-room static everywhere.
- Infinite strips.
- Single-biome collapse.
- Wildly unstable patch sizes.
- Excessive fragmentation.

## 14.3 Variety

Procedural test areas should contain multiple families.

For sufficiently large sampled procedural areas, expect:

- At least several biome variants.
- At least several biome families.
- Family distribution should vary by seed.
- Depth/altitude distribution should change with `z`.

## 14.4 Compatibility

Procedural placement must respect compatibility rules.

For all adjacent procedural rooms:

- If biomes are compatible, transition contract should resolve normally.
- If biomes are incompatible, the generator should avoid that adjacency.
- If an explicit exception exists, transition contract must identify and handle it.

---

## 15. Testing Plan

Testing is not optional. This project is only complete when the tests prove the system.

Recommended new or refactored test files:

```txt
src/world/generation/__tests__/starterBiomeMap.test.ts
src/world/generation/__tests__/proceduralBiomeMap.test.ts
src/world/generation/__tests__/biomeCompatibility.test.ts
src/world/generation/__tests__/transitionContracts.test.ts
src/world/generation/__tests__/transitionSafety.test.ts
src/world/generation/__tests__/verticalBiomeDistribution.test.ts
src/world/generation/__tests__/seededFeatureDeterminism.test.ts
```

Existing tests in:

```txt
src/world/__tests__/worldGenerationFairness.test.ts
```

should remain, but may be refactored or split if appropriate.

## 15.1 Starter biome stability test

Test:

```txt
For seeds:
  starter-a
  starter-b
  starter-c
  starter-d
  20+ total seeds

For each seed:
  Generate biome ID for every room in:
    x = -20..20
    y = -20..20
    z = 0

Assert:
  biome ID matches canonical starter biome layout.
```

Success:

- All starter biome IDs are stable across seeds.
- Existing important authored regions remain in place.

## 15.2 Starter seeded feature variability test

Test:

```txt
Generate starter area with seed A.
Generate starter area with seed B.

Assert:
  biome IDs are identical for every room.
  at least one generated non-biome feature differs.
```

Success:

- Starter biomes fixed.
- Starter structures/features seed-dependent.
- Same seed remains exactly reproducible.

## 15.3 Same-seed reproducibility test

Test:

```txt
Generate a broad area twice using same seed.

Compare:
  biomeId
  biomeTitle
  layout
  archetypeId
  portals
  structures
  towns
  rivers/barriers as reflected in layout
```

Success:

- Results are identical.

## 15.4 Different-seed procedural variability test

Test:

```txt
Generate far procedural area with seed A.
Generate same area with seed B.

Assert:
  enough biome/layout differences exist to prove seed matters.
```

Success:

- Procedural regions vary between seeds.
- Starter biome layout remains stable between seeds.

## 15.5 Biome patch size test

Test:

```txt
Generate large area outside starter region.
Compute connected components by biomeId and by family.
Measure:
  component size
  bounding width
  bounding height
```

Success:

- Majority of common biome regions are larger than one room.
- Average component width/height roughly matches configured targets.
- Rare small biomes are allowed but not dominant.
- No tested area collapses into infinite coordinate strips.
- No tested area becomes random static.

## 15.6 Climate depth distribution test

Test:

```txt
Generate comparable procedural sample areas at:
  z = -3
  z = 0
  z = 3

Count tags:
  hot
  cold
  frigid
  underground
  high-altitude
  cave
```

Success:

- `z = 3` has more cold/frigid/high-altitude biomes than `z = 0`.
- `z = -3` has more hot/underground/cave biomes than `z = 0`.
- `z = -3` is not only Sable Depths.
- `z = 3` is not only a copied surface map.

## 15.7 Biome compatibility test

Test:

```txt
For many seeds and broad procedural areas:
  For every east/south adjacent room pair:
    Check compatibility result.
```

Success:

- No hot/cold direct adjacency unless explicit special exception.
- No ocean/land adjacency without shoreline/dock/bridge/open-water contract as appropriate.
- No forest boundary without forest threshold/blocked/special contract.
- No cave/surface boundary without cave-mouth/shaft/blocked/special contract.

## 15.8 Edge passability test

This is one of the most important tests.

Test:

```txt
For many seeds:
  Generate broad areas at z = -2, z = 0, z = 2.

For every adjacent room pair:
  For every edge index:
    If first edge tile is safe:
      opposite edge tile must be safe.
      opposite room inward run-up must be safe.

    If second edge tile is safe:
      first edge tile must be safe.
      first room inward run-up must be safe.
```

Safe means:

```txt
not undefined
not wall
not water
not lethal
not collision-blocking
```

Success:

- No one-sided safe entries.
- No safe edge opens into unsafe opposite tile.
- No safe edge opens into blocked five-tile run-up.

## 15.9 Five-tile run-up test

Test:

```txt
For every generated room:
  For every edge tile:
    If edge tile is safe:
      next 5 inward cells must be safe.
```

Success:

- Every safe border entry has recovery space.
- Applies to all biomes.
- Applies to all tested seeds.
- Applies to all tested z levels.

## 15.10 Transition fixture tests

Use controlled/fake biome maps to force exact transitions.

Required fixtures:

```txt
forest -> land
land -> forest
forest -> forest
forest -> ocean
ocean -> land
land -> ocean
ocean -> ocean
desert -> grassland
hot -> cold
cave -> surface
surface -> cave
town -> land
town -> forest
town -> ocean
```

For each fixture:

Assert:

- Expected transition kind.
- Passable runs match on both sides.
- Blocked runs match on both sides.
- Required run-up cells are reserved.
- Full room generation preserves the contract.
- Final layouts pass edge safety rules.

## 15.11 Structure reservation tests

Test:

```txt
Create rooms with transition contracts.
Attempt to place structures near edges.
Assert structures do not overwrite reserved cells.
```

Include:

- Quest house.
- Village.
- Goblin camp.
- Town perimeter.
- Liberty Badlands structures.
- Ocean/shore structures.
- Forest-adjacent structures.

Success:

- Required passable cells remain safe.
- Required run-up cells remain safe.
- Structures fail or relocate instead of blocking transitions.

## 15.12 River/barrier reservation tests

Test:

```txt
Generate transitions with required passable runs.
Generate barriers and rivers.
Assert they respect transition reservations.
```

Success:

- No barrier blocks required passable edge.
- No river creates unbridged unsafe entry.
- Bridges appear where river crosses required passage.
- Adjacent edge consistency remains valid.

## 15.13 Portal/ladder vertical safety tests

Test:

```txt
For many seeds and rooms with portals/ladders:
  Resolve destination.
  Generate destination.
  Assert landing tile is safe.
  Assert local landing recovery area is safe.
```

Success:

- No portal/ladder places player into wall/water/hazard.
- Destination safety is deterministic.
- Vertical biome differences do not break landing safety.

## 15.14 Performance/laziness tests

Test or benchmark:

```txt
Generate sampled broad areas without precomputing entire world.
```

Success:

- Biome lookup is fast.
- Transition lookup is fast.
- Neighbor checks do not recursively generate unbounded world areas.
- Test suite remains practical to run.

---

## 16. Implementation Deliverables

## 16.1 Data model deliverables

- Expand `BiomeDefinition`.
- Add `BiomeFamily`.
- Add `BiomeTag`.
- Add `BiomeGenerationProfile`.
- Add `BiomeTransitionProfile`.
- Migrate existing biomes to include family/tags/generation metadata.
- Add new sub-biome scaffolding and at least initial variants where appropriate.

## 16.2 Biome map deliverables

- Implement authored starter biome map.
- Implement seeded procedural biome map.
- Replace or supersede `CoordinateBiomeMap`.
- Preserve starter biome layout.
- Add climate-aware procedural selection.
- Add altitude/depth rules.
- Add compatibility-aware selection.

## 16.3 Transition deliverables

- Add transition contract system.
- Add canonical edge keys.
- Add transition map.
- Add transition contract resolver.
- Add passable/blocked edge run model.
- Add required passable/blocked/forbidden cell helpers.
- Refactor forest operations to render contracts.
- Refactor ocean operations to render contracts.
- Ensure barriers/rivers/structures/vegetation respect contracts.

## 16.4 Seed deliverables

- Use `WorldGenerationIdentity` salts directly.
- Remove or reduce hidden constructor RNG dependency from cross-room features.
- Ensure same-seed deterministic output.
- Ensure different-seed variability where expected.

## 16.5 Test deliverables

- Preserve existing fairness tests.
- Add starter biome stability tests.
- Add seeded feature variability tests.
- Add procedural biome determinism tests.
- Add patch size sanity tests.
- Add climate depth distribution tests.
- Add compatibility tests.
- Add transition contract fixture tests.
- Add broad multi-seed edge safety tests.
- Add vertical portal/ladder safety tests.

---

## 17. Acceptance Criteria

This work is complete only when all criteria below are met.

## 17.1 Starter region

- The starter biome layout is stable across many seeds.
- Starter structures/features can vary by seed.
- Same seed reproduces exactly.
- Starter origin and starting neighborhood remain safe.
- Starter forest/ocean boundaries use safe contracts.
- Starter structures cannot block transition run-ups.

## 17.2 Procedural biome generation

- Procedural biomes exist outside the starter region.
- Procedural generation is seed-dependent.
- Same seed and coordinate are deterministic.
- Procedural biomes form readable regions.
- Procedural generation does not produce mostly one-room noise.
- Procedural generation does not collapse into infinite strips.
- Procedural generation supports different depth/altitude behavior.

## 17.3 Biome model

- Biomes have families.
- Biomes have tags.
- Biomes support sub-biome variants.
- Existing biomes are migrated into the new model.
- Systems can query by exact biome, family, or tag.
- Forest variants can count as forest.
- Cave variants can count as cave.
- Ocean variants can count as ocean.

## 17.4 Climate and depth

- Climate influences procedural biome selection.
- Hot/dry regions prefer hot/dry biomes.
- Cold/wet/high regions prefer cold/high biomes.
- Higher `z` increases cold/high-altitude biome likelihood.
- Lower `z` increases hot/underground/cave biome likelihood.
- Negative depth no longer means only Sable Depths.
- Positive depth is not just a surface copy.

## 17.5 Compatibility

- Hot and cold/frigid biomes do not directly border accidentally.
- Ocean/land borders use appropriate transition contracts.
- Forest boundaries use appropriate transition contracts.
- Cave/surface boundaries use appropriate transition contracts.
- Special exceptions are explicit and tested.

## 17.6 Transition safety

- Every shared room edge has a deterministic contract.
- Both rooms render the same contract.
- No passable edge opens into an unsafe opposite tile.
- Every passable edge has a five-tile inward run-up.
- Structures cannot block required transition cells.
- Barriers cannot create one-sided blocked edges.
- Rivers cannot create unbridged unsafe entries.
- Vegetation cannot block required transition cells.
- Portals/ladders cannot land the player in unsafe terrain.

## 17.7 Tests

- Existing tests pass.
- New biome tests pass.
- New compatibility tests pass.
- New transition tests pass.
- New multi-seed safety sweeps pass.
- New vertical distribution tests pass.
- New portal/ladder safety tests pass.

---

## 18. Non-Goals

The following are not required unless naturally touched by the implementation:

- Full quest rewrite.
- Final minimap redesign.
- Final art pass for every sub-biome.
- Final balance for every animal spawn table.
- Final enemy distribution pass.
- Permanent chunk save/storage system.
- Full biome discovery UI.
- Final naming pass for every possible future biome.

However, the implementation should prepare the biome model so those future systems can use biome family, tags, climate, and variants cleanly.

---

## 19. Engineering Guidance

## 19.1 Prefer clean ownership

Avoid adding more special-case logic directly inside unrelated stages.

Preferred ownership:

```txt
BiomeMap:
  Decides biome identity.

Climate:
  Decides procedural climate.

BiomeCompatibility:
  Decides whether biomes can neighbor.

TransitionMap:
  Decides edge contracts.

ForestOperations:
  Renders forest terrain and forest transition contracts.

OceanOperations:
  Renders ocean terrain and ocean transition contracts.

CrossRoomFeatureOperations:
  Places barriers/rivers while respecting transition contracts.

StructureOperations:
  Places structures while respecting forbidden/reserved cells.

SafetyOperations:
  Validates final safety invariants.
```

## 19.2 Avoid hidden randomness

Do not make output depend on:

- Constructor order.
- Previous RNG calls.
- Whether neighboring rooms were generated first.
- Test order.
- Object allocation order.

Prefer:

```txt
hash(seedSalt, coordinate, featureSalt)
```

## 19.3 Make transitions boring and explicit

The terrain can be interesting. The transition contract should be predictable, centralized, and heavily tested.

Room edge safety is not a place for clever implicit behavior.

## 19.4 Do the right refactor

This work may require touching many files.

That is acceptable.

Do not limit the solution to:

```txt
src/world/biomes.ts
```

if the correct design requires new modules and generation pipeline changes.

Do not implement a partial MVP that leaves forest/ocean transitions as fragile special cases.

## 19.5 Keep the authored starter identity

The starter biome layout should remain familiar.

This project is not an excuse to randomize the opening world.

Randomness belongs in seeded features and procedural expansion, not in the starter biome identity.

---

## 20. Suggested Implementation Order

## Step 1: Add biome metadata

- Add `BiomeFamily`.
- Add `BiomeTag`.
- Add generation profiles.
- Add transition profiles.
- Migrate existing biome definitions.
- Add helper functions.

## Step 2: Split starter biome map from procedural biome map

- Create starter biome map module.
- Preserve current starter layout.
- Add starter radius constant.
- Add tests proving starter biome stability across seeds.

## Step 3: Implement climate and procedural region resolver

- Add climate sampling.
- Add altitude/depth adjustment.
- Add biome scoring.
- Add procedural region/site generation.
- Add deterministic biome lookup.
- Add tests for determinism and patch sizes.

## Step 4: Add compatibility rules

- Add climate classes.
- Add compatibility module.
- Add hot/cold restrictions.
- Add transition requirements.
- Add compatibility tests.

## Step 5: Add transition contract system

- Add canonical edge keys.
- Add edge contract resolver.
- Add passable/blocked runs.
- Add reservation cell helpers.
- Add fixture tests for transition types.

## Step 6: Refactor forest and ocean operations

- Forest renders forest contracts.
- Ocean renders shoreline/open-water/dock contracts.
- Remove independent edge guessing where possible.
- Add forest/ocean fixture tests.

## Step 7: Refactor barriers/rivers/structures/vegetation

- Pass reservations into relevant stages.
- Ensure each stage respects transition contracts.
- Replace hidden RNG salts with world identity salts where appropriate.
- Add tests for structure/river/barrier reservation safety.

## Step 8: Add broad safety sweeps

- Multi-seed.
- Multi-z.
- Broad generated areas.
- Edge passability.
- Five-tile run-up.
- Compatibility.
- Reproducibility.

## Step 9: Clean up and document

- Update comments.
- Remove obsolete coordinate-only assumptions.
- Ensure old tests pass.
- Ensure new tests are readable and maintainable.

---

## 21. Final Success Statement

The project is successful when the game has a stable authored starter biome layout, seed-varying structures and features, seeded procedural biome regions beyond the starter area, meaningful sub-biomes and biome families, climate-aware placement, altitude/depth variation, compatibility rules that prevent ugly hot/cold adjacency, and a shared transition contract system that makes room-to-room travel safe by construction.

The player should be able to explore indefinitely without the world feeling like infinite coordinate strips, without biomes appearing as random static, without hot and cold regions colliding nonsensically, and without ever crossing a natural room edge into an immediate wall, water tile, tree mass, hazard, or unfair death.
