# Achievement Tree, Local Achievements, and Archipelago Refinement Requirements

## 1. Purpose

Implement a first-class achievement system for **Snaked. Revised. Revamped.** that serves three purposes at once:

1. **Local player progression**
   - Give the player a readable, Minecraft-style achievement tree.
   - Reward discovery, mastery, and strange system interactions.
   - Teach the player that the game is more than ordinary Snake without bloating the early game.

2. **Game design map**
   - Use achievements as a guided tour through the game’s existing systems: apples, score, length, equipment, swimming, towns, crime, guilds, relationships, fishing, archaeology, cards, biomes, bosses, caves/layers, extra lives, and rival/roaming snakes.

3. **Archipelago location/check system**
   - Treat achievements as Archipelago locations/checks.
   - Completing an achievement sends the corresponding AP location check.
   - Snake receives items, cards, artifacts, score bundles, length bundles, consumables, traps, and Victory from other players.
   - Replace or supplement the current simple score/length goal with a percentage-based achievement goal.

This document is intended to be detailed enough for a strong one-pass implementation with tests.

---

## 2. High-Level Product Goals

### 2.1 Player-Facing Goals

The player should be able to open an achievement screen from the pause/system menu and see a large, pannable achievement tree.

The tree should:

- feel like a Minecraft advancement tree;
- use pixel-art portraits/icons for every achievement;
- group achievements into broad sections;
- show completed achievements in green;
- show currently available achievements in gold;
- show currently unavailable achievements in gray;
- allow gray achievements to still complete if the player does the thing early;
- show progress for achievements that track counts;
- play a satisfying popup/toast when an achievement unlocks;
- support future expansion without redesigning the system.

### 2.2 Archipelago Goals

Achievements should become the primary long-term AP location/check structure.

The default Archipelago goal should be:

> Complete 60% of enabled AP achievements.

The percentage should be configurable.

Suggested AP goal option values:

- 40%
- 50%
- 60% default
- 70%
- 80%
- 100%

The percentage must be calculated only from achievements enabled for the current AP slot, not necessarily every local achievement that exists in the game.

### 2.3 Engineering Goals

The implementation should be robust, testable, and modular.

Avoid stuffing achievement logic directly into `SnakeScene` or scattering string IDs everywhere.

Use explicit typed definitions, explicit event/snapshot evaluation, local persistence, and integration points from existing systems.

---

## 3. Non-Goals

Do not implement achievement rewards that directly gate gameplay.

Achievements are:

- recognition;
- tutorialization;
- long-term goals;
- optional mastery challenges;
- Archipelago locations.

Achievements are not:

- mandatory gates for local gameplay;
- a second quest system;
- a replacement for save/load;
- a reason to add random grind;
- a reason to require every player to complete every subsystem.

Do not make the achievement tree a flat checklist.

Do not make the tree only text-based.

Do not make the tree randomly generated.

Do not require every local achievement to be an Archipelago location.

Do not include random simulation lottery achievements as core AP checks.

---

## 4. Design Principle: Steerable, Not Random

A good achievement should usually be something the player can intentionally pursue.

Avoid achievements that depend heavily on random simulation outcomes unless the player can reasonably force them during a normal run.

### 4.1 Good Achievement Patterns

Good achievements are things like:

- eat your first apple;
- reach length 100;
- reach length 2,500;
- reach score 500 / 1,000 / 10,000;
- equip equipment;
- swim 25 water tiles;
- drink beer or wine;
- enter a town;
- discover every biome;
- complete Thieves Guild initiation;
- marry an NPC;
- have a baby;
- catch a legendary fish;
- recover a legendary artifact;
- defeat Freak Dennis;
- defeat Jason Statham;
- complete an achievement tree branch;
- complete every achievement tree branch.

### 4.2 Weak Achievement Patterns

Avoid or demote achievements like:

- trigger a random patrol;
- have a jealous rival randomly murder someone;
- have the Thieves Guild randomly betray the player;
- see an extremely rare simulation event with no direct player control.

Those can remain future secret/local achievements if desired, but they should not be required for AP percentage goals.

---

## 5. Current Code Context

This implementation should build on existing systems rather than inventing parallel ones.

Relevant existing code areas include:

- `src/game/snakeGame.ts`
  - central runtime state;
  - score, length, room visits, death reasons;
  - towns, relationships, factions, actors, caves, followers;
  - apple consumption;
  - enemy eating;
  - animal handling;
  - boss events;
  - flags;
  - save/load integration.

- `src/scenes/snakeScene.ts`
  - pause/system UI;
  - existing menu modes;
  - rendering layer;
  - Archipelago client integration;
  - save UI;
  - mobile controls;
  - resolution settings;
  - boss HUD.

- `src/archipelago/archipelagoCheckManifest.ts`
  - current AP locations/items;
  - score, length, apple, quest, item, card, artifact, archaeology, and boss checks;
  - score bundles, length bundles, items, cards, artifacts, traps, and Victory.

- `apworld/snaked_revised_revamped/`
  - Python AP world package;
  - options;
  - item/location tables;
  - goal options;
  - slot data.

- `src/inventory/itemRegistry.ts`
  - equipment and consumables, including revolvers, swim equipment, Phoenix Charm, Baby Bottle, Life Tonic, Ofuda, beer, wine, Snake Burger, Snake Fries, Snake Nuggets, fishing rods, Jade Katana, heat/cold gear.

- `src/world/biomes.ts`
  - biome IDs and titles;
  - temperature hazards;
  - danger levels;
  - biome-specific animal/fish support.

- `src/systems/boss.ts`
  - Freak Dennis;
  - Freaker Dennis;
  - Angel;
  - Jason Statham;
  - Jason vulnerable/defeated phases.

- `src/relationships/relationshipController.ts`
  - date/lover/married/baby/divorce/neglect/hostile/dead states;
  - relationship memories;
  - spouse species rewards;
  - family unlock logic.

- `src/fishing/`
  - fish definitions;
  - rarity;
  - weights;
  - tension;
  - escape/line break/catch results.

- `src/archaeology/`
  - Moleman archaeology state;
  - depth;
  - chain;
  - artifacts;
  - caches;
  - rewards.

- `src/cards/cardGame.ts`
  - card tables;
  - win/loss logic;
  - card-specific scoring effects.

---

## 6. Achievement System Architecture

### 6.1 Proposed New Modules

Create a new folder:

```text
src/achievements/
```

Suggested files:

```text
src/achievements/achievementTypes.ts
src/achievements/achievementDefinitions.ts
src/achievements/achievementManager.ts
src/achievements/achievementStorage.ts
src/achievements/achievementEvents.ts
src/achievements/achievementProgress.ts
src/achievements/achievementTreeLayout.ts
src/achievements/achievementIconCatalog.ts
src/achievements/achievementApMapping.ts
```

Optional test files:

```text
src/achievements/achievementManager.test.ts
src/achievements/achievementStorage.test.ts
src/achievements/achievementTreeLayout.test.ts
src/achievements/achievementProgress.test.ts
src/achievements/achievementApMapping.test.ts
```

---

## 7. Achievement Definition Schema

Each achievement should be data-driven.

Suggested type:

```ts
export type AchievementId = string;

export type AchievementCategory =
  | 'core'
  | 'stats'
  | 'exploration'
  | 'biomes'
  | 'equipment'
  | 'towns'
  | 'guild'
  | 'relationships'
  | 'fishing'
  | 'archaeology'
  | 'cards'
  | 'bosses'
  | 'caves'
  | 'rivals'
  | 'skillTree'
  | 'archipelago';

export type AchievementDifficulty = 'tutorial' | 'easy' | 'medium' | 'hard' | 'legendary' | 'secret';

export interface AchievementDefinition {
  id: AchievementId;
  name: string;
  description: string;
  category: AchievementCategory;
  difficulty: AchievementDifficulty;

  /**
   * Parent achievement IDs in the visual tree.
   * These control availability/gray/gold status, not whether the achievement
   * is allowed to complete.
   */
  prerequisites?: AchievementId[];

  /**
   * Tree coordinates in virtual tree space.
   * These are not screen coordinates.
   */
  tree: {
    x: number;
    y: number;
    section: string;
  };

  /**
   * Pixel portrait/icon metadata.
   * This can map to an existing sprite, generated pixel icon, or new sprite asset.
   */
  icon: AchievementIconSpec;

  /** Progress metadata for UI. Omit for simple one-shot achievements. */
  progress?: AchievementProgressDefinition;

  /** Whether this achievement may be included as an AP location. */
  archipelago?: {
    enabledByDefault: boolean;
    locationName?: string;
    excludeFromPercentageGoal?: boolean;
    category?: string;
  };

  /** Optional secret flag. Secret achievements can hide description until unlocked. */
  secret?: boolean;
}
```

Suggested icon type:

```ts
export interface AchievementIconSpec {
  kind:
    | 'apple'
    | 'snake'
    | 'enemy'
    | 'equipment'
    | 'fish'
    | 'town'
    | 'guild'
    | 'heart'
    | 'baby'
    | 'artifact'
    | 'card'
    | 'boss'
    | 'biome'
    | 'cave'
    | 'drink'
    | 'fastFood'
    | 'water'
    | 'skillTree'
    | 'archipelago';

  variant?: string;
  spriteKey?: string;
  frame?: string | number;
  fallbackGlyph?: string;
}
```

---

## 8. Achievement Completion State

Use a persistent local state object.

Suggested type:

```ts
export interface AchievementState {
  version: 1;
  completed: Record<
    AchievementId,
    {
      completedAtMs: number;
      runSeed?: string;
      source?: 'local' | 'import' | 'debug';
    }
  >;
  progress: Record<AchievementId, AchievementProgressState>;
  discoveredBiomes: string[];
  apSubmitted?: Record<AchievementId, boolean>;
}
```

### 8.1 Persistence

Use localStorage with a versioned key:

```text
snake.achievements.v1
```

Persistence should:

- survive page reload;
- survive local game reset;
- not be erased by a normal run reset;
- be clearable from a debug/developer path if needed;
- handle invalid JSON safely;
- handle missing fields safely;
- avoid crashing in non-browser test environments.

### 8.2 Save File Relationship

Achievements should probably be profile-level rather than run-save-level.

Do not store achievements inside the normal game save unless there is a strong reason.

However, achievement state can be exported for debugging.

---

## 9. Achievement Status Rules

Every achievement shown in the tree has one of these statuses:

### 9.1 Completed / Green

The achievement has been completed.

Display:

- green border/frame;
- completed icon treatment;
- completion date/time if available;
- completed description.

### 9.2 Available / Gold

The achievement is not completed, and all prerequisites are completed.

Display:

- gold frame;
- normal icon;
- normal title/description;
- progress if relevant.

### 9.3 Locked / Gray

The achievement is not completed, and one or more prerequisites are incomplete.

Display:

- gray frame;
- dimmed icon;
- title visible;
- description visible unless secret;
- prerequisite hint;
- progress if relevant, if not secret.

### 9.4 Critical Rule: Gray Achievements Can Still Complete

The tree is a visual guide, not a gameplay gate.

If the player completes a gray achievement early, it must immediately become completed/green.

Example:

- The player has not completed the visual parent for a boss branch.
- They somehow defeat Freak Dennis anyway.
- The Freak Dennis achievement unlocks immediately.

This is required.

---

## 10. Evaluation Model

Use both event-driven and snapshot-driven evaluation.

### 10.1 Event-Driven Achievements

Use events for discrete actions:

```ts
export type AchievementEvent =
  | { type: 'apple:eaten'; appleTypeId: string }
  | { type: 'enemy:eaten'; enemyKind?: string; enemyName?: string }
  | { type: 'equipment:equipped'; itemId: string; slot: string }
  | { type: 'item:consumed'; itemId: string }
  | { type: 'extraLife:gained'; sourceItemId?: string; amount: number }
  | { type: 'water:swamTile'; roomId: string; biomeId: string }
  | { type: 'town:entered'; townId: string; name: string }
  | { type: 'town:gateOpened'; townId: string; scorePaid: number }
  | { type: 'town:crimeCommitted'; crimeKind: string; wantedLevel: number }
  | { type: 'guild:initiationStarted'; townId: string }
  | { type: 'guild:initiationCompleted'; townId: string }
  | { type: 'guild:jobCompleted'; townId: string; jobKind: string }
  | { type: 'relationship:dated'; relationshipId: string }
  | { type: 'relationship:lover'; relationshipId: string }
  | { type: 'relationship:married'; relationshipId: string; itemId?: string }
  | { type: 'relationship:child'; relationshipId: string; childKind: string }
  | { type: 'relationship:divorced'; relationshipId: string }
  | { type: 'fishing:caught'; fishTypeId: string; rarity: string; weight: number; biomeId: string }
  | { type: 'fishing:failed'; reason: 'lineBroken' | 'escape' | 'playerAbort' }
  | { type: 'archaeology:artifactRecovered'; artifactId: string; rarity: string }
  | { type: 'archaeology:cacheRecovered' }
  | { type: 'archaeology:depthReached'; depth: number }
  | { type: 'archaeology:chainReached'; chain: number }
  | { type: 'cards:tableWon'; tableId: string }
  | { type: 'cards:playedWithoutCards' }
  | { type: 'boss:defeated'; bossKind: string; bossName: string }
  | { type: 'boss:jasonVulnerableDamaged'; bossId: string }
  | { type: 'boss:jasonDefeatedWhileVulnerable'; bossId: string }
  | { type: 'biome:discovered'; biomeId: string; title: string }
  | { type: 'cave:entered'; caveId: string; templateId?: string }
  | { type: 'cave:completed'; caveId: string; templateId?: string }
  | { type: 'rivalSnake:lengthReached'; enemyId: string; length: number }
  | { type: 'skillTree:branchCompleted'; branchId: string }
  | { type: 'skillTree:allBranchesCompleted' };
```

### 10.2 Snapshot-Driven Achievements

Use snapshots for ongoing totals:

```ts
export interface AchievementSnapshot {
  score: number;
  length: number;
  roomsVisited: number;
  currentBiomeId?: string;
  discoveredBiomeIds: string[];
  inventoryItemIds: string[];
  equippedSlots: string[];
  cardsOwned: Record<string, number>;
  artifactsOwned: string[];
  completedQuestIds: string[];
  wantedLevelByTown?: Record<string, number>;
  skillTreeCompletedBranchIds?: string[];
  skillTreeAllBranchesCompleted?: boolean;
}
```

Use snapshot evaluation for:

- score thresholds;
- length thresholds;
- rooms visited;
- discover every biome;
- own all artifacts;
- own all cards;
- complete all skill tree branches;
- AP goal percentage.

---

## 11. Achievement Manager API

Suggested public API:

```ts
export class AchievementManager {
  constructor(definitions: readonly AchievementDefinition[], storage: AchievementStorage);

  getState(): AchievementState;
  getDefinitions(): readonly AchievementDefinition[];

  recordEvent(event: AchievementEvent, snapshot?: AchievementSnapshot): AchievementUnlockResult[];
  evaluateSnapshot(snapshot: AchievementSnapshot): AchievementUnlockResult[];

  getAchievementStatus(id: AchievementId): AchievementStatus;
  getProgress(id: AchievementId): AchievementProgressView | null;

  isCompleted(id: AchievementId): boolean;
  complete(id: AchievementId, source?: string): AchievementUnlockResult | null;

  resetLocalStateForTests(): void;
}
```

Suggested unlock result:

```ts
export interface AchievementUnlockResult {
  id: AchievementId;
  name: string;
  description: string;
  icon: AchievementIconSpec;
  completedAtMs: number;
  archipelago?: {
    shouldSubmitLocation: boolean;
    locationKey: string;
  };
}
```

---

## 12. UI Placement

Add an **Achievements** entry under the pause/system menu.

Possible path:

```text
Pause Menu
  Resume
  Save
  Load
  Settings
  Achievements
  Archipelago
  Quit / Reset
```

If the current pause menu already has a “system” subtab, use:

```text
Pause → System → Achievements
```

The achievement screen must be accessible during a run.

The achievement screen should pause gameplay while open.

---

## 13. Achievement Tree UI Requirements

This is the hardest UI piece and should be designed as a viewport/camera system.

### 13.1 Core Model

The achievement tree exists in virtual tree/world space.

The screen is a viewport over that larger tree.

```text
treeX/treeY: coordinates inside the achievement tree
panX/panY: current camera offset
screenX = treeX + panX
screenY = treeY + panY
```

Do not implement panning by manually applying ad-hoc movement logic to individual buttons.

Instead:

1. Store a pan/camera offset.
2. Convert tree coordinates to screen coordinates during layout/render.
3. Move nodes and connector lines according to the pan offset.
4. Keep fixed UI elements fixed.

### 13.2 Fixed UI vs Tree UI

Tree-space elements:

- achievement nodes;
- node icons;
- node frames;
- connector lines;
- section background hints/labels if desired.

Screen-space elements:

- title/header;
- back button;
- progress summary;
- details/tooltip panel;
- AP percentage progress if connected;
- center-on-root button;
- controls hint.

### 13.3 Interaction States

Implement clear interaction state.

Suggested state machine:

```ts
type AchievementTreeInteractionState =
  | { kind: 'idle' }
  | { kind: 'pointerDownBackground'; startX: number; startY: number; startPanX: number; startPanY: number }
  | { kind: 'pointerDownNode'; achievementId: string; startX: number; startY: number }
  | { kind: 'dragging'; startX: number; startY: number; startPanX: number; startPanY: number }
  | { kind: 'detailsOpen'; achievementId: string };
```

### 13.4 Drag Rules

- Pointer down on empty tree background begins a potential pan.
- Pointer movement over a small threshold, such as 4 pixels, starts dragging.
- While dragging:
  - update pan offset;
  - suppress node click;
  - suppress hover changes if needed.
- Pointer up after dragging ends drag.
- Pointer up without dragging on a node opens details.
- Pointer up without dragging on background does nothing.
- Escape closes details or exits achievement screen.
- Back button exits achievement screen.
- Optional: right-click or controller cancel exits details.

### 13.5 Panning Bounds

Implement pan bounds so the tree cannot be lost forever.

Requirements:

- The tree starts centered on the root achievement.
- There is a `Center` or `Root` button to recenter.
- Pan bounds should include generous padding around all nodes.
- If content is smaller than the viewport, keep it centered.
- Dragging should feel smooth at all supported resolutions.

### 13.6 Input Support

Support:

- mouse click;
- mouse drag;
- touch drag;
- pointer events if available;
- keyboard/controller fallback if practical.

Keyboard fallback can be simple:

- arrow keys/WASD pan the tree;
- Enter opens focused node;
- Escape exits/details close;
- Tab cycles nodes.

This does not need to be perfect in the first pass, but mouse/touch panning must be solid.

### 13.7 Node Rendering

Each achievement node should include:

- a square pixel portrait/icon;
- colored frame:
  - green completed;
  - gold available;
  - gray locked;
- optional progress badge;
- optional tiny check mark on completed;
- hover/click affordance.

Node size suggestion:

```text
Icon: 24x24 or 32x32
Frame: 34x34 or 40x40
Spacing: 96–140 px horizontally, 80–120 px vertically
```

Exact sizing should adapt to the existing game resolution and pixel art style.

### 13.8 Connector Lines

Connector lines should connect parent to child achievements.

Line color:

- green if child completed;
- gold if parent completed and child available;
- gray if child locked.

Connector lines are tree-space elements and should move with the pan offset.

### 13.9 Details Panel

Clicking an achievement opens a fixed details panel.

Panel should show:

- portrait/icon;
- name;
- description;
- status;
- progress if any;
- prerequisites if locked;
- completion timestamp if completed;
- AP status if AP connected:
  - not submitted;
  - submitted;
  - not in AP pool;
  - excluded from AP goal.

For progress achievements, show clear progress text:

```text
World Tour
Discover every biome.
Progress: 7 / 9 biomes discovered
```

---

## 14. Achievement Unlock Popup

When an achievement unlocks, display a toast/popup.

Suggested layout:

```text
[portrait] Achievement Unlocked!
           A Classic
           Eat your first apple.
```

Requirements:

- use the same portrait/icon as the tree;
- play a short fanfare/trumpet sound;
- use juice:
  - small scale pop;
  - slide in/out;
  - sparkle/particles if existing juice system supports it;
- queue multiple unlocks;
- do not duplicate popups;
- do not block gameplay;
- if pause/menu is open, still show or queue gracefully;
- respect reduced motion/accessibility settings if available.

Suggested queue behavior:

- show one toast at a time;
- 2.5–4 seconds display;
- if several achievements unlock from the same event, show them sequentially;
- AP submission should not wait for the animation.

---

## 15. Achievement Icons / Pixel Portraits

Each achievement must have a simple pixel portrait representing it.

Do not use plain emoji as final icons.

Acceptable first-pass icon strategies:

1. Use existing sprites where possible.
2. Create simple pixel portraits in the existing sprite style.
3. Use generated icon recipes that map to small pixel-art primitives.
4. Use fallback glyphs only during development.

Every achievement definition should include an icon spec.

Examples:

```ts
{
  id: 'core.firstApple',
  name: 'A Classic',
  icon: { kind: 'apple', variant: 'normal', spriteKey: 'apple-normal' }
}
```

```ts
{
  id: 'boss.defeatJasonStatham',
  name: 'Statham Must Fall',
  icon: { kind: 'boss', variant: 'jason-statham' }
}
```

```ts
{
  id: 'food.comboMeal',
  name: 'Combo Meal',
  icon: { kind: 'fastFood', variant: 'snake-combo' }
}
```

Icon creation should be handled like the rest of the game’s sprites, not as DOM emojis.

---

## 16. Achievement Tree Structure

Use one root achievement.

The root should be:

### A Classic

- ID: `core.firstApple`
- Trigger: eat first apple
- Description: `Eat your first apple.`
- Category: core
- Difficulty: tutorial

From that root, branch into major sections.

Suggested high-level layout:

```text
                          Bosses / Divine
                                ↑
             Cards ← Towns ← A Classic → Exploration / Biomes
                                ↓
                    Equipment / Survival / Food
                                ↓
                  Relationships / Family / Odd Life
                                ↓
                 Fishing / Archaeology / Collections
```

This should feel sprawling but not chaotic.

---

## 17. Initial Achievement Catalog

The following list is the proposed first-pass catalog.

This should be enough to make the local tree feel real and make Archipelago percentage goals meaningful.

The exact count may change during implementation, but target roughly **65–85 achievements**.

---

### 17.1 Core / Tutorial Achievements

#### A Classic

- ID: `core.firstApple`
- Trigger: eat first apple
- Description: `Eat your first apple.`
- Difficulty: tutorial
- AP: enabled

#### Big Bite

- ID: `core.firstEnemy`
- Trigger: eat or defeat first enemy
- Description: `Eat or defeat your first enemy.`
- Difficulty: tutorial
- AP: enabled

#### Dress for the Job

- ID: `equipment.firstEquip`
- Trigger: equip first equipment item
- Description: `Equip your first piece of equipment.`
- Difficulty: tutorial
- AP: enabled

#### City Limits

- ID: `town.firstTown`
- Trigger: enter first town
- Description: `Enter a town.`
- Difficulty: tutorial
- AP: enabled

#### Gone Fishin’

- ID: `fishing.firstCatch`
- Trigger: catch first fish
- Description: `Catch your first fish.`
- Difficulty: tutorial
- AP: enabled

#### Buried Treasure

- ID: `archaeology.firstArtifact`
- Trigger: recover first artifact
- Description: `Recover your first artifact from an archaeology site.`
- Difficulty: tutorial
- AP: enabled

#### No Deck, No Problem

- ID: `cards.playWithoutCards`
- Trigger: play cards without owning any cards
- Description: `Sit down at a card table with no cards to your name.`
- Difficulty: tutorial/easy
- AP: enabled if deterministic

#### Get Drunk

- ID: `items.getDrunk`
- Trigger: consume `beer` or `wine`
- Description: `Drink beer or wine.`
- Difficulty: easy
- AP: enabled

---

### 17.2 Score and Length Achievements

#### Growing Concern

- ID: `stats.length100`
- Trigger: reach length 100
- Description: `Reach length 100.`
- Difficulty: easy/medium
- AP: enabled

#### World Serpent

- ID: `stats.length2500`
- Trigger: reach length 2,500
- Description: `Reach length 2,500.`
- Difficulty: legendary
- AP: enabled, but consider excluding from low-percentage AP if too extreme

#### Pocket Change

- ID: `stats.score500`
- Trigger: reach score 500
- Description: `Reach score 500.`
- Difficulty: easy
- AP: enabled

#### Respectable Score

- ID: `stats.score1000`
- Trigger: reach score 1,000
- Description: `Reach score 1,000.`
- Difficulty: medium
- AP: enabled

#### High Roller

- ID: `stats.score10000`
- Trigger: reach score 10,000
- Description: `Reach score 10,000.`
- Difficulty: hard
- AP: enabled

---

### 17.3 Exploration and Biome Achievements

#### First Steps Out

- ID: `exploration.rooms25`
- Trigger: visit 25 rooms
- Description: `Visit 25 rooms.`
- Difficulty: easy
- AP: enabled

#### Far From Home

- ID: `exploration.rooms100`
- Trigger: visit 100 rooms
- Description: `Visit 100 rooms.`
- Difficulty: medium
- AP: enabled

#### World Tour

- ID: `biomes.discoverAll`
- Trigger: discover every discoverable biome
- Description: `Discover every biome.`
- Progress: `X / Y biomes discovered`
- Difficulty: hard
- AP: enabled

Important:

- Count only discoverable world biomes.
- Exclude internal/special biomes unless the player can intentionally discover them in normal play.
- The UI must display progress:
  - `7 / 9 biomes discovered`
  - or list discovered/missing biomes in details panel.

#### Bring a Jacket

- ID: `biomes.surviveCold`
- Trigger: survive a configured amount of time in a cold hazard biome
- Description: `Survive the cold long enough to prove you packed correctly.`
- Difficulty: medium
- AP: enabled if reliable

#### Sunscreen Snake

- ID: `biomes.surviveHot`
- Trigger: survive a configured amount of time in a hot hazard biome
- Description: `Survive the heat long enough to regret not wearing sunscreen.`
- Difficulty: medium
- AP: enabled if reliable

---

### 17.4 Equipment, Items, and Survival Achievements

#### Full Loadout

- ID: `equipment.fullLoadout`
- Trigger: have equipment in every equipment slot at once
- Description: `Fill every equipment slot.`
- Difficulty: medium/hard
- AP: enabled

#### Formal Disagreement

- ID: `equipment.equipGun`
- Trigger: equip a revolver
- Description: `Equip a revolver.`
- Difficulty: easy
- AP: enabled

#### Permit? What Permit?

- ID: `combat.killWithGun`
- Trigger: kill an NPC or enemy with a gun
- Description: `Settle a disagreement with a firearm.`
- Difficulty: medium
- AP: enabled

#### Olympic Swimmer

- ID: `equipment.swim25`
- Trigger: traverse 25 water tiles while swimming is enabled
- Description: `Swim across 25 water tiles.`
- Progress: `X / 25 water tiles`
- Difficulty: easy/medium
- AP: enabled

Important:

- Count water tiles traversed while the player can safely swim.
- Do not count merely equipping flippers.
- This achievement teaches that swimming exists.

#### Second Chances

- ID: `survival.gainExtraLifeAfterStart`
- Trigger: gain an extra life/death-prevention charge after the run starts
- Description: `Gain an extra life after the run has started.`
- Difficulty: medium
- AP: enabled

Important:

- This is not a revive achievement.
- This is not awarded for starting with extra lives from a background/class.
- It should unlock when the player gains additional life capacity or death-prevention after run initialization.
- Examples:
  - Life Tonic;
  - Ofuda;
  - other future life-gain effects.

#### Cut Through Bureaucracy

- ID: `equipment.wallSmite`
- Trigger: use Jade Katana wall-smite
- Description: `Cut through a wall with the Jade Katana.`
- Difficulty: medium
- AP: enabled

#### Combo Meal

- ID: `food.comboMeal`
- Trigger: consume Snake Burger, Snake Fries, and Snake Nuggets in one run
- Description: `Eat the full snake fast-food combo.`
- Difficulty: medium
- AP: enabled

Alternative simpler version:

- Trigger: consume Snake Burger only.
- Preferred version is the full combo, because it is more achievement-worthy.

---

### 17.5 Town and Crime Achievements

#### Local Ordinance

- ID: `town.commitCrime`
- Trigger: commit any town crime
- Description: `Break a town law.`
- Difficulty: easy/medium
- AP: enabled

#### Public Enemy

- ID: `town.wanted5`
- Trigger: reach wanted level 5 in any town
- Description: `Reach wanted level 5 in any town.`
- Difficulty: hard
- AP: enabled

#### Civil Engineering Fee

- ID: `town.openGate`
- Trigger: pay to open a town gate
- Description: `Pay the gate tax and open a town gate.`
- Difficulty: easy/medium
- AP: enabled

Do not include “trigger a patrol” as a core achievement unless patrols become reliably forceable.

---

### 17.6 Thieves Guild Achievements

#### Chalk Mark

- ID: `guild.initiationStarted`
- Trigger: begin Thieves Guild initiation
- Description: `Find the chalk mark and begin the guild test.`
- Difficulty: medium
- AP: enabled

#### Three Pockets Later

- ID: `guild.initiationCompleted`
- Trigger: complete Thieves Guild initiation and unlock the grate
- Description: `Complete the guild initiation.`
- Difficulty: medium
- AP: enabled

#### Odd Jobs

- ID: `guild.jobCompleted`
- Trigger: complete a guild job
- Description: `Complete a job for the Thieves Guild.`
- Difficulty: medium
- AP: enabled

Do not include random guild betrayal as a core AP achievement.

---

### 17.7 Relationship and Family Achievements

#### First Date

- ID: `relationships.firstDate`
- Trigger: date an NPC
- Description: `Go on a date with an NPC.`
- Difficulty: easy/medium
- AP: enabled

#### Going Steady

- ID: `relationships.lover`
- Trigger: take an NPC as lover
- Description: `Become lovers with an NPC.`
- Difficulty: medium
- AP: enabled

#### With This Bouquet

- ID: `relationships.married`
- Trigger: marry an NPC using the Deep-Lying Bouquet or current marriage item
- Description: `Marry an NPC.`
- Difficulty: medium/hard
- AP: enabled

#### Everyone’s Problem Now

- ID: `relationships.child`
- Trigger: have/adopt a child
- Description: `Start a family.`
- Difficulty: hard
- AP: enabled

#### Record Closed

- ID: `relationships.divorce`
- Trigger: divorce an NPC
- Description: `End a marriage.`
- Difficulty: medium
- AP: optional, maybe local-only

#### Bad Influence

- ID: `relationships.hostile`
- Trigger: turn a relationship NPC hostile or murderous through player actions
- Description: `Turn love into a problem.`
- Difficulty: hard
- AP: optional; include only if deterministic enough

Avoid random rival murder as a required achievement.

---

### 17.8 Fishing Achievements

#### Rare Bite

- ID: `fishing.rareFish`
- Trigger: catch any rare fish
- Description: `Catch a rare fish.`
- Difficulty: medium
- AP: enabled

#### Breakfast of Krakens

- ID: `fishing.krakenBaitfish`
- Trigger: catch Kraken Baitfish
- Description: `Catch the legendary Kraken Baitfish.`
- Difficulty: hard/legendary
- AP: enabled

#### Regional Menu

- ID: `fishing.fiveBiomes`
- Trigger: catch fish in 5 different biomes
- Description: `Catch fish across five different biomes.`
- Progress: `X / 5 biomes`
- Difficulty: medium/hard
- AP: enabled

#### Scale Collector

- ID: `fishing.allFish`
- Trigger: catch every fish type
- Description: `Catch every kind of fish.`
- Progress: `X / Y fish`
- Difficulty: legendary
- AP: optional; include if not too grindy

#### Gone With the Line

- ID: `fishing.lineBreak`
- Trigger: lose a fish to line break
- Description: `Break the line during a fishing attempt.`
- Difficulty: easy/medium
- AP: optional/local-only, because it is failure/random-adjacent

---

### 17.9 Archaeology and Artifact Achievements

#### Cache Me Outside

- ID: `archaeology.firstCache`
- Trigger: recover first archaeology cache
- Description: `Recover an archaeology cache.`
- Difficulty: medium
- AP: enabled

#### Dig Deep

- ID: `archaeology.depth25`
- Trigger: reach archaeology depth 25
- Description: `Reach archaeology depth 25.`
- Difficulty: medium
- AP: enabled

#### Still Digging

- ID: `archaeology.depth50`
- Trigger: reach archaeology depth 50
- Description: `Reach archaeology depth 50.`
- Difficulty: hard
- AP: enabled

#### Chain Reaction

- ID: `archaeology.chain5`
- Trigger: reach archaeology chain 5
- Description: `Reach archaeology chain 5.`
- Difficulty: medium
- AP: enabled

#### The Floor Understands Me

- ID: `archaeology.chain10`
- Trigger: reach archaeology chain 10
- Description: `Reach archaeology chain 10.`
- Difficulty: hard
- AP: enabled

#### Moleman’s Lucky Pebble

- ID: `archaeology.legendaryArtifact`
- Trigger: recover a legendary artifact
- Description: `Recover a legendary artifact.`
- Difficulty: hard
- AP: enabled

#### Museum of Bad Decisions

- ID: `archaeology.allArtifacts`
- Trigger: recover all artifacts
- Description: `Recover every artifact.`
- Progress: `X / Y artifacts`
- Difficulty: legendary
- AP: optional or enabled depending on AP pool size

---

### 17.10 Card Achievements

#### Table Stakes

- ID: `cards.winPorch`
- Trigger: win at Porch Table
- Description: `Win at Porch Table.`
- Difficulty: easy
- AP: enabled

#### Market Logic

- ID: `cards.winMarket`
- Trigger: win at Market Table
- Description: `Win at Market Table.`
- Difficulty: medium
- AP: enabled

#### Dare Accepted

- ID: `cards.winDennisDare`
- Trigger: win at Freak Dennis Dare
- Description: `Win at Freak Dennis Dare.`
- Difficulty: hard
- AP: enabled

#### Everything Worse and Bigger

- ID: `cards.freakDennisFogWin`
- Trigger: win with Freak Dennis Fog active, if this is directly detectable
- Description: `Win through the fog.`
- Difficulty: hard
- AP: optional

#### Full Deck

- ID: `cards.fullDeck`
- Trigger: collect every card
- Description: `Collect every card.`
- Progress: `X / Y cards`
- Difficulty: hard/legendary
- AP: optional or enabled depending on pool

---

### 17.11 Boss Achievements

#### Freak Off

- ID: `boss.defeatFreakDennis`
- Trigger: defeat Freak Dennis
- Description: `Defeat Freak Dennis.`
- Difficulty: hard
- AP: enabled

#### Freakier Friday

- ID: `boss.defeatFreakerDennis`
- Trigger: defeat Freaker Dennis
- Description: `Defeat Freaker Dennis.`
- Difficulty: legendary
- AP: enabled

#### Now He’s Vulnerable

- ID: `boss.damageJasonVulnerable`
- Trigger: damage Jason Statham while he is vulnerable
- Description: `Hurt Jason Statham while he is vulnerable.`
- Difficulty: hard
- AP: enabled

#### Statham Must Fall

- ID: `boss.defeatJasonStatham`
- Trigger: defeat Jason Statham
- Description: `Defeat Jason Statham.`
- Difficulty: legendary
- AP: enabled

Optional stricter version:

#### Proper Statham Timing

- ID: `boss.defeatJasonDuringVulnerable`
- Trigger: defeat Jason Statham during vulnerable phase
- Description: `Defeat Jason Statham during his vulnerable phase.`
- Difficulty: legendary
- AP: optional

Because Jason damage appears mechanically tied to vulnerability, this may collapse into the normal defeat achievement.

#### Meet the Angel

- ID: `boss.meetAngel`
- Trigger: encounter the Angel
- Description: `Meet the Angel.`
- Difficulty: hard
- AP: optional/enabled depending on encounter reliability

#### Meet the Goblin Angel

- ID: `boss.meetGoblinAngel`
- Trigger: encounter the Goblin Angel
- Description: `Meet the Goblin Angel.`
- Difficulty: hard/secret
- AP: optional/local-only unless reliable

---

### 17.12 Cave and Layer Achievements

#### Below the Surface

- ID: `caves.enterFirst`
- Trigger: enter first cave
- Description: `Enter a cave.`
- Difficulty: easy/medium
- AP: enabled

#### Hidden Room

- ID: `layers.enterFirst`
- Trigger: enter first layer/hidden room
- Description: `Enter a hidden room.`
- Difficulty: medium
- AP: enabled

#### Lake Treasure

- ID: `caves.lakeReward`
- Trigger: claim cave lake reward
- Description: `Claim treasure from a cave lake.`
- Difficulty: medium
- AP: enabled if reliable

#### The Walls Speak

- ID: `caves.caveDwellerReward`
- Trigger: claim Cave Dweller reward
- Description: `Accept a gift from someone who understands stone.`
- Difficulty: medium/hard
- AP: optional

---

### 17.13 Rival Snake Achievement

#### Let Them Cook

- ID: `rivals.length25`
- Trigger: a rival/roaming snake reaches length 25
- Description: `Let a rival snake reach length 25.`
- Progress: highest observed rival length
- Difficulty: medium
- AP: enabled if detection is reliable

This is preferred over achievements for random rival deaths or random rival collision events.

---

### 17.14 Skill Tree Achievements

These depend on the skill tree implementation.

If the skill tree is current but named differently, map to the actual implementation.

#### Specialist

- ID: `skillTree.oneBranch`
- Trigger: complete one full skill-tree branch
- Description: `Complete one skill-tree branch.`
- Difficulty: medium
- AP: enabled

#### Multiclassed

- ID: `skillTree.threeBranches`
- Trigger: complete three skill-tree branches
- Description: `Complete three skill-tree branches.`
- Difficulty: hard
- AP: optional/enabled

#### Fully Realized Snake

- ID: `skillTree.allBranches`
- Trigger: complete every skill-tree branch
- Description: `Complete every skill-tree branch.`
- Difficulty: legendary
- AP: enabled or optional depending on AP pool balance

---

## 18. Progress Achievements

Some achievements need progress state.

Examples:

```text
World Tour: discoveredBiomeIds.length / discoverableBiomeIds.length
Olympic Swimmer: waterTilesSwum / 25
Regional Menu: fishingBiomeIds.size / 5
Full Deck: uniqueCardsOwned / totalCards
Museum of Bad Decisions: uniqueArtifactsRecovered / totalArtifacts
Let Them Cook: maxRivalSnakeLength / 25
```

Progress should update even before the achievement is visually available/gold.

Progress should persist.

Progress should be visible in the details panel.

For some achievements, progress can also be visible directly on the node as a tiny badge:

```text
7/9
24/25
```

---

## 19. Local Achievement to AP Mapping

Each AP-enabled achievement maps to one AP location.

Suggested key format:

```text
achievement_<achievement_id_with_dots_replaced_by_underscores>
```

Examples:

```text
achievement_core_firstApple
achievement_equipment_swim25
achievement_food_comboMeal
achievement_boss_defeatFreakDennis
achievement_biomes_discoverAll
```

AP location display names should use the achievement name:

```text
A Classic
Olympic Swimmer
Combo Meal
Freak Off
World Tour
```

The AP manifest should be generated from achievement definitions or validated against them.

Avoid maintaining divergent hand-written AP lists in TypeScript and Python without tests.

---

## 20. Archipelago Design

### 20.1 Achievements as Locations

When a local achievement completes:

1. Achievement manager marks it complete.
2. UI toast is queued.
3. If AP is connected and achievement is in the AP pool:
   - submit the corresponding AP location check.
4. Mark the achievement’s AP check as submitted locally to avoid duplicate sends.
5. If AP reconnects later, submit any completed-but-unsubmitted AP achievements.

### 20.2 Items Received by Snake

Other players should not send “achievements” to Snake.

They send useful Snake things:

- score bundles;
- length bundles;
- equipment;
- consumables;
- cards;
- artifacts;
- traps;
- victory.

This already matches the current AP direction.

### 20.3 Achievement Percentage Goal

Add an AP goal mode:

```text
goal = achievement_percentage
achievement_goal_percentage = 60
```

When the player completes enough enabled AP achievements:

```ts
completedApAchievementCount >= Math.ceil(enabledApAchievementCount * percentage / 100)
```

then the game submits:

```text
achievement_goal
```

or an equivalent Victory location.

That location contains the `Victory` item in the AP world.

### 20.4 Enabled AP Achievement Pool

Do not calculate percentage from every local achievement.

Calculate from AP-enabled achievements only.

Optionally allow AP options to include/exclude categories:

```text
include_relationship_achievements: true/false
include_fishing_achievements: true/false
include_archaeology_achievements: true/false
include_boss_achievements: true/false
include_hard_achievements: true/false
```

First pass can keep this simpler:

- include a curated default AP achievement pool;
- exclude local-only/secret/random achievements;
- default goal percentage: 60%.

### 20.5 Backfill Existing AP Locations

Current AP has score/length/apple/quest/item/card/artifact/archaeology/boss locations.

This implementation should either:

1. migrate these into achievements; or
2. keep them temporarily, but add achievement locations and avoid duplicate checks for the same accomplishment.

Preferred approach:

- make achievements the canonical AP check layer going forward;
- use existing AP location ideas as seed achievements;
- keep item/card/artifact AP items as received rewards;
- retire tiny checks like length 10 / score 10 from long-term AP if they feel too trivial.

### 20.6 AP Slot Data

Slot data should include:

```json
{
  "achievementGoalPercentage": 60,
  "enabledAchievementLocationKeys": ["achievement_core_firstApple", "..."],
  "achievementMetadata": {
    "achievement_core_firstApple": {
      "name": "A Classic",
      "category": "Core",
      "difficulty": "tutorial"
    }
  }
}
```

Client should use slot data to know:

- which achievements are AP locations;
- which achievements count toward percentage;
- goal percentage;
- whether DeathLink is enabled;
- which item IDs/card IDs/artifact IDs can be received.

---

## 21. Archipelago DeathLink

DeathLink is related enough to include in this requirements pass because it belongs in AP settings.

### 21.1 Default DeathLink Behavior

Use the soft model:

> Local game over sends DeathLink. Incoming DeathLink costs one life if possible. If no life is available, incoming DeathLink causes game over.

### 21.2 Do Not Send on Every Life Loss

Do not send DeathLink every time the player loses an extra life.

Reason:

- it is too noisy;
- it can create loops;
- it over-punishes a game with extra-life buffers.

### 21.3 Do Not Echo DeathLink

DeathLink-caused deaths must not send another DeathLink.

Example:

```text
Local wall death, no lives left:
  game over
  send DeathLink

Incoming DeathLink, player has an extra life:
  consume one life
  continue
  do not send DeathLink

Incoming DeathLink, player has no lives:
  game over
  do not send DeathLink
```

### 21.4 DeathLink Options

Suggested AP/client options:

```text
death_link = off | soft | hard
```

Definitions:

```text
off:
  no DeathLink behavior.

soft:
  local game over sends DeathLink.
  incoming DeathLink costs one life if possible.
  incoming DeathLink causes game over if no life is available.
  default if enabled.

hard:
  local game over sends DeathLink.
  incoming DeathLink immediately causes game over.
```

First pass can implement only:

```text
off / soft
```

with hard mode as future work.

### 21.5 DeathLink UI

Show a clear message when DeathLink is received:

```text
DeathLink received from <player>: <cause>
A life was lost.
```

or:

```text
DeathLink received from <player>: <cause>
The run ends.
```

This should use existing UI messaging, not a huge blocking modal.

---

## 22. Integration Points

### 22.1 SnakeGame

`SnakeGame` should expose or invoke achievement events at key points.

Avoid direct UI dependency.

Examples:

- apple consumed: `apple:eaten`
- enemy eaten: `enemy:eaten`
- item equipped: `equipment:equipped`
- item consumed: `item:consumed`
- extra life gained: `extraLife:gained`
- water tile traversed: `water:swamTile`
- town entered: `town:entered`
- town gate opened: `town:gateOpened`
- guild initiation completed: `guild:initiationCompleted`
- relationship actions: `relationship:dated`, `relationship:married`, `relationship:child`
- fishing: `fishing:caught`
- archaeology: `archaeology:*`
- boss defeat: `boss:defeated`
- Jason vulnerable damage: `boss:jasonVulnerableDamaged`
- biome reveal: `biome:discovered`

### 22.2 SnakeScene

`SnakeScene` should:

- own visual achievement tree screen;
- show achievement popups;
- forward AP connection status to achievement UI;
- trigger AP location sends for unlocked AP achievements, or delegate this to an AP achievement bridge.

### 22.3 Archipelago Client

Archipelago client should:

- submit achievement locations;
- avoid duplicate location sends;
- resubmit completed pending AP achievement locations on reconnect;
- receive AP items as it already does;
- support achievement percentage goal;
- support DeathLink if enabled.

### 22.4 Save/Load

Achievements are profile-level and should persist independently from the run save.

However:

- run-specific progress, if needed, can be tracked in achievement progress state;
- per-run achievements like Combo Meal should reset their run progress on new run but persist completion once earned;
- AP submission state should persist independently so completed checks can be submitted later.

---

## 23. AP Backfill / Migration Plan

### 23.1 Current AP Checks to Convert or Mirror

Convert existing check categories into achievements where appropriate:

- score checks;
- length checks;
- apple type checks;
- quest completion checks;
- card collection checks;
- card table wins;
- artifact recovery;
- archaeology depth/chain/cache;
- boss Jason Statham.

### 23.2 New AP Achievement Checks to Add

Add new achievement checks for:

- A Classic;
- Big Bite;
- Dress for the Job;
- Get Drunk;
- Olympic Swimmer;
- City Limits;
- World Tour;
- Combo Meal;
- Freak Off;
- Freakier Friday;
- Statham Must Fall;
- Now He’s Vulnerable;
- Thieves Guild initiation;
- relationship milestones;
- cave entry;
- Let Them Cook;
- skill tree branch completion.

### 23.3 AP Item Pool

Keep and expand the item pool around things Snake can receive:

- score bundles;
- length bundles;
- inventory items;
- cards;
- artifacts;
- traps;
- healing/life items;
- victory.

Do not send achievements as AP items.

---

## 24. Testing Requirements

This should be implemented with tests in the same pass.

### 24.1 Unit Tests: Achievement Manager

Test:

- completing an achievement marks it green;
- completing an achievement is idempotent;
- a gray/locked achievement can still complete;
- prerequisites affect availability but not completion;
- progress updates persist;
- event-driven achievements unlock correctly;
- snapshot-driven achievements unlock correctly;
- multiple achievements can unlock from one event/snapshot;
- duplicate events do not create duplicate unlock popups;
- AP-enabled achievements produce AP submission metadata;
- local-only achievements do not produce AP submission metadata.

### 24.2 Unit Tests: Storage

Test:

- empty storage loads default state;
- invalid JSON loads default state;
- valid state round-trips;
- version mismatch is handled safely;
- completed achievements persist;
- progress persists;
- AP submitted flags persist;
- storage works in test/non-browser environments.

### 24.3 Unit Tests: Tree Layout and Panning

Test pure layout/camera math.

Do not rely on brittle canvas screenshots.

Test:

- tree-to-screen conversion;
- pan offset updates;
- pan bounds clamp;
- root centering;
- drag threshold;
- click suppression after drag;
- node hit testing with pan offset;
- connector endpoints with pan offset.

### 24.4 Unit Tests: Progress Helpers

Test:

- biome progress;
- swim tile progress;
- combo meal per-run progress;
- card collection progress;
- artifact collection progress;
- score/length thresholds;
- AP percentage threshold calculation.

### 24.5 Unit Tests: Archipelago Mapping

Test:

- every AP-enabled achievement has a stable location key;
- no duplicate location keys;
- no duplicate AP location IDs;
- percentage goal excludes local-only achievements;
- 60% threshold uses `ceil`;
- AP manifest and Python apworld tables stay in sync, if feasible.

### 24.6 Integration / Smoke Tests

Where possible, add integration tests for:

- first apple unlocks A Classic;
- score/length threshold unlocks stat achievement;
- consuming beer/wine unlocks Get Drunk;
- gaining Life Tonic/Ofuda unlocks Second Chances;
- defeating Jason emits correct boss achievement;
- AP bridge queues location check after local unlock;
- DeathLink soft mode consumes life but does not echo.

---

## 25. Manual QA Checklist

### 25.1 Achievement Tree UI

- Open pause menu.
- Open Achievements.
- Tree starts centered on root.
- Drag background pans tree.
- Clicking a node opens details.
- Dragging over a node does not accidentally open details.
- Back/Escape returns to pause menu.
- Connector lines move with tree.
- Tooltip/details panel does not move with tree.
- Progress achievements display `X / Y`.
- Completed achievements are green.
- Available achievements are gold.
- Locked achievements are gray.
- A locked/gray achievement can still unlock if completed early.

### 25.2 Popup

- Unlock first apple achievement.
- See achievement toast.
- Toast includes portrait, title, description.
- Sound/fanfare plays.
- Multiple unlocks queue.
- Duplicate unlock does not show twice.

### 25.3 Archipelago

- Connect to AP.
- Complete an AP-enabled achievement.
- Verify location check is sent.
- Disconnect AP.
- Complete an AP-enabled achievement.
- Reconnect AP.
- Verify pending location is sent.
- Complete enough achievements for 60%.
- Verify Victory goal location is sent.
- Receive score bundle.
- Receive length bundle.
- Receive item/card/artifact.
- Receive trap.
- DeathLink soft mode:
  - local game over sends DeathLink;
  - incoming DeathLink consumes life;
  - incoming DeathLink with no life ends run;
  - DeathLink-caused game over does not echo.

---

## 26. Implementation Strategy

Strongly prefer a full one-pass implementation.

Do not stop after only creating definitions.

A useful first pass should include:

1. typed achievement definitions;
2. local achievement state and persistence;
3. event/snapshot evaluation;
4. enough real hooks to unlock the initial achievement set;
5. achievement popup;
6. achievement tree UI with panning;
7. progress display;
8. Archipelago mapping and location submission bridge;
9. AP percentage goal support;
10. DeathLink soft mode;
11. tests;
12. documentation update.

If scope needs to be trimmed, trim the number of achievements wired, not the architecture.

Minimum acceptable first-pass achievement set:

- A Classic;
- Big Bite;
- Dress for the Job;
- Get Drunk;
- Olympic Swimmer;
- City Limits;
- World Tour;
- Score 500;
- Score 1,000;
- Score 10,000;
- Length 100;
- Length 2,500;
- Second Chances;
- Combo Meal;
- Gone Fishin’;
- First artifact;
- Depth 25;
- Chain 5;
- Win each card table;
- First Date;
- Married;
- Have a baby;
- Freak Off;
- Freakier Friday;
- Now He’s Vulnerable;
- Statham Must Fall;
- Let Them Cook;
- one skill-tree branch;
- all skill-tree branches.

---

## 27. Documentation Updates

Update or create docs:

```text
docs/ACHIEVEMENTS.md
docs/ARCHIPELAGO_ACHIEVEMENTS.md
```

`docs/ACHIEVEMENTS.md` should explain:

- achievement system;
- tree UI;
- colors/statuses;
- progress;
- popup;
- local persistence;
- how to add a new achievement;
- how to add an icon;
- how to test.

`docs/ARCHIPELAGO_ACHIEVEMENTS.md` should explain:

- achievements as AP locations;
- AP item pool;
- percentage goal;
- DeathLink behavior;
- AP options;
- manifest/apworld synchronization.

---

## 28. Acceptance Criteria

The implementation is complete when:

- Achievements can be earned locally.
- Achievements persist across reloads.
- Achievement tree opens from pause/system menu.
- Tree can be click-drag panned.
- Nodes have portraits/icons.
- Nodes use green/gold/gray status correctly.
- Gray achievements can unlock early.
- Details panel works.
- Unlock popup works with queueing.
- Progress achievements show progress.
- Initial achievement catalog is implemented or a documented subset is implemented with architecture ready for the rest.
- AP-enabled achievements submit location checks.
- AP goal can be based on configured achievement percentage, default 60%.
- AP received items remain items/cards/artifacts/bundles/traps/victory, not achievements.
- DeathLink soft mode is implemented or cleanly stubbed behind an option.
- Tests cover manager, persistence, panning math, progress, AP mapping, and DeathLink basics.
- `npm run test`
- `npm run typecheck`
- `npm run build`

all pass.

---

## 29. Final Guidance for Codex / Implementing AI

This should be implemented as a cohesive feature, not a scattered pile of conditionals.

Please perform a full one-pass implementation with tests.

Prioritize architecture and correctness:

- achievement definitions are data-driven;
- completion is idempotent;
- tree availability is separate from completion eligibility;
- gray achievements can still unlock;
- panning is a camera/viewport transform;
- AP achievement locations are stable;
- DeathLink does not echo;
- tests cover the risky logic.

Avoid adding random/bloated achievements just to increase count.

Use achievements to reward meaningful, steerable accomplishments across the existing game systems.

The result should feel like a real progression layer for Snaked, and a better foundation for Archipelago than simple score goals.
