# Snake for the Modern Gamer — Bug & Optimization Bounty

> Running repository audit ledger.  
> **IDs are stable**: do not renumber when items are fixed or new items are found.  
> Prioritization favors **player-facing product regressions, major FPS/runtime scaling problems, save reliability, and deterministic simulation** over cleanup.

## Priority Legend

- **P0 — Fix first:** Major player-facing regression, save/data-loss risk, or severe simulation inconsistency.
- **P1 — High:** Large FPS/runtime win, long-run degradation, determinism problem, or important system inconsistency.
- **P2 — Medium:** Noticeable bug/performance issue with narrower scope or requiring a targeted repro.
- **P3 — Cleanup:** Legacy/dead paths, misleading architecture, small memory leaks, docs, and migration debt.

## Confidence Legend

- **Confirmed:** Root cause visible directly in code.
- **High confidence:** Architecture strongly supports the bug; targeted repro should be added.
- **Repro needed:** Plausible bug from the code path; verify with an automated/in-game repro before changing behavior.
- **Cleanup:** Not currently a player-facing defect, but worth removing to reduce future bugs.

---

# Immediate Kill List

## Implementation Progress (2026-10-05)

The original findings below remain as audit evidence; this table records current implementation scope without renumbering IDs.

| IDs                          | Implementation                                                                                                                                                                                                       |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| #1 / #2 / #3                 | Special garage, village, and goblin services route ahead of generic shops, including actor-menu Shop choices. Full service-architecture consolidation remains under #14.                                             |
| #4 / #42                     | Village/biome ambience uses a bounded 60 Hz accumulator; resident effect probabilities account for elapsed time.                                                                                                     |
| #5 / #6 / #7 / #8 / #9 / #10 | Retained static render textures, conditional first-person construction, observation-only minimap reads, retained minimap terrain, cached presentation geometry/spatial data, single first-person render owner.       |
| #11 / #43                    | Room-indexed actor queries and revision-aware retained semantic presentation; positions/bobbing remain live.                                                                                                         |
| #12 / #13                    | Live pause/title getters; queued masonry expiry with structured coordinates (also fixes colon-containing layer IDs).                                                                                                 |
| #15 / #16 / #17 / #18        | Removed legacy movement/tick aliases, canonical minimap runtime flags, corrected quest ownership/path documentation.                                                                                                 |
| #19 / #20 / #23 / #24        | Preserved scheduler remainder/phase, fixed-step fishing, elapsed Minecraft hunger, millisecond Kami buffs.                                                                                                           |
| #21 / #22 / #25 / #26 / #27  | One snapshot per clock publication, retained Minecraft HUD/listeners, conditional manual-clock redraws, fishing listener cleanup, intermediate car collision substeps.                                               |
| #28 / #29                    | Indexed actor work sets and bounded hot room working set. Cold room archives preserve world history; total serialized explored-world data is not capped.                                                             |
| #30 / #31 / #40              | Bounded notification dedupe, event-aware 30 Hz archaeology publication with one snapshot, construction saves omit recomputable geometry.                                                                             |
| #32 / #34 / #35 / #39        | Global serialized save writes, prepared subsystem state, awaited initial save, automatic quota recovery. Retains at most 20 runs and five checkpoints per run; trims redundant checkpoints before oldest other runs. |
| #33                          | Scene/arcade writes now use the session saver. Legacy public save adapters/commands and migration support remain; retirement is not complete.                                                                        |
| #36 / #37 / #38              | Cross-room Minecraft persistence and hydration, protected edited/restored chunks, fishing journal round-trip.                                                                                                        |
| #41                          | Disposable unknown dead actors collapse to non-resurrection tombstones. Known/named historical actors remain intact; history compaction is not complete.                                                             |
| #44 / #45                    | Independent cosmetic RNG and saved gameplay RNG state.                                                                                                                                                               |

**Still open:** #14 full actor service migration; #33 retirement of legacy public writers; #41 lossless known-actor history compaction. These are not marked complete merely because their immediate player-facing failures have been repaired.

Regression coverage includes quota recovery across runs, concurrent session retention, real browser New Game at quota, archived-room edits after reference collection, non-churning world iteration, masonry layer IDs/rebuilding, car substeps, and geometry-free construction round trips.

These are the highest-value fixes to attack first.

| Order |                  ID | Priority | Why                                                                                                         |
| ----: | ------------------: | :------: | ----------------------------------------------------------------------------------------------------------- |
|     1 |             **#32** |    P0    | Frequent save failures are very plausibly localStorage quota exhaustion by design.                          |
|     2 |             **#34** |    P0    | Autosaves can successfully persist stale skill/Minecraft state.                                             |
|     3 |             **#39** |    P0    | Concurrent saves can overwrite one another and lose save points.                                            |
|     4 |       **#36 / #37** |    P0    | Minecraft can lose edited world state across rooms or chunk eviction.                                       |
|     5 |             **#19** |    P0    | Core snake movement can become refresh-rate dependent despite the fixed-step scheduler.                     |
|     6 |             **#20** |    P0    | Fishing difficulty and speed change directly with monitor FPS.                                              |
|     7 |    **#1 / #2 / #3** |    P0    | Refactor flattened special merchants into generic shops and broke intended product behavior.                |
|     8 |             **#44** |    P0    | Cosmetic rendering consumes simulation RNG, making gameplay outcomes depend on FPS/frame pacing.            |
|     9 |             **#43** |    P1    | Per-frame NPC rendering cost scales with total historical actors/world size.                                |
|    10 |             **#21** |    P1    | Simulation constructs full client snapshots repeatedly inside the same clock ticks.                         |
|    11 |         **#5 / #6** |    P1    | Major pure rendering waste: fake static cache + first-person presentation construction during 2D rendering. |
|    12 |       **#22 / #25** |    P1    | Minecraft redraw loop creates a self-amplifying object/listener leak.                                       |
|    13 | **#28 / #29 / #41** |    P1    | Runtime and save costs grow permanently with run age/exploration.                                           |
|    14 |             **#45** |    P1    | Save/load rewinds sequential PRNG state rather than resuming it.                                            |
|    15 |    **#7 / #8 / #9** |    P1    | Minimap and first-person presentation do unnecessary world generation/scans/rebuilds.                       |

---

# P0 — Product, Data Loss, and Simulation Correctness

## #1 — Garage mechanic becomes a generic merchant

**Status:** Confirmed  
**Area:** Actor refactor / shops / garage  
**Impact:** Product regression

The garage mechanic is materialized through the actor system as role `shopkeeper`, but the actor created from the town resident does not preserve the authored relationship/profile identity used by the special garage-shop detection.

Later, the relationship profile falls back to the generated actor ID, the garage-special-case check fails, and the unified shop system maps the plain `shopkeeper` role to `general-merchant`.

The old car-purchase implementation still exists (`buyGarageCar()` / garage-specific popup), but the unified actor interaction path can bypass it.

**Player symptom:** The mechanic sells random normal merchant inventory instead of cars.

**Fix direction:**

- Preserve stable authored NPC identity through actor materialization.
- Make special service identity explicit instead of inferring it from generic role strings.
- Add an integration test: **garage mechanic → Shop → garage/car inventory → purchase car**.

---

## #2 — Goblin contract shop is shadowed by the generic merchant path

**Status:** High confidence  
**Area:** Actor interactions / goblin shops  
**Impact:** Product regression

The goblin clerk is materialized as an ordinary `shopkeeper`, and unified relationship interaction can catch the NPC before the legacy goblin contract handler.

The old handler contains faction-sensitive behavior, ward contracts, dynamic prices, style sales, fishing supply, mercenary hiring, and special refusal states. A generic merchant cannot reproduce this behavior.

**Fix direction:**

- Move goblin services into the unified interaction model explicitly.
- Test hostile/angry/friendly faction states and special inventory.

---

## #3 — Village special shops can also be flattened into generic merchants

**Status:** High confidence  
**Area:** Village shops / unified actor interaction  
**Impact:** Product regression

Village shop behavior has its own inventory/style/biome/product logic, but the actor relationship path runs before multiple bespoke shop handlers.

This creates the same migration hazard as the garage and goblin clerk: the NPC exists, the Shop interaction exists, but the actual authored service behavior is lost.

**Fix direction:** Audit every authored NPC migrated into ActorSystem and prove that its pre-refactor interaction capabilities survived.

---

## #19 — Action-step interval updates destroy scheduler remainder

**Status:** Confirmed  
**Area:** Core movement / scheduler  
**Impact:** Refresh-rate-dependent player movement

The fixed-step scheduler correctly accumulates real elapsed time and should preserve leftover milliseconds after each movement step.

However, systems inside the action step can reapply the current action interval via `setActionStepIntervalMs()`. `SimulationScheduler.setClockInterval()` clamps the accumulator to the interval. If the accumulator contained overshoot, the overshoot is discarded before the scheduler subtracts the step.

This quantizes movement to render frames.

Example with a **75 ms** intended movement interval:

- ~30 FPS: next eligible frame may land around 100 ms → ~10 moves/sec
- ~60 FPS: ~83.3 ms → ~12 moves/sec
- ~120 FPS: can hit ~75 ms → ~13.3 moves/sec

**Fix direction:**

- Do not reset/reapply an unchanged clock interval.
- Preserve clock phase when changing interval.
- Capture the current step interval before callback mutation.
- Add fixed-duration tests at 30 / 60 / 75 / 120 / 144 FPS for 100, 75, 83, and 115 ms action intervals.

---

## #20 — Fishing simulation runs once per rendered frame

**Status:** Confirmed  
**Area:** Fishing  
**Impact:** FPS changes gameplay speed and difficulty

Fishing registers directly on Phaser's update event. It receives `delta`, explicitly ignores it, and calls `tickFishing()` once per rendered frame.

Therefore:

- 30 FPS ≈ 30 fishing ticks/sec
- 60 FPS ≈ 60 fishing ticks/sec
- 120 FPS ≈ 120 fishing ticks/sec

These ticks affect real fishing gameplay, including progress/tension and probabilistic escape/line-break checks.

**Fix direction:** Move fishing to a fixed-step accumulator or the central scheduler. Probability should be time-based, not frame-based.

---

## #23 — Minecraft hunger uses an exact wall-time modulo during manual turns

**Status:** Confirmed  
**Area:** Minecraft / survival loop  
**Impact:** Intended hunger behavior may rarely or never occur

Minecraft action logic samples `timeMs` only when a manual turn occurs and uses an exact condition equivalent to:

```ts
if (timeMs % 600 === 0) {
  hunger--;
}
```

`timeMs` is advanced by frame deltas, so there is no reason a manual action will land on an exact 600 ms multiple.

**Fix direction:** Track elapsed hunger milliseconds or explicit manual turns. Never use exact modulo checks on asynchronously sampled elapsed wall time.

---

## #24 — Kami Blessing durations were authored for ~60 Hz ticks but now use action steps

**Status:** Confirmed  
**Area:** Legacy Feature tick semantics  
**Impact:** Buff durations are dramatically wrong

Examples:

- `"Speed +2s"` → `durationTicks: 120`
- `"Hunger resistance +5s"` → `durationTicks: 300`

Those constants clearly encode ~60 ticks/sec. `Feature.onTick()` is now a compatibility shim for `onActionStep()`, which is around 10 steps/sec by default.

So the intended 2-second buff can last roughly 12 seconds, and 5 seconds can become roughly 30 seconds. Their real duration can also change with snake movement speed.

**Fix direction:**

- Convert real-time buffs to milliseconds.
- Audit all remaining legacy `onTick()` implementations for old frame-based constants.

---

## #32 — Save-session quota amplification

**Status:** Confirmed architecture / leading suspect for frequent failures  
**Area:** Saves / localStorage  
**Impact:** Save failure

Each save session is stored as a single localStorage value containing up to **five complete `GameSaveData` snapshots**.

There is no global cap on old sessions, and localStorage quota is origin-wide and limited. Save payload size grows over a long sandbox run.

A mature 700 KB save replicated five times is already ~3.5 MB before other sessions and duplicate legacy storage.

The actual storage write is effectively:

```ts
localStorage.setItem(key, JSON.stringify(record));
```

with no quota recovery strategy.

**Fix direction:**

- Move saves to IndexedDB or another storage designed for larger structured payloads.
- At minimum, detect `QuotaExceededError`.
- Track actual per-session/origin size.
- Retry after dropping oldest snapshots or offer cleanup.
- Add explicit save-size budget tests.

---

## #33 — Legacy and session save systems both remain active

**Status:** Confirmed  
**Area:** Persistence architecture  
**Impact:** Stale persistence + quota pressure

The new session save manager stores session records, while gameplay code still calls the old `snakeGame.saveGame()` path in places such as arcade flows.

Consequences:

- A subsystem can report that it saved while not updating the save session the player later loads.
- The old full save consumes the same origin storage quota as session saves.
- The two paths can write different schema versions/state.

**Fix direction:** One authoritative persistence pipeline. Legacy loading can remain as migration-only code, but legacy writing should die.

---

## #34 — Autosave skips `prepareCharacterSave()`

**Status:** Confirmed  
**Area:** Autosave  
**Impact:** Successful autosave can contain stale state

Manual character save preparation stages:

- `skills.ranks`
- `skills.ownership`
- `skills.extraLifeCharges`
- Minecraft save state

Autosave calls `snakeGame.getSaveData()` directly and does not call `prepareCharacterSave()`.

**Player consequence:** Autosave may succeed while restoring older skill-tree or Minecraft state.

**Fix direction:** `getSaveData()` should produce a complete canonical save by itself, or all save paths must go through one `prepareAndSerializeSave()` function.

---

## #35 — New-game initial save is fire-and-forget

**Status:** Confirmed  
**Area:** Save bootstrap  
**Impact:** Run can begin without a valid first recovery point

The initial session append is started with a discarded Promise and no failure handling.

If storage is already full, the run may start successfully while its first recovery save never exists.

**Fix direction:** Await/handle initial persistence and surface failure before presenting the run as safely started.

---

## #36 — Minecraft cross-room world edits are not fully serialized

**Status:** Confirmed  
**Area:** Minecraft / saving  
**Impact:** Data loss

`MinecraftFeature.saveToScene()` serializes Minecraft blocks/mobs primarily from the **current room**, then replaces the single `minecraft.save` flag.

A run can modify Room A, move to Room B, save, and end up with a payload centered on Room B instead of globally preserving edited Minecraft rooms.

**Fix direction:** Serialize global Minecraft world/chunk state rather than reconstructing only the current room.

---

## #37 — Dirty Minecraft chunks can be evicted without being persisted

**Status:** Confirmed  
**Area:** Minecraft chunk cache  
**Impact:** Data loss before save

Chunk cache eviction deletes a chunk without first checking/persisting whether it is dirty. Victim selection also appears to be coordinate-based rather than true LRU.

The system already has a global chunk serialization capability, but the save path does not use it appropriately.

**Fix direction:**

- Never discard a dirty chunk without serializing/merging it into durable world state.
- Use LRU or another explicit eviction policy.
- Add “edit → explore > cache limit → return/save/load” regression tests.

---

## #38 — Fishing catch journal does not round-trip through save/load

**Status:** Confirmed  
**Area:** Fishing persistence  
**Impact:** Progress loss

Runtime writes the catch journal to `fishing.catchJournal`.

`getSaveData()` only serializes `fishing.caughtFish`, and the load path primarily restores general `flags` rather than mapping the V3 fishing journal structure back into runtime state.

This appears to be a half-completed persistence migration.

**Fix direction:** Define one canonical fishing save structure and test caught fish, equipped state where applicable, and journal persistence across save/load.

---

## #39 — Concurrent saves can overwrite each other

**Status:** Confirmed architecture  
**Area:** SaveManagerV2  
**Impact:** Lost save points

`appendSave()` follows read → modify → write semantics with asynchronous boundaries and no per-session queue/lock.

Two overlapping saves can both read the same old session record, append independently, then the last writer wins and erases the other newly created save point.

Possible triggers:

- autosave + manual save
- repeated quick-save
- multiple UI calls

**Fix direction:** Serialize all writes per session using a queue/mutex or transactional storage.

---

## #44 — Cosmetic rendering consumes simulation RNG

**Status:** Confirmed  
**Area:** Rendering / determinism  
**Impact:** FPS/frame pacing changes future gameplay outcomes

`SnakeScene.random()` delegates to `SnakeGame.random()`, which consumes the same seeded `_rng` instance used by systems including:

- WorldService
- enemies
- bosses
- animals
- quest selection
- drop rolls

Per-frame cosmetic effects call this RNG repeatedly.

A 120 Hz client therefore consumes a different number of RNG values than a 30 Hz client before the next gameplay random decision.

**Consequences:**

- Same seed + same player inputs can produce different gameplay/world outcomes depending on FPS.
- Replays and multiplayer determinism become substantially harder.

**Fix direction:** Presentation must have an independent cosmetic RNG. Prefer independently keyed RNG streams for simulation domains.

---

## #45 — Save/load does not preserve sequential RNG state

**Status:** Confirmed  
**Area:** Saves / determinism  
**Impact:** Loading changes future random outcomes

The run uses a stateful seeded PRNG closure. Save data stores the original world-generation seed, but not the current PRNG state/counter.

On load, `_rng = createRng(originalSeed)` restarts at the beginning of the sequence.

Some room-generation systems already use independently keyed room RNGs, which is good, but runtime systems sharing `_rng` do not resume where they left off.

**Fix direction:**

- Persist RNG state/counter, or preferably
- split simulation into deterministic domain-specific keyed streams.

---

# P1 — Major FPS, Long-Run Scaling, and Architecture

## #4 — Ambient effects scale with monitor FPS

**Status:** Confirmed  
**Area:** Visual effects / FPS  
**Impact:** Faster displays spawn more work

Resident ambience and biome effects use frame-based probability checks such as `random() < 0.04`, `0.08`, etc. once per rendered frame.

At 144 Hz, a 4% frame roll is attempted 2.4× as often as at 60 Hz.

**Fix direction:** Convert effect spawning to rates-per-second or cooldown-based ambient schedulers with a maximum active effect budget.

> **See also #42**, which is expanded evidence of the same systemic problem.

---

## #5 — “Static room cache” still redraws static room tiles

**Status:** Confirmed  
**Area:** Renderer  
**Impact:** Major pure rendering waste

The renderer tracks static-room signatures and can report `Static: cached`, but the render path still loops through and redraws floor/wall tiles.

The cache mostly indicates whether content changed rather than caching the rendered result.

**Fix direction:** Render truly static room geometry to a RenderTexture/layer and blit it until the room revision changes.

---

## #6 — 2D mode builds the first-person presentation model

**Status:** Confirmed  
**Area:** Presentation / renderer  
**Impact:** Large avoidable allocation/work

Normal 2D drawing constructs the full world presentation scene—including tile and sprite presentation data used by first-person mode.

The 2D renderer appears to use the object mainly for presentation diagnostics such as sprite counts.

**Fix direction:** Build only the presentation representation required by the active renderer. Diagnostics should not force first-person scene construction.

---

## #7 — Minimap observation can generate rooms

**Status:** Confirmed  
**Area:** Minimap / world generation  
**Impact:** UI mutates world state and increases long-run costs

Minimap requests neighboring rooms through `getRoom()`. Missing rooms are generated and cached.

Simply looking at the minimap can instantiate nearby unexplored world state.

**Fix direction:** Add side-effect-free APIs such as `peekCachedRoom()` or deterministic lightweight minimap summaries.

---

## #8 — Minimap brute-forces thousands of tile checks per redraw

**Status:** Confirmed  
**Area:** Minimap / FPS  
**Impact:** Avoidable repeated work

A 3×3 neighborhood over 32×24 rooms can mean approximately **6,912 tile checks** per minimap redraw.

Most of the map is static.

**Fix direction:** Cache per-room minimap textures/summaries and update only changed rooms plus the player marker.

---

## #9 — First-person spatial view is rebuilt repeatedly

**Status:** Confirmed  
**Area:** First-person renderer  
**Impact:** Allocation and lookup overhead

First-person presentation constructs fresh spatial Maps/string keys for static room geometry.

**Fix direction:** Persist a dense/static spatial index per room revision.

---

## #10 — First-person rendering may occur twice on dirty frames

**Status:** High confidence / instrument once  
**Area:** First-person renderer  
**Impact:** Duplicate rendering work

The renderer can draw immediately from its normal render call while a `POST_UPDATE` callback also performs rendering every frame.

**Fix direction:** Add render counters/instrumentation; enforce one first-person render owner per frame.

---

## #11 — NPC semantic presentation does substantial work every frame

**Status:** Confirmed  
**Area:** NPC UI/render  
**Impact:** Per-frame CPU and allocations

Every frame can:

- hide multiple object pools,
- rebuild/filter resident profiles,
- compute relationship/presentation state,
- set text/texture/visibility repeatedly,
- evaluate badges and speech,
- update bobbing positions.

**Fix direction:** Separate state-change-driven semantic presentation from cheap frame interpolation/position animation.

---

## #21 — Full snapshot construction is repeated inside simulation steps

**Status:** Confirmed  
**Area:** LocalGameSession / simulation  
**Impact:** High CPU/allocation pressure

A single action step may construct a complete game snapshot:

1. before the step for comparison,
2. after mutation for snapshot emission,
3. again inside event emission.

Actor/bullet/hazard clocks have similar patterns.

At multiple ~10 Hz clocks, this can produce dozens to 100+ complete snapshot constructions per second.

**Fix direction:** Mutate simulation first, then construct one canonical snapshot per required publish boundary and pass it into event logic.

---

## #22 — Minecraft `onRender()` leaks GameObjects and update listeners

**Status:** Confirmed  
**Area:** Minecraft renderer  
**Impact:** Performance degrades as redraw count grows

Minecraft `onRender()` creates new Phaser `Text` objects and, when lives are visible, registers new scene `update` callbacks during rendering.

These allocations/listeners are not properly retained/destroyed as a stable HUD.

**Fix direction:** Create HUD elements/listeners once on mode entry; update them; destroy once on exit.

---

## #25 — Manual-room clock forces redraws every 100 ms

**Status:** Confirmed  
**Area:** Manual rooms / Minecraft  
**Impact:** Unnecessary redraw pressure

`runManualRoomClockStep()` unconditionally sets `isDirty = true`.

Standing completely still in a manual room therefore forces redraws around 10 times/sec.

This compounds #22 because every forced Minecraft redraw can allocate more leaked HUD/listener state.

**Fix direction:** Dirty only when visible/model state changes.

---

## #28 — Actor simulation repeatedly scans the entire actor registry

**Status:** Confirmed  
**Area:** ActorSystem / long-run FPS  
**Impact:** Cost grows with lifetime actor count

Normal actor clock processing performs multiple global registry passes around 10 times/sec for concerns including:

- sleep interruption expiry,
- offscreen goal advancement,
- speech expiry,
- metrics,
- business recovery.

**Fix direction:** Maintain indexed sets for actors requiring each type of processing.

---

## #29 — Coordinate-room cache grows for the entire run

**Status:** Confirmed  
**Area:** WorldService / memory/runtime  
**Impact:** Exploration permanently raises runtime baseline

Normal generated coordinate rooms remain cached until the run is cleared. Some special layer/cave rooms have explicit removal, but coordinate rooms do not.

This compounds:

- minimap-generated rooms (#7),
- world scans,
- NPC civic lookups,
- save/state growth.

**Fix direction:** Separate persistent world deltas from hot RoomSnapshot cache and add controlled eviction.

---

## #31 — Archaeology clones and redraws presentation every frame

**Status:** Confirmed  
**Area:** Archaeology / FPS  
**Impact:** Repeated cloning and full-board redraw

Archaeology timing correctly uses `delta`, but presentation calls complete snapshot cloning multiple times per visual frame and redraws the board even when most state has not changed.

**Fix direction:** Snapshot on model mutation/tick; interpolate presentation without repeatedly cloning the entire model.

---

## #41 — Actor persistence is effectively append-only

**Status:** Confirmed  
**Area:** ActorSystem / saves / runtime scaling  
**Impact:** Long-run CPU, memory, and save growth

`ActorRegistry.remove()` exists, but no meaningful production removal path was found in core ActorSystem/SnakeGame flows.

Dead/historical actors remain in the registry and are serialized by `toSaveData()`.

This is the persistence half of #28.

**Fix direction:** Define actor lifecycle tiers:

- active/materialized,
- persistent named/thick actors,
- compressed historical actors,
- disposable actors that can be removed.

---

## #42 — Expanded evidence: biome/resident juice is frame-probability based

**Status:** Confirmed / overlaps #4  
**Area:** Visual effects  
**Impact:** High-refresh monitors create more effects and more render load

This later pass confirmed the issue broadly, especially in Jade Peak, where many independent 4–18% rolls occur per render frame and some rolls emit multiple effects.

**Action:** Treat as additional evidence and scope for **#4**, not a separate implementation fix.

---

## #43 — Per-frame NPC rendering scales with all historical actors and cached rooms

**Status:** Confirmed  
**Area:** NPC presentation / world indexes  
**Impact:** Potential major long-run FPS degradation

`updateVillageResidentSprites()` runs every rendered frame.

It calls `getPresentRelationshipProfilesForRoom()` → ActorSystem room lookup → registry `getByRoom()` → `getAll().filter(...)`.

So even an empty current room can incur work proportional to the entire actor registry every rendered frame.

Visible residents also call civic badge lookup. That can call `findTownById()`, which scans cached world rooms.

The hot-path scaling can approach:

**FPS × total actors**

plus:

**FPS × visible residents × cached rooms**

**Fix direction:**

- Real room/town indexes in ActorRegistry and WorldService.
- Do not implement indexed APIs by calling `getAll().filter()`.
- Cache civic/presentation data until relevant state changes.

---

# P2 — Important but Narrower Bugs / Performance

## #12 — Atmosphere audio manager snapshots paused/title state at construction

**Status:** Confirmed  
**Area:** Atmosphere/audio  
**Impact:** Internal dirty/update logic can remain stuck on stale state

The manager receives primitive paused/title values during construction rather than live getters/state references.

It is created while the scene begins paused, so its internal notion of pause can remain stale.

**Fix direction:** Pass live state callbacks or explicit state updates.

---

## #13 — Masonry expiry scans all tracked masonry every frame

**Status:** Confirmed  
**Area:** Construction/masonry  
**Impact:** Avoidable per-frame scan

Every scene update scans all tracked masonry block ages, builds an expired list, splits/parses string keys, then mutates room layouts.

**Fix direction:** Use expiration timers or a min-heap/queue keyed by expiry time.

---

## #26 — Fishing keyboard listeners accumulate across sessions

**Status:** Confirmed  
**Area:** Fishing / input  
**Impact:** Event listener leak

Each fishing start registers new anonymous ESC/SPACE `down` listeners. Cleanup removes the scene update callback but does not remove those key listeners.

**Fix direction:** Store callback references and unregister them, or create the input bindings once.

---

## #27 — Car collision can tunnel at low FPS / long frames

**Status:** High confidence; repro needed  
**Area:** Vehicle physics  
**Impact:** Different collision outcome by frame time

Car movement uses `dt` for position integration, but collision is checked only at the final pose.

At 10.5 tiles/sec and a clamped 250 ms frame, the car can move roughly **2.625 tiles** in one update.

**Fix direction:** Swept collision or physics substeps. Test identical obstacle collisions at 8, 16, 33, 100, and 250 ms frame steps.

---

## #30 — Notification dedupe cache grows forever

**Status:** Confirmed  
**Area:** UI / memory  
**Impact:** Small long-run memory growth

`seenNotificationDedupeKeys` accumulates unique normalized notification strings and is not pruned.

**Fix direction:** TTL/LRU cap or transaction-scoped dedupe.

---

## #40 — Construction saves redundant geometry that load recomputes

**Status:** Confirmed  
**Area:** Construction / save size  
**Impact:** Save bloat

Construction save data stores each placed structure's fully stamped `cells[]`.

On load, those cells are discarded/recomputed from blueprint, anchor, and rotation.

**Fix direction:** Persist only the canonical placement parameters plus genuinely mutable per-instance state.

---

# P3 — Legacy, Cleanup, and Migration Debt

## #14 — Two NPC interaction architectures still run in parallel

**Status:** Confirmed  
**Area:** Interaction architecture

Unified relationship interaction runs before several older bespoke handlers.

This half-migration is the root class behind #1–#3.

**Fix direction:** Move all special behavior into one canonical actor interaction system, then delete legacy fallbacks.

---

## #15 — `SnakeGame.step()` is a legacy alias

**Status:** Cleanup  
**Area:** API migration

`step(paused)` forwards directly to `actionStep(paused)`.

**Fix direction:** Migrate remaining callers and delete the alias.

---

## #16 — `Feature.onTick()` is a legacy compatibility shim

**Status:** Cleanup with bug risk  
**Area:** Feature timing

`onActionStep()` forwards to old `onTick()` implementations.

The naming hides whether old features were authored for render frames, action steps, or real time. #24 demonstrates that this ambiguity already caused bugs.

**Fix direction:** Remove generic “tick” terminology. Use explicit clock units.

---

## #17 — Minimap state exists in duplicate representations

**Status:** Confirmed split state  
**Area:** UI state

Minimap enabled/unlocked state exists in multiple places such as cosmetic state and UI flags, and not all mutation paths update both.

**Fix direction:** One source of truth.

---

## #18 — Architecture cleanup docs contain fossilized file paths

**Status:** Cleanup  
**Area:** Documentation

Cleanup roadmap references legacy quest/feature file paths that no longer exist.

**Fix direction:** Update roadmap so future audits do not chase dead architecture.

---

# Cross-Cutting Root Causes

## 1. “Tick” has no single meaning

The game currently contains multiple clock domains:

- Phaser render frame
- fixed action clock
- actor clock
- bullet clock
- hazard clock
- manual-room clock
- manual Minecraft turns
- arcade timers
- Phaser tweens/timers
- wall/gameplay `timeMs`

The dangerous part is not having multiple clocks. The dangerous part is moving values between them without explicit units.

Prefer names such as:

- `durationMs`
- `remainingActionSteps`
- `remainingActorSteps`
- `manualTurns`

Avoid generic `ticks` unless the clock domain is explicit in the type/name.

---

## 2. Presentation still mutates simulation

The clearest case is #44: cosmetic effects consume the actual simulation PRNG.

Other examples include the minimap generating world rooms (#7).

The architectural rule should become:

> **Presentation may observe simulation. Presentation must not advance or create authoritative simulation state.**

This is especially important for eventual multiplayer/replay support.

---

## 3. “Current room” optimizations coexist with run-lifetime global registries

The game now has increasingly persistent sandbox systems, but many hot paths still use:

```ts
getAll().filter(...)
```

or scans over all cached rooms.

As actor/world persistence grows, work that was cheap early in development becomes permanently more expensive during a long run.

Indexes and compressed historical state are becoming necessary, not premature optimization.

---

## 4. Persistence is not canonical

There are still multiple ways to save:

- new session save path,
- legacy full save path,
- explicit `prepareCharacterSave()` staging,
- subsystem-specific flags,
- V3 schema fields,
- runtime state that is not mapped into those schema fields.

The desired architecture should be:

```text
Runtime systems
    ↓
Canonical Save Snapshot Builder
    ↓
Validation / size checks
    ↓
Serialized write queue
    ↓
Durable storage
```

No gameplay subsystem should directly choose which persistence backend/schema it writes.

---

# Save Reliability — Recommended First Remediation

Given the reported frequent save failures, the first persistence work should be:

1. **Log the exact exception name/message and current origin usage when a save fails.**
2. **Detect `QuotaExceededError` explicitly.**
3. **Queue session writes so only one save mutates a session record at once (#39).**
4. **Make autosave/manual/new-game use one canonical `prepare + snapshot` function (#34/#35).**
5. **Stop writing the legacy duplicate save (#33).**
6. **Measure actual save sections correctly, including nested flag payloads.**
7. **Remove redundant construction geometry (#40).**
8. **Fix Minecraft global state serialization (#36/#37).**
9. **Decide whether five full snapshots belong in localStorage at all.**
10. Prefer **IndexedDB** for session history.

---

# Profiling / Regression Tests Worth Adding

## Frame-rate invariance suite

Run equivalent simulations for a fixed real duration at:

- 30 FPS
- 60 FPS
- 75 FPS
- 120 FPS
- 144 FPS

Assert identical or intentionally bounded results for:

- snake movement count,
- fishing progression/outcomes with fixed RNG,
- timed buffs,
- cars crossing fixed obstacle courses,
- gameplay RNG sequence.

## Long-run scaling suite

Generate progressively larger runs:

- 50 actors / 25 rooms
- 250 actors / 100 rooms
- 1,000 actors / 500 rooms
- larger stress case

Measure:

- `SnakeScene.update()` CPU,
- actor clock CPU,
- village presentation CPU,
- snapshot-build count and duration,
- save JSON size,
- save write latency.

## Save torture suite

Test:

- rapid repeated quick-save,
- manual save overlapping autosave,
- storage quota exhaustion,
- large construction state,
- large actor history,
- Minecraft edits across many rooms,
- dirty chunk eviction,
- save/load RNG continuity,
- catch journal persistence,
- autosave skill-tree persistence.

---

# Running Tally

**Total tracked IDs: 45**

- **P0:** #1, #2, #3, #19, #20, #23, #24, #32, #33, #34, #35, #36, #37, #38, #39, #44, #45
- **P1:** #4, #5, #6, #7, #8, #9, #10, #11, #21, #22, #25, #28, #29, #31, #41, #42, #43
- **P2:** #12, #13, #26, #27, #30, #40
- **P3:** #14, #15, #16, #17, #18

> #42 intentionally remains in the stable-ID ledger but is an expanded confirmation of #4 rather than a separate implementation task.

---

# Next Audit Targets

Continue the bounty hunt in these areas:

1. **Load correctness:** every saved subsystem should round-trip exactly.
2. **Death / revival / reset:** stale state surviving resets, duplicated rewards, missing cleanup.
3. **Skill/equipment modifiers:** duplicate application, restore-order bugs, frame/tick unit mismatches.
4. **Construction/gardening:** per-frame work, stale room caches, save bloat, duplicated authored/runtime state.
5. **Combat:** bullet/enemy/hazard clocks, cooldown units, room-transition edge cases.
6. **World generation:** deterministic vs sequential RNG use, cache mutation, regeneration after load.
7. **Shops/interactions:** continue the ActorSystem migration audit beyond garage/goblin/village.
8. **Renderer:** actual RenderTexture/static-layer caching, first-person render ownership, object-pool churn.
9. **Session snapshots:** quantify snapshot build frequency and move toward one snapshot per publish boundary.
10. **Long-run memory:** Maps/Sets/timers/listeners that grow for the lifetime of the scene/run.
