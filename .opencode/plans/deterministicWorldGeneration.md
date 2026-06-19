# Plan: Fully Deterministic World Generation

## Current State

**Good news:** The core world generation pipeline is already deterministic. The room generation pipeline (biomes, archetypes, obstacles, structures, vegetation, portals, cross-room features, towns) all use either the seeded `RandomGenerator` or coordinate-based hashing (`hashWorldCoordinate`). The seed flows from `SnakeGame` → `WorldService` → `RoomGenerator` → all stage operations.

**What's missing:** No user-facing seed input, non-deterministic runtime systems (boss AI, juice effects, Minecraft, animals), and no test harness for deterministic verification.

---

## Phase 1: Seed Input & Configuration

### Step 1.1 — Seed Input UI on Title Screen
**Scope:** Add a seed text input field to the title/start screen so players can enter a custom seed string.
**Files:** `src/scenes/titleScene.ts` (or equivalent start screen scene)
**Details:**
- Add a Phaser `InputText` field bound to a config variable
- Validate input (strip whitespace, enforce max length, reject null bytes)
- If empty, fall back to auto-generated seed (unchanged behavior)
- Display the resolved seed string for confirmation

### Step 1.2 — Seed Propagation Through Config Chain
**Scope:** Ensure the seed flows from UI → game config → `SnakeGame` constructor.
**Files:** `src/scenes/snakeScene.ts`, `src/config/gameConfig.ts`, `src/game/snakeGame.ts`
**Details:**
- Add `seed: string | undefined` to `GameConfig` (or use existing `rng.seed`)
- Wire the title screen input to `createGameConfigForCharacterMode()` in `SnakeScene`
- Update `SnakeScene.create()` to pass the seed through to `new SnakeGame()`

### Step 1.3 — Seed Persistence in Saves
**Scope:** Ensure the seed is saved alongside world state and restored on load.
**Files:** `src/game/saveManager.ts`, `src/game/snakeGame.ts`
**Details:**
- `WorldGenerationIdentity` is already saved in `GameSaveData` — verify it round-trips
- On load, ensure `SnakeGame` uses the saved seed to recreate the exact same RNG state
- Add a `seed` field to the save data UI for display/editing

---

## Phase 2: Runtime Determinism (Non-World-Gen Systems)

### Step 2.1 — Expose RNG Through Game Context
**Scope:** Make the seeded RNG accessible to all systems that currently use `Math.random()`.
**Files:** `src/game/snakeGame.ts`, `src/scenes/snakeScene.ts`, `src/session/GameRuntime.ts`
**Details:**
- Ensure `SnakeGame.rng` is a stable, shared `RandomGenerator` instance
- Expose `random()` and `range(min, max)` helpers on the game object
- Ensure `snakeScene` can access `this.snakeGame.random()` for all random calls

### Step 2.2 — Determinize `snakeScene.ts` Juice & Flavor
**Scope:** Replace `Math.random()` calls in `snakeScene.ts` with the seeded RNG.
**Files:** `src/scenes/snakeScene.ts` (~30 calls across lines 3006-3010, 12955, 12965, 13257, 15235-15472)
**Details:**
- **Village juice effects** (lantern selection, temperature reliefs, biome-specific triggers): Replace with `this.snakeGame.random()`
- **Wanderer aura triggers**: Replace with seeded RNG
- **NPC dialogue/message selection**: Replace with seeded RNG
- **Bubble/lamp decoration positioning**: Replace with seeded RNG
- **Note:** These are per-frame effects, so they need a per-frame seed or a running RNG counter to avoid freezing all effects to the same outcome every frame

### Step 2.3 — Determinize Boss Behavior
**Scope:** Replace `Math.random()` calls in boss AI with seeded RNG.
**Files:** `src/systems/boss.ts` (~12 calls)
**Details:**
- Boss attack offsets, behavior choices, and direction selection all use `Math.random()`
- Inject `RandomGenerator` into `BossManager` constructor (currently receives it via `SnakeGame`)
- Route all boss randomness through `this.rng()`

### Step 2.4 — Determinize Minecraft Systems
**Scope:** Replace `Math.random()` in Minecraft integration with seeded RNG.
**Files:** `src/minecraft/mobSpawner.ts`, `src/minecraft/mobManager.ts`, `src/minecraft/farming.ts`, `src/minecraft/enchanting.ts`, `src/minecraft/weather.ts`, `src/minecraft/MinecraftFeature.ts` (~30+ calls)
**Details:**
- Mob spawning (positions, types, counts): Route through seeded RNG
- Farming (pumpkin spread, wheat counts, XP drops): Route through seeded RNG
- Enchanting (selection, rolls): Route through seeded RNG
- Weather (event triggers, type selection, timing): Route through seeded RNG
- Block break success: Route through seeded RNG
- These systems need the RNG injected from `SnakeGame` or `MinecraftFeature`

### Step 2.5 — Determinize Juice Effects
**Scope:** Replace `Math.random()` calls in UI juice system.
**Files:** `src/ui/juice.ts` (~23 calls)
**Details:**
- Particle angles, durations, audio LFO, confetti, screen shake variation
- Inject `RandomGenerator` into `JuiceManager` constructor
- All visual effects become deterministic given the same seed

### Step 2.6 — Determinize ID Generation
**Scope:** Replace `Math.random()` + `Date.now()` in ID generation with deterministic hashes.
**Files:** `src/animals/animalManager.ts`, `src/minecraft/mobManager.ts`, `src/fishing/catchJournal.ts`, `src/events/worldEventLog.ts`, `src/archipelago/archipelagoClient.ts`
**Details:**
- Animal IDs: Use `hashString(creatureType + ":" + roomId + ":" + index)` instead of `Math.random().toString(36)`
- Mob IDs: Same pattern
- Catch journal IDs: Use coordinate + timestamp hash
- Event IDs: Use `hashString(eventType + ":" + sequenceNumber)`
- Archipelago slot names: Accept an optional seed parameter from game config
- Boss IDs: Use `hashString(bossType + ":" + roomId)` instead of `Date.now()`

---

## Phase 3: Testing & Verification

### Step 3.1 — Deterministic Seed Test Harness
**Scope:** A test that verifies identical seeds produce identical worlds.
**Files:** New test file `tests/deterministic-seed.test.ts`
**Details:**
- Run world generation twice with the same seed
- Assert that both runs produce identical `RoomSnapshot` for every room in a radius
- Compare room biome, archetype, obstacles, structures, vegetation, portals
- Use `vi.mock()` to isolate RNG from system time

### Step 3.2 — RNG Unit Tests
**Scope:** Verify the PRNG produces identical output for identical seeds.
**Files:** New test file `tests/core/rng.test.ts`
**Details:**
- `createRng("test-seed")` produces the same sequence every time
- Different seeds produce different sequences
- `withFallback(undefined)` delegates to `Math.random` (non-deterministic, documented)
- MurmurHash3 produces consistent output for known inputs

### Step 3.3 — Regression Test for Existing Saves
**Scope:** Verify that saved games can be reloaded with identical state.
**Files:** Extend existing save/load tests
**Details:**
- Save a game, note the world state
- Reload the save, verify all rooms match byte-for-byte
- Verify the saved `WorldGenerationIdentity.seed` reproduces the world on fresh generation

### Step 3.4 — World Generation Fairness Tests
**Scope:** Ensure deterministic generation doesn't create biased or degenerate worlds.
**Files:** Extend `tests/world-generation/` test suite
**Details:**
- Run 1000 generations with sequential seeds
- Verify biome distribution is within expected ranges
- Verify town count and placement distribution
- Verify no seed produces completely empty or completely blocked worlds

---

## Priority & Effort Estimate

| Phase | Step | Effort | Risk |
|-------|------|--------|------|
| 1 | 1.1 Seed Input UI | Small | Low |
| 1 | 1.2 Config Chain | Small | Low |
| 1 | 1.3 Save Persistence | Small | Low |
| 2 | 2.1 Expose RNG Context | Small | Low |
| 2 | 2.2 snakeScene Juice | Medium | Medium (many call sites) |
| 2 | 2.3 Boss Behavior | Small | Low |
| 2 | 2.4 Minecraft Systems | Medium | Medium (many modules) |
| 2 | 2.5 Juice Effects | Small | Low |
| 2 | 2.6 ID Generation | Small | Low |
| 3 | 3.1 Seed Test Harness | Medium | Low |
| 3 | 3.2 RNG Unit Tests | Small | Low |
| 3 | 3.3 Save Regression | Small | Low |
| 3 | 3.4 Fairness Tests | Medium | Low |

## Key Tradeoffs to Consider

1. **Per-frame effects:** Village juice, wanderer auras, and particle effects run every frame. If we just plug in a running RNG, all effects will tick in lockstep (same lantern lights up every 12th frame, same temperature relief pulses, etc.). Options:
   - Use a per-frame counter + hash to derive per-frame randomness (deterministic but varied)
   - Use a separate "frame seed" derived from the game seed + frame count
   - Accept lockstep effects as a feature of determinism (like speedrunning tool-assisted runs)

2. **Minecraft integration:** The Minecraft system is a significant subsystem with its own spawning, farming, and weather logic. Determinizing it is a large lift. Could be split into a separate PR from the core world generation work.

3. **Multiplayer (Archipelago):** In multiplayer, each client needs to agree on world state. The seed system enables this, but race conditions in runtime events (boss attacks, animal spawns) still need synchronization. This is a separate concern from deterministic world generation.

4. **Performance:** Adding RNG lookups to per-frame code paths (village juice, boss AI) has negligible performance impact — `RandomGenerator` is a simple function call.

---

## Recommended Order of Execution

1. **Steps 1.1 + 1.2** (seed input + config) — enables everyone to use deterministic seeds
2. **Step 2.1** (expose RNG context) — prerequisite for all Phase 2 work
3. **Step 3.1** (seed test harness) — validates that Phase 1 works, gives confidence for Phase 2
4. **Step 2.3** (boss) + **Step 2.5** (juice) + **Step 2.6** (IDs) — small, isolated changes
5. **Step 2.2** (snakeScene juice) — medium, many call sites but straightforward replacements
6. **Step 2.4** (Minecraft) — medium, many modules but each is self-contained
7. **Steps 3.2–3.4** (testing) — can be done in parallel with Phase 2

Each step is self-contained and can be worked on by a different contributor. The test harness from Step 3.1 should be built early so it can validate each phase as it lands.
