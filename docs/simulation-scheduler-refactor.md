# Simulation Scheduler Refactor

## Purpose

The current runtime still behaves like a classic Snake game: one recurring scene timer calls one game step, and that step advances almost every meaningful simulation system. That was a reasonable starting point, but the project now includes RPG, settlement, dialogue, combat, shops, interiors, temperature, timed quests, bosses, enemies, animals, bullets, and long-lived state.

The refactor goal is:

> Separate snake time from world time.

The snake should be one actor in the simulation, not the simulation clock itself. Some mechanics should remain move-based because that is part of the game's identity. Other mechanics need their own clocks, mode rules, or event triggers.

## Current Runtime Shape

`SnakeScene` owns a single Phaser timer:

```ts
this.tickEvent = this.time.addEvent({
  loop: true,
  delay: this.tickDelay,
  callback: this.handleTick,
  callbackScope: this,
});
```

On each timer fire, `handleTick()` increments the `timeMs` flag by `tickDelay` and normally calls scene `step()`. Scene `step()` calls `SnakeGame.step(this.paused)`, then runs scene-facing feature hooks, UI feedback, powerup music, house ambience, skill-tree ticks, and render dirtying.

`SnakeGame.step(paused)` is the real mixed simulation step. In one pass it currently does all of these things:

- moves skittish apples;
- steps bosses;
- checks boss contact before snake movement;
- steps the snake;
- handles room transition bookkeeping;
- handles room-entry effects and relationship neglect;
- resolves apple, treasure, and powerup pickup;
- checks enemy and animal contact;
- steps enemies and their bullets;
- steps animals;
- resolves duel and encounter completion;
- ticks predation, followers, invulnerability, player bullet immunity, temperature, powerups, and the radiation quest timer;
- checks quest completions and quest offers.

That means the name `tick` is overloaded. Some code means "the Phaser timer fired." Some code means "the snake moved one tile." Some code means "one unit of effect duration elapsed." Some code uses `timeMs`, but that value is still advanced from the same `tickDelay`.

## Repo-Grounded Verdict

The AI-sourced premise is mostly right: `tickDelay` is currently doing too much.

Changing `tickDelay` via `setTickDelay()` changes the cadence of the Phaser timer that drives the entire scene step. The skill tree, equipment, religion/background/class mods, house interiors, and `killstreakArsenal` can all affect that delay through `tickDelayScalar` or direct `setTickDelay()` calls.

So a speed modifier that is intended to feel like a snake speed modifier can also affect systems that are wired to the same cadence:

- snake movement;
- boss stepping;
- enemy stepping;
- animal stepping;
- bullet collision checks inside enemy stepping;
- feature `onTick()` hooks;
- tick-counted powerup duration;
- invulnerability duration;
- follower and predation timers;
- scene juice cadence;
- any system whose real-time duration is derived as `ticks * tickDelay`.

There are caveats. Temperature and the radiation quest timer already calculate deltas from `timeMs`, so they are conceptually closer to world-clock systems than pure snake-step systems. However, because `timeMs` itself is incremented by `tickDelay` inside the same timer, they are still tied to the current master cadence.

## Design Principles

1. Rename ambiguous time first.
   The lowest-risk first move is to stop calling every cadence a tick. The current primary gameplay step should become `snakeStep()` or `actionStep()`. A universal `tick` name should be reserved for a true scheduler or clock abstraction.

2. Keep move-based mechanics where they belong.
   Hunger, combo windows, turn trails, some snake identity perks, and tile-movement hazards may still intentionally count snake steps. They should say that explicitly in names and data.

3. Make non-snake actors explicit.
   Enemies, bullets, bosses, animals, hazards, NPC schedules, and world state should not accidentally inherit the snake's interval. If they share cadence, that should be a rule, not a side effect.

4. Centralize mode rules.
   The question "what advances while dialogue is open?" should have one answer. It should not be scattered across `paused`, popup visibility, interior checks, and manual movement special cases.

5. Prefer event hooks over polling where possible.
   Long-term systems like relationships, shops, factions, settlement state, NPC schedules, and quest state should respond to events such as `roomEntered`, `interactionStarted`, `interactionEnded`, `dayAdvanced`, or `worldClockElapsed`.

## Target Model

Introduce a small scheduler that advances named clocks based on elapsed milliseconds and current game mode.

```ts
type SimulationClockId =
  | 'ui'
  | 'world'
  | 'snake'
  | 'enemy'
  | 'animal'
  | 'bullet'
  | 'boss'
  | 'hazard';

interface SimulationClock {
  id: SimulationClockId;
  intervalMs: number;
  accumulatorMs: number;
  step(): void;
}
```

The scheduler owns accumulation:

```ts
class SimulationScheduler {
  update(deltaMs: number, mode: GameMode): void {
    const rules = modeRules[mode];

    if (rules.ui) {
      this.ui.update(deltaMs);
    }

    this.stepClock('world', deltaMs, rules.world);
    this.stepClock('snake', deltaMs, rules.snake);
    this.stepClock('enemy', deltaMs, rules.enemy);
    this.stepClock('animal', deltaMs, rules.animal);
    this.stepClock('bullet', deltaMs, rules.bullet);
    this.stepClock('boss', deltaMs, rules.boss);
    this.stepClock('hazard', deltaMs, rules.hazard);
  }

  private stepClock(id: SimulationClockId, deltaMs: number, rule: ClockRule): void {
    if (rule !== true) {
      return;
    }
    const clock = this.clocks[id];
    clock.accumulatorMs += deltaMs;
    while (clock.accumulatorMs >= clock.intervalMs) {
      clock.step();
      clock.accumulatorMs -= clock.intervalMs;
    }
  }
}
```

This lets speed effects target one clock:

```ts
snakeClock.intervalMs = boostedSnakeIntervalMs;
```

A frenzy or danger effect can still speed up enemies, bullets, or bosses, but it has to say so directly.

## Game Modes

The project already has several implicit modes: title, paused, death cutscene, popup/dialogue, house manual movement, shops, card-game UI, and normal action play. Make them explicit.

```ts
type GameMode =
  | 'title'
  | 'action'
  | 'safe-real-time'
  | 'manual-room'
  | 'dialogue'
  | 'shop'
  | 'dating'
  | 'card-game'
  | 'death-cutscene'
  | 'paused';
```

Mode rules can start conservative:

```ts
const modeRules = {
  action: {
    ui: true,
    world: true,
    snake: true,
    enemy: true,
    animal: true,
    bullet: true,
    boss: true,
    hazard: true,
  },
  dialogue: {
    ui: true,
    world: false,
    snake: false,
    enemy: false,
    animal: false,
    bullet: false,
    boss: false,
    hazard: false,
  },
  shop: {
    ui: true,
    world: false,
    snake: false,
    enemy: false,
    animal: false,
    bullet: false,
    boss: false,
    hazard: false,
  },
  'safe-real-time': {
    ui: true,
    world: true,
    snake: true,
    enemy: false,
    animal: false,
    bullet: false,
    boss: false,
    hazard: true,
  },
  'manual-room': {
    ui: true,
    world: true,
    snake: 'manual',
    enemy: false,
    animal: false,
    bullet: false,
    boss: false,
    hazard: false,
  },
  paused: {
    ui: true,
    world: false,
    snake: false,
    enemy: false,
    animal: false,
    bullet: false,
    boss: false,
    hazard: false,
  },
} satisfies Record<string, ModeRule>;
```

## Step Decomposition

Before creating full independent clocks, split the current `SnakeGame.step()` into named phases. This is the practical path because it reduces risk and preserves current behavior.

Suggested first phase names:

- `preActionStep()`
- `bossStep()`
- `snakeStep()`
- `roomTransitionStep()`
- `pickupStep()`
- `contactStep()`
- `enemyStep()`
- `animalStep()`
- `postActionStep()`
- `questStep()`

The user-proposed list is good, but I would avoid `combatStep()` as the first extraction because combat is currently split across boss contact, enemy contact, animal overlap, bullets, player shots, followers, smite, and duel state. A single `combatStep()` risks becoming the next large bucket. Start with ownership-based names, then converge later.

Longer term, the loop should read closer to:

```ts
world.updateWorld(context);
action.updateAction(context);
snake.updateSnake(context);
actors.updateActors(context);
quests.updateQuests(context);
```

## Practical Refactor Order

### Step 1: Rename the Current Tick

Rename user-facing and internal concepts so the current movement cadence is not called universal time.

Candidate renames:

- `SnakeGame.step()` to `actionStep()` first, then narrow to `snakeStep()` once non-snake systems move out;
- scene `step()` to `runActionStep()` or `advanceActionFrame()`;
- feature `onTick()` to `onActionStep()` as a compatibility-preserving migration;
- `tickDelay` to `actionStepDelayMs` or `snakeStepIntervalMs`.

Keep a temporary alias if needed:

```ts
setTickDelay(delay: number): void {
  this.setSnakeStepInterval(delay);
}
```

This lets existing skill/equipment code keep compiling while the vocabulary shifts.

### Step 2: Split `SnakeGame.step()`

Extract methods without changing ordering. The immediate win is testability and readable ownership.

Proposed initial ordering:

1. `beginActionStep(paused)`
2. `preSnakeActorStep()`
3. `snakeStep()`
4. `roomTransitionStep(previousRoom)`
5. `pickupAndTileInteractionStep()`
6. `contactAfterSnakeStep()`
7. `actorStep()`
8. `postActorContactStep()`
9. `statusAndTimerStep()`
10. `questStep(paused)`
11. `createStepResult()`

This phase should not attempt to alter cadence yet. It should only make the current cadence explicit.

### Step 3: Add Independent Actor Clocks

Once the phases exist, move enemies, animals, bosses, bullets, and hazards onto scheduler clocks. At first, all intervals can equal the current base action interval.

```ts
enemyAccumulator += deltaMs;
while (enemyAccumulator >= enemyStepMs) {
  enemyManager.step();
  enemyAccumulator -= enemyStepMs;
}
```

Important repo-specific note: bullets currently appear to be managed through `EnemyManager.step()`, so bullet cadence may need to be split inside the enemy system before a separate `bulletClock` can be meaningful.

### Step 4: Centralize Mode Rules

Replace scattered checks with `GameMode` plus `modeRules`.

Current mode hints to unify:

- `paused`;
- `titleVisible`;
- `deathCutscene`;
- popup visibility;
- manual house movement;
- card game UI;
- dating UI;
- shop popups;
- safe village or house behavior.

The first implementation can derive `GameMode` inside `SnakeScene`. Later, mode should likely become a small controller owned by scene orchestration rather than the simulation state bag.

### Step 5: Move Long-Term Systems Off Snake Movement

Migrate systems according to the time they actually mean:

| System | Current-ish behavior | Target clock or event |
| --- | --- | --- |
| relationship neglect | room-entry side effect | `roomEntered`, possibly `dayAdvanced` later |
| shops | interaction-driven | `interactionStarted`, `interactionEnded`, inventory events |
| factions | mostly future state | world events and actor events |
| settlement state | mostly future state | `worldClock` or named settlement events |
| NPC schedules | mostly future state | `worldClock`, paused by mode as needed |
| quest timers | mixed | explicit `worldClock` for real time, `snakeStep` only for move-based quests |
| hunger | currently feature tick | decide: `snakeStep` if movement hunger, `worldClock` if real-time hunger |
| temperature | delta from `timeMs` | `hazardClock` or `worldClock` with explicit mode rules |
| powerups | tick-counted | `snakeStep` for movement buffs, `worldClock` for real-time effects |

## Open Design Questions

1. Should enemies move while the snake is idle in normal action mode?
   If yes, the game becomes more real-time. If no, enemy clocks should probably advance only when action mode is active and maybe only while the snake is advancing.

2. Should safe rooms advance world time?
   Villages and houses may want ambience and schedules, but not combat pressure.

3. Should dialogue freeze timed quest objectives?
   Freezing is friendlier. Letting timers continue is more simulationist. The mode table should make this explicit.

4. Is hunger movement-based or real-time?
   Classic Snake identity suggests movement-based. Survival RPG identity suggests world-time. The code should pick one per hunger source.

5. Are powerup durations measured in steps or seconds?
   Snake mobility buffs usually want snake steps or snake-clock seconds. Music and UI effects want real milliseconds.

## Migration Safety

This refactor touches the most central runtime path, so the safest implementation style is:

- keep behavior-preserving extractions first;
- add small tests around step ordering before changing cadence;
- introduce new names with compatibility aliases;
- migrate one clock at a time;
- log or debug-render active `GameMode` and clock intervals during development;
- keep save data stable by migrating flag names only after runtime behavior is stable.

## Suggested First PR

The first PR should be intentionally boring:

1. Add `ActionStepResult` naming aliases where useful.
2. Extract methods from `SnakeGame.step()` without changing call order.
3. Rename scene-level helper names around action steps, while keeping public compatibility aliases.
4. Add a short test or debug assertion that one action step still advances apples, bosses, snake, enemies, animals, timers, and quests in the same order as before.

After that, the scheduler can arrive in a second PR with much less drama. Let's-a-go, but with type safety first.

## Implementation Notes

Started in this repo:

- `SimulationScheduler` exists in `src/systems/simulationScheduler.ts`.
- `SnakeScene` now advances simulation from Phaser `update(delta)` through explicit mode rules instead of a single recurring `tickEvent`.
- The current gameplay clock is named `action`; manual house ambience has a separate `manual-world` clock slot.
- Bosses now run on a separate `boss` scheduler clock before the action clock. The default interval still matches the action interval, but boss speed is no longer changed by action-step interval buffs.
- Enemies/animals now run on a separate `actor` scheduler clock after the action clock. The default interval still matches action, but actor speed has its own interval knob.
- Bullets now run on a separate `bullet` scheduler clock after actor movement. `EnemyManager` exposes separate `stepEnemies()` and `stepBullets()` methods.
- Temperature and radiation now run on a separate `hazard` scheduler clock after actor updates.
- `timeMs` now advances from elapsed simulation time in active modes, not from action-step cadence.
- `SnakeGame.step()` is now a compatibility alias for `SnakeGame.actionStep()`.
- `Feature.onActionStep()` exists and falls back to legacy `onTick()` implementations.
- `SnakeGame.actionStep()` has early behavior-preserving phase helpers: `preSnakeStep()`, `snakeStep()`, `actorStep()`, and `actorStepPhase()`.
- Skill-tree speed plumbing now uses action-step interval APIs internally, while preserving `tickDelayScalar` as a content-data compatibility name.
- Room-entry biome reveal logic has been extracted out of the main action step.
- Room travel metric recording has been extracted out of the main action step.

Still next:

- migrate `tickDelayScalar` naming to action-step interval naming;
- decide which timers are snake-step based vs world-clock based;
- add broader tests around mode-rule clock behavior and action-step ordering.
