# Implementation Plan: Jade Peak Province (翡翠の山脈)

## Overview

A new Japan-themed biome spanning a mountainous region with cherry blossom groves, ancient shrines, bamboo forests, and a distant snow-capped peak. Danger level: 4/10 (moderate, with skilled enemies).

---

## Phase 1: Core Biome Infrastructure

### 1.1 Add `BiomeId` and `BiomeDefinition` for `jade-peak-province`

**File:** `src/world/biomes.ts`

**Changes:**
- Add `'jade-peak-province'` to the `BiomeId` union type (line ~10)
- Add a new `BiomeDefinition` entry in the `BIOMES` record:
  - `id: 'jade-peak-province'`
  - `title: 'Jade Peak Province'` / `'翡翠の山脈'`
  - `temperature: 'Serene'` (no hazard in most areas) + `'Biting'` near peak
  - `dangerLevel: 4`
  - `temperatureHazard: null` (upper areas), `'cold'` near peak (handled via coordinate-dependent logic)
  - `temperatureRate: 0` normally, 1 at peak altitude
  - `hue: 345`, `saturation: 0.22`, `lightness: 0.22`
  - `accentColor: 0xf8a0c2` (soft cherry blossom pink)
  - `enemyFireBias: 0`, `enemyMoveBias: 1`
  - `animalSpawnChance: 0.18`
  - `animalSpawnBias: { koi: 5, crane: 3, tanuki: 3, fox: 2, kappa: 2, rabbit: 0, deer: 0, bird: 3, wolf: 0, bear: 0, snake: 0 }`

**Challenge:** The biome definition currently uses a single `temperatureHazard` value. For Jade Peak, we need conditional hazard based on vertical position within the biome. Two approaches:
- **Option A (preferred):** Add a `peakZThreshold?: number` field to `BiomeDefinition` that the cold hazard system checks, and a per-biome cold rate for the peak zone.
- **Option B:** Handle peak cold as a post-biome-resolution override in the cold hazard feature based on z-coordinate.

**Coordinate condition in `getBiomeForRoom()`:**
```
y >= -5 && y <= -8 && x >= -4 && x <= 2
```
This should be evaluated before the default `verdigris-basin` fallback, after checking for origin and before falling through.

**New `temperatureReliefs`:**
- `onsen` tiles (warm relief tiles, like 'warm' but visually distinct) placed in this biome
- An `Onsen` structure type replaces some temperature relief placements

**File:** `src/world/types.ts` -- Extend `RoomSnapshot.temperatureReliefs` to support `kind: 'onsen'`

---

### 1.2 Add New Room Archetypes

**File:** `src/world/generation/types.ts`

Add to `RoomArchetypeId` union:
```ts
| 'cherry-garden'
| 'bamboo-thicket'
| 'shrine-courtyard'
| 'onsen-village'
| 'mountain-pass'
| 'tatami-dojo'
```

**File:** `src/world/generation/stages/roomArchetypeOperations.ts`

**Archetype weights per biome zone:**

| Zone | Weights |
|------|---------|
| Upper jade-peak (y=-5 to -6) | cherry-garden (30), shrine-courtyard (10), classic (50), open-clearing (10) |
| Mid jade-peak (y=-7) | bamboo-thicket (25), shrine-courtyard (15), classic (40), choke-point (10), onsen-village (10) |
| Lower jade-peak (y=-8) | mountain-pass (15), tatami-dojo (10), bamboo-thicket (20), classic (35), choke-point (15), onsen-village (5) |

**Archetype operations to implement:**

- **`cherry-garden`**: Scatter pink petal tiles (`P`) on ground floor, place 1-2 stone lanterns (`L`), optional small pond (`~` tiles in a small cluster). No wall obstacles suppressed.
- **`bamboo-thicket`**: Place dense vertical bamboo wall rows (`B` tiles -- see 1.4 for new tile type). Create narrow corridors 2-3 tiles wide. Suppress random obstacles (like `ocean`/`dense-forest`).
- **`shrine-courtyard`**: Build a torii gate entrance shape using `T` tiles forming an arch, add a shrine building (solid block), an offering altar (`S` shimenawa rope tiles), and clean stone floor (`E` tiles for the courtyard area).
- **`onsen-village`**: Warm pool of `O` tiles, a wooden bathhouse block, surrounding walkable area. Safe zone with relaxed hazard rules.
- **`mountain-pass`**: Narrow choke-point room with snow/ice tiles (white/light-blue ground), wind hazard overlay. High difficulty.
- **`tatami-dojo`**: Structured symmetrical layout. Wall-sense mechanic: walls glow within normal wall-sense radius plus 2 extra. Symmetrical from center.

**Implementation pattern:** Each archetype gets a `case` in the `chooseArchetype` switch and a `private applyXxx(context)` method, following the existing `applyFourCorners` / `applyChokePoint` patterns.

---

### 1.3 Add New Tile Characters

**File:** `src/config/gameConfig.ts` or wherever tile character definitions live (grep for tile mappings)

| Tile | Character | Walkable | Breakable | Behavior |
|------|-----------|----------|-----------|----------|
| Cherry blossom petal | `P` | Yes | N/A | Decorative, walkable ground tile |
| Shimenawa rope | `S` | No | No (decorative) | Sacred boundary, non-walkable |
| Koi fish | `K` | Yes | N/A | Animal spawn tile (triggers spawn) |
| Bamboo wall | `B` | No | Yes (harder) | Thicker wall, requires extra hits or katana |
| Onsen water | `O` | Yes | N/A | Warm tile, reduces cold hazard exposure |

**Challenge:** The bamboo wall (`B`) is "thicker, harder to break through" -- this requires modifying the wall-breaking logic in the combat/interaction system. The existing system likely treats all `#` walls equally. We need:
- A new tile type `B` with `isBreakable: true, breakCost: 2` (vs. 1 for normal walls)
- The Katana item (Phase 4) provides a one-time `B` wall cut

The onsen tile `O` should apply a local "warm" effect to the player in this biome, reducing cold hazard ticks. The shimenawa rope `S` is purely decorative (non-walkable, like a wall, but visually distinct).

**File to check:** `src/config/palette.ts` -- Add new tile colors:
- `P` (cherry petal): `#f8d5e0` (soft pink)
- `S` (shimenawa): `#d4c5a9` (pale straw)
- `K` (koi): `#ff8c42` (orange koi)
- `B` (bamboo): `#3a7d44` (deep green, darker than normal wall)
- `O` (onsen): `#5bb8d4` (warm blue)

---

### 1.4 Biome-Specific Base Terrain

**File:** `src/world/generation/stages/` (find where `applyBiomeBaseTerrain` lives)

For the jade-peak biome, the base terrain fill should use:
- Default ground: `.` (normal walkable)
- Cherry garden archetype: `P` tiles scattered at ~8% density on walkable tiles
- Bamboo thicket archetype: `B` tiles forming dense vertical walls (handled in archetype)
- Mountain pass archetype: `.` replaced with `=` (ice/snow) tiles at ~40% density in non-corridor areas

---

## Phase 2: Structures

### 2.1 Shrine Structure

**New file:** `src/world/shrine.ts`

Following the pattern of `src/world/village.ts`, `src/world/questHouse.ts`, `src/world/goblinCamp.ts`, `src/world/snakeMcDonalds.ts`.

**Structure layout:**
- Torii gate entrance: `T` tile arch at room entrance (2 pillars + top beam)
- Main hall: solid block of `.` tiles (shrine building, non-walkable)
- Offering box (suzumi): `F` tile near entrance
- Shimenawa rope (decorative boundary): `S` tiles along sacred perimeter
- Clean stone floor: `E` tiles for courtyard area
- Shrine Maiden NPC: placed near offering box

**Placement function:** `tryPlaceShrine(layout, grid, rng, options)`

**Context field:** `RoomSnapshot.shrine?: { maiden: NpcProfile & { x; y }; hasBlessings: boolean }`

**File:** `src/world/types.ts` -- Add `shrine` field to `RoomSnapshot`

**Integration:**
- **File:** `src/world/generation/stages/structureOperations.ts` -- Add `shrine` chance (~8%) alongside existing structure types. In the `jade-peak-province` biome, increase to 12%.
- In `pickSettlementKind()`: add `'shrine'` option
- In `tryPlaceSettlementKind()`: add `case 'shrine'`
- The Shrine Maiden is a wandering NPC encounter that can also be placed as a static structure

---

### 2.2 Ramen Stand

**New file:** `src/world/ramenStand.ts`

A variant of the market stall -- smaller than a village, single-building.

**Structure layout:**
- Small wooden stand: `R` tile decoration
- Steaming bowl: `~` tiles (mini water pool at stand)
- Yokai-disguised-as-human chef NPC placed at stand

**Context field:** `RoomSnapshot.ramenStand?: { chef: NpcProfile & { x; y }; sellsRamen: boolean }`

**File:** `src/world/types.ts` -- Add `ramenStand` field to `RoomSnapshot`

**Integration:**
- **File:** `src/world/generation/stages/structureOperations.ts` -- Add `ramen-stand` chance (~4% per room, higher in jade-peak)
- The ramen stand sells the **ramen** and **senbei** items (see Phase 4)
- The chef NPC has unique dialogue (see Phase 5)

---

### 2.3 Koi Pond

**File:** `src/world/koiPond.ts` (or add as part of shrine/onsen structure)

**Structure layout:**
- Water tiles: `~` in an oval/round shape
- Koi fish tiles: `K` placed within the water
- Stone border: `L` (stone lantern) or `S` (shimenawa) around the edge

**Context field:** `RoomSnapshot.koiPond?: { center: Vector2Like; waterTiles: Vector2Like[] }`

**Integration:**
- **File:** `src/world/generation/stages/structureOperations.ts` -- Add koi pond placement (~5% chance in jade-peak, 2% elsewhere)
- The koi pond is a decoration + mechanic: eating a special **koi apple** from the pond grants a temporary "flow" state (see Phase 3)

---

### 2.4 Tengu Camp (Goblin Camp Replacement)

**File:** `src/world/tenguCamp.ts` (or modify `goblinCamp.ts` to be biome-aware)

**Approach:** Extend `goblinCamp.ts` to be biome-aware. In `jade-peak-province`, replace goblin camp generation with tengu camp.

**Tengu camp characteristics:**
- Red-and-black color palette (vs. typical goblin greens)
- Tengu "chieftain" as merchant NPC (taller, bird-like, more intimidating)
- Formal dialogue (vs. crude goblin banter)
- Sells unique Japan-themed items and cards
- Quest giver instead of guard goblins

**Integration:**
- **File:** `src/world/generation/stages/structureOperations.ts` -- In `pickSettlementKind()`, when biome === 'jade-peak-province', replace `'goblin-camp'` option with `'tengu-camp'`
- **File:** `src/world/types.ts` -- Add `tenguCamp?: { chieftain: NpcProfile & { x; y }; feathers: Vector2Like[] }` to RoomSnapshot

---

## Phase 3: Apples & Items

### 3.1 New Apple Behaviors

**New files:**
- `src/apples/behaviors/mochiApple.ts`
- `src/apples/behaviors/wasabiApple.ts`
- `src/apples/behaviors/yuzuApple.ts`
- `src/apples/behaviors/koiApple.ts` (special pond apple)

**File:** `src/apples/appleRegistry.ts` -- Register new apple types

**Apple behavior implementations (extending `AppleInstance` from `src/apples/types.ts`):**

#### Mochi Apple
- `typeId: 'mochi'`
- Color: `#f5d5e8` (soft pink-white)
- `onConsume()` returns `{ growth: 1, bonusScore: 0 }`
- **Effect:** Makes the snake temporarily wider (visual + collision) for 5 seconds. Wider = easier to eat apples but harder to avoid walls/self.
- **Implementation:** Set a `snake.wide = true` flag with a 5-second timeout. Affects collision detection in the snake scene.

#### Wasabi Apple
- `typeId: 'wasabi'`
- Color: `#9acd32` (bright green)
- `onConsume()` returns `{ growth: 1, bonusScore: 0 }`
- **Effect:** Burns enemies in a 5-tile radius, dealing damage to all adjacent enemies. The snake takes small damage (1 HP) over 3 ticks.
- **Implementation:** On consume, find all enemies within 5 tiles of the apple's position and deal damage. Apply a `wasabiPoison` status to the snake (1 tick of damage for 3 ticks).

#### Yuzu Apple
- `typeId: 'yuzu'`
- Color: `#f0e68c` (lemon yellow)
- `onConsume()` returns `{ growth: 1, bonusScore: 0 }`
- **Effect:** Reveals all walls within a 5-tile radius (wall-sense boost) for 8 seconds. Also gives a speed boost for 4 seconds.
- **Implementation:** Temporarily boost wall-sense and apply a 4-second speed buff.

#### Koi Apple (Special Pond Apple)
- `typeId: 'koi'`
- Color: `#ff6b35` (vibrant koi orange)
- Only spawns in koi ponds (requires koi pond structure)
- **Effect:** Grants a "flow" state: faster turning speed and no self-collision for 6 seconds. Essentially a temporary "ghost" mode that only ignores self-collision (not wall collision).
- **Implementation:** Set `snake.flowMode = true` for 6 seconds. Override self-collision check while in flow mode.

#### Umbrella Apple (Amacha) -- Special Event Apple
- `typeId: 'amacha'`
- Color: `#8b4513` (brown, like an umbrella)
- **Effect:** Summons a random tanuki NPC who offers a quest or trades for score. One-time event per consumption.
- **Implementation:** On consume, trigger a tanuki NPC encounter immediately (bypass normal encounter system).

---

### 3.2 New Items

**File:** `src/inventory/items.ts` (or wherever the item definitions live -- grep for existing items)

#### Ofuda (Warding Talisman)
- `id: 'ofuda'`
- `name: 'Ofuda'`
- `kind: 'consumable'`
- `description: 'A paper talisman that negates one death. Stackable. Like a phoenix charge but single-use.'`
- **Effect:** On consumption, sets a one-time death negation flag. Stackable (up to 5).

#### Katana
- `id: 'katana'`
- `name: 'Katana'`
- `kind: 'equipment'`
- `slot: 'weapon'`
- `description: 'A blade that grants a one-time wall-smite ability. Cut through one wall segment.'`
- `modifiers: { gunEnabled: true }` (or add a `wallSmiteEnabled?: boolean` modifier)
- **Effect:** One-time use: destroys the nearest wall in the snake's current direction. After use, the item is removed.

#### Geta (Wooden Sandals)
- `id: 'geta'`
- `name: 'Geta'`
- `kind: 'equipment'`
- `slot: 'boots'`
- `description: 'Traditional wooden sandals. Cosmetic, but grants +1 movement speed on bamboo tiles.'`
- `modifiers: { tickDelayScalar: 0.97 }` (subtle speed boost)

#### Furoshiki (Wrapping Cloth)
- `id: 'furoshiki'`
- `name: 'Furoshiki'`
- `kind: 'equipment'`
- `slot: 'cloak'`
- `description: 'A wrapping cloth that temporarily stores one collected apple for later consumption.'`
- **Effect:** Adds a "hold" slot: when an apple is eaten, it can be stored instead of consumed. Can be activated later to eat the stored apple.
- **Implementation:** Add a `heldApple?: AppleSnapshot` field to the inventory system or snake state.

#### Senbei (Rice Cracker)
- `id: 'senbei'`
- `name: 'Senbei'`
- `kind: 'consumable'`
- `description: 'A cheap rice cracker from the ramen stand. Fills some hunger.'`
- **Effect:** Fills hunger for a small amount (cheaper than meat/fish). Sold at ramen stands.

#### Ramen
- `id: 'ramen'`
- `name: 'Ramen'`
- `kind: 'consumable'`
- `description: 'A steaming bowl of ramen. Fills hunger completely and gives a small speed boost.'`
- **Effect:** Fully resets hunger timer, plus a 10-second speed boost. Sold at ramen stands.

**File:** `src/inventory/item.ts` -- May need to extend `EquipableItem.modifiers` with new fields:
- `wallSmiteEnabled?: boolean` (for katana)
- `heldApple?: unknown` (for furoshiki -- may need a separate system)
- `deathNegation?: number` (for ofuda -- could be tracked in inventory count)

---

## Phase 4: NPCs & Encounters

### 4.1 New Wanderer Encounters

**File:** `src/npcs/encounters.ts`

Add to `WANDERER_ENCOUNTERS` array:

#### Shrine Maiden (Miko)
```ts
{
  id: 'shrine-maiden-miko',
  name: 'Shrine Maiden Miko',
  kind: 'flavor',
  weight: 1.2,
  minRoomsVisited: 2,
  zoneTags: ['upper', 'surface'],
  biomeIds: ['jade-peak-province'],
  portraitId: 'sage-1',
  pages: [
    'A young woman in white and crimson robes stands before a torii gate, her expression serene as mountain mist.',
    '"The kami watch over those who approach with respect. Will you leave an offering at the shrine?"',
    // ... offers blessings in exchange for apples or score
  ],
  repeatPages: [
    'Miko bows gracefully. The paper lanterns flicker in a wind that does not touch her.',
  ],
  acceptLabel: 'Leave offering',
  rejectLabel: 'Bow and depart',
}
```

#### Yokai Chef
```ts
{
  id: 'yokai-chef',
  name: 'The Ramen Master',
  kind: 'flavor',
  weight: 0.9,
  minRoomsVisited: 3,
  zoneTags: ['upper', 'east'],
  biomeIds: ['jade-peak-province'],
  portraitId: 'sage-2',
  pages: [
    'Behind a modest wooden stand, a chef stirs a steaming pot with fierce concentration. A faint smoke scent lingers -- perhaps imagination.',
    '"Welcome, welcome! The best broth in all the provinces. Or the dimension. However many there are." *burps smoke*',
    // ... quirky dialogue, constantly slipping up about being a yokai
  ],
  acceptLabel: 'Order ramen',
  rejectLabel: 'Just looking',
}
```

#### Kappa
```ts
{
  id: 'kappa-duel',
  name: 'Kappa of the Mountain Stream',
  kind: 'duel',
  weight: 0.7,
  minRoomsVisited: 4,
  zoneTags: ['upper', 'surface'],
  biomeIds: ['jade-peak-province'],
  portraitId: 'sage-3',
  pages: [
    'A small reptilian creature with a dish of water on its head stands before a koi pond, arms crossed and scowl in place.',
    '"Hmph. You want to pass? Fine. Duel me -- or bring me something I truly want. Cucumber. Not that I care. It is just... refreshing."',
    // ... can duel or trade cucumber
  ],
  acceptLabel: 'Duel',
  rejectLabel: 'Bring cucumber',
  questId: 'kappa-challenge',
}
```

#### Tanuki
```ts
{
  id: 'tanuki-shenanigans',
  name: 'Tanuki the Trickster',
  kind: 'quest',
  weight: 0.6,
  minRoomsVisited: 3,
  zoneTags: ['upper', 'lower'],
  biomeIds: ['jade-peak-province'],
  portraitId: 'sage-1',
  pages: [
    'A plump raccoon dog wearing a tiny hat materializes from behind a bamboo stalk, grinning with the kind of confidence only a creature known for illusions possesses.',
    '"Oho! Fortune favors the curious! Help me with a little task, and the heavens shall reward you! Or I will. Whichever comes first."',
    // ... shenanigan quest with variable rewards
  ],
  acceptLabel: 'Accept trickery',
  rejectLabel: 'Hesitate',
  questId: 'tanukis-shenanigans',
}
```

#### Ronin Wanderer
```ts
{
  id: 'ronin-wanderer',
  name: 'The Ronin',
  kind: 'duel',
  weight: 0.5,
  minRoomsVisited: 5,
  zoneTags: ['upper', 'east'],
  biomeIds: ['jade-peak-province'],
  portraitId: 'sage-2',
  pages: [
    'A wandering samurai stands motionless at a mountain pass, sword sheathed but presence sharp as a drawn blade.',
    '"I do not seek glory. I seek clarity. Prove your worth, and I shall share what I have learned."',
    // ... if defeated, drops katana blueprint; if player loses, lose score
  ],
  acceptLabel: 'Draw steel',
  rejectLabel: 'Pass quietly',
}
```

#### Tengu (Rare Encounter)
```ts
{
  id: 'tengu-encounter',
  name: 'Tengu of the Mountain',
  kind: 'flavor',
  weight: 0.15,
  minRoomsVisited: 6,
  zoneTags: ['upper', 'surface'],
  biomeIds: ['jade-peak-province'],
  portraitId: 'sage-3',
  pages: [
    'A towering bird-like spirit perches on a cliff edge, wings folded, eyes piercing. The air grows still around it.',
    '"Mortals who bring offerings to the mountain are granted favors. Bring me a cherry blossom branch, and I shall let you soar."',
    // ... grants temporary flight buff for 10 seconds if player brings cherry blossom branch
  ],
  acceptLabel: 'Offer branch',
  rejectLabel: 'Leave respectfully',
}
```

**Integration:**
- Add `jade-peak-province` to biomeId arrays for existing encounters that should appear here
- These encounters use the existing `biomeIds` filtering (already supported in `chooseWandererEncounter`)
- The `Kappa` encounter references a new quest ID (`kappa-challenge`)
- The `Tanuki` encounter references a new quest ID (`tanukis-shenanigans`)

---

## Phase 5: Quests

### 5.1 New Quest Definitions

**New files in `src/quests/definitions/`:**

#### The Shrine Maiden's Request
**File:** `src/quests/definitions/shrineMaidensRequest.ts`
```ts
class ShrineMaidensRequest extends Quest {
  constructor() {
    super('shrine-maidens-request', 'The Shrine Maiden\'s Request', 'Deliver 10 apples to the shrine maiden.');
  }

  override baselineKeys(): readonly string[] {
    return ['shrineOfferings'];
  }

  override isCompleted(runtime): boolean {
    return this.progressSinceAccept(runtime, 'shrineOfferings') >= 10;
  }

  override onReward(runtime): void {
    runtime.addScore(50);
    runtime.addItem('ofuda', 2);
    // Grant shrine blessing: temporary wall-sense boost (applied as a flag)
    runtime.setFlag('blessing.wallSense', (runtime.getFlag<number>('blessing.wallSense') ?? 0) + 2);
  }
}
```

#### Tanuki's Shenanigans
**File:** `src/quests/definitions/tanukisShenanigans.ts`
```ts
class TanukisShenanigans extends Quest {
  constructor() {
    super('tanukis-shenanigans', "Tanuki's Shenanigans", 'Find the mischievous tanuki hiding in the bamboo grove.');
  }

  override isCompleted(runtime): boolean {
    return runtime.getFlag<boolean>('tanuki.found') ?? false;
  }

  override onReward(runtime): void {
    runtime.addItem('furoshiki', 1);
    runtime.addScore(30);
  }
}
```

#### Kappa's Challenge
**File:** `src/quests/definitions/kappasChallenge.ts`
```ts
class KappasChallenge extends Quest {
  constructor() {
    super('kappas-challenge', "Kappa's Challenge", 'Defeat the kappa or bring him a cucumber at the mountain pass.');
  }

  override isCompleted(runtime): boolean {
    return runtime.getFlag<boolean>('kappa.defeated') ?? false;
  }

  override onReward(runtime): void {
    runtime.addCardToCollection?.('kappa-card', 1); // New card (Phase 6)
    runtime.addCardToCollection?.('katana-blueprint', 1); // Blueprint for katana
  }
}
```

#### Seven Dragon Temples
**File:** `src/quests/definitions/sevenDragonTemples.ts`
```ts
class SevenDragonTemples extends Quest {
  constructor() {
    super('seven-dragon-temples', 'Seven Dragon Temples', 'Find 7 hidden shrine rooms scattered across the biome.');
  }

  override baselineKeys(): readonly string[] {
    return ['templesFound'];
  }

  override isCompleted(runtime): boolean {
    return this.progressSinceAccept(runtime, 'templesFound') >= 7;
  }

  override onReward(runtime): void {
    runtime.addScore(100);
    runtime.addCosmeticReward('hat', 'dragon-helm');
    // Permanent speed upgrade
    runtime.setFlag('permanents.speedBonus', 1);
  }
}
```

#### Ramen Recipe Hunt
**File:** `src/quests/definitions/ramenRecipeHunt.ts`
```ts
class RamenRecipeHunt extends Quest {
  constructor() {
    super('ramen-recipe-hunt', 'Ramen Recipe Hunt', 'Collect 3 rare ingredients from different biome areas.');
  }

  override baselineKeys(): readonly string[] {
    return 'ramenIngredientsCollected';
  }

  override isCompleted(runtime): boolean {
    return this.progressSinceAccept(runtime, 'ramenIngredientsCollected') >= 3;
  }

  override onReward(runtime): void {
    runtime.addScore(75);
    runtime.setFlag('permanents.hungerResistance', 1);
    runtime.addCosmeticReward('hat', 'master-broth');
  }
}
```

**Quest flag conventions used:**
- `shrineOfferings` -- incremented each time an apple is given to the shrine maiden NPC
- `tanuki.found` -- set when the tanuki encounter is accepted/accepted
- `kappa.defeated` -- set when the kappa is defeated in duel or traded
- `templesFound` -- incremented each time a hidden shrine room is discovered
- `ramenIngredientsCollected` -- incremented each rare ingredient collected

---

## Phase 6: Cards

### 6.1 New Card Definitions

**File:** `src/cards/cardGame.ts`

Add new `CardId` values:
```ts
| 'oni-card'
| 'kitsune-card'
| 'samurai-card'
| 'jizo-card'
| 'raiju-card'
| 'kappa-card'
| 'katana-blueprint'
```

Add new suit: `'jade'` (or reuse existing suits -- consider adding a 6th suit for Japan-themed cards)

**Card definitions:**

#### Oni Card
```ts
{
  id: 'oni-card',
  name: 'Oni Card',
  suit: 'jade',
  chips: 5,
  price: 10,
  rarity: 'uncommon',
  description: 'Summons a temporary enemy that attacks other enemies. Friendly chaos.',
}
```

#### Kitsune Card
```ts
{
  id: 'kitsune-card',
  name: 'Kitsune Card',
  suit: 'jade',
  chips: 4,
  price: 8,
  rarity: 'common',
  description: 'Creates 3 illusory snakes that distract nearby enemies for 5 seconds.',
}
```

#### Samurai Card
```ts
{
  id: 'samurai-card',
  name: 'Samurai Card',
  suit: 'jade',
  chips: 10,
  price: 18,
  rarity: 'rare',
  description: 'Instantly kills one enemy on the board.',
}
```

#### Jizo Card
```ts
{
  id: 'jizo-card',
  name: 'Jizo Card',
  suit: 'jade',
  chips: 6,
  price: 12,
  rarity: 'uncommon',
  description: 'Places a stone statue that blocks enemy movement in a 3-tile radius for 8 seconds.',
}
```

#### Raiju Card
```ts
{
  id: 'raiju-card',
  name: 'Raiju Card',
  suit: 'jade',
  chips: 8,
  price: 15,
  rarity: 'rare',
  description: 'Lightning strike that damages all enemies in a line.',
}
```

#### Kappa Card (Quest Reward)
```ts
{
  id: 'kappa-card',
  name: 'Kappa Card',
  suit: 'jade',
  chips: 7,
  price: 14,
  rarity: 'rare',
  description: 'Summons a kappa ally that fights for 10 seconds.',
}
```

#### Katana Blueprint (Quest Reward)
```ts
{
  id: 'katana-blueprint',
  name: 'Katana Blueprint',
  suit: 'jade',
  chips: 3,
  price: 6,
  rarity: 'uncommon',
  description: 'A schematic. Craft a katana at the right forge.',
}
```

**Integration:**
- Add new cards to `CARD_SHOP_OFFERS` (onsen village shop)
- The `jade` suit needs special scoring logic in `scoreCardHand()` for cards with unique behaviors (Oni, Kitsune, Samurai, Jizo, Raiju)

---

## Phase 7: Religion Choice -- Add "Kami" Option

### 7.1 New Religion: Kami

**File:** `src/features/definitions/religionChoice.ts`

Add to the `RELIGIONS` array:

```ts
{
  id: 'kami',
  name: 'Kami Worship',
  description: 'Gameplay bonuses: periodic shrine blessings, yokai insight, and passive spiritual length growth.',
  mods: {
    shrineBlessing: true,
    yokaiInsight: true,
    spiritualLength: true, // Custom mod field
  },
},
```

**File:** `src/inventory/item.ts` -- Extend `EquipableItem.modifiers`:
```ts
shrineBlessing?: boolean;
yokaiInsight?: boolean;
spiritualLength?: boolean;
```

**Shrine Blessing effect:** Periodically grants a random small buff (speed +2 seconds, wall-sense +1 for 10 ticks, hunger resistance +5 ticks). Implemented as a periodic timer in a new feature `src/features/definitions/kamiBlessing.ts`.

**Yokai Insight effect:** When encountering NPCs, displays additional dialogue lines revealing yokai disguises. Implemented in `src/npcs/encounters.ts` -- check for `yokaiInsight` mod and append yokai-reveal text.

**Spiritual Length effect:** Gains +1 length every 30 seconds passively. Similar to the Hermit background but with different tradeoffs.

**Tradeoffs (documented, not mechanically enforced):**
- Lower base wall-sense (no +1 from scout equivalent)
- No starting invulnerability bonus (no +1 from noble equivalent)

---

## Phase 8: I18n & UI

### 8.1 Internationalization

**Files:** `src/i18n/languages/en.ts`, `src/i18n/languages/es.ts` (or wherever language files live)

**Add translation keys:**

English (`en.ts`):
```ts
// Biome
'jade-peak-province.title': 'Jade Peak Province',
'jade-peak-province.danger': 'Danger: {level}',
'jade-peak-province.temperature': 'Temperature: {temp}',

// Apple types
'apple.mochi.name': 'Mochi Apple',
'apple.mochi.description': 'Soft and squishy. Makes the snake temporarily wider.',
'apple.wasabi.name': 'Wasabi Apple',
'apple.wasabi.description': 'Spicy! Burns nearby enemies but damages you.',
'apple.yuzu.name': 'Yuzu Apple',
'apple.yuzu.description': 'Citrus burst. Reveals walls and grants speed.',
'apple.koi.name': 'Koi Apple',
'apple.koi.description': 'From the pond. Grants a temporary flow state.',
'apple.amacha.name': 'Umbrella Apple (Amacha)',
'apple.amacha.description': 'Summons a tanuki NPC for a quest or trade.',

// Items
'item.ofuda.name': 'Ofuda',
'item.ofuda.description': 'A warding talisman. Negates one death.',
'item.katana.name': 'Katana',
'item.katana.description': 'A blade that cuts through one wall segment.',
'item.geta.name': 'Geta (Wooden Sandals)',
'item.geta.description': 'Traditional footwear. +1 speed on bamboo tiles.',
'item.furoshiki.name': 'Furoshiki',
'item.furoshiki.description': 'Wrapping cloth. Stores one apple for later.',
'item.senbei.name': 'Senbei',
'item.senbei.description': 'Rice cracker. Fills some hunger.',
'item.ramen.name': 'Ramen',
'item.ramen.description': 'Steaming bowl. Fills hunger completely with a speed boost.',

// Quests
'quest.shrine-maidens-request.title': 'The Shrine Maiden\'s Request',
'quest.shrine-maidens-request.description': 'Deliver 10 apples to the shrine maiden.',
'quest.tanukis-shenanigans.title': "Tanuki's Shenanigans",
'quest.tanukis-shenanigans.description': 'Find the mischievous tanuki in the bamboo grove.',
'quest.kappas-challenge.title': "Kappa's Challenge",
'quest.kappas-challenge.description': 'Defeat the kappa or bring him a cucumber.',
'quest.seven-dragon-temples.title': 'Seven Dragon Temples',
'quest.seven-dragon-temples.description': 'Find 7 hidden shrine rooms across the biome.',
'quest.ramen-recipe-hunt.title': 'Ramen Recipe Hunt',
'quest.ramen-recipe-hunt.description': 'Collect 3 rare ingredients for the master chef.',

// Cards
'card.oni.name': 'Oni Card',
'card.kitsune.name': 'Kitsune Card',
'card.samurai.name': 'Samurai Card',
'card.jizo.name': 'Jizo Card',
'card.raiju.name': 'Raiju Card',
'card.kappa.name': 'Kappa Card',
'card.katana-blueprint.name': 'Katana Blueprint',

// Religion
'religion.kami.name': 'Kami Worship',
'religion.kami.description': 'Periodic shrine blessings, yokai insight, passive length growth.',
```

Spanish (`es.ts`): -- translate all of the above

### 8.2 Palette Additions

**File:** `src/config/palette.ts`

Add tile color definitions:
```ts
tiles: {
  ...existing...,
  P: 0xf8d5e0,  // cherry blossom petal -- soft pink
  S: 0xd4c5a9,  // shimenawa rope -- pale straw
  K: 0xff8c42,  // koi fish -- orange
  B: 0x3a7d44,  // bamboo wall -- deep green
  O: 0x5bb8d4,  // onsen water -- warm blue
  R: 0x8b5e3c,  // ramen stand -- wooden brown
  F: 0x6b4c3b,  // offering box -- dark wood
  E: 0xe8e0d4,  // clean stone floor -- light gray
}
```

### 8.3 New Cosmetics

**File:** `src/ui/spriteRecipes/` (or wherever cosmetics are defined)

Add cosmetic hats:
- `dragon-helm` -- a dragon-shaped helmet (from Seven Dragon Temples quest)
- `master-broth` -- a chef's hat with steam effect (from Ramen Recipe Hunt quest)

---

## Phase 9: World Grid Integration

### 9.1 Coordinate Mapping

**File:** `src/world/biomes.ts` -- Update `getBiomeForRoom()`:

Add the jade-peak-province coordinate condition BEFORE the default fallback:
```ts
// Jade Peak Province: mountainous region
if (y >= -8 && y <= -5 && x >= -4 && x <= 2) {
  return BIOMES['jade-peak-province'];
}
```

This sits after the existing biome checks (home-hearth, sable-depths, sunken-ocean, elderwood-maze, moonlit-parish, ember-waste, gloam-garden) and before the `verdigris-basin` default.

### 9.2 Cold Hazard at Peak

The biome spans y=-5 to y=-8. The "peak" zone (coldest area) should be at the highest elevation (z-axis), not the y-axis. Consider:
- At z <= -2 within the jade-peak region, the cold hazard activates
- This is handled in `createBiomePalette()` or a separate cold hazard system

### 9.3 Settlement Anchors

**File:** `src/world/generation/stages/structureOperations.ts`

The settlement anchor system (`isSettlementAnchor`) uses a hash-based spacing pattern. In the jade-peak biome:
- Increase shrine placement probability from 8% to 12%
- Add ramen stand placement chance (~4%)
- Add koi pond placement chance (~5%)
- Replace goblin camp with tengu camp

---

## Implementation Priority & Dependencies

### Sprint 1: Foundation (Core biome + tiles)
1. Add `jade-peak-province` biome definition
2. Add coordinate mapping in `getBiomeForRoom()`
3. Add new tile characters (P, S, K, B, O, R, F, E)
4. Add tile colors to palette
5. Add 'onsen' to temperatureReliefs kinds

### Sprint 2: Generation (Archetypes + structures)
6. Add 6 new room archetypes to types
7. Implement archetype placement operations
8. Build shrine structure (`shrine.ts`)
9. Build ramen stand structure (`ramenStand.ts`)
10. Build koi pond placement
11. Modify goblin camp to tengu camp in jade-peak biome

### Sprint 3: Apples + Items
12. Implement 5 new apple behaviors
13. Register apple types in registry
14. Define all new items in items system
15. Implement furoshiki held-apple mechanic
16. Implement katana wall-smite

### Sprint 4: NPCs + Quests
17. Add 6 new wanderer encounters
18. Add 5 new quest definitions
19. Add kappa-dish (cucumber) as consumable item (bonus)

### Sprint 5: Cards + Religion
20. Add 8 new cards
21. Add jade suit scoring logic
22. Add Kami religion option
23. Implement shrine blessing periodic feature
24. Implement yokai insight dialogue feature
25. Implement spiritual length passive growth

### Sprint 6: Polish + I18n
26. Add all i18n keys (en + es)
27. Add cosmetic hats (dragon-helm, master-broth)
28. Balance testing
29. Visual polish (palette, sprite effects)

---

## Files Summary

### New Files (14):
| File | Purpose |
|------|---------|
| `src/world/shrine.ts` | Shrine structure placement |
| `src/world/ramenStand.ts` | Ramen stand structure placement |
| `src/world/koiPond.ts` | Koi pond structure placement |
| `src/world/tenguCamp.ts` | Tengu camp (goblin camp replacement) |
| `src/apples/behaviors/mochiApple.ts` | Mochi apple behavior |
| `src/apples/behaviors/wasabiApple.ts` | Wasabi apple behavior |
| `src/apples/behaviors/yuzuApple.ts` | Yuzu apple behavior |
| `src/apples/behaviors/koiApple.ts` | Koi apple behavior |
| `src/apples/behaviors/amachaApple.ts` | Umbrella/apple behavior |
| `src/quests/definitions/shrineMaidensRequest.ts` | Quest: deliver 10 apples |
| `src/quests/definitions/tanukisShenanigans.ts` | Quest: find tanuki |
| `src/quests/definitions/kappasChallenge.ts` | Quest: kappa duel/trade |
| `src/quests/definitions/sevenDragonTemples.ts` | Quest: explore 7 shrines |
| `src/quests/definitions/ramenRecipeHunt.ts` | Quest: collect 3 ingredients |
| `src/features/definitions/kamiBlessing.ts` | Kami religion blessing feature |

### Modified Files (11):
| File | Changes |
|------|---------|
| `src/world/biomes.ts` | Add jade-peak-province biome + coordinate mapping |
| `src/world/types.ts` | Add shrine, ramenStand, koiPond, tenguCamp, onsen to RoomSnapshot |
| `src/world/generation/types.ts` | Add 6 new RoomArchetypeId values |
| `src/world/generation/stages/roomArchetypeOperations.ts` | Implement 6 new archetype operations |
| `src/world/generation/stages/structureOperations.ts` | Add shrine/ramen/onsen/tengu structure placement |
| `src/apples/appleRegistry.ts` | Register 5 new apple types |
| `src/inventory/item.ts` | Extend modifiers (wallSmite, shrineBlessing, yokaiInsight, spiritualLength) |
| `src/inventory/items.ts` | Define ofuda, katana, geta, furoshiki, senbei, ramen |
| `src/npcs/encounters.ts` | Add 6 new wanderer encounters |
| `src/cards/cardGame.ts` | Add 8 new cards + jade suit scoring |
| `src/features/definitions/religionChoice.ts` | Add Kami religion option |
| `src/config/palette.ts` | Add tile color definitions |
| `src/i18n/languages/en.ts` | Add all English translation keys |
| `src/i18n/languages/es.ts` | Add all Spanish translation keys |

---

## Risk & Complexity Notes

1. **Bamboo wall (`B`) breakability**: Requires modifying the wall-breaking system to support tiered wall health. Moderate complexity.
2. **Furoshiki held-apple mechanic**: Requires a new state slot in the inventory/snake system for holding an apple. Moderate complexity.
3. **Kami religion periodic blessing**: Requires a new timer-based feature that cycles through buffs. Low-moderate complexity.
4. **Wasabi apple AoE damage**: Requires accessing the enemy system from the apple consumption context. Moderate complexity.
5. **Koi apple flow state**: Requires overriding the self-collision check in the snake movement system. Low-moderate complexity.
6. **Tengu camp biome replacement**: Straightforward conditional logic in structure placement. Low complexity.
7. **Yokai insight dialogue**: Requires checking player mods and appending extra dialogue pages. Low complexity.
8. **Spiritual length passive growth**: Similar to Hermit background. Low complexity (reuse pattern).
