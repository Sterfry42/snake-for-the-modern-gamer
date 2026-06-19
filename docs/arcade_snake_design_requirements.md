# Snake for the Modern Snake — Arcade Minigame Requirements & Design

## 0. Purpose

This document specifies the **Snake for the Modern Snake** arcade minigame for the `snake-for-the-modern-gamer` repository.

The feature is a popup-only, fake-retro Snake arcade game found inside the main game. It should be playable as a small side activity, reward the player with real score, and gradually become visually and mechanically corrupted through repeated play and corrupted apples.

This document is written for implementation in the current repo structure, especially:

- `src/scenes/snakeScene.ts`
- `src/world/snakeMcDonalds.ts`
- `src/game/saveManagerV2.ts`
- new `src/arcade/*` modules
- existing Phaser UI, save, sprite, sound, and juice patterns

The feature should avoid the lore-heavy haunted-game material for now. This phase is about the **actual arcade game**, its mechanics, UI, corruption, persistence, audio, and placement.

---

## 1. Current Repo Context

### 1.1 Runtime / framework

The project is a Vite + Phaser + TypeScript game. `package.json` currently exposes:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "typecheck": "tsc --noEmit",
    "test": "vitest run"
  },
  "dependencies": {
    "phaser": "^3.90.0"
  },
  "devDependencies": {
    "vitest": "^4.1.5",
    "typescript": "^6.0.3",
    "vite": "^7.1.7"
  }
}
```

The implementation should include pure logic tests and should pass:

```bash
npm test
npm run typecheck
npm run build
```

### 1.2 Main scene

The main scene is `src/scenes/snakeScene.ts`.

That file already imports many of the systems this feature should integrate with, including:

- `ChoicePopup` from `src/ui/choicePopup.ts`
- `SaveUI` and `SaveLoadMenu`
- `saveManagerV2` and `GameSaveData`
- `JuiceManager`
- `RuntimeSpriteFactory`
- `SnakeRenderer`
- `McDonaldsData`
- world/town structures
- existing card-table popup logic

The arcade minigame should follow the same broad pattern as existing modal systems:

- temporarily pause/lock normal gameplay input
- render a modal overlay inside `SnakeScene`
- cleanly restore gameplay after closing
- avoid leaking Phaser game objects after the minigame closes

### 1.3 McDonald’s generation

McDonald’s generation is currently located in:

```txt
src/world/snakeMcDonalds.ts
```

`McDonaldsData` currently contains:

```ts
export interface McDonaldsData {
  cashier: {
    name: string;
    x: number;
    y: number;
  };
  toilet: {
    x: number;
    y: number;
  };
  bounds: { left: number; top: number; width: number; height: number };
}
```

`tryPlaceSnakeMcDonalds(...)` creates a 16x12 building with:

- outer walls
- floor
- a sign
- a counter
- cashier position
- bathroom/toilet
- south entrance

This feature should add an arcade cabinet to each McDonald’s building and return its position in `McDonaldsData`.

### 1.4 Save data

`GameSaveData` in `src/game/saveManagerV2.ts` currently has a `flags: Record<string, unknown>` field and typed sections for major systems like cosmetics, fishing, achievements, Minecraft, etc.

For this feature, prefer adding a typed optional field:

```ts
arcadeSnake?: ArcadeSnakeSaveData;
```

Do not store important arcade state only in ad hoc string flags unless necessary for a first pass. The arcade has enough persistent state to deserve a typed field.

Use migrations in `SaveManagerV2` so old saves load cleanly.

---

## 2. Feature Summary

### 2.1 Player-facing concept

The player can find an arcade cabinet called:

```txt
Snake for the Modern Snake
```

The cabinet appears:

1. In every McDonald’s, in the back of the building.
2. In the player’s home/base after buying a home arcade cabinet for **200 score**.

Interacting with the machine opens a popup arcade menu. Starting a run launches a small Snake game inside a modal. The minigame is intentionally crude: square tiles, one looping room, simple apples, fake-modern quests, fake leveling, optional hats, and corruption effects.

### 2.2 Core loop

```txt
Interact with arcade cabinet
→ Arcade menu
→ Start run
→ Play popup Snake
→ Eat apples, gain arcade score
→ Score converts to main-game score when run ends
→ Corruption/glitches escalate over repeated/corrupted play
→ Quit with Q or die
→ Stats persist
```

### 2.3 Main pillars

1. **Playable first.** It should be an actual small arcade Snake game, not just a joke box.
2. **Popup only.** It should not become a full second world scene.
3. **Microcosm of the main game.** Score, apples, quests, level, hat, and corruption exist, but in tiny dumb form.
4. **Corruption is opt-in risk.** Corrupted apples are avoidable; eating them escalates the machine.
5. **High corruption becomes mechanical.** Early corruption is visual. Late corruption can sabotage input.
6. **Juice matters.** Music, sound, screen twitch, apple pops, dead pixels, and blue screens should sell the feature.

---

## 3. Non-Goals for This Phase

Do **not** implement these yet:

- Developer logs / historical code comments.
- Full Freak Dennis dialogue events.
- Long haunted-game conversations.
- Patch notes.
- Multiple arcade rooms.
- Arcade inventory or real upgrades.
- Combat/enemies inside arcade snake.
- Full separate Phaser scene unless the modal implementation becomes too painful.
- A real texture/art pipeline for the minigame.
- Any mechanic that makes the arcade minigame more complex than the main game.

Freak Dennis is allowed only as part of the **blue screen corruption effect** described later.

---

## 4. New Files / Proposed Module Structure

Add a new folder:

```txt
src/arcade/
```

Recommended files:

```txt
src/arcade/arcadeSnakeTypes.ts
src/arcade/arcadeSnakeLogic.ts
src/arcade/arcadeSnakeApples.ts
src/arcade/arcadeSnakeQuests.ts
src/arcade/arcadeSnakeCorruption.ts
src/arcade/arcadeSnakeRenderer.ts
src/arcade/__tests__/arcadeSnakeLogic.test.ts
src/arcade/__tests__/arcadeSnakeCorruption.test.ts
```

If the codebase prefers fewer files, combine modules, but keep pure logic separable from Phaser rendering.

### 4.1 Responsibilities

#### `arcadeSnakeTypes.ts`

Owns shared types:

- run state
- save data
- apple types
- quest types
- corruption tiers
- renderer event types

#### `arcadeSnakeLogic.ts`

Pure gameplay logic:

- create run state
- movement ticks
- wrapping
- collision
- apple eating
- score/level update
- run end
- input buffering
- direction failure rules

#### `arcadeSnakeApples.ts`

Apple spawning and apple-specific behavior:

- regular/golden/scurry/barrier/corrupted weights
- corrupted apple eligibility
- scurry movement
- barrier placement/removal
- corrupted apple despawn

#### `arcadeSnakeQuests.ts`

Fake-modern quest system:

- quest definitions
- quest rolling
- quest progress updates
- quest completion events

#### `arcadeSnakeCorruption.ts`

Corruption/glitch math:

- glitch pressure
- corruption tiers
- dead pixel count
- blue screen eligibility/chance
- direction failure chance
- popup resize chance
- visual glitch event scheduling

#### `arcadeSnakeRenderer.ts`

Phaser-specific popup UI:

- modal overlay
- arcade menu
- stats menu
- active run UI
- pause UI
- game over UI
- tile drawing
- dead pixel overlay
- visual glitches
- sounds/music hooks
- cleanup

`SnakeScene` should own integration and lifecycle: opening/closing the arcade, passing score/state, saving, and placing/interacting with machines.

---

## 5. Arcade Machine Placement

## 5.1 McDonald’s arcade cabinet

Every generated McDonald’s should include one arcade cabinet.

Update `McDonaldsData`:

```ts
export interface McDonaldsData {
  cashier: {
    name: string;
    x: number;
    y: number;
  };
  toilet: {
    x: number;
    y: number;
  };
  arcade: {
    x: number;
    y: number;
  };
  bounds: { left: number; top: number; width: number; height: number };
}
```

Suggested position in `tryPlaceSnakeMcDonalds(...)`:

- Back wall / upper-right or upper-left of the main dining area.
- Not inside the bathroom.
- Not behind the counter unless intentionally inaccessible.
- Reachable from the McDonald’s floor.

Example placement:

```ts
const arcadeX = right - 3;
const arcadeY = top + 2;
setChar(layout, arcadeX, arcadeY, 'A');
```

But use a tile character that fits existing tile/entity conventions. If `A` is already used, choose another unused symbol.

The cabinet should visually read as an arcade machine:

- dark body
- small bright screen
- tiny colored controls
- maybe a yellow/purple screen glow

It does not need detailed sprite art in the first pass.

### 5.2 McDonald’s interaction

When the snake is adjacent to or on the arcade cabinet interaction tile, show an interaction option:

```txt
Play Snake for the Modern Snake
```

or compact:

```txt
Play Arcade
```

This opens the arcade menu.

If the current interaction flow uses `ChoicePopup`, use it. If McDonald’s already has a cashier/shop interaction menu, do not hide the arcade behind the cashier shop. The cabinet should be its own direct interaction.

### 5.3 Home arcade purchase

The player can buy a home arcade cabinet for:

```txt
200 score
```

The option should be available from McDonald’s arcade menu while interacting with a McDonald’s cabinet.

Menu option:

```txt
Buy Home Arcade Cabinet — 200 score
```

Rules:

- Only show if `arcadeSnake.hasHomeCabinet` is false.
- If player has score >= 200, selecting this subtracts 200 and sets `hasHomeCabinet = true`.
- If player score < 200, show disabled option or message: `Need 200 score.`
- Once purchased, a functional cabinet appears in the player’s home/base area.

If the repo does not yet have a clear home/base placement system, implement the persistent purchase flag and a TODO hook, but do not fake-place it somewhere random.

Preferred save field:

```ts
interface ArcadeSnakeSaveData {
  stats: ArcadeSnakeStats;
  hasHomeCabinet: boolean;
}
```

---

## 6. Save Data

Add a typed arcade save section to `GameSaveData`:

```ts
export interface GameSaveData {
  // existing fields...
  arcadeSnake?: ArcadeSnakeSaveData;
}
```

New types:

```ts
export interface ArcadeSnakeStats {
  lifetimeScore: number;
  highScore: number;
  playCount: number;
  corruptedApplesEaten: number;
  corruption: number;
  questsCompleted: number;
  totalLoops: number;
  totalGoldenApplesEaten: number;
  totalScurryApplesEaten: number;
  totalBarrierApplesEaten: number;
}

export interface ArcadeSnakeSaveData {
  version: 1;
  stats: ArcadeSnakeStats;
  hasHomeCabinet: boolean;
}
```

Default state:

```ts
export function createDefaultArcadeSnakeSaveData(): ArcadeSnakeSaveData {
  return {
    version: 1,
    hasHomeCabinet: false,
    stats: {
      lifetimeScore: 0,
      highScore: 0,
      playCount: 0,
      corruptedApplesEaten: 0,
      corruption: 0,
      questsCompleted: 0,
      totalLoops: 0,
      totalGoldenApplesEaten: 0,
      totalScurryApplesEaten: 0,
      totalBarrierApplesEaten: 0,
    },
  };
}
```

Update save migration:

- If `data.arcadeSnake` is missing, initialize it on load or lazily when the arcade menu opens.
- Do not break old saves.
- Persist after:
  - run ends
  - corrupted apple is eaten, if immediate persistence is easy
  - home cabinet purchase

Do **not** save every movement tick.

---

## 7. Arcade Machine Menu UI

When interacting with a cabinet, show a compact modal menu.

### 7.1 McDonald’s cabinet menu

```txt
Snake for the Modern Snake

Play
Stats
Buy Home Arcade Cabinet — 200 score
Leave
```

Only show purchase option if not owned.

If player lacks score:

```txt
Buy Home Arcade Cabinet — Need 200 score
```

or disabled button.

### 7.2 Home cabinet menu

```txt
Snake for the Modern Snake

Play
Stats
Leave
```

### 7.3 Stats screen

```txt
Snake for the Modern Snake — Stats

High Score: 24
Lifetime Score: 117
Times Played: 6
Corrupted Apples Eaten: 3
Corruption: 18
Quests Completed: 4

Back
```

No lore/logs/historical comments in this phase.

---

## 8. Arcade Run UI

The arcade run should occur inside a popup overlay.

### 8.1 Overall popup layout

```txt
┌────────────────────────────────────────┐
│ SNAKE FOR THE MODERN SNAKE             │
│ Score: 0     Level: 1                  │
│                                        │
│  [square tile grid]                    │
│                                        │
│ Quest: Eat 3 golden apples             │
│ SPACE: Pause        Q: Quit to main game│
└────────────────────────────────────────┘
```

### 8.2 Visual style

The minigame should look like a simple arcade display:

- black/dark screen background
- simple square grid
- no detailed textures
- square tiles with darker outlines
- pixel UI text
- minimal border
- subtle scanline or CRT overlay if cheap

Tile colors:

```txt
Snake body: green
Snake head: brighter green
Regular apple: red
Golden apple: yellow
Scurry apple: orange/yellow
Barrier apple: red with yellow/dark outline
Corrupted apple: slightly darker red, almost normal
Barrier blocks: gray
Dead pixels: black, white, purple, or stuck color
Grid background: black/dark gray
```

### 8.3 Required HUD text

During active play:

```txt
Snake for the Modern Snake
Score: X     Level: Y
```

Bottom controls:

```txt
SPACE: Pause     Q: Quit to main game
```

Optional active quest line:

```txt
Quest: Eat 3 golden apples
```

If two quests exist, show only the first in active play, or show a compact two-line list if space allows.

---

## 9. Controls

### 9.1 Movement

Support:

```txt
Arrow keys
WASD
```

Movement rules:

- fixed tick interval
- grid-based
- no direct reverse into self
- one queued direction allowed between ticks
- room wraps on all sides

### 9.2 Pause

```txt
SPACE
```

Toggles arcade pause menu.

### 9.3 Quit

```txt
Q
```

Quits to main game.

Important:

- Q should bank current run score before exiting.
- Q should close the arcade popup and restore normal game controls.
- Q should not open a nested “outer game” joke.

---

## 10. Pause Menu

When paused:

```txt
Snake for the Modern Snake

Level: 4
Current Score: 31
Lifetime Score: 117
Hat: None

Quests:
[ ] Eat 3 golden apples
[ ] Loop around the screen 5 times

SPACE: Resume
Q: Quit to main game
```

Requirements:

- Show current level.
- Show current score.
- Show lifetime score.
- Show equipped hat.
- Show active quests.
- Space resumes.
- Q quits.
- No patch notes.
- No developer logs.
- No lore screen.

Hat behavior:

- If the main game already exposes active hat/cosmetic state, display it.
- Otherwise show `Hat: None`.
- Hat does not change gameplay.

---

## 11. Grid and Core Game Rules

### 11.1 Grid size

Default:

```txt
16 x 12
```

Allow constants:

```ts
export const ARCADE_GRID_WIDTH = 16;
export const ARCADE_GRID_HEIGHT = 12;
```

Use constants rather than hardcoded numbers inside logic.

### 11.2 Wrapping

The room loops.

If snake exits left, it enters right.
If snake exits right, it enters left.
If snake exits top, it enters bottom.
If snake exits bottom, it enters top.

Implement helper:

```ts
export function wrapArcadePosition(pos: ArcadeTilePosition): ArcadeTilePosition;
```

Track wrap crossings for quests:

```ts
run.loopsThisRun += 1;
stats.totalLoops += 1; // on run end or immediate if preferred
```

### 11.3 Starting state

Initial snake:

```txt
Length: 3
Direction: right
Position: center-left or center
```

Example:

```ts
snake: [
  { x: 6, y: 6 },
  { x: 5, y: 6 },
  { x: 4, y: 6 },
]
direction: { x: 1, y: 0 }
```

### 11.4 Collision

Run ends when:

- snake head collides with snake body
- snake head collides with barrier block

There are no walls because the room wraps.

### 11.5 Score banking

Run score should be converted to main-game score when the run ends.

Preferred:

```txt
run score + quest score rewards = main-game score gained
```

If quests only award fake XP, then just arcade score converts.

Example game over:

```txt
GAME OVER
Score: 24
Main-game score gained: +24
```

If player presses Q mid-run, still bank the current run score.

---

## 12. Runtime State Types

Suggested types:

```ts
export type ArcadeAppleType =
  | 'regular'
  | 'golden'
  | 'scurry'
  | 'barrier'
  | 'corrupted';

export type ArcadeDirection = 'up' | 'down' | 'left' | 'right';

export interface ArcadeTilePosition {
  x: number;
  y: number;
}

export interface ArcadeApple {
  type: ArcadeAppleType;
  position: ArcadeTilePosition;
  spawnedAtTick: number;
  expiresAtTick?: number;
}

export interface ArcadeQuest {
  id: ArcadeQuestId;
  label: string;
  progress: number;
  target: number;
  completed: boolean;
  rewardXp: number;
}

export interface ArcadeSnakeRunState {
  score: number;
  xp: number;
  level: number;
  snake: ArcadeTilePosition[];
  direction: ArcadeDirection;
  queuedDirection?: ArcadeDirection;
  apple: ArcadeApple;
  barriers: ArcadeTilePosition[];
  quests: ArcadeQuest[];
  loopsThisRun: number;
  corruptionThisRun: number;
  corruptedApplesEatenThisRun: number;
  disabledDirection?: ArcadeDirection;
  disabledDirectionUntilTick?: number;
  disabledDirectionCooldownUntilTick?: number;
  lastBlueScreenAtTick?: number;
  tick: number;
  elapsedMs: number;
  isPaused: boolean;
  isGameOver: boolean;
}
```

Tick results should include events for renderer/audio:

```ts
export type ArcadeTickEvent =
  | { type: 'apple-eaten'; appleType: ArcadeAppleType; scoreGained: number }
  | { type: 'level-up'; level: number }
  | { type: 'quest-complete'; questId: ArcadeQuestId; label: string }
  | { type: 'corrupted-apple-eaten' }
  | { type: 'corrupted-apple-despawned' }
  | { type: 'blue-screen' }
  | { type: 'popup-resize-glitch' }
  | { type: 'direction-failure-start'; direction: ArcadeDirection; durationTicks: number }
  | { type: 'direction-failure-input-rejected'; direction: ArcadeDirection }
  | { type: 'game-over'; reason: 'self' | 'barrier' };
```

---

## 13. Apple Types

### 13.1 Regular Apple

Available from the start.

Visual:

```txt
red square
```

Effect:

```txt
+1 score
+1 length
```

### 13.2 Golden Apple

Eligible after current run score reaches 5.

Visual:

```txt
yellow square
```

Effect:

```txt
+3 score
+1 length
```

Purpose:

- simple reward apple
- quest target
- early “modern” feature

### 13.3 Scurry Apple

Eligible after current run score reaches 5.

Visual:

```txt
orange/yellow square
```

Effect:

```txt
+2 score
+1 length
```

Behavior:

- Moves occasionally.
- Preferably moves away from snake head when close.
- Does not move every tick.
- Does not move into the snake, barriers, or current apple tile.

Suggested movement:

```txt
Every 3-5 snake movement ticks, if snake head is within 4 tiles,
attempt to move one tile away from snake head.
```

If no safe tile exists, stay.

Juice:

- tiny jitter before moving
- small afterimage when it scurries
- quick chirp when eaten

### 13.4 Barrier Apple

Eligible after current run score reaches 5.

Visual:

```txt
red/yellow square or red square with strong outline
```

Effect:

```txt
+2 score
+1 length
```

Behavior:

When a barrier apple spawns, spawn 1-3 temporary gray barrier blocks.

Preferred behavior:

- barriers exist only while barrier apple is active
- eating/despawning the barrier apple clears those barrier blocks
- barrier blocks are hazards
- barrier blocks do not spawn on snake, apple, or immediate next tile

Collision with barrier block ends the arcade run.

Juice:

- barriers pop in with a tiny thud
- barrier blocks shake once when spawned

### 13.5 Corrupted Apple

Eligible after corruption thresholds.

Visual:

```txt
almost normal red square
slightly darker red
one wrong-colored pixel if possible
not obviously special at a glance
```

Audio:

- quiet hum when close
- hum grows slightly louder within 4 tiles

Effect if eaten:

```txt
+1 score
+1 length
+5 persistent corruption
+1 corruptedApplesEaten
short glitch burst
```

Behavior:

- Despawns after 8-12 movement ticks if ignored.
- If ignored, corruption does not increase.
- If eaten, corruption increases.
- Eating corrupted apples is the main path to hostile corruption.

This apple should feel like an avoidable risk, not a random punishment.

---

## 14. Apple Spawn Rules

### 14.1 Before score 5

Default:

```txt
Regular apples only.
```

Exception:

If corruption is already active from previous sessions, corrupted apples may appear rarely once run conditions are met.

### 14.2 After score 5

Modern apples enter the pool:

```txt
Regular
Golden
Scurry
Barrier
```

Base weights:

```ts
const BASE_MODERN_APPLE_WEIGHTS: Record<ArcadeAppleType, number> = {
  regular: 70,
  golden: 12,
  scurry: 10,
  barrier: 8,
  corrupted: 0,
};
```

### 14.3 Corrupted apple eligibility

Corrupted apple can begin appearing when:

```txt
playCount >= 2
currentRunScore >= 10
lifetimeScore >= 30
```

or when:

```txt
stats.corruption > 0
```

Roll corrupted apple separately before normal apple type.

Example:

```ts
const corruptedChance = getCorruptedAppleChance(stats, run);
if (random() < corruptedChance) return spawnCorruptedApple(...);
return spawnWeightedNormalApple(...);
```

Suggested chance:

```ts
export function getCorruptedAppleChance(stats: ArcadeSnakeStats, run: ArcadeSnakeRunState): number {
  const thresholdUnlocked = stats.playCount >= 2 && run.score >= 10 && stats.lifetimeScore >= 30;
  if (!thresholdUnlocked && stats.corruption <= 0) return 0;

  const base = stats.corruption > 0 ? 0.03 : 0.03;
  return clamp(base + stats.corruption * 0.002, 0.03, 0.18);
}
```

Cap chance at 18%. Corrupted apples should never dominate the pool.

### 14.4 Safe spawn requirements

Apples and barriers must not spawn:

- on snake body
- on barriers
- on another apple
- on the snake’s immediate next tile if avoidable

For corrupted apple, do not spawn it immediately adjacent every time. It should sometimes be subtle and discoverable via hum.

---

## 15. Leveling

Every 10 current run score:

```txt
Level +1
```

Formula:

```ts
level = Math.floor(score / 10) + 1;
```

Level does nothing.

On level-up:

- play tiny fanfare
- show small toast:

```txt
LEVEL UP!
```

Occasional extra line is allowed:

```txt
No rewards unlocked.
```

Do not add real stats, speed boosts, or power upgrades from level.

---

## 16. Quests

Quests are fake-modern objectives layered into tiny Snake.

### 16.1 Quest timing

Rules:

- No quest before score 5.
- At score 5, roll chance to add a quest.
- Every 10 score after that, roll again if fewer than 2 active quests.
- Max active quests: 2.

Suggested chance:

```txt
35% per eligible score milestone
```

### 16.2 Quest examples

```txt
Eat 3 regular apples.
Eat 2 golden apples.
Eat 1 scurry apple.
Add 10 length.
Loop around the screen 5 times.
Survive 30 seconds.
Reach score 20.
Eat 3 apples without turning left.
Eat 2 apples while length is at least 10.
```

### 16.3 Quest rewards

Preferred:

```txt
+10 XP
```

XP contributes only to level display if implemented. Level still has no gameplay effect.

If XP is not implemented, quests can simply show `QUEST COMPLETE!` and increment `questsCompleted`.

Avoid meaningful main-game score rewards from quests in the first pass.

### 16.4 Quest UI

During play, show a compact active quest line:

```txt
Quest: Eat 3 golden apples (1/3)
```

If multiple quests are active, either:

- rotate displayed quest every few seconds
- show only first incomplete quest
- show two lines if there is room

Pause menu should show all active quests.

---

## 17. Corruption System

Corruption is both persistent and contextual.

### 17.1 Persistent corruption

Saved value:

```ts
stats.corruption: number;
```

Increases primarily when corrupted apples are eaten.

Suggested:

```txt
Corrupted apple eaten: +5 corruption
```

Optional:

```txt
If stats.corruption > 0, each completed arcade run adds +1 corruption.
```

But do not punish normal play before corruption begins.

### 17.2 Runtime glitch pressure

Use derived pressure for event chance:

```ts
export function getArcadeGlitchPressure(
  stats: ArcadeSnakeStats,
  run: ArcadeSnakeRunState,
): number {
  return (
    stats.corruption +
    Math.floor(stats.lifetimeScore / 30) +
    Math.max(0, stats.playCount - 1) * 2 +
    Math.floor(run.score / 10) +
    run.corruptionThisRun
  );
}
```

This lets deep runs and lifetime play create mild weirdness, while corrupted apples drive serious hostility.

### 17.3 Corruption tiers

```ts
export type ArcadeCorruptionTier = 0 | 1 | 2 | 3 | 4;
```

Suggested thresholds:

```txt
Tier 0: pressure < 5
Tier 1: 5-14
Tier 2: 15-29
Tier 3: 30-49
Tier 4: 50+
```

#### Tier 0 — Clean

- no glitches or extremely rare flicker

#### Tier 1 — Weird

- tiny tile flickers
- 1-2 dead pixels
- rare score text flicker

#### Tier 2 — Unstable

- row shifts
- visual chunk swaps
- popup border twitch
- dead pixels increase
- blue screens become eligible
- popup resize glitch can occur

#### Tier 3 — Hostile

- direction failure can occur
- dead pixels can partially obscure tiles
- blue screens more likely
- popup resize more noticeable

#### Tier 4 — Severe

- direction failure can occur multiple times per run with cooldown
- dead pixels are visible and persistent
- blue screens more frequent
- screen may feel actively unstable

---

## 18. Visual Glitches

Visual glitches should look like actual rendering/display failures. Avoid only using stereotypical “glitch text.”

Most glitches should be visual-only and should not mutate gameplay state.

### 18.1 Row shift

For one or two frames:

```txt
A horizontal row of grid tiles renders shifted left or right by 1-3 tiles.
```

Gameplay positions do not change.

### 18.2 Chunk swap

For one frame:

```txt
A 2x2 or 3x3 visual chunk swaps with another chunk.
```

Gameplay positions do not change.

### 18.3 Tile flicker

A tile briefly renders as:

```txt
black
white
purple
wrong apple color
wrong snake green
```

### 18.4 Text corruption

For a brief moment:

```txt
Score: NaN
Level: -1
Score: 999999
```

Then it corrects.

### 18.5 Popup border misalignment

The popup border shifts 1-3 pixels independently of the grid for a few frames.

### 18.6 Popup resize glitch

Required.

At Tier 2+, the arcade popup can briefly resize or twitch.

Examples:

```txt
Popup becomes 5% larger for 0.2 seconds, then snaps back.
Popup squeezes horizontally for one frame.
Popup title bar shifts left while the grid remains still.
Popup frame expands but the grid does not.
```

This should be funny and unsettling. It should not change collision or actual grid coordinates.

### 18.7 Dead pixels

Dead pixels should increase with corruption.

Rules:

- Draw as overlay artifacts inside the arcade popup.
- Use black, white, purple, or stuck-color pixels.
- Persist during a run.
- Count scales with corruption tier.
- Mostly cosmetic; should not look exactly like obstacles.

Suggested counts:

```txt
Tier 0: 0
Tier 1: 1-2
Tier 2: 3-6
Tier 3: 7-12
Tier 4: 13-20
```

Optional: seed dead pixel positions from persistent corruption so the machine feels like it is degrading over time.

---

## 19. Blue Screens With Freak Dennis Flash

Blue screens are a major corruption event.

They should start appearing only after the arcade has been played enough or corruption pressure is high.

### 19.1 Eligibility

Blue screens can occur if either:

```txt
playCount >= 2
currentRunScore >= 10
lifetimeScore >= 30
```

or:

```txt
glitchPressure >= 15
```

### 19.2 Trigger chance

Roll on apple eaten or every few seconds, not every frame.

Suggested:

```ts
const chance = clamp((glitchPressure - 15) * 0.001, 0, 0.04);
```

Cooldown:

```txt
At least 30 seconds between blue screens.
```

### 19.3 Required sequence

The blue screen event should not immediately cut to blue.

It should happen like this:

```txt
1. Arcade play freezes or stutters.
2. For a very brief moment, Freak Dennis appears as a purple square inside the arcade popup.
3. The existing/current Freak Dennis noise begins playing.
4. About one second later, the arcade popup hard-cuts to a blue screen.
5. Blue screen remains for 0.8-1.5 seconds.
6. Game resumes with a small flicker.
```

Timing suggestion:

```txt
0.00s: gameplay freezes / screen stutters
0.05s: purple square appears
0.05s: Freak Dennis sound starts
0.85s-1.10s: cut to blue screen
1.80s-2.50s: return to game
```

Important:

- Freak Dennis should be a simple purple square, consistent with current game language.
- Do not add a detailed monster sprite.
- Use the existing Freak Dennis sound/noise already in the codebase. If the sound key/helper is not obvious, find the current place where Freak Dennis noise is used and reuse that path.
- This should be unsettling but stupid. It is not a full jumpscare.
- The blue screen usually should not end the run.

### 19.4 Blue screen text

Keep text short.

Examples:

```txt
DENNIS_RUNTIME_WARNING
APPLE_REFERENCE_LOST
SNAKE_MEMORY_OVERFLOW
ROYAL_BUILD_UNSTABLE
INPUT_DEVICE_DISAGREES
```

Do not include long lore text in this phase.

### 19.5 Blue screen rendering

- Arcade popup contents become blue.
- Use white pixel text.
- Maybe show one short error code plus fake progress percent.
- Music cuts or distorts.
- Resume after duration.

Example:

```txt
SNAKE FOR THE MODERN SNAKE
HAS ENCOUNTERED A PROBLEM

DENNIS_RUNTIME_WARNING

COLLECTING RECTANGLES: 37%
```

---

## 20. Mechanical Corruption: Direction Failure

At high corruption, corruption becomes a real obstacle.

Because corrupted apples are avoidable, this is acceptable.

### 20.1 Behavior

At Tier 3+, one direction can temporarily stop accepting input.

Example:

```txt
A harsh error beep plays.
A small corrupted message flashes: DOWN INPUT LOST.
For 3-6 seconds, pressing Down does nothing and plays a buzz.
```

### 20.2 Rules

- Only eligible at Tier 3+.
- Never trigger in first 8 seconds of a run.
- Never trigger immediately after pause resume or blue screen resume.
- Cooldown: 20-30 seconds.
- Duration: 3-6 seconds.
- Disables choosing that direction as a new turn.
- Does not stop current movement physics.
- Prefer not to disable the direction the snake is currently moving.
- Pressing disabled direction emits an input failure sound.
- Display message briefly: `LEFT INPUT LOST`, `↓ INPUT LOST`, etc.

### 20.3 Fairness example

If the snake is moving right and `down` is disabled:

- Player can still continue right.
- Player can turn up or left if legal.
- Pressing down is ignored and buzzes.

If the snake is already moving down, do not disable down unless no other direction is valid for the event. Current movement should never suddenly stop.

---

## 21. Corrupted Apple Hum

When a corrupted apple is active, play a quiet proximity hum.

Rules:

- Hum only plays within 4 tiles of snake head.
- Hum grows louder or more distorted as the snake gets closer.
- Hum stops if corrupted apple despawns or is eaten.
- The hum should be subtle; players may not understand it immediately.

Pseudo:

```ts
const distance = manhattanDistance(snakeHead, corruptedApple.position);
const volume = distance <= 4
  ? mapRange(4 - distance, 0, 4, 0.05, 0.25)
  : 0;
```

---

## 22. Music and Sound

Audio is required for this feature to feel good.

### 22.1 Music states

Suggested music keys:

```txt
arcade-menu-loop
arcade-run-loop
arcade-paused-muffle
arcade-corruption-layer
```

If real audio assets are unavailable, add clean placeholder hooks and reuse existing chiptune-ish sounds until assets exist.

### 22.2 Active run music

The active run should have a simple looping chiptune:

- short loop
- fake-retro
- mildly repetitive
- charming, not grating

At higher corruption:

- subtle detune
- dropped notes
- pitch wobble
- static overlay during glitch events
- music cut during blue screen

### 22.3 Required sound effects

Suggested keys:

```txt
arcade-apple
arcade-golden-apple
arcade-scurry-apple
arcade-barrier-apple
arcade-corrupt-apple
arcade-level-up
arcade-quest-complete
arcade-blue-screen
arcade-input-lost
arcade-popup-resize
arcade-game-over
arcade-quit
```

Reuse current project audio style. Do not block implementation on final assets.

### 22.4 Freak Dennis noise

For the blue screen sequence, reuse the existing/current Freak Dennis noise in the repo.

If there is an existing helper or sound key for Freak Dennis, use it. Do not create a new unrelated sound unless necessary.

The sequence is:

```txt
Freak Dennis purple square appears
existing Freak Dennis noise begins
then blue screen
```

---

## 23. Juice / Animation

Even with square tiles, the minigame should feel juicy.

### 23.1 Apple eat

When any apple is eaten:

- tile pop
- score text bump
- snake head briefly brightens
- tiny square particles if cheap

### 23.2 Golden apple

- brighter pop
- sparkle pixels
- brighter chime

### 23.3 Scurry apple

- jitter before moving
- tiny afterimage when it moves
- quick chirp when eaten

### 23.4 Barrier apple

- barrier blocks pop in
- tiny thud
- blocks shake once

### 23.5 Corrupted apple

- subtle wrong-color flicker
- hum nearby
- when eaten: short glitch burst, distorted beep, maybe one row shift

### 23.6 Level up

- `LEVEL UP!` toast
- tiny fanfare
- no actual reward

### 23.7 Quest complete

- `QUEST COMPLETE` toast
- fake achievement sound
- no large interruption

### 23.8 Blue screen

- gameplay freezes/stutters
- purple square appears
- Freak Dennis noise starts
- blue screen hard cut
- return with flicker

### 23.9 Direction failure

- screen blip
- `INPUT LOST` text flashes
- buzz on rejected input

### 23.10 Popup resize glitch

- small digital squeak or pop
- quick scale/squash tween
- no collision change

---

## 24. Run End / Game Over UI

When run ends:

```txt
GAME OVER

Score: 24
High Score: 31
Lifetime Score: 141
Main-game score gained: +24

SPACE / ENTER: Play Again
Q: Quit to main game
```

Requirements:

- update stats
- bank score into main-game score
- save data
- stop/adjust arcade music
- allow replay
- allow quitting

If player quits with Q mid-run:

- bank current run score
- update stats
- close popup
- restore main game

---

## 25. Main-Game Score Integration

The arcade should convert arcade score into main-game score.

Recommended:

```txt
1 arcade score = 1 main-game score
```

Bank when run ends.

In `SnakeScene`, locate existing methods/patterns for direct score changes. Card tables likely already use direct score mutation/payout. Reuse the same score mutation pathway so HUD/save/achievements update consistently.

Do not create a separate untracked score variable outside the normal game state.

---

## 26. Renderer Lifecycle

The arcade renderer should have explicit lifecycle methods.

Suggested class:

```ts
export class ArcadeSnakeRenderer {
  constructor(scene: Phaser.Scene, options: ArcadeSnakeRendererOptions) {}

  openMenu(context: ArcadeCabinetContext): void;
  startRun(stats: ArcadeSnakeStats): void;
  pause(): void;
  resume(): void;
  endRun(result: ArcadeRunResult): void;
  close(): void;
  destroy(): void;
}
```

Or if simpler, implement inside `SnakeScene` using helper functions, but keep cleanup explicit.

Requirements:

- destroy all Phaser objects on close
- stop arcade music on close
- stop hum loops on close
- restore main scene input
- avoid leaving timers/tweens running

---

## 27. Interaction Locking

While arcade popup is open:

- normal snake movement should pause or ignore input
- world interactions should be disabled
- save/load dev UI should not appear above arcade popup
- only arcade controls should apply

When arcade closes:

- restore normal movement/input
- resume normal music/state

If current popup systems already have a shared modal lock, use it.

---

## 28. Tests

Add Vitest tests for pure logic.

### 28.1 Movement tests

- snake advances in current direction
- wrapping works left/right/top/bottom
- direct reverse is ignored
- queued direction applies on next tick
- self collision ends run
- barrier collision ends run

### 28.2 Apple tests

- regular apple gives +1 score and grows snake
- golden apple gives +3 score and grows snake
- scurry apple gives +2 score and grows snake
- barrier apple gives +2 score and handles barriers
- corrupted apple gives +1 score, grows snake, and increments corruption counters

### 28.3 Spawn tests

- before score 5, only regular apples spawn unless corruption eligible
- after score 5, golden/scurry/barrier apples can spawn
- corrupted apples respect threshold
- corrupted apple chance scales and caps
- corrupted apple despawns without corruption increase

### 28.4 Quest tests

- quests do not spawn before score 5
- max active quests is 2
- quest progress updates correctly
- quest completion fires event
- loop quest increments on screen wrap

### 28.5 Stats tests

- play count increments on run start
- lifetime score updates on run end
- high score updates
- home cabinet purchase subtracts 200 score and sets flag
- purchase cannot happen without enough score

### 28.6 Corruption tests

- glitch pressure calculation matches expected thresholds
- tier calculation matches pressure
- dead pixel count increases by tier
- blue screen is gated by thresholds/cooldown
- direction failure only triggers at Tier 3+
- direction failure does not disable current movement physics
- disabled direction rejects input and expires

---

## 29. Implementation Plan

### Phase 1 — Pure logic

- Add `src/arcade` types.
- Implement grid movement/wrapping/collision.
- Implement apple spawn/eat logic.
- Implement score/level.
- Implement run start/end.
- Add tests.

### Phase 2 — Persistence and McDonald’s placement

- Add `arcadeSnake` save data.
- Add save migration/default creation.
- Add `arcade` position to `McDonaldsData`.
- Place cabinet in every McDonald’s.
- Add interaction hook.
- Add home cabinet purchase flag.

### Phase 3 — Basic renderer/UI

- Add arcade menu.
- Add stats menu.
- Add active run popup.
- Add pause/game-over overlays.
- Add controls.
- Add score banking into main-game score.

### Phase 4 — Apple variety and quests

- Add golden/scurry/barrier apples.
- Add quest rolling/progress.
- Add level-up toast.
- Add fake hat display.

### Phase 5 — Corruption visuals

- Add corrupted apples and hum.
- Add dead pixels.
- Add row shift/chunk swap/tile flicker/text corruption.
- Add popup resize glitch.

### Phase 6 — Hostile corruption

- Add blue screen event.
- Add required Freak Dennis pre-blue-screen flash/noise.
- Add direction failure.
- Add cooldown/fairness rules.

### Phase 7 — Audio/juice polish

- Add/route music.
- Add SFX hooks.
- Add apple pop, score bump, particles, tweens.
- Confirm cleanup and no audio leakage.

---

## 30. Acceptance Criteria

The feature is complete when:

- Every McDonald’s has an interactable arcade machine.
- Player can open `Snake for the Modern Snake` from the cabinet.
- Player can buy a home arcade cabinet for 200 score.
- Home cabinet purchase persists.
- Arcade run plays inside a popup, not a separate world room.
- Popup uses simple square-tile visuals.
- The arcade grid wraps on all sides.
- Regular apples are available from the start.
- Golden, scurry, and barrier apples become available after score 5.
- Corrupted apples can appear after the specified thresholds or existing corruption.
- Corrupted apples are subtle and have proximity hum.
- Ignored corrupted apples despawn without increasing corruption.
- Eating corrupted apples increases corruption.
- Current score, high score, lifetime score, play count, corrupted apples eaten, and corruption are tracked.
- Arcade run score converts into main-game score when run ends or player quits.
- Space pauses.
- Q quits to main game.
- Pause menu shows level, current score, lifetime score, hat, and active quests.
- Level increases every 10 score and has no gameplay effect.
- Quests can appear and complete.
- Visual glitches increase with corruption.
- Dead pixels increase with corruption.
- Popup resize glitch can occur.
- Blue screens can occur after thresholds.
- Blue screen event first shows Freak Dennis as a purple square, starts the existing Freak Dennis noise, then cuts to blue screen about a second later.
- At high corruption, one input direction can temporarily fail.
- Direction failure has sound, message, duration, and cooldown.
- Music/SFX hooks exist and are used.
- Phaser objects/timers/sounds clean up on close.
- Pure logic tests cover movement, apples, stats, quests, and corruption.
- `npm test`, `npm run typecheck`, and `npm run build` pass.

---

## 31. Implementation Notes for Codex

Use existing repo conventions wherever possible.

Important files to inspect before coding:

```txt
src/scenes/snakeScene.ts
src/world/snakeMcDonalds.ts
src/game/saveManagerV2.ts
src/ui/choicePopup.ts
src/ui/juice.ts
src/ui/runtimeSpriteFactory.ts
src/game/snakeGame.ts
```

Look for existing patterns for:

- modal overlays
- direct score changes
- music start/stop
- sound effects
- cleanup of Phaser objects
- world object interaction
- save serialization
- current Freak Dennis sound/noise usage

Do not implement lore logs in this task. Leave room for future unlockable historical comments, but do not build that UI now.

The most important feel requirement: this should be a fun, playable, tiny Snake game first. Corruption should start as flavor, then become dangerous only after the player has opted into it by eating corrupted apples.
