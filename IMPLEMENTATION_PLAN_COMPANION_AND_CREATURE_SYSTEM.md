# Companion & Creature System — Junior Engineer Implementation Plan

> "A snake is only as strong as the creatures at its side."

## Overview for Engineers

This plan breaks the Companion & Creature System into **6 sequential phases**. Each phase is self-contained and must pass `npm run typecheck`, `npm run build`, and `npm run dev` before the next phase begins.

**Key principle:** The companion system is self-contained. `CompanionService` exposes a clean interface. `SnakeScene` consumes it. Nothing in the companion system reaches into unrelated systems directly.

**Existing code to be aware of (not modified unless noted):**
- `src/systems/snakeState.ts` — companion state stored in `flags` namespace (`companions.*`)
- `src/game/saveManager.ts` — save/load hooks for companion snapshot
- `src/inventory/inventory.ts` — item consumption for feeding/taming
- `src/inventory/itemRegistry.ts` — new food items + equipment modifiers
- `src/quests/quest.ts` + `src/quests/questRegistry.ts` — creature quests
- `src/quests/questController.ts` — `QuestRuntime` extension methods
- `src/ui/juice.ts` — new sound effects
- `src/ui/runtimeSpriteFactory.ts` — creature sprite recipes
- `src/ui/skillTreeOverlay.ts` — compendium overlay pattern
- `src/ui/questPopup.ts` — encounter popup pattern
- `src/ui/questHud.ts` — companion HUD pattern
- `src/world/biomes.ts` — spawn table biome references
- `src/actors/actorTypes.ts` — creatures as `kind: 'animal'`, `role: 'pet'`

---

## Phase 1: Core Foundation

**Goal:** Basic creature definitions, spawning, taming, and following.
**Estimated effort:** 2 weeks
**Files to create:** 8
**Files to modify:** 4

### 1.1 Create Type Definitions

**File:** `src/companions/companionTypes.ts`

This is the single source of truth for all companion types. Define every interface and type used across the system.

**Must define:**

```typescript
// Companion category
export type CompanionKind = 'follower' | 'protector' | 'scout' | 'forager' | 'fighter' | 'mount';

// Rarity tiers
export type CompanionRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

// Trait IDs
export type CompanionTraitId =
  | 'fireResistance' | 'coldResistance' | 'movementSpeed' | 'wallSenseRadius'
  | 'appleScoreBonus' | 'appleSpawnBonus' | 'waterSafe' | 'damageMitigation'
  | 'bulletDodgeChance' | 'bossPullReduction' | 'shopDiscount' | 'mapReveal'
  | 'hazardDetection' | 'cooldownReduction' | 'companionDamageBonus';

// Trait definition
export interface CompanionTrait {
  traitId: CompanionTraitId;
  value: number;
  description: string;
}

// Active ability
export interface CompanionAbility {
  abilityId: string;
  name: string;
  description: string;
  requiresBondLevel: number;
  cooldownRooms: number;
  cooldownTicks?: number;
  effect: 'heal' | 'shield' | 'dash' | 'reveal' | 'buff' | 'attack' | 'summon' | 'mount';
  parameters: Record<string, number>;
  soundEffectId?: string;
}

// Taming cost
export interface TameCost {
  foodItems: Array<{ itemId: string; count: number }>;
  minimumBondLevel: number;
  conditions?: {
    requiredQuestCompleted?: string;
    minRoomsVisited?: number;
    requiresReligion?: string;
    onlyAtNight?: boolean;
    onlyInBiome?: string;
    onlyDuringEvent?: string;
  };
}

// Spawn table entry
export interface SpawnTableEntry {
  biomeId: string;
  roomCondition: 'any' | 'structure' | 'dangerous' | 'water';
  minRoomsVisited: number;
  baseWeight: number;
  scoreWeight?: number;
  timeOfDayBias?: 'day' | 'night' | 'any';
  eventBias?: string;
}

// Main definition
export interface CompanionDefinition {
  id: string;
  name: string;
  species: string;
  kind: CompanionKind;
  rarity: CompanionRarity;
  portraitId: string;
  spriteRecipeId: string;
  size: number;
  followOffset: { x: number; y: number };
  maxBonds: number;
  traits: CompanionTrait[];
  abilities: CompanionAbility[];
  spawnTable: SpawnTableEntry[];
  tameCost: TameCost;
  description: string;
  lore?: string;
  minRoomsVisited?: number;
}

// Runtime instance state
export interface CompanionInstance {
  id: string;
  definitionId: string;
  bondLevel: number;       // 1-5
  bondProgress: number;    // 0-100 within current level
  currentRoomId: string;
  gridX: number;
  gridY: number;
  lastFedRoom: number;
  feedCountThisDay: number;
  lastInteractionRoom: number;
  abilitiesUsed: Map<string, number>;  // abilityId -> lastUsedRoom
  totalApplesEatenTogether: number;
  totalDangersSurvived: number;
  mood: 'happy' | 'neutral' | 'sad' | 'excited' | 'protective';
  flags: Record<string, unknown>;
}

// Render data
export interface CompanionRenderData {
  companionId: string;
  sprite: Phaser.GameObjects.Sprite;
  gridX: number;
  gridY: number;
  targetX: number;
  targetY: number;
  followIndex: number;
  mood: CompanionInstance['mood'];
  isMount: boolean;
}

// Save data
export interface CompanionSaveData {
  version: number;
  instances: Record<string, CompanionInstance>;
  compendium: CompendiumSaveData;
  settings: {
    mountAutoEnabled: boolean;
    followerLimit: number;
  };
}

export interface CompendiumSaveData {
  discovered: string[];
  maxBondReached: Record<string, number>;
  totalEncounters: Record<string, number>;
  totalBred: number;
}

// Taming/feeding/ability result types
export interface TameResult {
  success: boolean;
  companionId: string;
  message: string;
  failedReason?: 'insufficientFood' | 'bondTooLow' | 'conditionsNotMet' | 'tamingFailed';
  nextEncounterRoom?: number;
}

export interface FeedResult {
  success: boolean;
  bondGain: number;
  feedsRemainingToday: number;
  message: string;
  failedReason?: 'noFood' | 'dailyLimitReached' | 'notPreferred' | 'companionNotFound';
}

export interface AbilityResult {
  success: boolean;
  abilityId: string;
  cooldownRemaining?: number;
  message: string;
  failedReason?: 'onCooldown' | 'bondTooLow' | 'companionNotFound' | 'invalidAbility';
}

// Compendium entry for UI
export interface CompendiumEntry {
  companionId: string;
  discovered: boolean;
  tamed: boolean;
  bondLevel?: number;
  definition: CompanionDefinition;
  maxBondReached?: number;
  totalEncounters: number;
}
```

**Assignment:** Engineer A
**Checklist:**
- [ ] All interfaces compile with no errors
- [ ] `CompanionKind` has exactly 6 values
- [ ] `CompanionRarity` has exactly 5 values
- [ ] All effect types for `CompanionAbility.effect` are represented
- [ ] `CompanionSaveData.version = 1`

---

### 1.2 Create Companion Registry with 12 Creature Definitions

**File:** `src/companions/companionRegistry.ts`

Define the first 12 creatures (2 per kind). This is a read-only data file — no class, no methods. Just exported constant arrays.

**Creatures to define (12 total):**

| # | ID | Name | Kind | Rarity | Biome |
|---|---|---|---|---|---|
| 1 | `ember-wisp` | Ember Wisp | follower | common | ember-waste |
| 2 | `dust-bunny` | Dust Bunny | follower | common | liberty-badlands |
| 3 | `stoneback-turtle` | Stoneback Turtle | protector | rare | verdigris-basin |
| 4 | `bramble-boar` | Bramble Boar | protector | rare | elderwood-maze |
| 5 | `rust-moth` | Rust Moth | scout | uncommon | liberty-badlands |
| 6 | `dusk-mole` | Dusk Mole | scout | uncommon | sable-depths |
| 7 | `copper-rat` | Copper Rat | forager | common | any town |
| 8 | `goldfinch` | Goldfinch | forager | uncommon | verdigris-basin |
| 9 | `thorn-viper` | Thorn Viper | fighter | rare | elderwood-maze |
| 10 | `jade-panther` | Jade Panther | fighter | epic | jade-peak-province |
| 11 | `wild-boar` | Wild Boar | mount | uncommon | verdigris-basin |
| 12 | `river-koi` | River Koi | mount | rare | sunken-ocean |

**For each creature, define:**
- `id`, `name`, `species` (e.g., 'wisp', 'turtle', 'moth')
- `kind`, `rarity`
- `portraitId` = `companion-portrait-{id}`
- `spriteRecipeId` = `companion-{id}`
- `size` = `0.5` for followers/scouts, `1` for others
- `followOffset` = `{ x: 0, y: 1 + followerIndex }` for followers, adjusted per type
- `maxBonds` = `5`
- `traits` = 1-3 traits based on the creature's passive effect (use values from PLAN §3.1)
- `abilities` = 1-3 abilities gated behind bond levels (see PLAN §3.3 for ability structure)
- `spawnTable` = 1-3 entries from the biome data in PLAN §Appendix A
- `tameCost` = food items + minimum bond level (common: 1 feed, 1 bond; rare: 3 feeds, 3 bonds; legendary: special items)
- `description` = 1-2 sentence flavor text
- `lore` = optional 1-2 sentence backstory

**Trait value reference** (from PLAN §3.2):
- `fireResistance: 0.05` = 5% fire resistance
- `coldResistance: 0.05` = 5% cold resistance
- `movementSpeed: 1` = +1 cell/tick (followers) or `4` (mounts)
- `wallSenseRadius: 64` = 64px
- `appleScoreBonus: 0.10` = +10% apple score
- `appleSpawnBonus: 0.10` = +10% spawn rate
- `bulletDodgeChance: 0.10` = 10% dodge
- `bossPullReduction: 0.15` = 15% pull reduction
- `shopDiscount: 0.05` = 5% discount
- `damageMitigation: 30` = 1 absorption every 30 ticks
- `cooldownReduction: 0.20` = 20% cooldown reduction

**Assignment:** Engineer B (or split between A and B)
**Checklist:**
- [ ] All 12 creatures defined with valid biome IDs
- [ ] All biome IDs match those in `src/world/biomes.ts`
- [ ] Trait values are reasonable per §3.2 interpretation rules
- [ ] Abilities reference valid bond levels (1-5)
- [ ] TameCost food items reference real item IDs (or placeholder IDs for Phase 6)
- [ ] No circular references
- [ ] `npm run typecheck` passes
- [ ] `npm run build` succeeds

**Unit tests to write** (`src/companions/__tests__/companionRegistry.test.ts`):
- Registry exports exactly 12 definitions
- All definitions have non-empty required fields
- All biome IDs in spawn tables are valid biomes
- All ability cooldowns have exactly one of `cooldownRooms` or `cooldownTicks`
- All tame costs have at least one food item

---

### 1.3 Create Companion Service

**File:** `src/companions/companionService.ts`

The runtime management class. This is the most important file.

```typescript
import type {
  CompanionDefinition,
  CompanionInstance,
  CompanionRenderData,
  CompanionSaveData,
  TameResult,
  FeedResult,
  AbilityResult,
  CompendiumSaveData
} from './companionTypes.js';
import { COMPANION_DEFINITIONS } from './companionRegistry.js';

export class CompanionService {
  private readonly snakeGame: SnakeGame;
  private readonly companions: Map<string, CompanionInstance> = new Map();
  private readonly juiceManager: JuiceManager;
  private readonly inventoryService: InventoryService;
  private readonly questService: QuestService;
  private readonly compendium: CompendiumSystem;
  private nextInstanceId: number = 1;

  constructor(
    snakeGame: SnakeGame,
    juiceManager: JuiceManager,
    inventoryService: InventoryService,
    questService: QuestService
  );

  // ---- Core Methods ----

  /** Spawn a wild creature at a position (called by spawn system) */
  spawnCompanion(companionId: string, roomId: string, x: number, y: number): void;

  /** Attempt to tame a wild creature — multi-step process */
  attemptTame(companionId: string, playerId: string): TameResult;

  /** Feed a companion to increase bond */
  feedCompanion(companionId: string, itemId: string): FeedResult;

  /** Increase bond progress (called by multiple sources) */
  increaseBond(companionId: string, amount: number): void;

  /** Use an active ability */
  useAbility(companionId: string, abilityId: string): AbilityResult;

  /** Get all passive trait effects from active companions */
  getAllPassiveEffects(): CompanionTrait[];

  /** Get render data for all active companions */
  getCompanionRenderData(): CompanionRenderData[];

  /** Per-tick update (movement interpolation, cooldown checks) */
  step(stepMs: number): void;

  /** Called when the player enters a new room */
  onRoomChange(newRoomId: string): void;

  // ---- Save/Load ----

  getSnapshot(): CompanionSaveData;
  loadSnapshot(data: CompanionSaveData): void;

  // ---- Helpers ----

  private getDefinition(id: string): CompanionDefinition | undefined;
  private resolveCooldown(ability: CompanionAbility, instance: CompanionInstance): number;
}
```

**Implementation requirements for each method:**

#### `spawnCompanion(companionId, roomId, x, y)`
1. Check if a companion with this `companionId` already exists (by definition ID) — max 1 wild instance per definition at a time
2. Create a new `CompanionInstance` with:
   - `id` = `"wild-" + this.nextInstanceId++`
   - `definitionId` = `companionId`
   - `bondLevel` = `1`
   - `bondProgress` = `0`
   - `currentRoomId` = `roomId`
   - `gridX` = `x`, `gridY` = `y`
   - `lastFedRoom` = current room number (from `snakeGame.getCurrentRoomNumber()`)
   - `feedCountThisDay` = `0`
   - `lastInteractionRoom` = current room number
   - `abilitiesUsed` = `new Map()`
   - `totalApplesEatenTogether` = `0`
   - `totalDangersSurvived` = `0`
   - `mood` = `'neutral'`
   - `flags` = `{}`
3. Store in `this.companions`

#### `attemptTame(companionId, playerId)`
1. Find the wild `CompanionInstance` for this `companionId` (not yet tamed)
2. Validate taming conditions:
   - Check food items in inventory (via `inventoryService.getItemCount(foodItem.itemId)`)
   - Check `minimumBondLevel` (bondLevel >= tameCost.minimumBondLevel)
   - Check any special conditions from `tameCost.conditions`
3. If validation fails, return `TameResult` with `success: false` and appropriate `failedReason`
4. If all validation passes:
   - Consume food items from inventory
   - Calculate success chance per PLAN §4.3:
     - Common: 100%, Uncommon: 85%, Rare: 70%, Epic: 50%, Legendary: 30%
     - Plus `+5%` per bond level above minimum
   - Roll RNG (use `snakeGame.rng`)
   - If success: mark instance as tamed (`bondLevel = 1`), discover in compendium, play taming success sound
   - If failure: set encounter cooldown flag `companions.encounterCooldown.{companionId}`, creature flees (remove instance), set `nextEncounterRoom`
5. Return appropriate `TameResult`

**Assignment:** Engineer A
**Checklist:**
- [ ] `spawnCompanion` creates valid instance state
- [ ] `attemptTame` validates food, bond level, and conditions
- [ ] `attemptTame` correctly calculates success chance per rarity table
- [ ] `feedCompanion` enforces daily feed limit (3/day default)
- [ ] `feedCompanion` checks food is in preferredBy list
- [ ] `useAbility` checks cooldown (rooms or ticks), bond level, and ability validity
- [ ] `getAllPassiveEffects` aggregates traits from all active companions
- [ ] `step` interpolates companion positions toward target positions
- [ ] `onRoomChange` resolves `cooldownRooms`-based cooldowns
- [ ] `getSnapshot` / `loadSnapshot` serialize/deserialize all state
- [ ] `npm run typecheck` passes
- [ ] `npm run build` succeeds

**Unit tests to write** (`src/companions/__tests__/companionService.test.ts`):
- `spawnCompanion` creates instance with correct defaults
- `attemptTame` succeeds with sufficient food and bond
- `attemptTame` fails with insufficient food → `insufficientFood`
- `attemptTame` fails with low bond → `bondTooLow`
- `attemptTame` fails with unmet conditions → `conditionsNotMet`
- `attemptTame` fails taming roll for legendary → `tamingFailed`, sets encounter cooldown
- `feedCompanion` grants bond when preferred food given
- `feedCompanion` denies when daily limit reached
- `feedCompanion` denies when wrong food type
- `useAbility` succeeds when unlocked and off cooldown
- `useAbility` fails on cooldown → `onCooldown`
- `useAbility` fails when bond too low → `bondTooLow`
- `getAllPassiveEffects` returns aggregated traits
- `getSnapshot` / `loadSnapshot` round-trip preserves all state
- Edge case: tame during active hazard (should still work)
- Edge case: feed wrong food type (should not grant bond)

---

### 1.4 Create Compendium System

**File:** `src/companions/compendiumSystem.ts`

Tracks discovered creatures. Simple, stateless-ish class.

```typescript
import type { CompanionDefinition } from './companionTypes.js';
import { COMPANION_DEFINITIONS } from './companionRegistry.js';

export class CompendiumSystem {
  private discovered: Set<string> = new Set();
  private firstEncountered: Map<string, number> = new Map();
  private totalEncounters: Map<string, number> = new Map();
  private tamed: Set<string> = new Set();
  private maxBondReached: Map<string, number> = new Map();

  discoverCompanion(companionId: string, roomNumber: number): void;
  isDiscovered(companionId: string): boolean;
  getDiscoveryCount(): number;
  getTotalCompanions(): number;
  getCompendiumView(definitions: CompanionDefinition[]): CompendiumEntry[];
  getLore(companionId: string): string | undefined;
  getSnapshot(): CompendiumSaveData;
  loadSnapshot(data: CompendiumSaveData): void;
  markTamed(companionId: string): void;
  markBondReached(companionId: string, bondLevel: number): void;
  recordEncounter(companionId: string): void;
}
```

**Implementation notes:**
- `getTotalCompanions()` returns `COMPANION_DEFINITIONS.length` (total defined creatures)
- `getCompendiumView()` builds `CompendiumEntry[]` by joining discovered state with definitions
- `loadSnapshot()` restores Sets and Maps from arrays/objects
- `version` migration not needed yet (version 1 only), but structure should support future versions

**Assignment:** Engineer B
**Checklist:**
- [ ] `discoverCompanion` adds to discovered Set, records first encounter room
- [ ] `getCompendiumView` returns all creatures with correct discovered/tamed state
- [ ] `loadSnapshot` / `getSnapshot` round-trip works
- [ ] `markTamed` and `markBondReached` update state correctly
- [ ] `npm run typecheck` passes

**Unit tests** (`src/companions/__tests__/compendiumSystem.test.ts`):
- `discoverCompanion` makes `isDiscovered` return true
- `getDiscoveryCount` returns correct count
- `getCompendiumView` shows silhouettes for undiscovered creatures
- `loadSnapshot` restores discovered state

---

### 1.5 Create Companion State & Save Integration

**File:** `src/companions/companionState.ts`

This file handles the bridge between `snakeState.flags` and the `CompanionService`. It does NOT manage runtime logic — that's `CompanionService`. This file is purely about persistence.

```typescript
import type { CompanionSaveData, CompendiumSaveData } from './companionTypes.js';

/** Flag key prefixes for companion data */
export const COMPANION_FLAG_PREFIX = 'companions';
export const COMPANION_INSTANCES_KEY = 'companions.instances';
export const COMPANION_COMPENDIUM_KEY = 'companium.discovered';
export const COMPANION_SETTINGS_KEY = 'companions.settings';

/** Read companion state from snakeState.flags */
export function readCompanionState(flags: Record<string, unknown>): CompanionSaveData;

/** Write companion state to snakeState.flags */
export function writeCompanionState(flags: Record<string, unknown>, data: CompanionSaveData): void;

/** Get companion-specific flag helpers for the flag system */
export function createCompanionFlagHelpers(flags: Record<string, unknown>): {
  setCompanionFlag(key: string, value: unknown): void;
  getCompanionFlag<T>(key: string): T | undefined;
  hasCompanionFlag(key: string): boolean;
};
```

**Flag key layout** (from PLAN §10.2):
- `companions.instances.{instanceId}` — serialized `CompanionInstance` (JSON)
- `companions.discovered` — string[] of discovered creature IDs
- `companions.maxBondReached` — `{ creatureId: number }`
- `companions.encounterCooldown.{creatureId}` — room number until next encounter
- `companions.totalBred` — total creatures bred (number)
- `companions.settings.mountAutoEnabled` — boolean
- `companions.settings.followerLimit` — number (default: 3)

**Assignment:** Engineer A
**Checklist:**
- [ ] `readCompanionState` correctly deserializes from flags
- [ ] `writeCompanionState` correctly serializes to flags
- [ ] Flag helpers work with nested flag keys
- [ ] Handles missing/invalid flag data gracefully (returns defaults)

**Integration test to write** (`src/companions/__tests__/companionState.integration.test.ts`):
- Flags → readCompanionState → writeCompanionState → readCompanionState round-trip
- Invalid flag data returns sensible defaults

---

### 1.6 Create Encounter Popup UI

**File:** `src/ui/companionEncounterPopup.ts`

Reusable popup that appears when a wild creature is encountered. Pattern follows `src/ui/questPopup.ts`.

```typescript
import { type SnakeScene } from '../scenes/snakeScene.js';
import type { CompanionDefinition } from '../companions/companionTypes.js';

export class CompanionEncounterPopup {
  constructor(private readonly scene: SnakeScene);

  show(definition: CompanionDefinition, callbacks: {
    onObserve?: () => void;
    onFeed?: () => void;
    onLeave?: () => void;
    onTame?: () => void;
  }): void;

  hide(): void;
}
```

**UI layout** (from PLAN §11.2):
- Background rectangle (dark, semi-transparent)
- Creature portrait (RuntimeSpriteFactory, from `portraitId`)
- Creature name + rarity stars
- Description text
- Rarity badge (colored by rarity tier)
- Kind badge (follower/protector/etc.)
- Home biome text
- Three buttons: [Observe] [Feed] [Leave]
- [Tame] button appears when player has required food

**Assignment:** Engineer B
**Checklist:**
- [ ] Popup appears at bottom-center of screen
- [ ] Portrait rendered via RuntimeSpriteFactory
- [ ] Buttons are interactive (useHandCursor, pointerdown)
- [ ] Callbacks fire correctly
- [ ] Popup hides cleanly (removes from scene)
- [ ] Rarity shown with star symbol (★)
- [ ] `npm run typecheck` passes

---

### 1.7 Basic Follower Rendering

**File:** `src/ui/companionRenderer.ts`

Handles rendering companion sprites on the game grid.

```typescript
import { type SnakeScene } from '../scenes/snakeScene.js';
import type { CompanionRenderData } from '../companions/companionTypes.js';

export class CompanionRenderer {
  constructor(private readonly scene: SnakeScene);

  /** Create sprites for a companion and add to scene */
  createCompanionSprite(companionId: string, spriteRecipeId: string, size: number): Phaser.GameObjects.Sprite;

  /** Update all companion sprite positions based on snake position */
  updateRenderData(renderData: CompanionRenderData[]): void;

  /** Clear all companion sprites */
  clear(): void;
}
```

**Implementation notes:**
- Sprites are added to `snakeScene` with depth below snake body
- Movement is interpolated each tick (lerp toward target position)
- Followers trail behind snake head at offset positions
- Z-order: creatures render below snake body

**Assignment:** Engineer A
**Checklist:**
- [ ] Sprites created via RuntimeSpriteFactory
- [ ] Sprites positioned relative to snake head
- [ ] Smooth interpolation each tick
- [ ] `npm run typecheck` passes

---

### 1.8 Basic Sound Effects

**File:** `src/ui/juice.ts` (modify — add new methods)

Add companion-related sound methods to the existing `JuiceManager`:

```typescript
// Add to JuiceManager class

/** Sound when a creature appears */
creatureAppear(worldX: number, worldY: number, companionId: string): void;

/** Sound when feeding a creature */
creatureFeed(worldX: number, worldY: number): void;

/** Sound when bond increases */
creatureBondIncrease(worldX: number, worldY: number): void;

/** Sound when taming succeeds */
creatureTameSuccess(worldX: number, worldY: number): void;

/** Sound when taming fails */
creatureTameFail(worldX: number, worldY: number): void;

/** Sound when using a companion ability */
creatureAbility(worldX: number, worldY: number, abilityId: string): void;
```

**Assignment:** Engineer B
**Checklist:**
- [ ] All 6 methods added to `JuiceManager`
- [ ] Sounds use Web Audio API (procedural, no new assets needed)
- [ ] `creatureAppear` uses descending arpeggio (pitch varies by creature)
- [ ] `creatureTameSuccess` uses ascending 3-note fanfare
- [ ] `creatureTameFail` uses descending sad tone
- [ ] `npm run typecheck` passes

---

## Phase 1 Acceptance Criteria

Before moving to Phase 2, the following end-to-end test must pass manually:

1. Spawn a wild `ember-wisp` in the `ember-waste` biome
2. Observe the creature (popup shows info)
3. Feed it the correct food (fire-pepper, or placeholder if not yet created)
4. Build bond to required level
5. Successfully tame the creature
6. Creature follows the snake smoothly
7. Open and close the compendium — ember-wisp appears as discovered
8. Save and reload — creature state persists

---

## Phase 2: Passive Traits & Bond System

**Goal:** Companions provide meaningful passive effects and bond progression.
**Estimated effort:** 1 week
**Files to create:** 3
**Files to modify:** 3

### 2.1 Passive Trait Evaluation System

**File:** `src/companions/bondSystem.ts`

Manages bond levels, progression, and effects.

```typescript
import type { CompanionInstance, CompanionTrait } from './companionTypes.js';

export const BOND_LEVELS = 5;
export const BONDS_PER_LEVEL = 100; // 0-100 progress per level
export const MAX_DAILY_FEEDS = 3;
export const NEGLECT_DECAY_ROOMS = 50;
export const NEGLECT_DECAY_AMOUNT = 1;
export const MAX_NEGLECT_DECAY = 3;

export interface BondLevelInfo {
  level: number;
  hearts: string;  // 💔, 💛, ❤️, 💖, 💝
  name: string;
  description: string;
}

export const BOND_LEVEL_DESCRIPTIONS: BondLevelInfo[] = [
  { level: 1, hearts: '\u{1F494}', name: 'Fledgling', description: 'Just tamed. Doesn't fully trust you.' },
  { level: 2, hearts: '\u{1F9E8}', name: 'Trusted', description: 'Follows reliably. First ability unlocked.' },
  { level: 3, hearts: '\u2764\uFE0F', name: 'Devoted', description: 'Strong bond. Second ability unlocked.' },
  { level: 4, hearts: '\u{1F496}', name: 'Kindred', description: 'Deep connection. Third ability unlocked.' },
  { level: 5, hearts: '\u{1F49D}', name: 'Legendary', description: 'Unbreakable bond. All abilities + unique passive.' },
];

/** Calculate bond level from progress (0-100 within level) */
export function getBondLevel(bondProgress: number): number;

/** Calculate progress needed to reach next bond level */
export function getProgressNeededForNextLevel(bondLevel: number): number;

/** Check if a companion should leave due to neglect */
export function checkNeglectDecay(
  instance: CompanionInstance,
  currentRoomNumber: number,
  flags: Record<string, unknown>
): { shouldLeave: boolean; bondLost: number };

/** Apply bond increase with daily feed limits and caps */
export function applyBondIncrease(
  instance: CompanionInstance,
  amount: number,
  currentRoomNumber: number,
  flags: Record<string, unknown>
): { newProgress: number; levelUp: boolean; newLevel: number };

/** Evaluate passive traits from all active companions, resolving stacking rules */
export function evaluatePassiveTraits(
  instances: CompanionInstance[],
  definitions: Map<string, CompanionDefinition>
): TraitEvaluation[];

export interface TraitEvaluation {
  traitId: string;
  totalValue: number;
  sources: Array<{ companionId: string; value: number }>;
}
```

**Trait stacking rules** (from PLAN §17.3):
- Traits stack **additively** (not multiplicatively)
- No single trait should exceed defined caps (fireResistance max: 0.50, movementSpeed max: 5, etc.)
- If stacking would exceed cap, truncate to cap

**Assignment:** Engineer A
**Checklist:**
- [ ] `getBondLevel` correctly maps 0-100 to level 1-5
- [ ] `checkNeglectDecay` triggers after 50 rooms without interaction
- [ ] `applyBondIncrease` enforces daily feed limit
- [ ] Bond at 0 with bondLevel 1 → companion leaves
- [ ] Trait stacking is additive and capped
- [ ] `npm run typecheck` passes

### 2.2 Passive Effects Application

**File:** `src/systems/snakeState.ts` (modify — add companion passive effect methods)

Add methods to `SnakeState` for companion passive effects:

```typescript
// Add to SnakeState class

getActiveCompanions(): CompanionInstance[];
getPassiveEffects(): CompanionTrait[];
applyPassiveEffects(): void;
canSpawnCompanion(companionId: string): boolean;
getMaxFollowers(): number;
getMount(): CompanionInstance | null;
```

**Implementation notes:**
- `getActiveCompanions()` reads from `this.flags['companions.instances']`
- `getPassiveEffects()` aggregates all traits from active companions
- `applyPassiveEffects()` sets flag values that `snakeState.step()` checks:
  - `fireResistance`, `coldResistance` → affects temperature hazard
  - `movementSpeed` → modifies step interval
  - `wallSenseRadius` → modifies wall collision detection
  - `appleScoreBonus` → modifies score gain
  - `bulletDodgeChance` → checked in boss collision
- `canSpawnCompanion()` checks:
  - Max total active companions (default: 4, adjustable via equipment)
  - Max followers (default: 3)
  - Max protectors (default: 2)
  - Max scouts (default: 2)
  - Max fighters (default: 2)
  - Max mounts (1, only one at a time)
- `getMount()` returns the single active mount companion

**Assignment:** Engineer A
**Checklist:**
- [ ] `getPassiveEffects` returns all traits from active companions
- [ ] `applyPassiveEffects` sets appropriate flags for snakeState.step() to read
- [ ] Companion limits enforced (4 total, 3 followers, etc.)
- [ ] `canSpawnCompanion` checks all limit constraints
- [ ] `npm run typecheck` passes

### 2.3 Companion HUD Panel

**File:** `src/ui/companionHud.ts`

HUD panel showing active companions (like quest tracker).

```typescript
import { type SnakeScene } from '../scenes/snakeScene.js';

export class CompanionHud {
  constructor(private readonly scene: SnakeScene);

  /** Update HUD with current companion state */
  update(companionData: Array<{
    id: string;
    name: string;
    portraitId: string;
    bondLevel: number;
    bondProgress: number;
    kind: string;
  }>, gridWidth: number): void;

  hide(): void;
}
```

**UI layout:**
- Row of small companion icon squares at top-left of screen
- Below each icon: heart indicator (bond level)
- Click/tap opens quick menu (Feed / Ability)
- Auto-hides when no active companions

**Assignment:** Engineer B
**Checklist:**
- [ ] Icons shown at top-left
- [ ] Bond hearts displayed under each icon
- [ ] Click opens quick menu (stub for Phase 3)
- [ ] Auto-hides when no companions
- [ ] `npm run typecheck` passes

### 2.4 Compendium UI Overlay

**File:** `src/ui/compendiumOverlay.ts`

Full-screen bestiary overlay. Pattern follows `src/ui/skillTreeOverlay.ts`.

```typescript
import { type SnakeScene } from '../scenes/snakeScene.js';
import type { CompendiumEntry } from '../companions/companionTypes.js';

export class CompendiumOverlay {
  constructor(private readonly scene: SnakeScene);

  show(entries: CompendiumEntry[]): void;
  hide(): void;
  refresh(entries: CompendiumEntry[]): void;
  toggle(entries: CompendiumEntry[]): void;
}
```

**UI layout:**
- Full-screen dark overlay
- Grid of creature icons (discovered = color, undiscovered = silhouette + ?)
- Filter buttons: All / Followers / Protectors / Scouts / Foragers / Fighters / Mounts
- Discovery counter: "12/36 discovered"
- Clicking creature opens detail panel:
  - Name, rarity, kind
  - Description + lore
  - Passive traits + abilities
  - Bond level (if tamed)
  - Taming hint

**Assignment:** Engineer B
**Checklist:**
- [ ] Grid view of all creatures
- [ ] Filter buttons work
- [ ] Discovery counter shows progress
- [ ] Detail panel opens on click
- [ ] Discovered vs undiscovered visual distinction
- [ ] `npm run typecheck` passes

### 2.5 Equipment Modifier Integration

**File:** `src/inventory/item.ts` (modify — add new modifier keys)

Add companion-related modifier keys to `EquipableItem.modifiers`:

```typescript
interface EquipableItemModifiers {
  // ... existing modifiers ...
  bondGainMultiplier?: number;      // Multiplier on bond increase (default: 1.0)
  maxCompanions?: number;            // Hard cap on active companions
  abilityCooldownReduction?: number; // Percentage reduction (0.8 = 20% reduction)
  companionDamageBonus?: number;     // Multiplier on fighter damage
}
```

**File:** `src/companions/companionService.ts` (modify — apply equipment modifiers)

In `CompanionService.getAllPassiveEffects()` and `increaseBond()`, read equipment modifiers and apply them.

**Assignment:** Engineer A
**Checklist:**
- [ ] New modifier keys defined in `EquipableItemModifiers`
- [ ] `bondGainMultiplier` applied in `increaseBond()`
- [ ] `abilityCooldownReduction` applied in cooldown calculation
- [ ] `maxCompanions` overrides default limit in `canSpawnCompanion`
- [ ] `npm run typecheck` passes

---

## Phase 2 Acceptance Criteria

1. Two followers active simultaneously both provide passive buffs
3. Bond increases on feed, respects daily limit
4. Neglect decay works (50 rooms without feed = bond loss)
5. Compendium shows discovered creatures with correct state
6. Tamer's Cloak equipment increases bond gain
7. `npm run typecheck` passes
8. `npm run build` succeeds

---

## Phase 3: Abilities & Combat

**Goal:** Active abilities and fighter companions.
**Estimated effort:** 1 week
**Files to create:** 2
**Files to modify:** 3

### 3.1 Ability System

**File:** `src/companions/abilitySystem.ts`

Dedicated ability management with cooldown handling.

```typescript
import type { CompanionAbility, CompanionInstance, AbilityResult } from './companionTypes.js';

export class AbilitySystem {
  constructor(private readonly juiceManager: JuiceManager);

  /** Check if ability is available (bond level + cooldown) */
  canUseAbility(instance: CompanionInstance, ability: CompanionAbility, currentRoom: number): boolean;

  /** Use an ability, applying cooldown */
  useAbility(
    instance: CompanionInstance,
    ability: CompanionAbility,
    currentRoom: number,
    cooldownReduction?: number
  ): AbilityResult;

  /** Resolve cooldowns when room changes (for cooldownRooms abilities) */
  resolveCooldownsOnRoomChange(instance: CompanionInstance, ability: CompanionAbility, newRoom: number): number;

  /** Get remaining cooldown for an ability */
  getCooldownRemaining(instance: CompanionInstance, ability: CompanionAbility, currentRoom: number): number;
}
```

**Assignment:** Engineer A
**Checklist:**
- [ ] `canUseAbility` checks bond level and cooldown
- [ ] `useAbility` applies cooldown reduction if provided
- [ ] `resolveCooldownsOnRoomChange` handles `cooldownRooms` properly
- [ ] Only one of `cooldownRooms` or `cooldownTicks` is active per ability
- [ ] `npm run typecheck` passes

### 3.2 Ability Selection UI

**File:** `src/ui/abilitySelectionUI.ts`

Popup for selecting which ability to use. Pattern follows PLAN §11.4.

```typescript
import { type SnakeScene } from '../scenes/snakeScene.js';

export class AbilitySelectionUI {
  constructor(private readonly scene: SnakeScene);

  show(companions: Array<{
    id: string;
    name: string;
    abilities: Array<{
      id: string;
      name: string;
      description: string;
      cooldown: number;
      isReady: boolean;
    }>;
  }>, onUse: (companionId: string, abilityId: string) => void): void;

  hide(): void;
}
```

**Assignment:** Engineer B
**Checklist:**
- [ ] Lists available abilities per companion
- [ ] Cooldown shown in UI
- [ ] Unready abilities dimmed
- [ ] `onUse` callback fires with companionId + abilityId
- [ ] `npm run typecheck` passes

### 3.3 Fighter & Protector Integration

**File:** `src/companions/behaviors/fighter.ts`

```typescript
import type { CompanionInstance, CompanionDefinition } from '../companionTypes.js';

/** Fighter companion: apply damage to enemies or reduce boss pull strength */
export function applyFighterEffect(
  instance: CompanionInstance,
  definition: CompanionDefinition,
  snakeState: SnakeState,
  enemies: Enemy[]
): void;
```

**File:** `src/companions/behaviors/protector.ts`

```typescript
import type { CompanionInstance, CompanionDefinition } from '../companionTypes.js';

/** Protector companion: intercept hazard (wall, water, boss) based on damageMitigation trait */
export function tryProtectorIntervene(
  instance: CompanionInstance,
  definition: CompanionDefinition,
  hazardType: 'wall' | 'water' | 'boss' | 'temperature',
  currentTick: number
): boolean; // true if protector intervened
```

**Assignment:** Engineer A
**Checklist:**
- [ ] Fighter reduces boss pull or deals damage based on traits
- [ ] Protector intercepts hazards at cooldown intervals
- [ ] Protector cooldown visual (pulsing ring on creature sprite)
- [ ] `npm run typecheck` passes

### 3.4 Ability Juice Effects

**File:** `src/ui/juice.ts` (modify — add ability-specific VFX)

```typescript
// Add to JuiceManager

/** Visual effect for a companion ability */
creatureAbilityEffect(effectType: CompanionAbility['effect'], worldX: number, worldY: number): void;

/** Particle burst for companion spawn */
creatureSpawnBurst(worldX: number, worldY: number, companionId: string): void;

/** Heart particles for bond increase */
creatureHeartParticles(worldX: number, worldY: number): void;

/** Screen flash + ring pulse for taming */
creatureTamingEffect(worldX: number, worldY: number, success: boolean): void;
```

**Assignment:** Engineer B
**Checklist:**
- [ ] `creatureAbilityEffect` produces different VFX per effect type
- [ ] `creatureSpawnBurst` uses type-colored particles
- [ ] `creatureHeartParticles` floats hearts upward
- [ ] `creatureTamingEffect` flashes screen + ring pulse
- [ ] `npm run typecheck` passes

### 3.5 Edge Case Tests

**File:** `src/companions/__tests__/abilitySystem.test.ts`

- Two abilities on same cooldown tick → only one fires
- Protector blocks damage while shield active → no double-block
- Fighter ability triggers at bond 1 (unlocked) → works correctly
- Cooldown reduction from equipment → correctly applied

**Assignment:** Engineer A
**Checklist:**
- [ ] All edge cases tested
- [ ] `npm run typecheck` passes
- [ ] `npm run build` succeeds

---

## Phase 3 Acceptance Criteria

1. Fighter companion deals damage in combat
2. Protector companion blocks hazards at correct cooldown intervals
3. Ability selection UI shows all available abilities
4. Ability cooldowns displayed and enforced correctly
5. Visual effects (particles, screen flash) play on ability use
6. `npm run typecheck` passes
7. `npm run build` succeeds

---

## Phase 4: Mount System & Polish

**Goal:** Rideable creatures and quality of life improvements.
**Estimated effort:** 1 week
**Files to create:** 2
**Files to modify:** 3

### 4.1 Mount System

**File:** `src/companions/mountSystem.ts`

```typescript
import type { CompanionInstance, CompanionDefinition } from './companionTypes.js';
import type { SnakeState } from './systems/snakeState.js';

export class MountSystem {
  /** Enter a mount — modify snake movement */
  enterMount(instance: CompanionInstance, definition: CompanionDefinition, snakeState: SnakeState): void;

  /** Exit a mount — restore normal movement */
  exitMount(snakeState: SnakeState): void;

  /** Get mount speed modifier (from trait + tradeoff) */
  getMountSpeedModifier(definition: CompanionDefinition, currentBiome: string): number;

  /** Check if mount tradeoff is active */
  getMountTradeoff(definition: CompanionDefinition, currentBiome: string): string | null;

  /** Check if mount can traverse current biome safely */
  canMountInBiome(definition: CompanionDefinition, biomeId: string): boolean;
}
```

**Tradeoff examples** (from PLAN §3.1):
- Wild Boar: +40% speed, but 1-frame input delay
- River Koi: water safe for 20s, cannot eat apples while mounted
- Desert Strider: immune to heat, burns in cold biomes
- Storm Hawk: brief flight (5s cooldown), requires storm event

**Assignment:** Engineer A
**Checklist:**
- [ ] `enterMount` applies speed modifier
- [ ] `exitMount` restores normal movement
- [ ] Tradeoffs enforced (input delay, food restriction, biome burn)
- [ ] `canMountInBiome` returns false when tradeoff is active
- [ ] `npm run typecheck` passes

### 4.2 Mount UI

**File:** `src/ui/mountUI.ts`

```typescript
import { type SnakeScene } from '../scenes/snakeScene.js';

export class MountUI {
  constructor(private readonly scene: SnakeScene);

  /** Show mount/unmount button when a mount companion is available */
  showMountButton(mountAvailable: boolean, isMounted: boolean): void;

  hide(): void;
}
```

**Assignment:** Engineer B
**Checklist:**
- [ ] Button appears when mount companion is active
- [ ] Button text changes: "Ride" / "Dismount"
- [ ] Clicking calls appropriate mountSystem method
- [ ] `npm run typecheck` passes

### 4.3 Companion Panel HUD Improvements

**File:** `src/ui/companionHud.ts` (modify — expand)

Add:
- Ability quick-use buttons
- Feed button with food selector
- Dismiss companion option
- Expanded view with bond progress bar

**Assignment:** Engineer B
**Checklist:**
- [ ] Feed button with food selector works
- [ ] Ability quick-use fires ability selection UI
- [ ] Dismiss option returns companion to wild state
- [ ] Bond progress bar shown in expanded view
- [ ] `npm run typecheck` passes

### 4.4 Creature Voice Lines / Dialogue

**File:** `src/ui/companionDialogue.ts`

```typescript
/** Select a voice line for a companion based on mood and bond level */
export function selectCompanionDialogue(
  companionId: string,
  mood: string,
  bondLevel: number,
  i18nKey: string
): string;

/** All companion dialogue pools, keyed by companionId */
export const COMPANION_DIALOGUE: Record<string, Record<string, string[]>>;
```

**Assignment:** Engineer A
**Checklist:**
- [ ] Dialogue selected based on mood + bond level
- [ ] Higher bond = more expressive dialogue
- [ ] Default fallback for creatures without dialogue entries

### 4.5 Polish Visual Effects

**File:** `src/ui/juice.ts` (modify — add polish VFX)

```typescript
// Neglect: creature sprite fades slightly, sad particles
creatureNeglectEffect(worldX: number, worldY: number): void;

// New discovery: spotlight effect + name reveal
creatureDiscoveryEffect(worldX: number, worldY: number, companionId: string): void;
```

**Assignment:** Engineer B
**Checklist:**
- [ ] All polish VFX from PLAN §13.2 implemented
- [ ] `npm run typecheck` passes
- [ ] `npm run build` succeeds

---

## Phase 4 Acceptance Criteria

1. Wild Boar mount: +40% speed with input delay tradeoff
2. Desert Strider: immune to heat, burns in cold biome
3. Mount/unmount smoothly, tradeoffs enforced
4. Companion HUD shows ability quick-use
5. `npm run typecheck` passes
6. `npm run build` succeeds

---

## Phase 5: Breeding & Bestiary

**Goal:** Complete the system with breeding and full bestiary.
**Estimated effort:** 1 week
**Files to create:** 2
**Files to modify:** 2

### 5.1 Breeding Mechanics

**File:** `src/companions/breedingSystem.ts`

```typescript
import type { CompanionInstance, CompanionDefinition } from './companionTypes.js';

export interface BreedingResult {
  success: boolean;
  offspringDefinitionId?: string;
  message: string;
  failedReason?: 'incompatible' | 'notBondLevel5' | 'notSameRoom' | 'noBreedingFood' | 'maxCompanionsReached';
}

export class BreedingSystem {
  /** Check if two companions are compatible for breeding */
  areCompatible(a: CompanionDefinition, b: CompanionDefinition): boolean;

  /** Attempt breeding — produces offspring with inherited traits */
  attemptBreeding(
    parent1: CompanionInstance,
    parent2: CompanionInstance,
    breedingFoodId: string,
    currentRoom: string
  ): BreedingResult;

  /** Generate offspring traits: 50% chance per parent trait */
  generateOffspringTraits(parent1: CompanionDefinition, parent2: CompanionDefinition): CompanionTrait[];

  /** Determine offspring rarity: up to 1 tier better than either parent */
  determineOffspringRarity(parent1Rarity: CompanionRarity, parent2Rarity: CompanionRarity): CompanionRarity;
}
```

**Compatibility rules** (from PLAN §9.1):
- Same `kind` (both Protectors, or both Scouts)
- Same biome origin (both from Elderwood Maze)
- Same rarity tier (both Rare)

**Offspring traits** (from PLAN §9.2):
- 50% chance to inherit each parent trait
- Kind: random from either parent's kind
- Rarity: up to 1 tier better than either parent (two epics → legendary)

**Assignment:** Engineer A
**Checklist:**
- [ ] `areCompatible` checks all 3 compatibility rules
- [ ] `attemptBreeding` validates all preconditions
- [ ] Offspring inherits traits with 50% probability per trait
- [ ] Offspring rarity capped at +1 tier above parents
- [ ] Returns error for incompatible pair, bond level < 5, max companions, no breeding food
- [ ] `npm run typecheck` passes

### 5.2 Breeding UI

**File:** `src/ui/breedingUI.ts`

```typescript
import { type SnakeScene } from '../scenes/snakeScene.js';

export class BreedingUI {
  constructor(private readonly scene: SnakeScene);

  /** Show breeding selection UI */
  show(companions: Array<{
    id: string;
    name: string;
    kind: string;
    rarity: string;
    bondLevel: number;
  }>, onBreedingFoodSelected: (foodId: string) => void,
       onPairSelected: (parent1Id: string, parent2Id: string) => void
  ): void;

  hide(): void;
}
```

**Assignment:** Engineer B
**Checklist:**
- [ ] Lists tamed companions at bond level 5
- [ ] Highlights compatible pairs
- [ ] Incompatible pairs dimmed
- [ ] `npm run typecheck` passes

### 5.3 Full Compendium Content

**File:** `src/companions/companionRegistry.ts` (modify — add remaining 24 creatures)

Add all remaining creatures from PLAN §Appendix A (24 more, for total of 36):

- Followers: cave-cricket, sun-sparrow (2 more)
- Protectors: deep-shell, thornback-drake, liberty-bastion (3 more)
- Scouts: tide-seer, garden-whisper, peak-crow (3 more)
- Foragers: pearl-shell, honey-drake, ash-gleaner, frost-nectar, badlands-burrower (5 more)
- Fighters: shadow-jackal, freak-biter (2 more)
- Mounts: desert-strider, storm-hawk (2 more)

**Assignment:** Engineer B (split if both engineers are available)
**Checklist:**
- [ ] All 36 creatures defined
- [ ] All have valid biome IDs, traits, abilities, spawn tables
- [ ] Rarity distribution: 10 common, 10 uncommon, 8 rare, 5 epic, 3 legendary
- [ ] `npm run typecheck` passes
- [ ] `npm run build` succeeds

### 5.4 Breeding Tests

**File:** `src/companions/__tests__/breedingSystem.test.ts`

- Breed compatible pair (same kind) → success, traits inherited
- Breed incompatible pair → `incompatible`
- Breed while one parent at bond < 5 → `notBondLevel5`
- Breed with same creature twice → should require two distinct instances
- Offspring exceeding max companion limit → `maxCompanionsReached`
- Two epic parents → offspring can be legendary
- 50% trait inheritance: test across many runs, average is ~50%

**Assignment:** Engineer A
**Checklist:**
- [ ] All edge cases tested
- [ ] Trait inheritance randomness tested with statistical validation

---

## Phase 5 Acceptance Criteria

1. Two compatible companions at bond 5 can breed
2. Offspring has inherited traits (50% chance per trait)
3. Offspring rarity max +1 tier above parents
4. Compendium shows all 36 creatures
5. Breeding UI highlights compatible pairs
6. `npm run typecheck` passes
7. `npm run build` succeeds

---

## Phase 6: Integration & Content

**Goal:** Tie everything together and add content.
**Estimated effort:** 1 week
**Files to create:** 6
**Files to modify:** 4

### 6.1 Creature Food Items

**File:** `src/inventory/itemRegistry.ts` (modify — add new items)

Add creature food items:

| ID | Name | Description | Category | tameBonus | preferredBy |
|---|---|---|---|---|---|
| `fire-pepper` | Fire Pepper | Spicy pepper from Ember Waste. Flame creatures love it. | food | 1.0 | ember-wisp, ashen-hound, honey-drake |
| `fresh-fish` | Fresh Fish | Shimmering. Aquatic creatures find it irresistible. | food | 1.0 | ironscale-carp, tide-seer, river-koi |
| `wild-herbs` | Wild Herbs | Aromatic herbs from Gloam Garden. | food | 0.5 | gloom-moth, moss-imp, dust-bunny |
| `meat-skewer` | Meat Skewer | Simple but effective. Most creatures find it appealing. | food | 0.5 | wild-boar, bramble-boar, shadow-jackal |
| `primordial-egg` | Primordial Egg | Shimmering egg used for breeding. | consumable | — | (breeding food, not for taming) |

**Also add equipment items:**

| ID | Name | Slot | Modifiers |
|---|---|---|---|
| `tamers-cloak` | Tamer's Cloak | cloak | bondGainMultiplier: 1.5, maxCompanions: 5 |
| `beast-tamer-ring` | Beast Tamer Ring | ring | abilityCooldownReduction: 0.8, companionDamageBonus: 1.25 |

**Assignment:** Engineer A
**Checklist:**
- [ ] All 5 food items defined
- [ ] `primordial-egg` marked as breedable
- [ ] `tamers-cloak` and `beast-tamer-ring` defined with correct modifiers
- [ ] All new items added to `CHEST_LOOT_ITEMS` at appropriate rates
- [ ] Common food drops at ~2% from normal rooms
- [ ] Rare food items available in shops at score cost proportional to creature rarity
- [ ] `npm run typecheck` passes

### 6.2 Creature-Related Quests

**File:** `src/quests/definitions/` (create new quest definitions)

Add creature-related quests:

| Quest ID | Name | Type | Description | Reward |
|---|---|---|---|---|
| `first-friend` | First Friend | Tutorial | Tame your first creature | Ember Wisp |
| `light-the-garden` | Light the Garden | Exploration | Find the Gloom Moth in Gloam Garden | Gloom Moth |
| `creature-collector` | Creature Collector | Collection | Discover 10 creatures in the compendium | Beast Tamer hat |
| `last-storm-hawk` | The Last Storm Hawk | Story | Find and tame a Storm Hawk during a storm event | Storm Hawk |
| `bestiary-master` | Bestiary Master | Challenge | Discover all 36 creatures | Unique snake palette |
| `pack-leader` | Pack Leader | Collection | Have 5 companions active simultaneously | Tamer's Cloak |

**File:** `src/quests/quest.ts` (modify — extend `QuestRuntime`)

```typescript
// Add to QuestRuntime interface

getActiveCompanions(): CompanionInstance[];
getCompanionKind(kind: CompanionKind): CompanionInstance[];
getDiscoveredCompanionCount(): number;
isCompanionDiscovered(id: string): boolean;
getMaxBond(companionId: string): number;
getBondLevel(companionId: string): number;
```

**Assignment:** Engineer A
**Checklist:**
- [ ] All 6 quests defined
- [ ] `QuestRuntime` extended with companion methods
- [ ] Quest completion conditions check companion state
- [ ] Quest rewards apply correctly (hat, palette, companion spawn)
- [ ] `npm run typecheck` passes

### 6.3 Spawn System

**File:** `src/companions/biomes/spawnTables.ts`

```typescript
import type { SpawnTableEntry } from '../companionTypes.js';

/** Biome-specific spawn tables for all creatures */
export const SPAWN_TABLES: Record<string, SpawnTableEntry[]>;

/** Calculate effective spawn weight for a creature in a room */
export function calculateSpawnWeight(
  entry: SpawnTableEntry,
  score: number,
  roomCondition: string,
  timeOfDay: 'day' | 'night',
  activeEvent?: string
): number;

/** Select a creature to spawn in a room (if any) */
export function selectSpawnCreature(
  roomId: string,
  biomeId: string,
  score: number,
  encountered: Set<string>,
  rng: RandomNumberGenerator
): string | null;
```

**Weight calculation** (from PLAN §7.3):
```
effectiveWeight = baseWeight × scoreMultiplier × roomConditionMultiplier × timeBiasMultiplier × eventBiasMultiplier

scoreMultiplier = 1 + (score / 1000) * 0.1
roomConditionMultiplier = { any: 1.0, structure: 2.0, dangerous: 0.5, water: 0.8 }
timeBiasMultiplier = { any: 1.0, day: 1.5, night: 1.5 }
eventBiasMultiplier = 1.0 (no event) or 3.0 (during matching event)
```

**Spawn caps** (from PLAN §7.2):
- Max 2 wild creatures per biome at any time
- Creatures despawn after 10 rooms without interaction
- Each creature encountered once per biome per playthrough

**Assignment:** Engineer B
**Checklist:**
- [ ] All biome spawn tables defined
- [ ] Weight calculation matches formula exactly
- [ ] Spawn caps enforced (2 per biome)
- [ ] Despawn after 10 rooms
- [ ] Biome uniqueness tracked
- [ ] `npm run typecheck` passes

### 6.4 I18n Support

**File:** `src/i18n/languages/en/companionStrings.ts` (new)

**File:** `src/i18n/languages/es/companionStrings.ts` (new)

**File:** `src/i18n/i18nManager.ts` (modify — add companion string lookup)

All companion-related UI strings must be i18n keys:

```typescript
// English example
export const companionStrings = {
  'creature.ember-wisp.name': 'Ember Wisp',
  'creature.ember-wisp.description': 'A tiny flame spirit...',
  'creature.ember-wisp.lore': 'Legend says...',
  'compendium.discovered': 'Discovered!',
  'compendium.undiscovered': 'Unknown Creature',
  'companion.feed': 'Feed',
  'companion.tame': 'Attempt to Tame',
  'companion.observe': 'Observe',
  'companion.leave': 'Leave',
  'companion.ability': 'Ability',
  'companion.dismiss': 'Dismiss',
  'companion.bond.fledgling': 'Fledgling',
  'companion.bond.trusted': 'Trusted',
  'companion.bond.devoted': 'Devoted',
  'companion.bond.kindred': 'Kindred',
  'companion.bond.legendary': 'Legendary',
  'companion.tame.success': 'Taming successful!',
  'companion.tame.failure': 'The creature escapes...',
  'companion.tame.insufficientFood': 'Not enough food.',
  'companion.feed.dailyLimit': 'No more food today.',
  'companion.ability.onCooldown': 'Ability on cooldown.',
  'companion.dismiss.confirm': 'Dismiss this companion?',
  'companion.breeding': 'Breeding',
  'companion.breeding.incompatible': 'These creatures are not compatible.',
  'mount.ride': 'Ride',
  'mount.dismount': 'Dismount',
  'mount.tradeoff.hot': 'Burns in cold!',
  'mount.tradeoff.cold': 'Burns in heat!',
};
```

**Spanish translation**: Full translations of all keys.

**Assignment:** Engineer B (English), Engineer A (Spanish)
**Checklist:**
- [ ] All 40+ keys defined in English
- [ ] All 40+ keys translated to Spanish
- [ ] i18nManager exposes `getCompanionString(key)`
- [ ] All UI components use `i18n.getCompanionString()` instead of hardcoded strings
- [ ] `npm run typecheck` passes

### 6.5 World Event Spawns

**File:** `src/companions/biomes/spawnTables.ts` (modify — add event-based spawns)

Add storm-hawk spawn triggered by storm world event:

```typescript
/** Check if a creature should spawn due to a world event */
export function checkEventSpawn(
  eventId: string,
  roomId: string,
  rng: RandomNumberGenerator
): string | null;
```

**Assignment:** Engineer B
**Checklist:**
- [ ] Storm Hawk spawns during storm event
- [ ] Event-based spawns respect world event lifecycle
- [ ] `npm run typecheck` passes

### 6.6 Balance Tests

**File:** `src/companions/__tests__/balanceTests.test.ts`

Automated balance verification:

```typescript
// Max passive effects stacking should not exceed defined caps
describe('Passive effect stacking caps', () => {
  it('fireResistance should not exceed 50%', () => { ... });
  it('movementSpeed should not exceed +5', () => { ... });
  it('max companions should be enforceable at 4', () => { ... });
});

// Spawn rate verification
describe('Spawn rates', () => {
  it('common creatures should spawn more frequently than legendary', () => { ... });
  it('each creature should have at least one valid biome', () => { ... });
});

// Time to first tame validation
describe('Time to first tame', () => {
  it('common creature should be tamable within 10-20 minutes of gameplay', () => { ... });
});
```

**Assignment:** Engineer A
**Checklist:**
- [ ] All balance caps verified
- [ ] Spawn rate distribution tested
- [ ] Time-to-first-tame validated
- [ ] `npm run typecheck` passes
- [ ] `npm run build` succeeds

### 6.7 Save/Load Full Integration Test

**File:** `src/companions/__tests__/saveLoad.integration.test.ts`

Full end-to-end save/load test:

1. Spawn, tame, feed, and develop bond with 3 companions
2. Use abilities on them
3. Save the game
4. Reload the game
5. Verify all companion state is preserved (bond levels, abilities used, mood, etc.)
6. Verify compendium state is preserved
7. Verify flags are correctly read/written

**Assignment:** Engineer A
**Checklist:**
- [ ] Full state round-trip works
- [ ] All companion instances restored
- [ ] Compendium discovered state restored
- [ ] Bond levels, progress, mood all preserved
- [ ] Ability cooldowns restored
- [ ] `npm run typecheck` passes

---

## Phase 6 Acceptance Criteria

1. All 6 creature quests functional and completable
2. Creature food items available in shops
3. Tamer's Cloak and Beast Tamer Ring functional
4. All 36 creatures discoverable
5. I18n strings resolve correctly in both English and Spanish
6. Save/load preserves all companion state
7. Balance tests pass
8. `npm run typecheck` passes
9. `npm run build` succeeds
10. Full end-to-end playtest: spawn → observe → feed → tame → bond → ability → mount → breed → save → reload

---

## Cross-Phase Dependencies

```
Phase 1 (Core Foundation)
  ├── companionTypes.ts          — types for all phases
  ├── companionRegistry.ts       — definitions used by all phases
  ├── companionService.ts        — runtime logic used by all phases
  ├── companionState.ts          — save integration used by all phases
  ├── compendiumSystem.ts        — discovery tracking used by phases 2-5
  ├── companionEncounterPopup.ts — UI used in phases 1-6
  ├── companionRenderer.ts       — rendering used by all phases
  ├── juice.ts (modified)        — sound effects used by all phases

Phase 2 (Passive Traits & Bond)
  ├── bondSystem.ts              — builds on Phase 1
  ├── snakeState.ts (modified)   — reads companion state, applies effects
  ├── companionHud.ts            — builds on Phase 1 renderer
  ├── compendiumOverlay.ts       — builds on Phase 1 compendium
  ├── item.ts (modified)         — adds modifier keys

Phase 3 (Abilities & Combat)
  ├── abilitySystem.ts           — builds on Phase 1 service
  ├── abilitySelectionUI.ts      — builds on Phase 1 popup pattern
  ├── fighter.ts                 — builds on Phase 1 types
  ├── protector.ts               — builds on Phase 1 types
  ├── juice.ts (modified)        — adds ability VFX

Phase 4 (Mount & Polish)
  ├── mountSystem.ts             — builds on Phase 1 types
  ├── mountUI.ts                 — builds on Phase 4 HUD
  ├── companionHud.ts (modified) — expands Phase 2 HUD
  ├── companionDialogue.ts       — new polish system
  ├── juice.ts (modified)        — adds polish VFX

Phase 5 (Breeding & Bestiary)
  ├── breedingSystem.ts          — builds on Phase 1 types + Phase 4 mount system
  ├── breedingUI.ts              — new UI
  ├── companionRegistry.ts (modified) — adds remaining 24 creatures

Phase 6 (Integration & Content)
  ├── itemRegistry.ts (modified) — new food + equipment items
  ├── quest definitions (6 new)  — builds on Phase 1-5
  ├── quest.ts (modified)        — extends QuestRuntime
  ├── spawnTables.ts             — new spawn system
  ├── companionStrings.ts (en)   — i18n
  ├── companionStrings.ts (es)   — i18n
  ├── i18nManager.ts (modified)  — adds companion string lookup
```

---

## Testing Strategy by Phase

| Phase | Unit Tests | Integration Tests | Visual Tests | Balance Tests |
|-------|-----------|-------------------|-------------|--------------|
| 1 | Service methods, compendium, state serialization | Save/load round-trip | Sprite rendering, encounter popup | — |
| 2 | Bond progression, trait stacking, neglect decay | Equipment modifier interaction | HUD panel, compendium overlay | Trait stacking caps |
| 3 | Ability cooldowns, fighter/protector logic | Combat integration | Ability VFX, protector cooldown ring | Ability power caps |
| 4 | Mount speed, tradeoffs | Mount/unmount in hazards | Mount UI, polish VFX | Mount speed limits |
| 5 | Breeding compatibility, trait inheritance | Full breeding workflow | Breeding UI | Offspring limits |
| 6 | Quest conditions, spawn weights | Full playthrough | All UI in EN/ES | Full balance suite |

---

## Risk Mitigation

| Risk | Mitigation |
|------|-----------|
| Companion system adds complexity to SnakeScene | Keep CompanionService self-contained; clear interface contracts |
| 36 creatures = a lot of content | Use Phase 1 for 12 creatures; Phase 5 adds remaining 24 |
| Bond system overlaps with relationship system | Bond is simpler (5 levels); keep separate but compatible |
| Save format drift | Version field + migration logic in companionState.ts |
| Performance from extra sprites | Max 8 companions; negligible overhead per PLAN §18.2 |
| Balance breaking with equipment | Additive stacking only; tested in Phase 2 and 6 |

---

## Code Quality Guidelines

1. **No hardcoded strings in UI** — all strings go through i18n
2. **No direct access to snakeState.flags from companion logic** — use `CompanionService` as the single access point
3. **No Phaser dependencies in type files** — `companionTypes.ts` is pure TypeScript
4. **No game logic in UI files** — UI files are presentational; logic stays in services
5. **All new files need a single-line doc comment** explaining what the file does
6. **All public methods need JSDoc comments** with parameter and return descriptions
7. **All public types need JSDoc comments** describing the type's purpose

---

## Estimated Total Effort

- **Phases 1-2:** 3 weeks (core + passive systems)
- **Phase 3:** 1 week (abilities + combat)
- **Phase 4:** 1 week (mounts + polish)
- **Phase 5:** 1 week (breeding + full bestiary)
- **Phase 6:** 1 week (integration + content + testing)
- **Total:** 7 weeks with 2 engineers, or 9-10 weeks with 1 engineer

**Estimated code additions:** ~4,000-6,000 lines across 15+ new files, 4 modified files.
