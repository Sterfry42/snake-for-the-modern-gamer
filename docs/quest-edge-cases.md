# Quest Edge Cases And Prevention

## Purpose

Complex quests are now state machines with world placement, actor stamping, map markers, carried state, rewards, and original-giver turn-ins. That creates many failure paths that simple stat quests never had.

This document lists the likely edge cases for the current complex quest designs:

- `Find My Baby`
- `The Tax Collector Of Your Future Body`
- `The Green Purchase`
- `Freak You`

The goal is not to make every quest impossible to fail. The goal is to make failure intentional, readable, recoverable when appropriate, and never caused by broken generation or hidden state.

## Global Rules

### Quest Instance Rules

Every complex quest instance should store enough state to survive room unloads and save/load:

```ts
questId: string;
giverRoomId: string;
stage: string;
targetRoomId?: string;
targetZone?: { centerRoomId: string; radiusRooms: number };
carriedItemId?: string;
failureReason?: string;
```

Prevention rules:

- Never derive the target room again after acceptance unless the stored target is missing from an old save.
- Never complete a complex quest through `Quest.isCompleted()` alone.
- A stage transition should be idempotent. Repeating the same interaction should not duplicate rewards, duplicate actors, or move targets.
- A failed quest should stay accepted for the run and should not be offered again.
- A completed quest should remove carried quest state and stop timers.

### Placement Rules

Objective rooms should be selected before the player travels to them and stored on the instance.

Prevention rules:

- Validate the target biome when the quest requires one.
- Validate target distance at acceptance time.
- Do not spawn quest actors inside walls, water, dense forest walls, NPCs, apples, treasure, enemies, or the snake.
- Before stamping an actor, clear a small local safety area around it.
- If the intended tile is blocked, use a nearest-open-cell search instead of silently failing.
- If no valid target exists, the NPC should not offer that quest.

### Marker Rules

The map marker should always answer, "Where is the next required action?"

Prevention rules:

- `travel` stages point to the target room or search zone.
- `interact` stages point to the actor room.
- `return` stages point to `giverRoomId`.
- `failed` stages show a failed subtask but no active route marker unless there is a cleanup objective.
- Markers should render even for rooms that have not been generated.

### Save And Load Rules

Current saves store quest state through flags. That is acceptable for now, but edge cases need clear load behavior.

Prevention rules:

- On load, restore staged quest instances before generating or stamping the current room.
- Stamp quest actors when `getRoom()` or `getCurrentRoom()` is called, not only when entering a room.
- If a carried timed quest item exists on load, restore the timer from saved remaining time.
- If saved quest state is malformed, fail softly: keep the quest accepted, show `[!] Broken quest state`, and do not crash the run.

### Death Rules

Death during a complex quest should have a product decision per quest.

Prevention rules:

- If the quest item is physical and fragile, death can fail the quest.
- If the quest item is narrative/cosmetic, death can preserve progress.
- If an extra-life system saves the player, quest-specific failure should still be decided by quest rules.
- Fatal quest failure should remove carried quest state before resurrection systems continue.

## Find My Baby

Status: implemented as a staged quest.

Core flow:

1. Accept from original NPC.
2. Reveal a target room within the normal quest radius.
3. Enter the target room and find the baby actor.
4. Talk to the baby.
5. Carry `quest-baby`.
6. Return to original NPC.
7. Receive Baby Bottle.

Current implementation notes:

- The baby is a quest actor, not a normal inventory item.
- The baby is drawn with a distinct swaddled sprite.
- The baby is placed away from exact room center to avoid house/shop NPC confusion.
- While `carriedItemId === "quest-baby"`, a repeating baby cry plays until turn-in.
- The Baby Bottle currently uses the existing phoenix-style extra-life modifier. The more precise "heart reset before death" behavior remains a future upgrade.

### Target Zone Has No Valid Baby Room

How it occurs:

- The selected search zone lands mostly in ocean, dense walls, or special rooms.
- Every candidate room has a quest giver, structure, or terrain layout that cannot safely place the baby.

Player symptom:

- Map points to a zone, but the baby never appears.

Prevention:

- At acceptance, choose a target zone with at least one valid room candidate.
- Store both `targetZone` and a lazily selected `babyRoomId`.
- If the first candidate fails at generation time, scan nearby rooms inside the zone.
- If no valid room exists, reroll before the quest is accepted.

### Baby Spawns In A Wall Or Hazard

How it occurs:

- Room generation later places obstacles, water, forest thresholds, cross-room barriers, or another structure over the chosen baby tile.

Player symptom:

- Marker says the baby is present, but the actor is unreachable or invisible.

Prevention:

- Stamp quest actors after terrain and structures.
- Clear a local area around the baby.
- Prefer a deterministic non-center tile that is easy to see and unlikely to overlap structures.
- Future improvement: use nearest-open-cell placement from the preferred baby tile.
- Never let a quest actor occupy a collidable tile.

### Baby Can Be Damaged Or Eaten

How it occurs:

- The baby is represented as a normal actor or pickup and participates in enemy, bullet, apple, or treasure systems.

Player symptom:

- Quest becomes impossible or absurd because the baby disappears.

Prevention:

- Baby should be a quest actor, not an inventory item, enemy, treasure, apple, or destructible.
- It should ignore bullets, enemy collisions, terrain damage, and score pickup logic.
- After interaction, remove the room actor and store `carriedItemId: "quest-baby"`.

Current prevention:

- The baby only exists through `getQuestRoomActors()` while the quest is in `find-baby`.
- Pickup transitions the quest to `return-to-giver` and stores `carriedItemId: "quest-baby"`.

### Player Dies While Carrying The Baby

How it occurs:

- Normal gameplay death after the pickup but before return.

Player symptom:

- Unclear whether the baby is still carried, lost, or reset.

Prevention:

- Decide intentionally:
  - forgiving version: keep `quest-baby` across death/resurrection;
  - harsh version: fail with `failureReason: "baby-lost"`.
- MVP recommendation: keep the baby while the run continues, because accidental quest loss would feel arbitrary.

Current behavior:

- The baby is preserved as staged quest carried state while the run continues.
- The cry loop is state-driven, so it resumes after room changes and should resume after save/load as long as the staged state is restored.

### Original Giver Is Replaced Or Missing

How it occurs:

- The giver room is regenerated and no longer has the same NPC.
- A village/quest house stamp changes.
- Future systems allow NPC death, relocation, or anger.

Player symptom:

- Return marker points to the room, but no turn-in is available.

Prevention:

- Store `giverRoomId` and `giverNpcId`.
- If the original NPC is missing, stamp a quest-specific fallback giver in that room.
- Turn-in checks should key off `giverRoomId` and quest instance, not only current room content.

### Baby Bottle Reward Duplicates

How it occurs:

- The player talks to the giver multiple times while the instance is `return-to-giver`.
- Completion and reward are not atomic.

Player symptom:

- Multiple Baby Bottles or multiple heart-reset charges.

Prevention:

- Transition to `completed` before granting reward.
- Reward path should check `completed` and item ownership.
- Clear `carriedItemId` in the same state update.

## The Tax Collector Of Your Future Body

Current flow:

1. Accept from original tax collector.
2. Three tax offices are placed within a `5-8` zone radius.
3. Each office can be settled by score, length, or duel.
4. After all offices are paid, return to the original collector.
5. Receive Ledger Ring reward.

### Office Rooms Overlap

How it occurs:

- Random room picking selects duplicate target rooms.
- Small radius ranges produce repeated rooms.

Player symptom:

- Fewer than three visible offices, or one room contains multiple tax objectives.

Current prevention:

- The implementation tracks `usedRooms` during office selection.

Additional prevention:

- Make the picker return `null` if it cannot find enough unique rooms.
- If uniqueness fails, widen the radius by one room and retry.
- Store office order and room IDs immediately.

### Tax Office Spawns Inside Blocking Terrain

How it occurs:

- Target room generation places walls, water, dense forest thresholds, or cross-zone barriers at the office center.

Player symptom:

- The map marker is correct, but the tax clerk cannot be reached.

Current prevention:

- Quest actor stamping clears a local area around quest actors.

Additional prevention:

- Use nearest-open-cell placement instead of always room center.
- Clear a wider approach lane if the room center is surrounded.
- Refuse to place tax offices in ocean or dense forest unless they have special office layouts.

### Player Cannot Pay Score Or Length

How it occurs:

- Player reaches an office with less than 25 score and too little snake length to surrender two segments.
- Duel may be too hard or unavailable because another duel is active.

Player symptom:

- Quest becomes stuck at an office.

Current prevention:

- Score payment checks score.
- Length payment checks shrink safety.
- Duel exists as third path.

Additional prevention:

- Always keep at least one settlement method available.
- If duel cannot start, disable the option with a clear reason.
- Add a "defer payment" line so leaving the office feels intentional.
- Future option: allow paying with an item, card, or exemption.

### Duel Clerk Completion Is Too Easy Or Too Hard

How it occurs:

- Current duel settlement marks the office paid immediately when the duel is selected.
- If the player loses or leaves, the office may still count as paid.

Player symptom:

- Player can choose duel, avoid actual cost, and still progress.

Prevention:

- Add office state `pendingDuel`.
- Start duel without marking paid.
- On duel win, mark paid with `method: "duel"`.
- On duel loss, either leave unpaid or mark failed depending on design.

### Player Dies After Paying Some Offices

How it occurs:

- Normal death after one or two receipts.

Player symptom:

- Unclear whether paid receipts persist.

Prevention:

- Keep paid offices for the same run if resurrection/extra lives continue.
- If the run truly ends, normal save/run reset rules apply.
- Do not reset office payment just because the room unloads.

### Player Returns To Collector Before All Receipts

How it occurs:

- Player follows the giver marker from memory or returns early.

Player symptom:

- Maybe accidental turn-in or no feedback.

Current prevention:

- Turn-in only occurs at `return-to-giver`.

Additional prevention:

- NPC should show progress text: `2 of 3 receipts filed`.
- Info tab should list each office status.

### Ledger Ring Effects Stack Or Persist After Unequip

How it occurs:

- Equipment flags are applied repeatedly.
- Unequipping does not clear `refundEveryRooms` or `appleScorePenalty`.

Player symptom:

- Infinite refunds, permanent apple score penalty, or duplicate penalties.

Prevention:

- Equipment flags should be derived from equipped items every refresh, not manually accumulated.
- Room refund counter should reset or pause when the ring is unequipped.
- The score refund should trigger once per room transition, not every `getRoom()` call.

## The Green Purchase

Current flow:

1. Quest is only offered by NPCs with an elderwood forest room `10-12` zones away.
2. Accepted quest stores forest `targetRoomId`.
3. Forest teleporter sends player to same x/y room at `z + 100`.
4. A deep merchant is placed in a separate room from the deep teleporter.
5. Deep merchant sells radioactive substance for 50 score.
6. A route-based timer starts.
7. Player must return to the deep teleporter, return to forest, then return to original giver.
8. Timer expiry fails the quest and triggers death once.

Current implementation notes:

- The deep destination room contains the return teleporter.
- The merchant room is stored as `merchantRoomId` and is intentionally separate from `deepRoomId`.
- The merchant room gets a small accessible house stamped around the merchant.
- The timer is based on route distance, not a fixed two minutes.
- On save/load before purchase, the marker should point back to the forest teleporter if the player is not currently in the deep/merchant room.
- On save/load while carrying the substance, `radiationLastTickMs` is reset to current game time so offline time does not instantly drain the timer.

### NPC Offers Quest Without Valid Forest Teleporter Room

How it occurs:

- Eligibility is not checked by giver location.
- Forest biome rules change.
- Current room is too far from elderwood.

Current prevention:

- `canOfferQuestFromGiver("green-purchase", giverRoomId)` checks for a forest room within `10-12` zones.

Additional prevention:

- Also validate the chosen room can place an actor safely.
- For cheat-started quest, either spawn the giver only when eligible or move the teleporter search to the nearest eligible forest with a clear marker.

### Teleporter Spawns But Is Not Activatable

How it occurs:

- Actor only responds to interaction key, while player expects collision.
- Actor tile is blocked or not stamped into the room on load.

Current prevention:

- Teleporters activate when the snake head enters the exact actor tile.
- Rooms are stamped through `getRoom()` and room entry.

Additional prevention:

- Keep the interaction key as a backup.
- Make nearby hint explicit: "slither onto it."
- Clear a `5x5` tile area around the pad.
- If the player crosses the pad too fast, activation should still happen during step resolution.

### Deep Room Is Hostile Or Impossible

How it occurs:

- Depth `z + 100` inherits biome hazards, enemies, obstacles, or temperature conditions.
- Deep teleporter room is blocked.
- Separate merchant room is blocked.
- Merchant house doorway or approach is blocked.

Player symptom:

- Player teleports into immediate death, cannot reach the merchant, or cannot return to the teleporter.

Current prevention:

- Quest actor stamping clears a wider area around teleporters and merchant actors.
- Merchant is placed in a separate `merchantRoomId`, not inside the teleporter room.
- Merchant room gets an accessible house stamp with a doorway and cleared approach.

Prevention:

- Deep teleporter room and merchant room should both get quest-safe clearings.
- Suppress unavoidable hazards in the spawn/merchant area.
- Place the merchant and return teleporter before enemies or remove enemies nearby.
- Keep merchant and teleporter rooms close enough that the timer is fair.
- Future improvement: use special deep-room templates for both the teleporter clearing and merchant house.

### Merchant And Teleporter Are In Different Rooms

How it occurs:

- This is intentional current design: the player must leave the deep teleporter room, reach the merchant, buy the substance, and return to the teleporter before heading back to the giver.

Player symptom:

- After teleporting 100 depths down, the marker may need to switch from the deep teleporter to the merchant.
- After buying, the marker must switch back to the deep teleporter.

Current prevention:

- `merchantRoomId` is stored on the quest instance.
- During `buy-substance`, the marker targets the merchant when the player is in the deep area.
- During `escape-radiation`, the marker targets the deep teleporter while still deep, then the original giver after returning.

Additional prevention:

- Quest subtasks should explicitly say:
  - find the forest teleporter;
  - reach the deep merchant;
  - buy the substance;
  - return to the deep teleporter;
  - return to the original giver.
- If the player is deep but outside both deep rooms, marker logic should prefer the current next objective rather than the original forest teleporter.

### Player Cannot Afford The Substance

How it occurs:

- Player accepts quest with less than 50 score.
- Player spends score before reaching merchant.

Current behavior:

- Merchant refuses purchase; quest remains in `buy-substance`.
- The deep teleporter can return the player without purchase.

Prevention:

- This is acceptable because the deep teleporter can return the player without purchase.
- Quest subtask should say `Buy the substance - 50 score`.
- Optional: require 50 score before offering the quest.

### Player Buys Substance, Then Saves And Reloads

How it occurs:

- Timer state is saved as remaining time, but load order or paused state may reset it.

Player symptom:

- Timer restarts, vanishes, or instantly kills the player.

- `remainingRadiationMs`, `totalRadiationMs`, and `quest.staged.radiationLastTickMs` are stored in flags.
- On load, `radiationLastTickMs` is reset to current game time to avoid offline drain or instant timeout.

Additional prevention:

- If `remainingRadiationMs <= 0` on load, fail the quest with readable text.
- Never use wall-clock time for this timer unless the design explicitly wants offline decay.

### Timer Runs While Paused Or In Menus

How it occurs:

- Timer uses real elapsed time instead of simulation time.
- Pause overlay does not stop `step()`.

Player symptom:

- Player dies while reading quest info or inventory.

Prevention:

- Timer should tick from game simulation time only.
- Pause, dialogue, map, and inventory should not reduce remaining time unless intentionally designed.
- If dialogue is open with the deep merchant, timer should not start until purchase is confirmed.

### Timer Expiry And Resurrection Interact Badly

How it occurs:

- Radiation timeout returns death reason `temperature`.
- Phoenix Charm, extra lives, Baby Bottle, or future revival systems can intercept death.
- Quest failure and death resolution happen in different paths.

Current behavior:

- Quest is failed before death handling attempts rescue.

Prevention:

- Keep that ordering: fail quest first, then resolve death/resurrection.
- Ensure carried item is removed before resurrection.
- Show quest failure text even if the run survives.
- Add a distinct death/failure reason like `radiation-timeout` instead of reusing `temperature` long term.

### Player Uses Forest Teleporter Again While Carrying Substance

How it occurs:

- After returning to the forest, the forest teleporter actor still exists during `escape-radiation`.
- Player steps on it again instead of going to giver.

Player symptom:

- Unexpected re-teleport, stuck loop, or no feedback.

Current behavior:

- Forest teleporter exists during `escape-radiation`, but `useGreenTeleporter()` only returns from deep room to forest. It does nothing from forest during that stage.
- The marker should point to the giver after forest return.

Prevention:

- Hide or disable forest teleporter after returning from the deep room.
- Or show a clear message: `The pad refuses to take the green thing back down.`
- Marker should point to giver after forest return, not teleporter.

## Freak You

Status: implemented as a staged boss quest.

Current flow:

1. Accept from a terrified time traveler.
2. A nearby target room is prepared.
3. A portal appears.
4. Freak You emerges as a long, 3-wide snake boss.
5. Freak You is immune to bullets.
6. The player must make Freak You collide with the player's body.
7. Return to the time traveler.
8. Receive Time Splinter.

Current implementation notes:

- Freak You tracks an explicit `headCenter` so movement, marker tracking, and head rendering agree.
- The head is highlighted with a directional nose marker.
- The boss cannot intentionally U-turn.
- Turns are blocked near room edges with a 5-tile margin, reducing unavoidable entry deaths.
- The boss can carve/eat walls instead of getting stuck.
- The quest marker tracks the boss head room while the boss is alive.
- If the boss is missing after load while the quest is still active, it is respawned.

### Boss Spawns All At Once Instead Of Emerging

How it occurs:

- Boss body is initialized at full length.

Current prevention:

- Freak You starts with only the 3-wide head band and grows as it moves, making it feel like it is coming out of the portal.

Additional prevention:

- Keep the portal visible until a minimum number of segments has emerged.
- Delay boss damage until the head has fully exited the portal, or clearly telegraph the danger zone.

### Head Direction Is Ambiguous

How it occurs:

- A 3-wide head band has multiple cells.
- If movement uses an edge cell as the center, the boss appears to drift or reverse.

Current prevention:

- Store `headCenter` explicitly.
- Draw the nose only on the center head cell.
- Use `headCenter` for movement and marker tracking.

### Boss Turns Near A Room Entrance

How it occurs:

- Freak You turns one or two tiles from a room boundary.
- Player enters the adjacent room and immediately hits a fresh wall of boss body.

Current prevention:

- Direction changes require the next 3-wide head band to stay inside a 5-tile room-local margin.

Additional prevention:

- Consider widening the margin for larger rooms or high-speed boss states.
- Prevent newly created body cells from occupying player entry buffers.

### Boss Gets Stuck On Walls

How it occurs:

- Boss pathing tries to follow the player into an obstacle-heavy room.

Current prevention:

- Freak You carves wall tiles in its next head band instead of failing movement.

Additional prevention:

- Avoid carving special quest actors, portals, or village interiors unless explicitly allowed.
- Emit debris/juice so wall eating is visible rather than looking like clipping.

### Player Shoots Freak You Forever

How it occurs:

- Player expects guns to work on any boss.

Prevention:

- Keep objective text explicit: `Make Freak You run into your body`.
- Consider a "bullets do nothing" popup the first time a bullet hits Freak You.
- Info tab should keep the boss-kill method visible until completion.

### Player Dies After Buying But Before Returning

How it occurs:

- Normal wall/enemy/depth death while carrying radioactive substance.

Player symptom:

- Unclear whether the radioactive quest failed.

Prevention:

- Decide intentionally:
  - strict version: any death while carrying substance fails quest;
  - current version: only timeout fails quest if the run survives.
- MVP recommendation: any death while carrying the substance should fail it, because it is explicitly unstable.
- Implement by checking carried radioactive quest state during death resolution.

### Quest Completes But Timer Keeps Ticking

How it occurs:

- Completion clears carried item but not timer flags.
- Timer loop scans stale instance data.

Current prevention:

- Timer only ticks while stage is `escape-radiation` and carried item is `radioactive-substance`.

Additional prevention:

- On turn-in, clear `remainingRadiationMs`, `carriedItemId`, and `quest.staged.radiationLastTickMs`.
- `getRadiationTimer()` should return null for completed/failed quests.

### Cheat-Spawning The Quest In An Ineligible Place

How it occurs:

- Cheat creates the NPC wherever the player stands.
- Current location may have no forest within `10-12` zones.

Player symptom:

- Cheat appears to do nothing or creates a quest with fallback target behavior.

Prevention:

- Cheat should either:
  - refuse with message: `No eligible forest teleporter site within 10-12 zones`;
  - or spawn a temporary eligible forest teleporter site and mark it as quest-made.
- For debugging, the second option is more useful.

## Quest Controller Edge Cases

### Assigned Quest Becomes Invalid

How it occurs:

- NPC gets assigned Green Purchase.
- Biome rules or eligibility change before interaction.

Current prevention:

- `getQuestForGiver()` rechecks `canOfferQuestFromGiver()` and discards invalid assignments.

Additional prevention:

- Log invalid assignment replacement in debug builds.
- Avoid changing assigned quests after the player has seen the offer unless the offer was never accepted.

### Random Quest Order Feels Repetitive

How it occurs:

- Registry is small.
- Accepted/completed exclusions are run-scoped.
- Giver assignment persists by room.

Prevention:

- Weight recently seen quests lower.
- Track `quest.seenOffers` separately from accepted quests.
- Let special-giver quests declare eligibility and priority.
- Show "no quest available" instead of reassigning the same quest flavor nearby.

### Random Encounters Start Giver-Scoped Quests Without A Giver

How it occurs:

- `resolveRandomEncounter()` calls `offerSpecificQuestById(encounter.questId, this)` without a `giverRoomId`.

Player symptom:

- A complex quest may be accepted without an original NPC room.

Prevention:

- Complex staged quests should require a giver room.
- Random encounters that offer staged quests should pass `currentRoomId` or create a temporary giver anchor.
- If no giver exists, reject staged quest offer and use a simple quest instead.

## Recommended Test Matrix

Manual smoke tests:

- Accept Tax Collector, pay all offices by score, return to giver.
- Accept Tax Collector, pay one by length, one by score, one by duel, return.
- Try Tax Collector with insufficient score and short length.
- Save/load after one tax office is paid.
- Save/load while standing in a tax office target room.
- Accept Green Purchase from eligible NPC and confirm marker is in elderwood within `10-12` rooms.
- Confirm ineligible NPCs do not offer Green Purchase.
- Slither directly onto forest teleporter and confirm activation.
- Buy radioactive substance, wait for timer expiry, confirm quest fails and resurrection systems can still save the run.
- Buy radioactive substance, use deep teleporter, return to original giver before timer expires.
- Save/load while carrying radioactive substance.
- Trigger Green Purchase cheat in eligible and ineligible rooms.
- Accept Find My Baby, locate baby, pick it up, confirm marker returns to giver and cry loop plays.
- Save/load while carrying the baby and confirm cry loop and marker resume.
- Complete Find My Baby and confirm the cry stops.
- Accept Freak You, confirm portal emergence, head marker tracking, no U-turns, and no edge turns near room boundaries.
- Kill Freak You by body collision and return to giver.
- Save/load during Freak You and confirm missing boss recovery.

Automated tests worth adding:

- Target placement returns unique tax offices within radius `5-8`.
- Green Purchase eligibility returns false without forest candidates.
- Green Purchase target is always elderwood when accepted normally.
- Quest actor stamping clears blocked center tiles.
- Radiation timeout transitions to `failed` exactly once.
- Turn-in grants reward exactly once.
- Completed/failed staged quests do not emit active map markers.
- Find My Baby carried state emits turn-in marker and no target actor.
- Green Purchase stores distinct `deepRoomId` and `merchantRoomId`.
- Green Purchase marker switches merchant -> deep teleporter -> giver.
- Freak You turn selection rejects turns inside the room-edge margin.
- Freak You marker uses boss head room, not spawn room.

## Priority Fixes

1. Add a nearest-open-cell quest actor placement helper.
2. Add explicit staged quest death hooks.
3. Make Tax Clerk duel settlement wait for duel victory.
4. Add save/load tests for staged quest instances, baby carried state, Freak You respawn, and radiation timer.
5. Decide and implement Green Purchase cheat behavior in ineligible locations.
6. Add a fallback original-giver stamp for return quests.
7. Prevent quest actors/teleporters from being overwritten by future special-room stamps.
8. Promote staged quest flags into typed save data once the system stabilizes.
