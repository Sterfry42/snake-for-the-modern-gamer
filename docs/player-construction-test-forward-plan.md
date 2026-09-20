# Player Construction System — Test-Forward Architecture Plan

**Status:** Design / test-first implementation plan  
**Feature:** Room claims, multi-object structure placement, ghost preview, validation, persistence, effective geometry, and future mayor/town building

## North Star

> **Preview what will actually be built. Build what was actually previewed. Make every system respect what was built. Save it forever.**

Player construction is persistent world mutation, not a decorative placement overlay. The complete product path is:

```text
claim authority
→ select structure
→ enter placement mode
→ manual/ghost movement
→ preview one tile ahead, oriented by snake facing
→ per-cell green/red validation
→ atomic stamp
→ collision/navigation/rendering update
→ save/reload
→ structure still behaves correctly
```

The governing architectural rule is:

> **Generation and player construction should share the same stamp/planning language where appropriate, while player permissions and validation remain stricter than procedural generation.**

---

## 1. Test Strategy

Use six layers:

1. **Pure unit tests** — blueprint transforms, rotation, anchors, bounds, determinism.
2. **Domain service tests** — claims, validation, atomic placement, demolition, effective geometry.
3. **Game-state tests** — construction mode, ghost movement, cancel/confirm, presentation overrides.
4. **Headless user-story tests** — complete player flows through `SnakeGame` / `HeadlessScenario`.
5. **Presentation tests** — ghost preview, per-cell red/green overlays, shared canonical structure visuals.
6. **Regression/invariant tests** — save/load, non-origin rooms, pathfinding, spawning, deterministic generation.

Do not use Phaser to prove gameplay legality. Rendering consumes validated domain state; it does not recalculate it.

---

## 2. Permanent Test Fixtures

Keep a tiny test-only catalog whose geometry never changes.

### `test-fence`

```text
###
```

Tests simple solid geometry.

### `test-house`

```text
####
#..#
#.B#
##D#
```

Tests asymmetric anchor, walls, floor, door, prop composition, and rotation.

### `test-lamp`

```text
L
```

Tests a non-solid prop/light source.

### `test-l-shape`

```text
###
#..
#D.
```

Tests rotations where symmetry cannot hide mistakes.

---

## 3. Blueprint and Stamp Planning

Suggested tests:

```text
src/building/__tests__/
  structureBlueprint.test.ts
  structureStampPlan.test.ts
```

Required contracts:

- Blueprint anchor remains fixed through every rotation.
- Facing east/west/north/south places the anchor exactly one tile ahead of the snake head.
- Rotation transforms cells, props, entrances, interaction points, and lights together.
- Four quarter-turns return to the original plan.
- Planned coordinates contain no accidental duplicates.
- Reported bounds contain every planned operation.
- Same blueprint + anchor + rotation produces the same plan.
- Plan contains the complete structure composition, not just walls.
- Preview and commit consume the same `StructureStampPlan`.

Use asymmetric fixtures for rotation tests.

---

## 4. Room Claim Authority

Suggested:

```text
src/building/__tests__/roomClaims.test.ts
```

Test:

- Unclaimed rooms reject construction with `unclaimed-room`.
- Claiming removes only the authority blocker; terrain/occupancy can still reject placement.
- Claims identify an owner rather than using a global boolean.
- `build` and `demolish` permissions can differ.
- Claiming twice for the same owner is idempotent.
- Claims persist through save/load.
- Future mayor authority can grant access through claims without the building system depending directly on `isMayor`.

Room claims answer **who may build here**. They do not contain placement logic.

---

## 5. Placement Validation

Suggested:

```text
src/building/__tests__/
  structurePlacementValidator.test.ts
  structurePlacementConsistency.test.ts
```

One validator powers both preview and commit.

### Hard blockers

Direct tests for:

- outside room
- unclaimed room
- solid terrain
- existing structure
- portal
- layer entrance
- cave entrance
- station
- protected landmark
- reserved cell

### Occupancy blockers

Direct tests for:

- player
- NPC
- enemy
- boss

### Vegetation policy

Explicitly classify vegetation:

- small grass/flowers may be `clear-on-commit`
- large trees/rocks may block

Do not leave this accidental.

### Per-cell result

Validation must return individual cell status, e.g.:

```ts
{
  valid: false,
  cells: [
    { x: 10, y: 10, valid: true },
    { x: 11, y: 10, valid: false, reason: 'npc' }
  ]
}
```

Tests prove:

- any required invalid cell makes the placement invalid
- unaffected cells remain valid
- multiple conflict reasons can coexist
- renderer needs no extra legality logic

### Preview/commit equivalence

Invariant:

> If preview is valid and the world has not changed, confirming commits exactly the previewed plan.

If the world changes after preview, commit revalidates the **same plan** against current state. It does not move or reorient the player's intended structure.

---

## 6. Atomic Placement Service

Suggested:

```text
src/building/__tests__/structureService.test.ts
```

A placement commit is transactional.

### Success

Assert:

- exactly one `PlacedStructure`
- all planned cells/props created
- cost charged once
- effective geometry immediately updated
- placement state exits cleanly

### Failure

Force a late conflict and prove:

- zero structure records
- zero geometry changes
- zero props
- zero resource cost
- zero actor mutations

No half-house.

### Duplicate confirmation

Confirm twice and prove one structure, one transaction, one cost.

---

## 7. Persistent Structures and Effective Geometry

Suggested:

```text
src/building/__tests__/
  effectiveWorldGeometry.test.ts
  structureSave.test.ts
```

Player construction stays distinguishable from generated layout:

```text
generated room
+ placed structures
= effective geometry
```

Tests:

- placing a wall does not erase the base generated tile
- effective geometry reports the placed wall as solid
- demolition restores generated geometry underneath
- generated walls cannot be erased by player floor stamps
- overlay precedence is explicit and tested
- identical structures receive distinct stable IDs
- IDs survive save/load
- demolition targets structure identity, not “whatever is at x,y”

This geometry service becomes the canonical gameplay query for constructed worlds.

---

## 8. Upgrade `HeadlessScenario`

Add helpers such as:

```ts
scenario.claimRoom(roomId?)
scenario.claimCurrentRoom()

scenario.beginStructurePlacement(blueprintId)
scenario.structurePlacement()
scenario.structurePreview()

scenario.face(direction)
scenario.stepPlacement(direction)

scenario.confirmStructurePlacement()
scenario.cancelStructurePlacement()

scenario.placedStructures(roomId?)
scenario.structure(id)
scenario.effectiveCell(roomId, x, y)

scenario.saveAndReload()
```

Helpers use real game/service boundaries, not direct internal-array mutation.

### Critical invariant upgrade

`HeadlessScenario.assertWorldIntegrity()` must reason about **effective geometry**, not raw room layout.

New invariant:

> No living materialized actor or player occupies an effectively solid cell.

Gameplay path helpers must likewise use effective geometry when modeling traversal.

---

## 9. Construction Mode State

Suggested:

```text
src/game/__tests__/constructionMode.test.ts
```

Entering placement mode proves:

- automatic snake movement stops
- movement becomes manual step
- selected blueprint and preview state exist
- preview room is stable
- normal gameplay interactions are suppressed according to explicit ghost rules

Define “ghost” through tests. For MVP, while surveying:

- no wall death
- no apple consumption
- no NPC damage
- no accidental ordinary combat interaction

### Orientation

Snake facing controls blueprint orientation. Turning rotates the preview about its anchor.

### Cancel

Cancel:

- places nothing
- consumes nothing
- removes preview state
- restores normal movement mode
- preserves equipment state

### Invalid confirm

Confirming a red preview:

- changes nothing
- reports a rejection reason
- remains in placement mode so the player can reposition

### Daggerfell override

With Daggerfell Helm equipped:

```text
normal play → first person
construction mode → top-down construction
confirm/cancel → first person
```

The helm stays equipped throughout.

---

## 10. Core Headless User Stories

Suggested:

```text
src/game/__tests__/integration/construction/
```

### BUILD-STORY-001 — Claim and build

Unclaimed placement fails. Claim room, place fence, confirm, prove snake cannot cross it.

### BUILD-STORY-002 — House orientation

Select house, face east, verify forward anchor/orientation. Turn north, verify rotation around same door anchor. Confirm and prove committed orientation equals preview.

### BUILD-STORY-003 — NPC blocks site

Put NPC on one footprint cell. Preview reports one red NPC cell and remaining cells green. Confirm changes nothing. Move away and confirm successfully.

### BUILD-STORY-004 — Generated wall conflict

Overlap generated solid terrain. Reject without mutating the generated wall. Reposition and succeed.

### BUILD-STORY-005 — Structure overlap

Place House A. Overlapping House B fails. Adjacent House B succeeds. Both retain independent IDs.

### BUILD-STORY-006 — Actor navigation

NPC has a route across the room. Build across the direct route. NPC must route around or report blocked travel, but never traverse/occupy effective solid cells.

### BUILD-STORY-007 — Enemy and boss occupancy

Enemy cells block placement. Every occupied boss body cell blocks placement.

### BUILD-STORY-008 — Save/reload

Claim room, build house and lamp, save, reload. Prove claim, IDs, blueprint/anchor/rotation, effective geometry, collision, and non-solid prop behavior survive.

### BUILD-STORY-009 — Revisit

Build, travel several rooms away, read/generate other rooms, return. Structure remains and does not duplicate.

### BUILD-STORY-010 — Non-origin room

Build in `1,0,0` and a negative coordinate room. Prove local/world conversion, collision, snapshots, and presentation positions are correct.

### BUILD-STORY-011 — Cancel is side-effect free

Begin placement, move/rotate, cancel. Claims, structures, resources, room state, and actors remain unchanged.

### BUILD-STORY-012 — Demolition

Build wall, prove collision, demolish, prove base terrain/navigation return, save/reload and verify demolition persists.

---

## 11. Simulation Consumers of Effective Geometry

A newly constructed solid cell must be respected by:

| Consumer | MVP Contract |
|---|---|
| Player snake collision | Required |
| Actor occupancy | Required |
| Actor pathfinding | Required |
| Structure placement validator | Required |
| NPC/materialization spawn | Required |
| Apple spawn | Required |
| Enemy spawn/navigation | Required where normal geometry applies |
| Boss occupancy validation | Required |
| Daggerfell raycasting | Required |
| Top-down presentation | Required |
| Minimap | Optional/later |

Do not patch every consumer with `&& !structureThere`. Route them through canonical effective geometry.

---

## 12. Spawn Safety

After construction:

- apples do not spawn inside effectively solid cells
- actors do not materialize inside effectively solid cells
- enemies do not spawn inside effectively solid cells

If services independently read raw layout, move them to the shared geometry query rather than adding structure-specific exceptions everywhere.

---

## 13. Presentation Tests

Suggested:

```text
src/ui/presentation/structurePresentation.test.ts
src/ui/building/structurePlacementOverlay.test.ts
```

### Completed structure

`WorldRenderScene` represents completed structure components using canonical structure visuals.

### Preview

Preview uses the same canonical visual identity plus preview treatment:

- translucent structure
- green valid footprint cells
- red invalid footprint cells

Preview renderer consumes validator output and never derives legality independently.

### Projection parity

Completed structures appear in:

- top-down
- Daggerfell

Solid structure geometry participates in first-person raycasting.

Do not create separate first-person structure art unless deliberately authored later.

---

## 14. Generated Structure Reuse

Existing town generation already has conflict-aware stamping semantics. Extract/reuse the useful **plan/conflict/commit language** rather than duplicating it.

Tests prove shared behavior where appropriate:

- out-of-bounds operations reject
- protected/important cells are not silently overwritten
- blocking conflicts are recorded
- approved authored overwrite cases still work

Do **not** give player construction every privilege available to procedural generation.

Reuse the mechanism, not the authority level.

---

## 15. Deterministic Generation Regression

Player construction must not alter deterministic base generation.

Test:

```text
same world seed
+ same room ID
= same generated base room
```

whether or not a save contains player-built structures.

Placed structures overlay generated rooms after generation. Existing multi-room town-generation determinism tests remain green.

---

## 16. Catalog Contract Tests

Every registered production blueprint automatically passes:

- unique non-empty ID
- valid anchor
- at least one operation
- no accidental duplicate local coordinates
- valid supported rotations
- referenced props/interactions exist
- planning at origin does not throw
- bounds contain all operations

Every new building gets these inspectors for free.

---

## 17. Save Compatibility

Tests cover:

- old saves with no construction data load as empty construction state
- claims serialize/deserialize
- structures serialize/deserialize
- structure-specific state survives
- unknown/removed blueprint IDs fail safely or migrate intentionally
- malformed construction records do not corrupt unrelated save state

Do not only inspect JSON. After reload, prove gameplay collision and authority still work.

---

## 18. Construction Costs

Even if initial debug placement is free, preserve transactional tests for future economy:

- valid confirm deducts once
- invalid confirm deducts zero
- cancel deducts zero
- duplicate confirm deducts once
- failed atomic placement deducts zero or fully rolls back

---

## 19. Property/Invariance Tests

Good candidates:

- anchor remains invariant through rotation
- four rotations return original geometry
- plans contain unique transformed coordinates
- all cells lie within bounds
- valid preview plan equals committed plan
- structure IDs remain stable across persistence
- demolition restores prior effective geometry

---

## 20. Test Diagnostics

Construction failures should print:

```text
room
claim owner
blueprint ID
anchor
rotation
planned cells
conflicts
nearby actors
placed structures
effective geometry around site
```

Prefer:

```text
Small House east at 11,8 rejected:
12,8 occupied by resident:bartender
13,9 occupied by structure player-house-2
```

over `expected true to be false`.

---

## 21. Test-Driven Implementation Sequence

### Phase 1 — Planning
Failing tests for anchor, rotation, translation, bounds, determinism. Implement pure planner.

### Phase 2 — Claims
Failing authority and persistence tests. Implement claims independently from mayor logic.

### Phase 3 — Validator
Implement complete per-cell conflict matrix. Preview and commit share it.

### Phase 4 — Persistent structures + effective geometry
Implement atomic commit, stable structure identity, demolition, base-room preservation.

### Phase 5 — Headless vertical slice
Make `BUILD-STORY-001` pass end-to-end.

### Phase 6 — Placement mode
Add manual/ghost movement, facing/orientation, cancel, invalid confirm, Daggerfell override.

### Phase 7 — Preview presentation
Render canonical ghost structure plus validator-driven green/red footprint.

### Phase 8 — Simulation integration
Move collision, actors, pathfinding, spawning, and first-person raycasting onto effective geometry.

### Phase 9 — Persistence hardening
Save/reload full player stories, non-origin rooms, revisit, demolition.

### Phase 10 — Mayor integration later
Mayor/town systems grant build authority and catalog access; construction itself remains independent.

---

## 22. PR Gates

### Planning PR
Prove rotation, anchor, transforms, determinism.

### Claims PR
Prove authorization and persistence.

### Structure storage PR
Prove atomic commit, effective geometry, stable identity, demolition.

### Placement mode PR
Prove a complete headless player placement flow.

### Presentation PR
Prove UI consumes domain preview state and does not duplicate validation.

### Simulation integration PR
Prove player, actors, spawns, and Daggerfell all respect placed structures.

---

## 23. Global Definition of Done

Construction is not complete until:

- [ ] Room claim authority exists and persists.
- [ ] Blueprint placement is anchor-based and deterministic.
- [ ] Rotation is pure and fully tested.
- [ ] Preview and commit use the same stamp plan.
- [ ] One validator owns placement legality.
- [ ] Validation reports per-cell conflicts.
- [ ] Invalid placement has zero side effects.
- [ ] Successful placement is atomic.
- [ ] Player structures have stable persistent identities.
- [ ] Generated room identity remains unchanged.
- [ ] Effective geometry includes player structures.
- [ ] Player collision respects structures.
- [ ] Actor occupancy and pathfinding respect structures.
- [ ] Spawn systems avoid constructed solid cells.
- [ ] Daggerfell raycasting respects constructed walls.
- [ ] Completed structures render in top-down and first-person.
- [ ] Preview uses canonical structure visuals.
- [ ] Placement mode uses manual movement with explicitly tested ghost semantics.
- [ ] Construction overrides Daggerfell presentation without unequipping gear.
- [ ] Cancel is side-effect free.
- [ ] Save/reload preserves gameplay behavior.
- [ ] Non-origin coordinate rooms are covered.
- [ ] Demolition restores generated geometry.
- [ ] Existing deterministic town-generation tests remain green.
- [ ] Existing headless town-life tests run through effective geometry.
- [ ] `HeadlessScenario.assertWorldIntegrity()` understands constructed geometry.

---

## 24. Foundation Acceptance Test

Create one deliberately broad headless test:

### `BUILD-FOUNDATION-001`

```text
Given the player owns a room
And an NPC can currently travel from west to east

When the player enters construction mode
And previews a Small House
And the preview is valid
And the player confirms it

Then one persistent structure exists
And the snake cannot cross its walls
And the NPC cannot cross its walls
And the door remains traversable
And the structure exists in world presentation

When the game is saved and reloaded

Then the claim still exists
And the same structure still exists
And the snake still cannot cross its walls
And the NPC still cannot cross its walls
And the door is still traversable
And world integrity remains valid
```

If this test is green, we have a construction system.

If eighty-seven unit tests are green and this test fails, we have a pile of lumber.
