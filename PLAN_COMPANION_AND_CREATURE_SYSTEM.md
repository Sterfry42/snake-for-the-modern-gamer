# Companion & Creature System — Implementation Plan

> "A snake is only as strong as the creatures at its side."

## 1. Overview

A comprehensive **pet and companion system** that lets players discover, tame, bond with, and ride creatures found throughout the game world. Creatures follow the snake, provide passive buffs, unlock active abilities, and form emotional bonds through the existing relationship system. This adds emotional depth, meaningful gameplay variety, and a compelling meta-progression loop.

### Design Goals

- **Discovery**: Creatures are hidden or rare finds that reward exploration
- **Bonding**: Emotional connection through interaction, feeding, and shared adventures
- **Meaningful gameplay**: Each companion type offers distinct mechanical advantages
- **Progression**: Level up, unlock abilities, and build a bestiary
- **Emotional resonance**: Creatures remember you, react to your behavior, and some form deep bonds

### What This Does NOT Do

- No multiplayer or persistent online features
- No new rendering engine work — creatures reuse the sprite recipe system
- No major changes to core snake movement — creatures enhance, never break

---

## 2. System Architecture

### 2.1 High-Level Component Diagram

```
SnakeScene (monolith)
├── CompanionRegistry       ← Creature definitions & spawning
├── CompanionService        ← Runtime creature management
├── CompanionState          ← Per-companion state tracking
├── BondSystem              ← Relationship integration
├── AbilitySystem           ← Active abilities on Q/ability slots
├── CompendiumSystem        ← Discovery tracking & bestiary UI
└── MountSystem             ← Riding mechanics (if implemented)
```

### 2.2 Where New Files Live

```
src/
├── companions/                          # NEW
│   ├── companionTypes.ts                # Types & interfaces
│   ├── companionRegistry.ts             # Creature definitions
│   ├── companionService.ts              # Runtime management
│   ├── companionState.ts                # State & save integration
│   ├── bondSystem.ts                    ← NEW (extends relationships)
│   ├── abilitySystem.ts                 ← NEW
│   ├── mountSystem.ts                   ← NEW
│   ├── biomes/
│   │   └── spawnTables.ts               # Biome-specific spawn tables
│   └── behaviors/
│       ├── follower.ts                  # Passive follower
│       ├── protector.ts                 # Blocks hazards
│       ├── scout.ts                     # Reveals map hints
│       ├── forager.ts                   # Apple detection
│       └── fighter.ts                   # Combat assistance
├── ui/
│   ├── companionUI.ts                   ← NEW
│   ├── compendiumOverlay.ts             ← NEW
│   └── spriteRecipes/
│       └── companionRecipe.ts           ← NEW
├── i18n/
│   └── languages/
│       ├── companion_en.ts              ← NEW
│       └── companion_es.ts              ← NEW
```

---

## 3. Creature Definitions

### 3.1 Companion Types (6 Categories)

Each type has distinct behavior, visual design, and gameplay role.

#### A. Followers (Passive Support)

Small creatures that follow behind the snake and provide passive buffs.

| Creature | Rarity | Biome | Passive Effect | Unlock Quest |
|----------|--------|-------|----------------|--------------|
| **Ember Wisp** | Common | Ember Waste | +5% fire resistance | None — random encounter |
| **Frost Sprite** | Common | Moonlit Parish | +5% cold resistance | None — random encounter |
| **Gloom Moth** | Uncommon | Gloam Garden | +10% apple spawn rate | "Light the Garden" |
| **Silt Salamander** | Uncommon | Sunken Ocean | +1 water tile tolerance | "Fisherman" quest completion |
| **Dust Bunny** | Common | Liberty Badlands | +1 movement speed tick | None — random encounter |
| **Moss Imp** | Common | Elderwood Maze | +5% wall sense radius | None — random encounter |

#### B. Protectors (Damage Mitigation)

Larger creatures that intercept danger.

| Creature | Rarity | Biome | Active Protection | Unlock |
|----------|--------|-------|-------------------|--------|
| **Stoneback Turtle** | Rare | Verdigris Basin | Absorbs 1 wall collision per 30s | Explore 3 rooms |
| **Ironscale Carp** | Rare | Sunken Ocean | Prevents water tile death for 10s (30s cooldown) | Complete fishing minigame |
| **Bramble Boar** | Rare | Elderwood Maze | Blocks 1 enemy attack per 20s | Defeat 10 enemies |
| **Ashen Hound** | Epic | Ember Waste | Absorbs 1 temperature death per 60s | Survive ember waste for 5 min |

#### C. Scouts (Information)

Reveal hidden world data.

| Creature | Rarity | Biome | Information Revealed | Unlock |
|----------|--------|-------|---------------------|--------|
| **Owl of the Thorn** | Rare | Elderwood Maze | Shows nearest room with apples for 15s | Explore 5 rooms |
| **Tide Seer** | Rare | Sunken Ocean | Reveals water tile patterns for 10s | Dive to z=-2 |
| **Rust Moth** | Uncommon | Liberty Badlands | Shows nearest shop/structure on minimap | Find first shop |
| **Dusk Mole** | Uncommon | Sable Depths | Reveals portal locations in current room | Survive sable depths |

#### D. Foragers (Resource Bonus)

Increase resource acquisition.

| Creature | Rarity | Biome | Resource Effect | Unlock |
|----------|--------|-------|-----------------|--------|
| **Goldfinch** | Uncommon | Verdigris Basin | +10% apple score | Eat 20 gold apples |
| **Copper Rat** | Common | Any town | +5% shop discount | Visit 3 shops |
| **Pearl Shell** | Rare | Sunken Ocean | Pearl apples worth +50% score | Eat 5 pearl apples |
| **Honey Drake** | Epic | Gloam Garden | Honey apples grant double effect | Collect 10 honey |

#### E. Fighters (Combat Assist)

Actively help in combat against enemies and bosses.

| Creature | Rarity | Biome | Combat Effect | Unlock |
|----------|--------|-------|---------------|--------|
| **Thorn Viper** | Rare | Elderwood Maze | 10% chance to dodge enemy bullets | Defeat 5 enemies |
| **Ashen Hound** | Epic | Ember Waste | 5% chance to damage nearby enemies on apple | See protector |
| **Freak Biter** | Legendary | Any (post-Dennis) | Reduces boss pull strength by 15% | Defeat Freak Dennis |
| **Shadow Jackal** | Legendary | Any (night) | +20% enemy kill score | Survive 10 night encounters |

#### F. Mounts (Movement)

Rideable creatures for faster exploration (with tradeoffs).

| Creature | Rarity | Biome | Ride Effect | Tradeoff |
|----------|--------|-------|-------------|----------|
| **Wild Boar** | Uncommon | Verdigris Basin | +40% movement speed | Harder turning (1-frame input delay) |
| **River Koi** | Rare | Sunken Ocean | Can traverse water safely for 20s | Cannot eat apples while mounted |
| **Desert Strider** | Epic | Liberty Badlands | Immune to heat, +30% speed | Burns in cold biomes |
| **Storm Hawk** | Legendary | Any (storm event) | Brief flight over hazards (5s cooldown) | Requires storm weather event |

### 3.2 Creature Definition Interface

```typescript
// src/companions/companionTypes.ts

export type CompanionKind = 'follower' | 'protector' | 'scout' | 'forager' | 'fighter' | 'mount';
export type CompanionRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

export type CompanionTraitId =
  | 'fireResistance' | 'coldResistance' | 'movementSpeed' | 'wallSenseRadius'
  | 'appleScoreBonus' | 'appleSpawnBonus' | 'waterSafe' | 'damageMitigation'
  | 'bulletDodgeChance' | 'bossPullReduction' | 'shopDiscount' | 'mapReveal'
  | 'hazardDetection' | 'cooldownReduction';

export interface CompanionTrait {
  traitId: CompanionTraitId;
  value: number;  // Scaled: 0.05 = 5%, 10 = 10 ticks, etc.
  description: string;
}

export interface CompanionDefinition {
  id: string;                          // e.g., 'ember-wisp'
  name: string;                        // Display name
  species: string;                     // e.g., 'wisp', 'salamander', 'owl'
  kind: CompanionKind;
  rarity: CompanionRarity;
  portraitId: string;                  // For UI portraits
  spriteRecipeId: string;              // For in-game rendering
  size: number;                        // Grid cells wide/tall (0.5 = half cell)
  followOffset: { x: number; y: number };  // Position relative to snake head
  maxBonds: number;                    // Max bonding level (affects ability unlocks)
  traits: CompanionTrait[];
  abilities: CompanionAbility[];       // Active abilities unlocked at bond levels
  spawnTable: SpawnTableEntry[];       // Where/when they can be encountered
  tameCost: TameCost;                  // What it takes to tame
  description: string;
  lore?: string;                       // Flavor text for compendium
  minRoomsVisited?: number;            // Minimum rooms to encounter
}
```

### 3.3 Active Ability Interface

```typescript
export interface CompanionAbility {
  abilityId: string;
  name: string;
  description: string;
  requiresBondLevel: number;           // Bond level to unlock
  cooldownRooms: number;               // Cooldown in rooms (not time!)
  cooldownTicks?: number;              // Alternative: cooldown in ticks
  effect: 'heal' | 'shield' | 'dash' | 'reveal' | 'buff' | 'attack' | 'summon' | 'mount';
  parameters: Record<string, number>;  // Effect-specific parameters
  soundEffectId?: string;              // Juice sound to play
}
```

---

## 4. Taming Mechanics

### 4.1 The Taming Process

Taming is not instantaneous — it's a multi-step process that creates a meaningful moment:

```
Encounter → Observe → Feed → Bond → Tame
```

1. **Encounter**: Creature appears in the world (random spawn, quest reward, or structure)
2. **Observe**: Player interacts to learn about the creature (dialogue + info panel)
3. **Feed**: Player must feed the creature a specific item/food (varies by creature type)
4. **Bond**: Player must interact multiple times over time (days/rooms) to build trust
5. **Tame**: Final interaction after bond threshold reached — creature becomes permanent

### 4.2 Taming Cost Structure

```typescript
export interface TameCost {
  // Required food items for initial taming
  foodItems: Array<{ itemId: string; count: number }>;
  // Minimum bond level before taming is possible
  minimumBondLevel: number;
  // Special conditions (optional)
  conditions?: {
    requiredQuestCompleted?: string;
    minRoomsVisited?: number;
    requiresReligion?: string;
    onlyAtNight?: boolean;
    onlyInBiome?: string;
    onlyDuringEvent?: string;
  };
}
```

### 4.3 Taming Success Chance

Success is not guaranteed for rare creatures, adding drama:

| Rarity | Base Success Rate | Bond Level Modifier |
|--------|-------------------|---------------------|
| Common | 100% | +0% (always succeeds) |
| Uncommon | 85% | +5% per bond level |
| Rare | 70% | +5% per bond level |
| Epic | 50% | +5% per bond level |
| Legendary | 30% | +5% per bond level |

If taming fails, the creature flees. The player must re-encounter it. Repeated failures make re-encounters rarer (tracked in flags: `companions.encounterCooldown.{creatureId}`).

---

## 5. Bond System

### 5.1 Bond Levels

Bond levels mirror the existing relationship system's heart progression but simplified for creatures:

| Bond Level | Hearts | Name | Description |
|------------|--------|------|-------------|
| 1 | | Fledgling | Just tamed. Doesn't fully trust you. |
| 2 | | Trusted | Follows reliably. First ability unlocked. |
| 3 | | Devoted | Strong bond. Second ability unlocked. |
| 4 | | Kindred | Deep connection. Third ability unlocked. |
| 5 | | Legendary | Unbreakable bond. All abilities + unique passive. |

### 5.2 Bond Progression

Bond increases through:

1. **Feeding**: +1 bond per feed (limited per day — default: 3 feeds/day)
2. **Sharing victories**: +1 bond when apple eaten in same room as companion (daily cap: 2)
3. **Surviving danger**: +2 bonds when companion uses protector ability to save you
4. **Special gifts**: +3 bonds for giving creature-specific favorite items
5. **Neglect penalty**: -1 bond per 50 rooms without interaction (cap: -3)

Bond is tracked as `companions.bonds.{companionId}` with value 0-100 (percentage toward next level).

### 5.3 Bond Effects on Gameplay

Bond level affects:

- **Ability unlocks**: Abilities gated behind bond levels (see §3.3)
- **Passive strength**: Some passive buffs scale with bond level (e.g., 5% → 10% → 15% at bond 5)
- **Creature AI**: Higher bond = more proactive ability usage
- **Creature voice lines**: More expressive dialogue at higher bonds
- **Emotional events**: At bond 5, special cutscene plays (creature "saves" you with unique animation)

---

## 6. Companion Service (Runtime)

### 6.1 Core Class

```typescript
// src/companions/companionService.ts

export class CompanionService {
  private readonly snakeGame: SnakeGame;
  private readonly companions: Map<string, CompanionInstance> = new Map();
  private readonly juicemanager: JuiceManager;

  // Spawn a new companion
  spawnCompanion(companionId: string, roomId: string, x: number, y: number): void;

  // Attempt to tame a wild creature
  attemptTame(companionId: string, playerId: string): TameResult;

  // Feed a companion
  feedCompanion(companionId: string, itemId: string): FeedResult;

  // Increase bond with a companion
  increaseBond(companionId: string, amount: number): void;

  // Check all passive effects currently active
  getAllPassiveEffects(): CompanionTrait[];

  // Use an active ability (triggers cooldown, plays effect)
  useAbility(companionId: string, abilityId: string): AbilityResult;

  // Get companion positions for rendering
  getCompanionRenderData(): CompanionRenderData[];

  // Tick-based updates (movement, cooldowns, abilities)
  step(stepMs: number): void;

  // Save/Load
  getSnapshot(): CompanionSaveData;
  loadSnapshot(data: CompanionSaveData): void;
}
```

### 6.2 Companion Instance

```typescript
export interface CompanionInstance {
  id: string;                         // Unique per-player (UUID)
  definitionId: string;               // Reference to CompanionDefinition
  bondLevel: number;                  // 1-5
  bondProgress: number;               // 0-100 within current level
  currentRoomId: string;
  gridX: number;
  gridY: number;
  lastFedRoom: number;                // Room number of last feed (for daily cap)
  feedCountThisDay: number;           // Feeds today (resets on day change)
  lastInteractionRoom: number;        // For neglect tracking
  abilitiesUsed: Map<string, number>; // abilityId -> lastUsedRoom
  totalApplesEatenTogether: number;
  totalDangersSurvived: number;
  mood: 'happy' | 'neutral' | 'sad' | 'excited' | 'protective';
  flags: Record<string, unknown>;
}
```

### 6.3 Companion Rendering

Each companion is rendered as a sprite positioned relative to the snake head:

- Followers trail behind the snake body (offset by follower index)
- Protectors hover near the head
- Scouts orbit the minimap area
- Fighters position themselves near enemies when in combat
- Mounts replace the snake head visual (with rider indicator)

The sprite system uses existing `RuntimeSpriteFactory` with custom companion recipes. Movement is interpolated each tick for smooth following.

---

## 7. Spawn System

### 7.1 Spawn Tables

```typescript
// src/companions/biomes/spawnTables.ts

interface SpawnTableEntry {
  biomeId: string;
  roomCondition: 'any' | 'structure' | 'dangerous' | 'water';
  minRoomsVisited: number;
  baseWeight: number;               // Higher = more common
  scoreWeight?: number;             // Weight scales with player score
  timeOfDayBias?: 'day' | 'night' | 'any';
  eventBias?: string;               // Only during specific world events
}
```

### 7.2 Spawn Methods

Creatures can appear through:

1. **Random world encounter** (like wanderers but non-hostile): 0.5% chance per room entry
2. **Structure-dwelling**: Certain structures always have a creature (e.g., shrine cats, goblin dogs)
3. **Quest reward**: Completing certain quests grants a creature directly
4. **Shop purchase**: Some shops sell creature food that attracts creatures
5. **Breeding**: Two companions of the same type can produce offspring (§9)
6. **World events**: Rare events spawn unique creatures (storm spawns Storm Hawk)

### 7.3 Spawn Weight Calculation

```
effectiveWeight = baseWeight × scoreMultiplier × roomConditionMultiplier

scoreMultiplier = 1 + (score / 1000) * 0.1    // Diminishing returns
roomConditionMultiplier = { any: 1.0, structure: 2.0, dangerous: 0.5, water: 0.8 }
```

---

## 8. Bestiary / Compendium System

### 8.1 Compendium State

Tracks all discovered creatures for the player.

```typescript
// src/companions/compendiumSystem.ts

export class CompendiumSystem {
  private discovered: Set<string> = new Set();       // Creature IDs discovered
  private firstEncountered: Map<string, number> = new Map();  // creatureId -> roomNum
  private totalEncounters: Map<string, number> = new Map(); // creatureId -> count
  private tamed: Set<string> = new Set();            // Creature IDs currently tamed
  private maxBondReached: Map<string, number> = new Map(); // creatureId -> maxBondLevel

  discoverCompanion(companionId: string, roomNumber: number): void;
  isDiscovered(companionId: string): boolean;
  getDiscoveryCount(): number;
  getTotalCompanions(): number;
  getCompendiumView(): CompendiumEntry[];
  getLore(companionId: string): string | undefined;
  getSnapshot(): CompendiumSaveData;
  loadSnapshot(data: CompendiumSaveData): void;
}
```

### 8.2 Compendium UI

A full-screen overlay (similar to skill tree) showing:

- **Grid view** of all creatures with icons
- **Discovered** creatures shown in full color; undiscovered shown as silhouettes with question mark
- **Clicking a creature** opens detail panel with:
  - Name, rarity, kind
  - Description and lore
  - Passive traits and abilities
  - Bond level (if tamed)
  - "Taming Guide" hint (without giving away exact method)
- **Filter buttons**: All / Followers / Protectors / Scouts / Foragers / Fighters / Mounts
- **Rarity filter**: Show/hide by rarity tier
- **Discovery counter**: "12/36 discovered"

### 8.3 Compendium Rewards

Reaching milestones unlocks cosmetic rewards:

| Discovered | Reward |
|------------|--------|
| 5 | "Creature Whisperer" hat |
| 12 | New snake palette: "Beast Tamer" |
| 20 | New hat: "Bestiary Keeper" |
| 30 | "Tamer's Cloak" equipment |
| 36 (all) | "Legend of Creatures" title + unique snake style |

---

## 9. Creature Breeding (Phase 2)

### 9.1 Breeding Mechanics

At bond level 5, two compatible companions can breed to produce offspring:

```
Requirements:
- Both parents at bond level 5
- Both currently tamed and present in the same room
- Player has breeding food item
- One-time "breeding event" dialogue
```

### 9.2 Offspring Traits

Offspring inherit:

- **Kind**: Random from either parent's kind
- **Traits**: 50% chance to inherit each parent trait
- **Rarity**: Up to 1 tier better than either parent (so two epics can produce a legendary)
- **Bond**: Starts at bond level 1

### 9.3 Breeding Food

Special item required for breeding:

```
"Primordial Egg" — A shimmering egg found in deep caves. When placed with two bonded creatures at maximum affection, something stirs...
```

Purchased from the Goblin Merchant for 5000 score + rare materials.

---

## 10. Integration Points

### 10.1 With Existing Systems

| System | Integration |
|--------|-------------|
| **Actor System** | Creatures are actors with `kind: 'animal'`, `role: 'pet'` in the world. CompanionService queries the actor registry for spawn data. |
| **Relationship System** | Bond system shares types (`RelationshipStage` maps to bond levels). Creatures can be dating candidates via the existing relationship framework. |
| **Inventory System** | Creature food items stored in inventory. Taming costs checked via `getItemCount()`. |
| **Equipment System** | Companion buffs stack with equipment modifiers. Some equipment can enhance companion abilities. |
| **Quest System** | Creature-related quests use existing quest definitions. "Adopt a creature" quests follow standard accept/complete pattern. |
| **Save System** | Companion state saved via `companions.snapshot` and `compendium.snapshot` in the main save. |
| **Skill Tree** | Skill ranks can enhance companion abilities (e.g., "Beast Tamer" perk reduces cooldowns by 10%). |
| **Juice System** | Companion abilities trigger screen shake, particles, and sound effects. |
| **World Generation** | Spawn tables reference biomes. Structures get creature NPCs. |
| **NPC System** | Some NPCs have companion creatures that follow them (visual + dialogue). |

### 10.2 Flag Conventions

All companion state stored in the existing `flags` system:

```
companions.instances.{instanceId}.definitionId     — string
companions.instances.{instanceId}.bondLevel         — number
companions.instances.{instanceId}.bondProgress      — number (0-100)
companions.instances.{instanceId}.currentRoomId     — string
companions.instances.{instanceId}.gridX             — number
companions.instances.{instanceId}.gridY             — number
companions.instances.{instanceId}.lastFedRoom       — number
companions.instances.{instanceId}.feedCountThisDay  — number
companions.instances.{instanceId}.abilitiesUsed     — Record<string, number>
companions.instances.{instanceId}.mood              — string
companions.instances.{instanceId}.mood              — number
companions.discovered                               — string[] (JSON array of IDs)
companions.maxBondReached                           — Record<string, number>
companions.encounterCooldown.{creatureId}           — number (room number until next encounter)
companions.totalBred                                — number (total creatures bred)
companions.settings.mountAutoEnabled                  — boolean
companions.settings.followerLimit                     — number (max followers, default: 3)
```

### 10.3 SnakeState Integration

```typescript
// In snakeState.ts — add to SnakeState class

getActiveCompanions(): CompanionInstance[];
getPassiveEffects(): CompanionTrait[];
applyPassiveEffects(): void;
canSpawnCompanion(companionId: string): boolean;
getMaxFollowers(): number;
getMount(): CompanionInstance | null;
```

---

## 11. UI Components

### 11.1 Companion Panel (HUD)

Small panel showing active companions — similar to quest tracker:

- Shows 1-3 companion icons at top of screen
- Bond hearts indicator under each icon
- Click to open quick menu: Feed / Use Ability / Compendium
- Disappears if no companions active (auto-collapses)

### 11.2 Creature Encounter Popup

When a wild creature appears:

```
┌─────────────────────────────────────────────┐
│  🦊 Wild Fox                               │
│  ─────────────────────────────────────────  │
│  A small fox with amber eyes watches you    │
│  from behind a tree. It seems curious, not  │
│  afraid.                                   │
│                                             │
│  Rarity: ★★☆☆                              │
│  Kind: Forager                              │
│  Home: Verdigris Basin                      │
│                                             │
│  [Observe] [Feed] [Leave]                   │
└─────────────────────────────────────────────┘
```

### 11.3 Feeding UI

```
┌─────────────────────────────────────────────┐
│  Feed Ember Wisp                            │
│  ─────────────────────────────────────────  │
│  Ember Wisp seems to like warm things...    │
│                                             │
│  Available Food:                            │
│  [🔥 Fire Pepper x3]  (+1 bond)             │
│  [🍖 Dried Meat x2]   (+0.5 bond)           │
│  [🌿 Herbs x5]      (+0.25 bond)            │
│                                             │
│  Feeds remaining today: 2/3                 │
│  Current bond: ★★★☆☆ (70/100)              │
└─────────────────────────────────────────────┘
```

### 11.4 Ability Selection

When using a companion ability:

```
┌─────────────────────────────────────────────┐
│  Select Ability                             │
│                                             │
│  🔥 Ember Burst      (Lv.2)                 │
│  Deal 3 fire damage to all enemies.         │
│  Cooldown: 15s    [USE]                     │
│                                             │
│  🛡️ Flame Shield     (Lv.3)                 │
│  Block next damage for 8s.                  │
│  Cooldown: 30s    [USE]                     │
│                                             │
│  [CANCEL]                                  │
└─────────────────────────────────────────────┘
```

### 11.5 Compendium Overlay

Full-screen bestiary (similar to skill tree screen). Opens with "B" key or from companion panel.

---

## 12. New Items

### 12.1 Creature Food Items

```typescript
// New items in itemRegistry.ts

{
  id: 'fire-pepper',
  name: 'Fire Pepper',
  description: 'A spicy pepper from the Ember Waste. Creatures of flame love it.',
  category: 'food',
  tameBonus: 1.0,
  preferredBy: ['ember-wisp', 'ashen-hound', 'honey-drake']
}

{
  id: 'fresh-fish',
  name: 'Fresh Fish',
  description: 'Still shimmering. Aquatic creatures find this irresistible.',
  category: 'food',
  tameBonus: 1.0,
  preferredBy: ['ironscale-carp', 'tide-seer', 'river-koi']
}

{
  id: 'wild-herbs',
  name: 'Wild Herbs',
  description: 'A bundle of aromatic herbs from the Gloam Garden.',
  category: 'food',
  tameBonus: 0.5,
  preferredBy: ['gloom-moth', 'moss-imp', 'dust-bunny']
}

{
  id: 'meat-skewer',
  name: 'Meat Skewer',
  description: 'Simple but effective. Most creatures find it appealing.',
  category: 'food',
  tameBonus: 0.5,
  preferredBy: ['wild-boar', 'bramble-boar', 'shadow-jackal']
}

{
  id: 'primordial-egg',
  name: 'Primordial Egg',
  description: 'A shimmering egg that pulses with faint energy. Used for breeding.',
  category: 'consumable',
  breedable: true
}
```

### 12.2 Equipment that Boosts Companions

```typescript
{
  id: 'tamers-cloak',
  name: "Tamer's Cloak",
  description: 'A cloak woven with creature fur and scales. Creatures trust you more.',
  kind: 'equipment',
  slot: 'cloak',
  modifiers: {
    bondGainMultiplier: 1.5,    // 50% faster bonding
    maxCompanions: 5            // Can have more companions
  }
}

{
  id: 'beast-tamer-ring',
  name: 'Beast Tamer Ring',
  description: 'A ring that hums with the voices of a hundred tamed creatures.',
  kind: 'equipment',
  slot: 'ring',
  modifiers: {
    abilityCooldownReduction: 0.8,  // 20% faster cooldowns
    companionDamageBonus: 1.25      // 25% more fighter damage
  }
}
```

---

## 13. Sound & Juice

### 13.1 Audio Design

All sounds use existing `JuiceManager` procedural audio.

| Event | Sound Design |
|-------|-------------|
| Creature appears | Soft chime + descending arpeggio (creature type-dependent pitch) |
| Feeding | Gentle "munch" sound + positive blip |
| Bond increase | Warm chord (major 3rd, ascending) |
| Taming success | Fanfare-like burst (3 notes, ascending) |
| Taming failure | Sad descending tone |
| Ability used | Creature-specific sound (roar, chirp, whoosh) |
| Creature death/gone | Fading whistle |
| Compendium open | Page-turn + discovery chime |

### 13.2 Visual Juice

| Event | Effect |
|-------|--------|
| Creature spawns | Gentle particle burst (type-colored) |
| Bond increase | Heart particles float up from creature |
| Taming | Screen flash + ring pulse |
| Ability used | Ability-type VFX (fire particles, shield glow, etc.) |
| Mounting | Camera shake + speed lines |
| New discovery | Spotlight effect + name reveal |
| Neglect | Creature sprite fades slightly, sad particles |

---

## 14. Save System Integration

### 14.1 Save Data Structure

```typescript
interface CompanionSaveData {
  version: number;                     // 1
  instances: Record<string, CompanionInstance>;
  compositum: CompendiumSaveData;
  settings: {
    mountAutoEnabled: boolean;
    followerLimit: number;
  };
}

interface CompendiumSaveData {
  discovered: string[];                // Creature IDs
  maxBondReached: Record<string, number>;
  totalEncounters: Record<string, number>;
  totalBred: number;
}
```

### 14.2 Save/Load Flow

1. **On game start**: `CompanionService.loadSnapshot()` reads from flags
2. **On save**: `saveManager.save()` includes companion state via existing save hooks
3. **On load**: All companion instances restored with bond levels, abilities, positions
4. **On position change**: Companion currentRoomId updated (creatures teleport to player's room)

---

## 15. Quest Integration

### 15.1 Creature-Related Quests

New quests that tie into the companion system:

| Quest | Type | Description | Reward |
|-------|------|-------------|--------|
| "First Friend" | Tutorial | Tame your first creature | Ember Wisp |
| "Light the Garden" | Exploration | Find the Gloom Moth in Gloam Garden | Gloom Moth |
| "Creature Collector" | Collection | Discover 10 creatures in the compendium | Beast Tamer hat |
| "The Last Storm Hawk" | Story | Find and tame a Storm Hawk during a storm event | Storm Hawk |
| "Bestiary Master" | Challenge | Discover all 36 creatures | Unique snake palette |
| "Pack Leader" | Collection | Have 5 companions active simultaneously | Tamer's Cloak |

### 15.2 Quest Runtime Methods

```typescript
// In QuestRuntime (questController.ts)

getActiveCompanions(): CompanionInstance[];
getCompanionKind(kind: CompanionKind): CompanionInstance[];
getDiscoveredCompanionCount(): number;
isCompanionDiscovered(id: string): boolean;
getMaxBond(companionId: string): number;
getBondLevel(companionId: string): number;
```

---

## 16. Phase Plan

### Phase 1: Core Foundation (Week 1-2)

**Goal**: Basic creature spawning, taming, and following.

- [ ] Create `companionTypes.ts` with all type definitions
- [ ] Create `companionRegistry.ts` with 12 creature definitions (2 per kind)
- [ ] Create `companionService.ts` with spawn, tame, feed, bond logic
- [ ] Create `companionState.ts` with save/load
- [ ] Add follower rendering (creature sprite follows snake)
- [ ] Basic encounter popup UI
- [ ] Integration with existing save system
- [ ] Basic sound effects via JuiceManager
- **Test**: Spawn creature → Observe → Feed → Tame → Follow snake

### Phase 2: Passive Traits & Bond System (Week 3)

**Goal**: Companions provide meaningful passive effects and bond progression.

- [ ] Implement `companionState.ts` passive trait evaluation
- [ ] Bond level system with progression tracking
- [ ] Bond display in companion panel
- [ ] Passive effect stacking (multiple companions)
- [ ] Equipment interaction (items that boost companions)
- [ ] Compendium system basics (discovery tracking)
- [ ] Compendium UI overlay
- **Test**: Multiple companions with stacked passive effects work correctly

### Phase 3: Abilities & Combat (Week 4)

**Goal**: Active abilities and fighter companions.

- [ ] Implement `abilitySystem.ts` with cooldown management
- [ ] Ability selection UI
- [ ] Fighter companion combat integration
- [ ] Ability sound effects and visual juice
- [ ] Protector ability (hazard blocking)
- [ ] Integration with existing combat systems
- **Test**: Abilities trigger correctly with proper cooldowns

### Phase 4: Mount System & Polish (Week 5)

**Goal**: Rideable creatures and quality of life.

- [ ] Implement `mountSystem.ts` with ride mechanics
- [ ] Mount UI (enter/exit mount)
- [ ] Mount speed modifiers and tradeoffs
- [ ] Companion panel HUD improvements
- [ ] Feeding UI improvements
- [ ] Creature voice lines / dialogue
- [ ] Polish all visual effects
- **Test**: Mount/unmount smoothly, tradeoffs balance correctly

### Phase 5: Breeding & Bestiary (Week 6)

**Goal**: Complete the system with breeding and full bestiary.

- [ ] Implement breeding mechanics
- [ ] Breeding food item
- [ ] Offspring trait inheritance
- [ ] Full compendium with all 36 creatures
- [ ] Compendium milestone rewards
- [ ] Breeding UI
- **Test**: Breed creatures, offspring inherit traits correctly

### Phase 6: Integration & Content (Week 7)

**Goal**: Tie everything together and add content.

- [ ] Creature-related quests
- [ ] Creature food items in shops
- [ ] Companion equipment items
- [ ] World event spawns (storm hawk, etc.)
- [ ] I18n support (en + es)
- [ ] NPC companion creatures (visual only)
- [ ] Balance tuning (spawn rates, bond speeds, ability power)
- **Test**: Full playtest of companion system end-to-end

---

## 17. Balance Guidelines

### 7.1 General Principles

- Companions should **enhance** gameplay, never replace skill
- No companion should make the game trivial
- Tradeoffs should feel fair, not punishing
- Progression should feel rewarding but not grindy

### 7.2 Specific Balance Targets

| Metric | Target | Rationale |
|--------|--------|-----------|
| Time to first tame | 10-20 minutes | Early reward without trivializing |
| Time to all abilities on one creature | 2-4 hours | Meaningful progression |
| Time to discover all creatures | 15-30 hours | Encourages exploration, not speedrun |
| Max passive buffs stacking | 3-4 traits | Prevents overpowered combinations |
| Mount speed bonus | +30-40% | Useful but not gamebreaking |
| Bond neglect decay | 1 bond per 50 rooms | Rewards regular interaction |

### 7.3 Power Creep Prevention

- Companion effects are **additive** with equipment, not multiplicative
- Rare/legendary creatures have longer cooldowns and fewer abilities
- No companion should replace core mechanics (e.g., no auto-pilot, no invincibility)
- Legendary creatures have explicit tradeoffs (e.g., Storm Hawk: powerful but rare event-gated)

---

## 18. Technical Constraints & Considerations

### 18.1 Phaser Scene Integration

- Companions render as sprites added to the SnakeScene's graphics layer
- Movement interpolated per tick (same as snake body segments)
- Z-order: creatures render below the snake body (so snake is always on top)
- Maximum 8 companions on screen at once (limit enforced by `followerLimit` flag)

### 18.2 Performance

- Each companion instance: ~1 sprite + 1 update tick per game tick
- 8 companions × update = negligible overhead (estimated < 0.1ms per tick)
- No physics calculations — position is purely snake-relative
- Ability cooldowns checked on room change, not per-tick

### 18.3 Mobile Compatibility

- Touch controls: Companion panel accessible via tap icon
- Feeding/ability UI adapted for touch (larger buttons)
- Companion sprites slightly larger on mobile for visibility

### 18.4 i18n

All creature names, descriptions, and UI text use the existing `i18n` system:

```typescript
// In companion_en.ts
export const companionStrings = {
  'creature.ember-wisp.name': 'Ember Wisp',
  'creature.ember-wisp.description': 'A tiny flame spirit... ',
  'creature.ember-wisp.lore': 'Legend says...',
  'compendium.discovered': 'Discovered!',
  'companion.feed': 'Feed',
  'companion.tame': 'Attempt to Tame',
  // ...
};
```

---

## 19. Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Companion system too complex for single-scene architecture | High | Start with 6 creatures (2 per kind), expand iteratively |
| Performance impact from extra sprites | Low | 8 max companions is minimal; profile in Phase 1 |
| Balance breaking when combined with existing equipment | Medium | Additive effects only; test stacking in Phase 2 |
| Content creation bottleneck (36 creatures is a lot) | Medium | Use sprite variations + recolors for similar creatures; focus on quality over quantity |
| Bond system overlapping with relationship system | Low | Bond system is simpler (5 levels vs 13 stages); keep separate but compatible |
| Save data bloat | Low | Each companion instance is ~200 bytes; 36 max = ~7KB total |

---

## 20. Success Metrics

This system is successful when:

1. **Players discover and tame at least 3 creatures in their first playthrough**
2. **Players mention creatures in feedback ("I love my Ember Wisp!")**
3. **Companion system is referenced in 2+ quest descriptions**
4. **No game-breaking combinations found after 2 weeks of playtesting**
5. **Compendium completion rate > 20% of players**
6. **Breeding used by at least 5% of active companion owners**

---

## Appendix A: Complete Creature Roster (36 Total)

### Followers (8)
1. Ember Wisp — Ember Waste
2. Frost Sprite — Moonlit Parish
3. Dust Bunny — Liberty Badlands
4. Moss Imp — Elderwood Maze
5. Gloom Moth — Gloam Garden
6. Silt Salamander — Sunken Ocean
7. Cave Cricket — Sable Depths
8. Sun Sparrow — Verdigris Basin

### Protectors (7)
9. Stoneback Turtle — Verdigris Basin
10. Ironscale Carp — Sunken Ocean
11. Bramble Boar — Elderwood Maze
12. Ashen Hound — Ember Waste
13. Deep Shell — Sable Depths
14. Thornback Drake — Gloam Garden
15. Liberty Bastion — Liberty Badlands

### Scouts (6)
16. Owl of the Thorn — Elderwood Maze
17. Tide Seer — Sunken Ocean
18. Rust Moth — Liberty Badlands
19. Dusk Mole — Sable Depths
20. Garden Whisper — Gloam Garden
21. Peak Crow — Jade Peak Province

### Foragers (7)
22. Goldfinch — Verdigris Basin
23. Copper Rat — Any town
24. Pearl Shell — Sunken Ocean
25. Honey Drake — Gloam Garden
26. Ash Gleaner — Ember Waste
27. Frost Nectar — Moonlit Parish
28. Badlands Burrower — Liberty Badlands

### Fighters (4)
29. Thorn Viper — Elderwood Maze
30. Shadow Jackal — Any (night)
31. Freak Biter — Any (post-Dennis)
32. Jade Panther — Jade Peak Province

### Mounts (4)
33. Wild Boar — Verdigris Basin
34. River Koi — Sunken Ocean
35. Desert Strider — Liberty Badlands
36. Storm Hawk — Any (storm event)

---

## Appendix B: Sprite Palette Suggestions

Creature sprites should use the game's existing palette system with creature-specific accents:

| Creature | Base Palette | Accent Color |
|----------|-------------|-------------|
| Ember Wisp | `ember-waste` | #ff6600 (warm orange) |
| Frost Sprite | `moonlit-parish` | #88ccff (ice blue) |
| Dust Bunny | `liberty-badlands` | #d4a76a (sandy) |
| Moss Imp | `elderwood-maze` | #55aa55 (leaf green) |
| Gloom Moth | `gloam-garden` | #cc88ff (mystic purple) |
| Silt Salamander | `sunken-ocean` | #44aacc (marine teal) |
| Owl of the Thorn | `elderwood-maze` | #664422 (bark brown) |
| Goldfinch | `verdigris-basin` | #ffcc00 (gold) |
| Stoneback Turtle | `verdigris-basin` | #888899 (stone grey) |
| Shadow Jackal | `moonlit-parish` | #440066 (deep purple) |

---

*Plan written for Snake for the Modern Gamer.*
*Estimated implementation time: 5-7 weeks with a single developer.*
*Estimated code additions: ~4,000-6,000 lines across 15+ new files.*
