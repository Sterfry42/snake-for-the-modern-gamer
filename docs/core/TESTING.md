# Testing Strategy

This document defines the testing model for **Snake for the Modern Gamer**.

The repository has many useful tests, but historically the word **story** has been used for several different kinds of tests: true headless gameplay stories, cross-system integration tests, deterministic/invariant checks, presentation contracts, and direct subsystem tests.

Those tests are all valuable, but they do not provide the same guarantee.

The purpose of this document is to make those guarantees explicit.

The most important distinction is:

> **An E2E story proves that a meaningful player behavior or world behavior works through the same gameplay boundaries used by the running game.**

A test is not E2E merely because it creates a real `SnakeGame`, uses `createHeadlessScenario()`, or touches several systems.

---

# 1. Test Types

## Unit Tests

A unit test verifies a small piece of behavior in isolation.

Good unit-test subjects include:

* pure functions
* registries
* parsers
* deterministic calculations
* combat geometry
* stock generation
* path calculations
* serialization helpers
* presentation descriptor functions
* individual state transitions

Unit tests may call implementation methods directly. They may construct exact inputs and assert exact outputs.

Examples:

* a sword footprint is six cells in the expected direction
* a mapper stock generator produces locator offers
* a tile classification function reports a canopy tile as passable
* a presentation helper maps `sleeping` to the correct marker

These are important tests, but they do **not** prove that a player can reach or use the feature in the game.

---

## Integration Tests

An integration test verifies that two or more real systems work together correctly.

Integration tests may use public domain/game APIs directly when the integration itself is what is under test.

Examples:

* shop catalogs are selected from the merchant's role
* save/load preserves an Actor's combat state
* a raid state transition updates faction-event state
* an interior retains its parent-room routing metadata
* a schedule change updates an Actor goal

Integration tests are allowed to begin in the middle of a feature and call a domain operation directly.

That is the key difference from E2E.

---

## Invariant, Property, Deterministic, and Soak Tests

These tests verify global engineering guarantees rather than a player or world story.

Examples:

* repeated reads do not mutate simulation state
* town generation remains traversable across many seeds
* unrelated RNG calls do not rewrite a town
* offscreen work remains bounded
* structural tiles never receive spawns
* a long-running simulation maintains world integrity

These are valuable and should remain in the suite.

They simply must not be represented as E2E stories.

---

## Presentation Tests

Presentation tests verify rendering-independent presentation contracts, such as:

* activity props
* indicators
* labels
* sleep markers
* dialogue state
* other data consumed by Phaser/UI code

A headless presentation test is not E2E merely because it uses a `HeadlessScenario`.

If it calls a presentation helper directly and checks its descriptor, it is a presentation/unit/integration test.

---

## Headless E2E Story Tests

Headless E2E stories run the real game without Phaser and prove meaningful gameplay behavior.

The canonical harness is `createHeadlessScenario()` in:

```text
src/test/headless/headlessScenario.ts
```

The harness creates a real `SnakeGame`, wraps it in `LocalGameSession`, and advances the same game clocks used by runtime code.

There are two valid kinds of E2E story:

1. **player-based stories** — the snake/player does something and observes the result
2. **world-based stories** — the world is placed in a situation, the real simulation runs, and the world produces the result

These are defined precisely below.

---

# 2. Naming and Location

The `.story.test.ts` suffix and:

```text
src/game/__tests__/stories/**
```

should be reserved for genuine E2E stories.

Recommended organization:

```text
src/**/__tests__/
  *.test.ts                    # unit tests colocated with systems

src/game/__tests__/
  integration/                 # cross-system integration tests
  invariants/                  # deterministic/property/soak/global contracts
  stories/                     # headless E2E stories only
```

Existing tests do not need to be deleted merely because they are misclassified.

Move them or rewrite them.

A mixed file should be split rather than retaining non-E2E tests in a `.story.test.ts` file.

---

# 3. What an E2E Story Must Prove

An E2E story should be expressible as one clear gameplay sentence.

## Player-Based Form

> **Given** the player is in situation X, **when the snake does Y**, **then the player observes Z**.

Examples:

* Given a general store is open and the player has enough score, when the snake enters the store, approaches the merchant, chooses **Shop**, and buys a revolver, then score is deducted and the revolver is owned by the player.
* Given a mapper is closed at night, when the snake moves into the mapper door, then the snake remains outside and receives a closure explanation.
* Given the player is at a tavern at night with enough score, when the player chooses the bartender's **Sleep Until Dawn** interaction, then score is deducted, health is restored when applicable, and the world advances to dawn.
* Given a hostile guard is in melee range, when the world advances through the guard's normal combat behavior, then the snake takes damage.

---

## World-Based Form

> **Given** the world is in situation X, **when the simulation advances**, **then the world naturally does Y**.

Examples:

* Given a guard and a thief are near each other, when Actor simulation advances, then the guard targets the thief and does not become hostile to the innocent player.
* Given a resident is away from home at night, when the world advances, then the resident travels home and sleeps.
* Given a storm begins, when the world advances, then cautious residents seek shelter while guards remain on duty.
* Given two bonded Actors and a rumor source, when conversation simulation advances, then the rumor propagates to the listener.

A world-based story is not a license to call the desired world transition directly.

If the test says:

> raiders enter town

then the E2E version should run the world mechanism that causes raiders to travel and arrive.

Calling:

```ts
advanceApproachingBanditRaid()
```

directly tests the raid state machine.

It does not test the world story.

---

# 4. The Core E2E Rule

> **GIVEN may cheat. WHEN may not.**

This is the central rule for headless stories.

Direct state manipulation is allowed while arranging the initial scenario.

Once the behavior under test begins, the test must use real player-facing actions or real world simulation.

---

## Allowed in GIVEN

It is fine to:

* choose a deterministic seed
* locate a generated store, tavern, town, or structure
* place the snake near the relevant feature
* give the player a known amount of score
* set player health for the scenario
* create or position an Actor fixture
* give an Actor a relationship or memory needed for the story
* set the starting day phase
* establish weather or an event as the initial condition
* put the world immediately before the behavior being tested
* load a fixture save when save state is setup

E2E tests do not need to waste time making the snake cross twenty rooms when traversal is unrelated to the story.

Setup should be cheap and deterministic.

---

## Forbidden in WHEN for Player Stories

Once the player action begins, do not bypass the player-facing gameplay path.

Examples of invalid E2E WHEN steps:

* teleporting with `scenario.enterRoom()` when the test claims the player walked or followed something there
* directly entering a building with `enterNearbyTownBuildingDoor()` when the feature is supposed to be automatic movement entry
* calling `wakeActor()` instead of selecting the **Wake** interaction through the canonical interaction path
* calling a purchase method without first proving the merchant exposes **Shop** and reaching the purchase through the interaction flow
* directly invoking a rest service when the story says the player asked the bartender to rest
* directly resolving damage when the story says an NPC attacked the snake

Headless tests do not need to emulate mouse clicks or Phaser widgets.

They do need to use the same **gameplay command boundary** the runtime UI/input layer ultimately invokes.

For example:

```ts
scenario.game.chooseActorInteraction(actorId, 'tavern-rest');
```

is appropriate because it represents the selected gameplay verb.

Calling the lower-level rest implementation directly is not appropriate for that E2E story.

---

## Forbidden in WHEN for World Stories

Do not manually drive the subsystem transition the story is claiming the world performs.

Examples of invalid world-story WHEN steps:

```ts
advanceTownPatrolExcursion(...)
advanceApproachingBanditRaid(...)
resolvePatrolRaidInterception(...)
resumeGoal(...)
chooseActorAttackAgainstPlayer(...)
```

Also avoid:

* direct registry mutation during the behavior being tested
* directly invoking world-generation helpers
* directly forcing the final world state
* manually stepping state machines that are supposed to be integrated into simulation

A world story should normally reach its outcome by advancing `HeadlessScenario` clocks with methods such as:

```ts
advanceMs()
advanceSeconds()
advanceMinutes()
advanceUntil()
advanceActorTicks()
advanceActionTicks()
```

If a feature can only progress by directly invoking an internal transition method, that is useful integration coverage.

It also means the feature is not currently wired into a headless world E2E path.

---

# 5. E2E Tenets

## 5.1 Test the Wiring, Not Only the Pieces

The primary purpose of E2E coverage is to catch bugs where individually correct systems are not connected.

A merchant feature can have all of the following green independently:

* the merchant exists
* a shop catalog exists
* the interaction menu generator knows about `shop`
* the purchase function deducts score
* the item registry contains the item

The game can still be broken if:

* the snake cannot actually reach **Shop**
* selecting **Shop** opens the wrong catalog
* selecting an offer never reaches the purchase path
* the purchase succeeds internally but the item is not given to the player

The E2E story must cross those seams.

---

## 5.2 The Test Title Must Describe What the Test Actually Does

If a test is named:

> `the player can follow an Actor through consecutive room transitions`

then the player must actually transition using player gameplay behavior.

Teleporting the player into the next room with a fixture helper during WHEN violates the story.

If the test is named:

> `raiders enter through a physical gate`

then the world must actually advance the raid to the gate through its normal simulation path.

Calling the raid transition function directly is an integration test.

---

## 5.3 Prefer Observable Outcomes

Primary E2E assertions should describe state that is meaningful to the player or to the simulated world.

Strong primary assertions include:

* current room/interior
* snake position
* player health
* player score
* player inventory/equipment
* available interaction verbs
* a shop being open or closed
* an offer actually being purchasable
* an Actor being physically present
* an Actor reaching home or work
* an Actor sleeping, talking, fleeing, guarding, or fighting
* a world event becoming active
* a business becoming inaccessible during an emergency
* a rumor appearing in another Actor's memory after simulated conversation

Internal assertions are allowed as secondary diagnostics.

But a story whose only success condition is:

* an internal flag
* registry metadata
* geometry arrays
* cache sizes
* serialized fields
* internal state-machine values

is probably not E2E.

---

## 5.4 Use Real Systems

Mock platform boundaries only.

Acceptable mocked boundaries include:

* DOM
* Phaser rendering
* browser storage wrappers
* external network/platform integration

Do not replace gameplay systems with test doubles in E2E stories.

Do not mock:

* Actor simulation
* shops
* inventory
* combat
* world generation
* schedules
* factions
* room traversal
* save/load behavior under test

The wise old snake tests the real thing. Fuhgeddaboudit.

---

## 5.5 Deterministic Does Not Mean Artificial

Use fixed seeds.

Make randomness reproducible.

It is fine to locate a deterministic generated target during GIVEN.

Do not replace the real behavior with a fake deterministic implementation.

---

## 5.6 E2E Helpers Must Preserve the Gameplay Boundary

Good helper:

```ts
walkSnakeTo(scenario, target);
chooseActorVerb(scenario, merchant.id, 'shop');
advanceUntilActorSleeps(scenario, resident.id);
```

Potentially bad helper:

```ts
teleportPlayerToShopInterior(scenario);
forcePurchase(scenario, merchant.id, offerId);
advanceRaidStateDirectly(scenario, raidId);
```

A helper does not make a shortcut valid.

Review what the helper actually calls.

---

## 5.7 Keep Stories Bounded

Every asynchronous world story must have a bounded timeout and useful failure diagnostics.

Prefer:

```ts
await scenario.advanceUntil(..., {
  timeoutMs: 10_000,
});
```

over arbitrary giant tick counts.

Long soak tests should be categorized as soak/invariant tests rather than ordinary E2E stories unless the duration is essential to the gameplay sentence.

---

## 5.8 One Story Should Protect One Meaningful Behavior

An E2E test may cross many systems, but it should still have a recognizable narrative.

Good:

> Player enters an open general store, chooses Shop, buys an item, and receives it.

Too broad:

> Simulate a whole town day, run a raid, manipulate a casualty, save/load, inspect caches, check weather, and assert world integrity.

The latter can be a useful composed soak/integration test.

It is not a focused E2E regression story.

---

## 5.9 Negative Stories Matter

User-visible failures deserve E2E coverage too.

Examples:

* closed shop cannot be entered
* insufficient score prevents purchase
* insufficient score prevents rest
* sleeping merchant cannot provide normal services
* danger prevents rest
* friendly NPC does not attack the player
* a wall prevents normal movement
* a locked house does not allow entry

The failure should be reached through the same player/world path as the success case.

---

## 5.10 Regression Tests Should Live at the Highest Layer That Would Have Caught the Bug

When fixing a bug, ask:

> What test would have failed before this fix and protected the player's or world's actual experience?

Add that test.

Lower-level tests may also be appropriate.

They do not replace the E2E regression when the bug was a wiring or behavior-path failure.

---

# 6. Exact Guidance for Player-Based E2E Stories

A player story should normally look conceptually like this:

```ts
it('player can buy an item from an open merchant', async () => {
  // GIVEN
  const scenario = createHeadlessScenario({
    seed: 'shop-e2e',
  });

  const { room, entrance } = findGeneratedTownDoor(scenario, {
    templateId: 'generalStore',
  });

  scenario.setDayPhase('day');
  scenario.game.setScore(100);

  // Setup shortcut is okay.
  placeSnakeNearDoorForSetup(scenario, room, entrance);

  // WHEN
  // From here onward, use the real gameplay path.

  walkSnakeIntoDoor(scenario, room, entrance);

  const merchant = currentRoomActorWithRole(
    scenario,
    'equipmentMerchant',
  );

  const menu =
    scenario.game.getActorInteractionMenu(merchant.id);

  expect(menu?.options).toContainEqual(
    expect.objectContaining({
      id: 'shop',
      enabled: true,
    }),
  );

  const opened =
    scenario.game.chooseActorInteraction(
      merchant.id,
      'shop',
    );

  expect(opened.ok).toBe(true);

  // Select the offer through the canonical shop command
  // used by runtime.

  const purchase =
    /* canonical runtime shop selection */;

  // THEN

  expect(purchase.ok).toBe(true);
  expect(scenario.game.getScore()).toBeLessThan(100);
  expect(/* player owns item */).toBe(true);
});
```

The exact helper names are not important.

The boundary is.

Setup may position the scenario.

The behavior under test must be driven like the game.

---

## Player Story Checklist

Before calling a player story E2E, verify:

* Did the snake/player actually perform the action named in the title?
* Did the test prove the required interaction verb/action is reachable?
* Did it execute the selected action through the canonical runtime command?
* Did it avoid teleporting or calling the final effect directly during WHEN?
* Does THEN assert something the player would experience?
* Would this test fail if the feature's wiring were disconnected even though each subsystem still worked independently?

If the last answer is **no**, the test is not doing the primary job of E2E testing.

---

# 7. Exact Guidance for World-Based E2E Stories

A world story should normally look like this:

```ts
it('a resident goes home and sleeps at night', async () => {
  // GIVEN

  const scenario = createHeadlessScenario({
    seed: 'resident-night-e2e',
  });

  const resident = ensureScenarioActor(scenario, {
    id: 'resident',
    name: 'Resident',
    role: 'resident',
    roomId: '0,0,0',
    homeRoomId: '1,0,0',
    position: firstWalkableTile(
      scenario,
      '0,0,0',
    ),
  });

  scenario.setDayPhase('night');

  // WHEN
  // Let the real world run.

  await scenario.advanceUntil(
    () =>
      scenario.actor(resident.id).currentRoomId ===
        '1,0,0' &&
      scenario.actor(resident.id).activity?.kind ===
        'sleeping',
    {
      timeoutMs: 30_000,
    },
  );

  // THEN

  expect(
    scenario.actor(resident.id).currentRoomId,
  ).toBe('1,0,0');

  expect(
    scenario.actor(resident.id).activity?.kind,
  ).toBe('sleeping');
});
```

---

## World Story Checklist

Before calling a world story E2E, verify:

* Is the initial condition arranged entirely in GIVEN?
* Does WHEN primarily advance the real simulation?
* Does the desired behavior emerge from Actor/world systems rather than a direct transition call?
* Is the result a meaningful world behavior?
* Would the test fail if the feature existed as an isolated API but was never scheduled or integrated into the game loop?

If the world only changes because the test calls the state transition itself, the test is integration coverage.

---

# 8. Save/Load in E2E Stories

Calling save/load APIs is acceptable when save/load is itself part of the story.

Valid E2E example:

> Given an Actor is naturally traveling home, when the world advances to the middle of the trip, the game is saved/reloaded, and simulation resumes, then the same Actor completes the trip.

Invalid E2E example:

> Directly construct an internal combat state, save/load it, and compare implementation flags.

The latter is useful integration/serialization coverage.

---

# 9. What Headless E2E Does Not Cover

The headless harness intentionally excludes Phaser/browser rendering.

Therefore headless E2E can prove:

* gameplay commands are reachable
* world simulation is connected
* the correct interaction options/data exist
* player/world state changes correctly
* save/load preserves gameplay behavior

It does not prove:

* a sprite is positioned correctly
* a button is visually rendered
* Phaser depth is correct
* mouse/touch hitboxes work
* animation timing looks correct
* mobile controls are positioned correctly

Those require presentation/unit tests or browser/UI-level tests where appropriate.

Do not weaken headless E2E by pretending a presentation helper is E2E.

Use the right test type for each guarantee.

---

# 10. Definition of Done for Gameplay Features

For a player-facing or living-world feature, the expected testing shape is generally:

1. **unit tests** for important local logic and edge cases
2. **integration tests** for meaningful subsystem contracts where needed
3. **at least one headless E2E story** proving the complete player/world behavior is actually wired into the running game

Not every pure helper or refactor needs a new E2E test.

New gameplay behavior generally does.

When a feature has both a success path and an important player-visible failure path, cover both where practical.

---

# 11. Review Checklist for New `.story.test.ts` Tests

A reviewer should reject or reclassify a proposed E2E story if any of the following are true:

* the test cannot be described as a player story or world story
* the test's WHEN calls the implementation method whose integration it claims to prove
* the title says the player moves/interacts/follows/attacks/buys/rests, but the test teleports or invokes the final effect directly
* the title says the world moves/reacts/attacks/raids/resumes, but the test manually invokes that state transition
* the assertions are primarily internal geometry, registry, cache, deterministic, presentation, or serialization properties
* the test would still pass if the real gameplay wiring were removed
* the test mocks a gameplay subsystem rather than a platform boundary
* the test is really a performance/soak/property test wearing a `.story.test.ts` name

A direct internal call is not automatically bad.

It simply means the test probably belongs in unit or integration coverage.

---

# 12. Current E2E Classification Violations

This section audits the tests currently under:

```text
src/game/__tests__/stories/**
```

at the time this document was created.

> **Violation here means "does not meet the E2E story definition above." It does not mean the test is useless or should be deleted.**

Most should be moved or reclassified.

Some should additionally gain a new true E2E story.

---

## `headlessCore.story.test.ts`

The following are currently misclassified as E2E stories:

* `world and Actor reads do not advance simulation`

  * invariant/read-purity test

* `Actor clock is frame-independent under heavy read load`

  * scheduler/invariant test

* `runtime Actor presence drives relationship presentation candidates`

  * integration/presentation contract

* `waking a sleeping butcher interrupts sleep without opening the shop`

  * calls `wakeActor()` directly rather than selecting the player interaction through the canonical interaction path

* `the player can follow an Actor through consecutive room transitions`

  * teleports the player with `scenario.enterRoom()` during the behavior the title claims the player performs

* `a town interior round trip restores the parent room and return tile`

  * enters the building through the direct door API rather than the movement/player path

* `save/load inside a town interior preserves exit routing`

  * integration/serialization test with direct interior entry

* `minimap-like nine-room query stress does not mutate simulation state`

  * invariant/read-purity test

* `a populated town can live under deterministic headless clocks`

  * soak/integrity test

Examples in this file that **do** fit the world-story model include:

* guard/thief reaction
* residents traveling home under schedules
* gossip diffusion
* visible Actors continuing cross-room travel under simulation

---

## `townLife/townActorLifecycle.story.test.ts`

Both current tests violate the E2E classification:

* `TOWN-HARDEN-026 / TOWN-REGRESSION-017 - discovered town owns its whole Actor roster`

  * Actor registry/invariant test

* `TOWN-HARDEN-027 / TOWN-REGRESSION-018 - materialization is not resident creation`

  * Actor identity/materialization integration test

---

## `townLife/townCommerce.story.test.ts`

The following currently violate the E2E classification:

* `TOWN-HARDEN-034 - player layer exits dematerialize actors without moving them outside`

  * primarily an Actor materialization invariant

* `TOWN-HARDEN-030 - offscreen unvisited shop workers do not generate interiors or recover`

  * offscreen generation/recovery invariant

* `TOWN-HARDEN-031 - initially unvisited tavern staff materialize at work without recovery`

  * materialization/recovery integration test

* `TOWN-HARDEN-002 / TOWN-REGRESSION-002 - closed potion makers cannot sell at night through gameplay paths`

  * begins through gameplay, but purchase behavior is ultimately tested by calling `purchaseActorShopOffer()` directly rather than traversing the complete player interaction/shop path

* `TOWN-HARDEN-003 / TOWN-REGRESSION-003 - mapper actor interaction opens mapper stock instead of generic equipment`

  * verifies menu/catalog pieces directly but never actually chooses **Shop** through the canonical interaction flow

* `TOWN-HARDEN-004 - specialist actors expose their role-specific commerce catalogs`

  * catalog integration test

`TOWN-HARDEN-029 - shopkeeper completes a full station-home-station lifecycle without recovery` is a valid world-based story and can remain E2E.

This file is the clearest example of why the distinction matters.

It verifies:

* the merchant exists
* the `shop` verb exists
* the catalogs exist
* the purchase API exists

while still leaving room for the actual player shopping flow to be disconnected.

That is exactly the kind of bug E2E exists to catch.

---

## `townLife/townDoors.story.test.ts`

No current violation identified.

`TOWN-HARDEN-001 / TOWN-REGRESSION-001` moves the snake through the real action path into a closed/open mapper door and observes the resulting room/closure behavior.

This is the model player-based E2E style.

---

## `townLife/townHouseholds.story.test.ts`

The following currently violate the strict E2E classification:

* `TOWN-HARDEN-005 - visible residential doors have one-to-one entrance metadata across 50 seeds`

  * generation/property invariant

* `TOWN-HARDEN-006 / TOWN-REGRESSION-004 - three-house districts expose distinct stable household interiors`

  * routing/integration test that directly invokes door entry

* `TOWN-HARDEN-035 - player residential exits dematerialize actors without moving them outside`

  * mostly a materialization invariant and uses direct door entry for repeated re-entry

The behavior protected by `TOWN-HARDEN-035` is worth keeping.

A strict E2E rewrite should have the snake leave and re-enter through gameplay movement, then observe that the household members are still inside.

---

## `townLife/townInn.story.test.ts`

The following currently violate the E2E classification:

* `TOWN-HARDEN-028 - hospitality schedules keep night services staffed without opening daytime specialists`

  * schedule integration test

* `TOWN-HARDEN-028 / TOWN-REGRESSION-019 - an unvisited tavern works at night with a pre-existing bartender`

  * useful cross-system integration, but the rest operation is invoked directly through `chooseCurrentInnRest()`

The following **does** fit the player-based E2E model:

* `TOWN-HARDEN-019 / TOWN-REGRESSION-012 - paid rest is reachable through bartender interaction`

This test:

* makes the snake enter the tavern
* finds the bartender
* proves the interaction exists
* selects `tavern-rest` through `chooseActorInteraction()`
* verifies both failure and success behavior

That is the style to copy.

---

## `townNpcLivingWorldPresentation.story.test.ts`

Every current test in this file violates the E2E classification and should be presentation/unit/integration coverage instead:

* `TOWN-LIFE-019 - Activity props describe current actions`
* `TOWN-LIFE-020 - Sleeping uses an above-head presentation contract`
* `TOWN-HARDEN-032 - Sleeping actors do not produce direct or conversation dialogue`
* `TOWN-LIFE-021 - Routine roles do not create indicator clutter`
* `TOWN-LIFE-022 - Urgent states remain visible`

These tests directly call presentation/dialogue helpers or directly manufacture Actor activity.

They are useful.

They are not E2E stories.

---

## `townNpcLivingWorldCore.story.test.ts`

This file currently mixes genuine world/player stories with:

* unit tests
* integration tests
* property tests
* deterministic tests
* state-machine tests
* combat geometry tests
* serialization tests
* soak tests

The following IDs currently violate the E2E classification:

* `TOWN-LIFE-002` through `TOWN-LIFE-010`
* `TOWN-LIFE-012`
* `TOWN-LIFE-014`
* `TOWN-LIFE-023` through `TOWN-LIFE-053`
* `TOWN-LIFE-056` through `TOWN-LIFE-085`

The reasons are grouped below.

---

### `TOWN-LIFE-002` through `010`, plus `012` and `014`

These primarily call:

* door access APIs
* Actor wake/resume methods
* menu/catalog APIs
* deterministic schedule APIs

or inspect internal schedule state directly.

They do not consistently allow the claimed player/world behavior to emerge through the full runtime path.

---

### `TOWN-LIFE-023` through `040`

These are primarily:

* world-generation tests
* traversability tests
* mapper-stock tests
* locator-search tests
* determinism tests
* compatibility tests
* geometry/property tests

Examples include:

* solid exterior shells
* spawn rejection on structural tiles
* canopy passability
* distinct household metadata
* required interior structure
* decorative traversability
* mapper stock determinism
* stock boundary behavior
* locator contents
* locator search behavior
* direct `tryPlaceGarage()` fallback behavior
* direct `tryPlaceMolemanDigSite()` fallback behavior
* generation-version compatibility

They should remain tests.

They should not remain E2E stories.

---

### `TOWN-LIFE-041` through `047`

These are inn-rest integration/serialization tests that call:

```ts
restAtCurrentInnUntilDawn()
```

directly.

Keep the detailed rest-mechanics coverage as integration tests.

Use a player E2E story such as:

```text
TOWN-HARDEN-019 / TOWN-REGRESSION-012
```

to prove the bartender interaction actually reaches the rest behavior.

---

### `TOWN-LIFE-048` through `053`

These are patrol state-machine/invariant tests that directly call operations such as:

```ts
resolveTownPatrolExcursion()
advanceTownPatrolExcursion()
evaluateTownPatrolRetreat()
```

A future patrol E2E story should instead:

1. establish a patrol/world situation
2. advance the real world
3. observe the patrol naturally moving, engaging, or retreating

---

### `TOWN-LIFE-056` through `063`

These primarily drive goblin/faction/raid state through direct APIs such as:

```ts
escalateGoblinAggressionAgainstGuards()
startApproachingBanditRaidForCurrentTown()
advanceApproachingBanditRaid()
resolvePatrolRaidInterception()
resolveApproachingBanditRaidAftermath()
```

They are useful faction/raid integration tests.

They do not prove that the running world naturally reaches those transitions.

---

### `TOWN-LIFE-064` through `080`

These are primarily combat unit/integration tests.

They cover things like:

* loadout ownership
* direct weapon selection
* sword footprint geometry
* deterministic facing
* wall clipping
* direct sword damage resolution
* cooldown behavior
* fallback weapon selection
* Actor-vs-Actor melee resolution
* friendly-fire rules
* presentation cleanup
* combat save/load

They should remain outside the E2E story suite.

A corresponding E2E combat story should instead:

1. establish hostility
2. put the relevant Actor/player positions into the GIVEN
3. advance normal Actor/combat clocks
4. verify the snake or Actor actually experiences the resulting attack

---

### `TOWN-LIFE-081` through `085`

These are primarily:

* composed save/load tests
* read-purity tests
* RNG-isolation tests
* performance-bound tests
* emergency-day integrity tests
* soak tests

They are valuable global tests.

They are not focused E2E stories.

---

## Current `townNpcLivingWorldCore.story.test.ts` Tests That Do Fit E2E

The following currently fit the intended player/world E2E definition reasonably well:

* `TOWN-LIFE-001 - Open doors enter automatically`
* `TOWN-LIFE-011 - A resident keeps one identity across a full day`
* `TOWN-LIFE-013 - Higher-priority danger interrupts a schedule`
* `TOWN-LIFE-015 - Storm behavior depends on role and personality`
* `TOWN-LIFE-016 - Weather clearing restores schedule intent`
* `TOWN-LIFE-017 - Mild weather cannot cancel sleep`
* `TOWN-LIFE-018 - A sky event creates specialized activity`
* `TOWN-LIFE-054 - Guards attack bandits without attacking an innocent player`
* `TOWN-LIFE-055 - Goblin tension is not automatic combat`

These are useful reference points when rewriting the rest of the suite.

---

# 13. Migration Principle

Do not delete violating tests just to make the folder conform.

For each violation:

1. decide whether the existing test is:

   * unit
   * integration
   * invariant/property
   * presentation
   * soak

2. move or rename it accordingly

3. if the behavior is player-facing or living-world-facing, add a separate E2E story that crosses the real gameplay wiring

4. keep detailed lower-level tests where they add value

The target is **not fewer tests**.

The target is a suite where the test type tells us what guarantee we actually have.

A green unit suite should mean the pieces work.

A green integration suite should mean the systems work together at their intended API boundaries.

A green invariant suite should mean the world remains structurally sane.

And a green E2E story suite should mean:

> **the snake and the world can actually perform the behaviors the game promises.**
