# Snake for the Modern Gamer — Cave Rooms Requirements

## 1. Overview

Add a new **Cave Room** system to *Snake for the Modern Gamer*.

Caves are special subrooms attached to normal overworld rooms. They are not part of the normal global `x,y,z` room grid, but they should be implemented in a way that can eventually support multi-zone subworlds or dimensions.

For v1, caves will mostly be **single-zone rooms** entered through cave entrances placed in overworld rooms. Each cave provides a small contained encounter: timed apple rooms, treasure rooms, lake treasure rooms, NPC gift rooms, monster dens, or random single-room structure encounters.

The goal is to add Zelda-like discovery moments to exploration without building full alternate dimensions yet.

---

## 2. Design Goals

### 2.1 Primary Goals

- Add cave entrances to overworld rooms.
- Cave entrances should replace accessible barrier/wall blocks.
- Entering a cave should load a separate cave room instance.
- Caves should support deterministic generation from seed.
- Caves should save completion state.
- Caves should always include an exit back to the overworld.
- V1 caves should be single-zone, but the code should support future multi-zone cave instances.
- Cave contents should reuse existing game systems where possible: apples, items, NPCs, enemies, structures, water traversal, timers, rewards.

### 2.2 Non-Goals for V1

- No Heaven/Hell dimensions.
- No full procedural dungeon generator.
- No large multi-zone cave chains yet.
- No biome-specific cave structure table yet.
- No caves inside towns or major structures unless explicitly allowed later.
- No multiple cave entrances per overworld room in v1.
- No forced overworld coordinate movement inside caves.

---

## 3. Terminology

### 3.1 Overworld Room

A normal room addressed by global coordinates, such as:

```ts
"-6,-7,0"
```

These rooms use the existing world generation, biome, structure, and transition logic.

### 3.2 Cave Instance

A cave attached to an overworld room.

Example ID:

```ts
"cave:-6,-7,0:0"
```

The cave belongs to parent room `-6,-7,0`, but it does not occupy any global coordinate.

### 3.3 Cave Zone

A local zone inside a cave instance.

For v1, every cave instance may only have one zone:

```ts
"0,0,0"
```

But the data model should support future multi-zone caves:

```ts
"0,0,0"
"1,0,0"
"1,-1,0"
"0,0,-1"
```

### 3.4 Cave Entrance

A tile in an overworld room that lets the snake enter a cave instance.

The entrance should replace a barrier/wall block that is accessible from adjacent walkable terrain.

---

## 4. High-Level Behavior

### 4.1 Cave Spawning

Caves should have a base chance of appearing in eligible overworld rooms.

Recommended starting value:

```ts
baseCaveChance = 0.10
```

Only one cave entrance may spawn per overworld room in v1.

### 4.2 Cave Entrance Placement

Cave entrances should be placed by replacing a wall/barrier block.

A valid cave entrance candidate must satisfy:

- Tile is a barrier/wall/solid obstacle.
- Tile has at least one adjacent walkable cardinal neighbor.
- Tile is not inside the spawn guard area.
- Tile is not blocking required room traversal.
- Tile is not on a room edge portal transition.
- Tile is not inside a major structure unless that cave type explicitly allows it.
- Tile is accessible by the snake from the spawn/start area.
- Prefer tiles on the outside of a barrier cluster.

Recommended scoring:

- Higher score if tile has 1–2 adjacent walkable neighbors.
- Higher score if tile has at least 2 adjacent wall/barrier neighbors.
- Lower score if tile is too close to portals, spawn, NPCs, or existing structures.
- Reject if adjacent walkable tile is not reachable from spawn.

### 4.3 Entering a Cave

When the snake moves onto a cave entrance tile:

1. Save current overworld room ID and return position.
2. Load the cave instance.
3. Spawn the snake inside the cave near the cave entrance.
4. Apply cave-specific rules.
5. Disable normal overworld coordinate edge transitions unless the cave template allows wrapping.

### 4.4 Exiting a Cave

Every cave must have at least one visible exit.

When the snake enters the exit tile:

1. Return to parent overworld room.
2. Place snake near the original cave entrance or configured return position.
3. Apply cave completion/collapse rules if applicable.

### 4.5 Forced Ejection

Some caves, such as timed apple rush caves, should eject the player automatically when the timer expires.

On forced ejection:

1. Shake screen / show rumble feedback.
2. Return snake to overworld.
3. Mark cave as completed/collapsed if applicable.
4. Replace overworld cave entrance with rubble/explosion aftermath.

---

## 5. Data Model Requirements

### 5.1 Cave Entrance

Add cave entrance data to room snapshots.

```ts
export interface CaveEntrance {
  id: string;
  caveId: string;
  x: number;
  y: number;
  templateId: CaveTemplateId;
  collapsed: boolean;
}
```

Room snapshot should support:

```ts
caveEntrances?: CaveEntrance[];
```

### 5.2 Cave Instance

```ts
export interface CaveInstance {
  id: string;
  parentRoomId: string;
  seed: number;
  templateId: CaveTemplateId;
  state: CaveInstanceState;
  returnPosition: {
    x: number;
    y: number;
  };
  zones: Record<string, CaveZone>;
}
```

```ts
export type CaveInstanceState =
  | 'available'
  | 'active'
  | 'completed'
  | 'collapsed';
```

### 5.3 Cave Zone

```ts
export interface CaveZone {
  id: string;
  localCoord: {
    x: number;
    y: number;
    z: number;
  };
  templateId: string;
  completed: boolean;
  exits: Partial<Record<'north' | 'south' | 'east' | 'west' | 'up' | 'down', string>>;
}
```

For v1, `zones` may always contain only:

```ts
"0,0,0"
```

### 5.4 Cave Template

```ts
export interface CaveTemplate {
  id: CaveTemplateId;
  label: string;
  category:
    | 'appleRush'
    | 'treasure'
    | 'npc'
    | 'combat'
    | 'structure';

  layoutId: CaveLayoutId;
  boundaryMode: CaveBoundaryMode;
  exitMode: CaveExitMode;

  timerSeconds?: number;
  collapseOnExit?: boolean;
  collapseOnTimerEnd?: boolean;
  forcedEjectionOnTimerEnd?: boolean;

  applePool?: CaveApplePool;
  rewardTableId?: string;
  enemyTableId?: string;

  structureTableId?: string;
}
```

```ts
export type CaveBoundaryMode =
  | 'solidWalls'
  | 'wrap';

export type CaveExitMode =
  | 'manual'
  | 'timerForced'
  | 'combatClear'
  | 'rewardClaimed';
```

### 5.5 Cave Save State

Save only cave instances that have been discovered, entered, completed, collapsed, or modified.

```ts
export interface CaveSaveState {
  caveInstances: Record<string, CaveInstanceSaveData>;
}

export interface CaveInstanceSaveData {
  id: string;
  parentRoomId: string;
  templateId: CaveTemplateId;
  state: CaveInstanceState;
  collectedItemIds: string[];
  openedChestIds: string[];
  killedEnemyIds: string[];
  rewardClaimed: boolean;
  discoveredZones: string[];
}
```

Generated layout should come from seed. Player modifications should come from save state.

---

## 6. Cave Template Pool — V1

V1 should include the following cave templates.

### 6.1 Golden Apple Rush

A timed cave filled with golden apples.

Rules:

- Contains 15 golden apples.
- Timer starts immediately on entry.
- Timer duration: 30 seconds.
- Player may leave manually through exit.
- If timer expires, player is forced out.
- Cave collapses after exit or timer expiration.
- Overworld entrance becomes rubble/exploded/collapsed.

Requirements:

- Apples should be collectable using normal apple behavior.
- Timer should be visible.
- Cave should not be re-enterable after collapse.
- Exit must be reachable without collecting all apples.

### 6.2 Skittish Apple Rush

A timed cave containing running/skittish apples.

Rules:

- Contains 10–20 skittish/running apples.
- Timer starts immediately on entry.
- Timer duration: 35 seconds.
- Player may leave manually through exit.
- If timer expires, player is forced out.
- Cave collapses after exit or timer expiration.

Requirements:

- Use existing skittish/running apple behavior where possible.
- Apples should be seeded.
- Exit must remain reachable.
- Cave should not softlock the player.

### 6.3 Simple Treasure Cave

A small cave with a simple reward.

Rules:

- Contains one chest, item pedestal, or reward pickup.
- Exit is visible and available from the start.
- Cave may remain accessible after reward is claimed, but reward should not respawn.
- No special traversal item required.

Requirements:

- Reward should be selected from an appropriate cave treasure table.
- Save whether reward was claimed.
- If re-entered after completion, cave should remain empty or show opened chest.

### 6.4 Lake Treasure Cave

A treasure cave with a lake in the center and four visible rewards in or beyond the lake.

The player can see the rewards immediately, but needs an existing traversal system, likely flippers, to collect them.

Rules:

- Center of the room contains water/lake terrain.
- Four separate items are placed in the lake area or on small islands within the lake.
- Exit is visible and reachable from dry land.
- Cave must not require flippers or water traversal to exit.
- Cave remains persistent so player can return later.
- Each item is tracked independently.
- Collected items should not respawn.

Requirements:

- Uses existing water/flipper traversal behavior.
- If player lacks required traversal, rewards remain visible but inaccessible.
- Dry path from entrance to exit is mandatory.
- Save collected item IDs.
- Do not collapse on exit.
- Use slightly better-than-basic treasure rewards because traversal is required.

Recommended layout:

```txt
########################
#......................#
#......................#
#.......~~~~~~~~.......#
#......~~~~~~~~~~......#
#......~~~I~~I~~~......#
#......~~~~~~~~~~......#
#......~~~I~~I~~~......#
#......~~~~~~~~~~......#
#.......~~~~~~~~.......#
#......................#
#.........EXIT.........#
########################
```

### 6.5 Cave Dweller

A Zelda-style NPC cave.

The cave contains one cave-dwelling NPC who gives the player an item.

Rules:

- Contains one NPC.
- NPC gives one item or reward.
- Reward can only be claimed once.
- Exit is visible and available.
- Cave remains accessible after reward is claimed.

Suggested dialogue:

> “It’s dangerous to go alone. Take this.”

Variants:

- “It’s dangerous to go alone. Take this. I found it in a wall.”
- “A snake should never enter a cave unarmed. Take this.”
- “The world is full of corners. Take this.”
- “I have lived in this cave for reasons I will not explain. Take this.”

Requirements:

- Use existing NPC/dialogue systems where possible.
- Item should come from a cave dweller reward table.
- Save reward claimed state.

### 6.6 Monster Den

A compact combat cave.

Rules:

- Contains enemies.
- Reward appears or unlocks after enemies are defeated.
- Exit should be visible and available from the start for v1.
- Chest/reward should be locked until enemies are cleared.
- Cave remains accessible after clearing, but enemies/reward should not respawn.

Requirements:

- Use existing enemy systems.
- Enemy count and types should be seeded.
- Save killed enemies and reward state.
- Avoid spawning enemies directly on the snake’s cave spawn point.

### 6.7 Random Structure Room

A cave template that force-spawns exactly one existing biome-neutral, single-room structure.

This is meant to reuse existing overworld content in a cave/subroom context.

Rules:

- Select one structure from a weighted structure table.
- Force that structure to spawn in the cave room.
- Do not use normal random structure probabilities.
- Exit is visible and available.
- Structure room should be persistent unless specific structure behavior says otherwise.
- Structure must not require biome-specific terrain or overworld adjacency.

V1 structure table:

```ts
const CAVE_STRUCTURE_TABLE = [
  { structureId: 'snakeMcDonalds', weight: 1 },
  { structureId: 'goblinCamp', weight: 2 },
  { structureId: 'shrine', weight: 2 },
  { structureId: 'questHouse', weight: 1 },
  { structureId: 'villageShop', weight: 1 },
];
```

Actual IDs should match existing code.

Excluded from v1:

- Jade-specific structures.
- Liberty Badlands-specific structures.
- Ocean-specific structures.
- Structures requiring multi-room town adjacency.
- Structures requiring outdoor roads, biome hazards, or special biome terrain.

Requirements:

- Add a forced structure placement path.
- Structure placement should not depend on random overworld structure chance.
- If forced placement fails, fallback to Simple Treasure Cave or reroll another valid structure.
- Preserve existing rendering/interactions for the selected structure.

---

## 7. Cave Layout Requirements

Every cave must:

- Have a defined entrance spawn area.
- Have a visible exit.
- Have a 1-tile solid wall border unless `boundaryMode = 'wrap'`.
- Avoid softlocks.
- Avoid spawning the snake on hazards, enemies, water, or walls.
- Be deterministic from cave seed.

Most caves should use:

```ts
boundaryMode: 'solidWalls'
```

Some caves may use:

```ts
boundaryMode: 'wrap'
```

In wrap caves, moving off one side of the cave room wraps to the opposite side, similar to classic Snake rules.

Wrap caves should be uncommon in v1 and should not be used for caves where wrapping would break structure placement or exits.

---

## 8. Cave Generation Flow

Recommended generation flow:

1. Generate overworld room normally.
2. Place normal obstacles and structures.
3. Evaluate whether the room is eligible for a cave.
4. Roll cave spawn chance.
5. Find valid cave entrance candidates among barrier/wall tiles.
6. Select cave template from weighted table.
7. Replace chosen barrier tile with cave entrance tile.
8. Store cave entrance metadata in room snapshot.
9. Validate room safety.

When a cave is entered:

1. Resolve cave instance ID from entrance.
2. Check save state.
3. Generate cave layout from cave seed and template.
4. Apply saved state overlays.
5. Spawn snake.
6. Start cave-specific behavior.

---

## 9. Cave Template Weighting

Initial cave template table:

```ts
const CAVE_TEMPLATE_TABLE = [
  { id: 'goldenAppleRush', weight: 3 },
  { id: 'skittishAppleRush', weight: 3 },
  { id: 'simpleTreasure', weight: 3 },
  { id: 'monsterDen', weight: 2 },
  { id: 'randomStructureRoom', weight: 2 },
  { id: 'caveDweller', weight: 1 },
  { id: 'lakeTreasure', weight: 1 },
];
```

Notes:

- Lake Treasure should be rare because it may require backtracking.
- Cave Dweller should be rare because it gives a direct item.
- Random Structure Room should be uncommon but not extremely rare.
- Timed apple caves can be more common because they collapse and are self-limiting.

---

## 10. Spawn Chance Rules

Recommended:

```ts
baseCaveChance = 0.10
```

Caves should not spawn:

- In origin room.
- In rooms too close to origin, unless desired later.
- In rooms without valid barrier entrance candidates.
- In ocean rooms for v1.
- Inside town districts for v1.
- Inside major structures for v1.
- In rooms where safety validation fails after entrance placement.

Optional pity chance:

```ts
effectiveChance = baseChance + roomsSinceLastCave * 0.01
maxChance = 0.20
```

This prevents long cave droughts.

---

## 11. Player State and Cave State

When entering a cave, store:

```ts
{
  parentRoomId: string;
  returnPosition: { x: number; y: number };
}
```

For v1, a single return state is enough.

However, architecture should allow a future stack:

```ts
roomStack: [
  {
    roomId: "-6,-7,0",
    returnPosition: { x: 12, y: 9 }
  }
]
```

This supports future caves inside caves.

---

## 12. UI Requirements

### Cave Entrance

Cave entrance tile should be visually distinct.

Possible labels/icons:

- Cave mouth
- Dark opening
- Hole in wall
- Cracked arch
- Stairs down

### Cave Timer

Timed caves require visible countdown UI.

Timer should show:

- Seconds remaining.
- Warning flash / sound near final 5 seconds.
- Forced ejection feedback.

### Cave Exit

Exit should be visually clear.

Possible labels/icons:

- Ladder up
- Cave mouth
- Exit stairs
- Light beam

### Collapse Feedback

When a timed cave collapses:

- Screen shake.
- Sound effect if available.
- Entrance tile in overworld becomes rubble.
- Optional explosion visual.

---

## 13. Safety Requirements

Caves must not create softlocks.

Required validations:

- Snake spawn is walkable.
- Exit is reachable from spawn.
- In Lake Treasure Cave, dry exit path exists without flippers.
- In Monster Den, enemies do not spawn on snake spawn.
- In Structure Room, exit remains reachable after structure placement.
- In timed caves, forced ejection always works.
- Collapsed caves cannot be re-entered.
- Caves do not respawn one-time rewards after save/load.

---

## 14. Testing Requirements

### Unit Tests

Add tests for:

- Cave entrance candidate detection.
- Cave entrance candidates are reachable from spawn.
- Cave template selection is deterministic for seed.
- Cave IDs are deterministic.
- Cave state persists reward collection.
- Timed cave collapse updates save state.
- Lake Treasure exit path is reachable without flippers.
- Structure Room fallback works when forced structure placement fails.

### Generation Tests

Generate many rooms and verify:

- Cave spawn rate is approximately expected.
- No more than one cave entrance per room.
- Cave entrance always replaces a barrier tile.
- Cave entrance always has adjacent walkable tile.
- Cave rooms always have exits.
- Cave room safety validation passes.

### Save/Load Tests

Verify:

- Claimed treasure does not respawn.
- Collected lake items do not respawn.
- Cave Dweller reward does not repeat.
- Monster Den enemies remain killed.
- Collapsed timed caves stay collapsed.
- Re-entered persistent caves retain correct state.

---

## 15. Implementation Notes

Possible files:

```txt
src/caves/caveTypes.ts
src/caves/caveTemplates.ts
src/caves/caveEntrancePlacement.ts
src/caves/caveGenerator.ts
src/caves/caveState.ts
src/caves/caveRewards.ts
src/caves/caveStructureTable.ts
```

Recommended integration points:

- Room generation pipeline:
  - Add cave entrance placement stage.
- Room snapshot types:
  - Add `caveEntrances`.
- Game navigation:
  - Add cave enter/exit handling.
- Save manager:
  - Add cave save state.
- Renderer:
  - Render cave entrance, cave exit, rubble/collapsed entrance.
- Apple system:
  - Support cave-specific apple placement.
- Structure system:
  - Add forced single-structure placement API.
- Inventory/item system:
  - Support Cave Dweller and Lake Treasure rewards.

---

## 16. Acceptance Criteria

The v1 cave system is complete when:

1. Caves can spawn in eligible overworld rooms.
2. Cave entrances replace accessible barrier blocks.
3. Cave entrances are deterministic per seed.
4. The snake can enter and exit caves.
5. Cave rooms are separate from global `x,y,z` overworld coordinates.
6. Cave data model supports future multi-zone caves.
7. Golden Apple Rush works.
8. Skittish Apple Rush works.
9. Simple Treasure Cave works.
10. Lake Treasure Cave works and uses existing water/flipper traversal behavior.
11. Cave Dweller works and gives one item only once.
12. Monster Den works and rewards after combat.
13. Random Structure Room works using a weighted biome-neutral structure table.
14. Timed caves collapse after completion/timer expiration.
15. Persistent caves retain state after save/load.
16. No cave type can softlock the player.
17. Tests cover cave generation, entrance placement, save/load, and safety rules.

---

## 17. Future Extensions

Not part of v1, but architecture should allow:

- Multi-zone caves.
- Cave chains.
- Proper dungeons.
- Cave-specific bosses.
- Biome-specific cave structure tables.
- Dark caves with limited vision.
- Bombable hidden cave entrances.
- Town basements and interiors.
- Hell/Heaven/other realm subworlds.
- Caves that exit to a different overworld room.
- Cave maps or cave-detecting items.
- Puzzle caves using snake length, switches, and body positioning.

---

## 18. Summary

V1 caves should be a small but expandable subroom system.

They should feel like Zelda-style discoveries: a hole in a wall, a small contained challenge, a weird NPC, a treasure, a monster den, or an impossible underground structure.

The implementation should stay simple at launch, but the architecture should treat caves as local subworld instances so future multi-room caves, dungeons, and dimensions can be added without rewriting the system.
