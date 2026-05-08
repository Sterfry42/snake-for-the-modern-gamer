# Quest System Design

## Goal

Make quests feel like small RPG stories instead of passive stat counters.

The player should be able to:

- accept a quest from a specific NPC;
- see where to go next on the map;
- find a quest zone or quest object far from the giver;
- interact with a target NPC/object;
- carry a quest item or state back to the original giver;
- receive a reward only after turning the quest in.

The important shift is that quests are no longer just "do number until complete." A quest can have stages, world targets, map markers, dialogue beats, and a return step.

## Core Quest Shape

Each quest should be a small state machine.

```ts
type QuestStage =
  | "offered"
  | "accepted"
  | "travel-to-target"
  | "interact-with-target"
  | "return-to-giver"
  | "ready-to-turn-in"
  | "completed";
```

MVP quests do not need every stage, but the system should support them. Existing stat quests can stay simple by mapping directly from `accepted` to `completed`.

## Quest Instance Data

A quest definition describes what can happen. A quest instance stores what happened in this run.

```ts
interface QuestInstance {
  questId: string;
  giverRoomId: string;
  stage: QuestStage;
  targetRoomId?: string;
  targetZone?: {
    centerRoomId: string;
    radiusRooms: number;
  };
  carriedItemId?: string;
  flags: Record<string, unknown>;
}
```

This instance data should be saved. Current saves already store active, accepted, completed quests and generic flags, so the first implementation can store quest instances in `flags["quest.instances"]`. A later cleanup can promote it into typed save data.

## Quest Markers

Quest markers should point to the next required action, not just the final destination.

Marker types:

- `giver`: return to the original NPC.
- `target-zone`: search this region.
- `target-object`: interact with a specific object or NPC.
- `turn-in`: reward is ready; go back to the giver.

Suggested marker colors:

- accepted/searching: amber
- target found: pale blue
- turn-in ready: green
- failed/blocked: red

The map tab should draw quest markers even if the target room has not been generated yet. Unknown target rooms can appear as faint cells, similar to the existing house/origin markers.

When the player is not in the map tab, the HUD can show a compact direction hint:

```text
Quest: Find My Baby - 17 rooms east, 8 rooms south
```

This avoids forcing the player to pause constantly.

## Target Placement

Quests need deterministic target placement so save/load does not move objectives.

For a target "about 20 squares away":

1. Parse the giver room coordinate.
2. Pick a distance range, for example 18-24 rooms.
3. Pick a direction vector with enough variance to avoid every quest being a straight line.
4. Clamp or reject impossible placements if later world rules require it.
5. Store the target room id on the quest instance.

Example:

```ts
targetRoomId = pickQuestTargetRoom({
  originRoomId: giverRoomId,
  minDistance: 18,
  maxDistance: 24,
  seed: `${runSeed}:${questId}:${giverRoomId}`,
});
```

The target room does not need to exist immediately. The room generator can check active quest instances and stamp the quest object when that room is generated.

## Quest Zones

A zone is better than a single exact room when the quest is exploratory.

For "find my baby," the marker should first reveal a search zone with a radius of 1-2 rooms. Once the player enters the zone, the quest can spawn or reveal the actual baby in one room and update the marker to `target-object`.

This makes the map useful without making the quest feel like GPS.

## NPC Return Flow

The quest controller should not auto-reward complex quests as soon as a condition is true.

Instead:

1. Player accepts quest from giver.
2. Quest instance stores `giverRoomId`.
3. Player completes the field objective.
4. Quest stage becomes `return-to-giver`.
5. Map marker points back to `giverRoomId`.
6. Player talks to that same giver.
7. Quest becomes `completed`.
8. Reward is granted.

Existing simple quests can keep auto-completion for now, but new complex quests should require `turnIn(runtime, instance)`.

## Quest Interactions

Complex quests need interaction hooks:

```ts
interface QuestDefinition {
  id: string;
  label: string;
  description: string;
  onAccept?(runtime: QuestRuntime, instance: QuestInstance): void;
  onEnterRoom?(runtime: QuestRuntime, instance: QuestInstance, roomId: string): void;
  onInteract?(runtime: QuestRuntime, instance: QuestInstance, actorId: string): void;
  canTurnIn?(runtime: QuestRuntime, instance: QuestInstance): boolean;
  onReward?(runtime: QuestRuntime, instance: QuestInstance): void;
  getMarker?(runtime: QuestRuntime, instance: QuestInstance): QuestMapMarker | null;
}
```

This can live alongside the current `Quest` class at first. A practical migration path is:

- keep `Quest` for stat quests;
- add `StagedQuest` for multi-step quests;
- teach `QuestController` to handle both.

## Example Quest: Find My Baby

### Public Quest Card

Title: **Find My Baby**

Description:

```text
The cradle has learned absence. The milk has gone cold in its little moon.
Somewhere beyond twenty rooms of bad weather, my baby is becoming a question.
Bring the question home before it remembers the answer.
```

Short objective:

```text
Find the missing baby and bring it back to the grieving stranger.
```

### Stage 1: Accept

The NPC gives the quest.

State changes:

- store `giverRoomId`;
- choose `targetZone.centerRoomId` around 20 rooms away;
- set `targetZone.radiusRooms = 2`;
- set stage to `travel-to-target`;
- add a `target-zone` map marker.

NPC accept line:

```text
It was small enough to fit inside a name. Then the name opened.
Follow the stain on the map. If it cries, do not answer in your own voice.
```

### Stage 2: Search Zone

When the player enters the target zone, the game chooses or confirms a specific target room in that zone.

The map marker changes from a broad zone to a specific `target-object` marker once the baby has been found or heard.

Possible room treatment:

- the room has no normal quest giver;
- the baby is a small interactable actor;
- nearby tiles are slightly wrong: cradle, blanket, bottle, toy blocks, or a spiral of floor tiles;
- the baby cannot be damaged and should not block the player into death.

### Stage 3: Talk To The Baby

Baby dialogue should be cryptic, but still readable as a joke.

Baby lines:

```text
Before hunger, I was a hallway.
```

```text
I have no teeth, yet the world keeps putting names in my mouth.
```

```text
Carry me, long animal. I am tired of being a prophecy with soft bones.
```

After the interaction:

- add carried item/state `quest-baby`;
- remove or hide the baby actor from the room;
- set stage to `return-to-giver`;
- update map marker to `giverRoomId`;
- HUD objective becomes `Return the baby to the grieving stranger`.

This should be a quest item/state, not a normal inventory item. The player should not be able to equip, sell, or drop the baby.

### Stage 4: Return To Original NPC

The player must return to the same NPC in the same room where the quest began.

Turn-in line:

```text
You brought back the small hunger. The house remembers its shape.
```

Baby final line:

```text
I forgive the cradle. It was also new.
```

State changes:

- remove carried `quest-baby`;
- mark quest completed;
- grant reward.

### Reward

Equipment: **Baby Bottle**

Slot: `amulet`

Description:

```text
A warm little bottle full of second chances. Once per run, when your hearts would hit zero, refill them instead.
```

Mechanical effect:

- one charge;
- when fatal damage would occur, consume the charge;
- set current hearts back to max hearts;
- do not trigger normal death/revival effects;
- show a short message: `The Baby Bottle remembers you whole.`

This is different from the Phoenix Charm. Phoenix cheats death after dying; Baby Bottle resets hearts before death resolves.

Implementation flag:

```ts
modifiers: {
  heartResetCharges: 1
}
```

The equipment system currently does not have `heartResetCharges`, so this would require:

- adding the modifier to `EquipableItem`;
- applying equipment flags when equipped;
- checking the flag before final death resolution;
- consuming the item charge or marking `equipment.babyBottleConsumed`.

## MVP Implementation Plan

1. Add staged quest instance storage.
2. Add quest marker data returned from `SnakeGame` to the map overlay.
3. Draw target-zone and turn-in markers on the map.
4. Add a room-generation hook that can stamp quest actors into target rooms.
5. Add interaction handling for quest actors.
6. Add `Find My Baby` as the first staged quest.
7. Add Baby Bottle equipment and heart-reset behavior.
8. Add save/load coverage for quest instance stage, target room, carried quest item, and consumed reward charge.

## Minimum First Slice

The smallest useful version is:

- one staged quest instance stored in flags;
- one target room exactly 20 rooms away;
- one baby actor in that room;
- one return marker;
- one reward item;
- no generic quest-zone system yet.

After that works, add search zones and generic marker APIs.

## Design Rules For Future Quests

- Every complex quest should know its original giver.
- Every active complex quest should answer "where next?"
- Quest markers should update when the objective changes.
- Quest items should not clutter normal inventory unless they are intended to be usable.
- Rewards should be weird but mechanically legible.
- Cryptic text is best when the objective text is plain.
- The map should guide the player to the next step, not solve the whole quest.

## Example Quest: The Tax Collector Of Your Future Body

### Public Quest Card

Title: **The Tax Collector Of Your Future Body**

Description:

```text
Your future length has been assessed. Your unpaid segments are accruing interest.
Report to the appointed offices before the body you have not yet grown becomes legally enormous.
```

Short objective:

```text
Visit three tax offices, settle your future-body debt, then return to the collector.
```

### Stage 1: Accept

The quest starts from a tax collector NPC.

State changes:

- store `giverRoomId`;
- create three office target rooms, each 8-18 rooms away from the giver and from each other;
- set stage to `visit-offices`;
- add three map markers, numbered `I`, `II`, and `III`;
- store receipt flags:

```ts
flags: {
  offices: [
    { id: "office-1", roomId: "...", paid: false, method: null },
    { id: "office-2", roomId: "...", paid: false, method: null },
    { id: "office-3", roomId: "...", paid: false, method: null }
  ]
}
```

NPC accept line:

```text
You are smaller than your paperwork suggests. That will be corrected.
```

### Stage 2: Visit Tax Offices

Each target room contains a tax clerk, a desk, and a receipt stamp.

At each office, the player chooses one settlement method:

- pay score;
- surrender snake length;
- duel the clerk;
- produce a weird exemption if future skills/equipment support it.

MVP options:

- **Pay score:** lose 25 score.
- **Pay length:** lose 2 body segments if safe.
- **Duel clerk:** start a named duel with modest hearts.

Office clerk lines:

```text
Your tail is income.
```

```text
A segment not yet grown is still a segment owed.
```

```text
Please place your future on the counter.
```

After settlement:

- mark that office as paid;
- store the method;
- remove that office marker;
- if all offices are paid, stage becomes `return-to-giver`;
- map marker points back to the original tax collector.

### Stage 3: Return To Tax Collector

Turn-in line:

```text
Your future body has been reduced to a manageable liability.
```

Possible alternate line if the player fought every clerk:

```text
An aggressive filing strategy. Expensive, but recognized.
```

State changes:

- mark completed;
- grant reward.

### Reward

Equipment: **Ledger Ring**

Slot: `ring`

Description:

```text
A brass ring engraved with numbers that change when you are not looking. Every debt wants to become a weapon.
```

Mechanical effect:

- every 10 rooms visited, grant a tax refund of 20 score;
- apples give 1 less score while equipped.

Implementation flag:

```ts
modifiers: {
  refundEveryRooms: { interval: 10, score: 20 },
  appleScorePenalty: 1
}
```

MVP can simplify this to a plain score reward plus a cosmetic receipt if equipment modifiers are too much for the first slice.

## Example Quest: The Green Purchase

### Public Quest Card

Title: **The Green Purchase**

Description:

```text
There is a merchant beneath the ordinary bottom of the world.
He sells a green thing that should not be held by anything with blood, memory, or plans.
Bring it back quickly. Do not admire it.
```

Short objective:

```text
Find the forest teleporter, buy the radioactive substance 100 depths below, and return before the timer kills you.
```

### Stage 1: Accept

The quest starts from an NPC who needs a mysterious radioactive substance.

State changes:

- store `giverRoomId`;
- choose a forest target room 15-25 rooms away;
- set stage to `find-forest-teleporter`;
- add a `target-zone` map marker in a forest biome.

NPC accept line:

```text
The substance is not rare. Rarity implies the world permits comparison.
This is singular, green, and waiting under a forest that denies it has roots.
```

### Stage 2: Find Forest Teleporter

The target forest room contains an ancient teleporter pad.

Room treatment:

- dense forest edges;
- a circular clearing;
- a humming teleporter tile or object;
- warning text when near it:

```text
The moss bends away from the circle.
```

Interacting with the teleporter:

- stores `returnTeleporterRoomId`;
- moves the player to the same x/y coordinate at depth `currentDepth + 100`;
- generates or loads the deep merchant room;
- sets stage to `buy-substance`.

The map should show a return marker at the teleporter room after teleporting.

### Stage 3: Buy The Substance

At 100 depths below, the player meets a merchant.

Merchant line:

```text
No refunds. Refunds imply survival.
```

Purchase requirements:

- cost: 50 score, or whatever economy feels fair for the current run;
- if the player cannot pay, they can still leave, but the quest remains incomplete.

After purchase:

- add carried quest state `radioactive-substance`;
- set stage to `escape-radiation`;
- start a 120-second real-time countdown;
- show a large timer on screen, not just in the quest list;
- set a map/HUD marker pointing to the deep teleporter.

Timer display:

```text
RADIOACTIVE SUBSTANCE: 01:59
```

The timer should be visually loud: green/yellow at first, orange below 45 seconds, red below 15 seconds, with screen pulse or Geiger-click juice.

### Stage 4: Escape Radiation

The player must:

1. reach the deep teleporter;
2. teleport back to the forest teleporter;
3. return to the original NPC before the timer reaches zero.

After using the teleporter back:

- stage remains `escape-radiation`;
- marker changes from teleporter to original `giverRoomId`;
- HUD objective becomes:

```text
Return to the buyer before the substance kills you.
```

### Failure Rule

If the 120-second timer reaches zero while carrying `radioactive-substance`:

- remove `radioactive-substance`;
- mark the quest failed;
- kill the player once;
- if the player has extra lives or resurrection equipment, those systems may save the run, but the quest remains failed;
- show failure text:

```text
The green thing finishes explaining itself.
```

This is a quest failure, not necessarily a run-ending failure. The player can survive through lives, Phoenix Charm, Baby Bottle, or future revival systems, but the NPC will not accept the destroyed/expired substance.

Suggested failed quest state:

```ts
stage: "failed";
flags: {
  failureReason: "radiation-timeout"
}
```

Failed quests should appear in the accepted quest list as `[!]` and should not be offered again during the same run.

### Stage 5: Turn In

The player returns to the original NPC before the timer expires.

Turn-in line:

```text
Do not set it down. The table has children.
```

State changes:

- stop the timer;
- remove carried `radioactive-substance`;
- mark completed;
- grant reward.

### Reward

Equipment: **Hazard Halo**

Slot: `helm`

Description:

```text
A dim green halo that warns your skull before the world becomes technical.
```

Mechanical effect:

- reduces heat and cold exposure slightly;
- reveals dangerous rooms within 1 room on the map;
- while equipped, radioactive quest timers tick 10% slower if future quests reuse radiation.

Implementation flag:

```ts
modifiers: {
  heatResistance: 0.35,
  coldResistance: 0.35,
  hazardMapSense: 1,
  radiationTimerScalar: 0.9
}
```

For MVP, the reward can be just heat/cold resistance because those modifiers already exist.

### Implementation Notes

This quest needs several systems that simple quests do not:

- biome-aware target placement, so the first teleporter appears in a forest;
- depth-changing teleport interaction;
- a quest countdown timer that survives pause/save/load decisions;
- a large HUD timer;
- quest failure state;
- fatal quest damage that can consume lives without completing the quest.

The timer should probably pause when the game is paused. Save/load behavior needs a product decision:

- easier: quest timers do not persist across full browser reload; loading with radioactive material fails the quest;
- better: store `deadlineGameTimeMs` and restore the remaining time on load.

Recommended first implementation:

- use in-game elapsed time, paused with the game;
- save `remainingRadiationMs`;
- on load, resume from that remaining time.
