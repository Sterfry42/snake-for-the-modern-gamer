# Amendment — Translating Towns from Abstract Structure Nodes to Physical Multi-Zone Spaces

## Purpose

This amendment corrects the earlier town implementation plan.

The previous plan described towns as if they were mostly **abstract internal locations** navigated through menu choices. That is not the intended design.

The intended design is:

> Human towns are generated **physical room clusters** embedded into the normal run. Each town district is a real playable room with town-specific tiles, NPCs, shops, exits, patrols, crimes, and interactables. Input-step menus are used only for interactions inside those rooms, not for navigating the town itself.

So this document explains how to translate the prior design into the correct physical-space implementation.

---

# 1. Core Correction

## Previous model

The previous plan treated towns like this:

```txt
Normal Room
  -> Enter Town Structure
      -> Town Location: Outskirts
          [Go to Gate]
      -> Town Location: Gate
          [Go to Square]
      -> Town Location: Square
          [Go to Market]
```

That would make the town feel like a text-adventure module inside one room.

## Correct model

Towns should instead work like this:

```txt
Normal Wilderness Room
   |
Physical Town Outskirts Room
   |
Physical Town Gate Room
   |
Physical Town Square Room
   |          |             |
Market     Tavern      Residential
   |          |             |
Shop       Back Alley   House Interior
              |
       Thieves Guild Hideout
              |
          Town Exit
              |
       Normal Run Continues
```

Each bracketed location is a **real playable room/zone**, not a menu node.

The player physically moves through these spaces using normal room transitions.

---

# 2. Terminology Changes

## Replace “TownLocationNode” with physical rooms

If the previous plan used language like:

```ts
TownLocationNode
TownLocationKind
currentTownLocationId
moveWithinTown()
```

translate it to:

```ts
TownStructure
GeneratedRoom
TownDistrictKind
currentRoomId
transitionToRoom()
```

The town still has a graph, but the nodes in that graph are actual game rooms.

## Recommended names

```ts
export interface TownStructure {
  id: string;
  name: string;

  biomeId: string;
  seed: number;
  factionId: string;

  physicalRoomIds: string[];

  entranceRoomId: string;
  exitRoomIds: string[];

  districtByRoomId: Record<string, TownDistrictKind>;

  townTags: TownTag[];
  mood: TownMood;

  prosperity: number;
  danger: number;

  wantedLevel: WantedLevel;
  reputation: number;

  discoveredGuild: boolean;
  thievesGuild?: ThievesGuildState;

  laws: TownLaw[];
  rumors: TownRumor[];
  notices: TownNotice[];

  createdAtRoomNumber: number;
}
```

Room metadata:

```ts
export type TownDistrictKind =
  | "outskirts"
  | "gate"
  | "square"
  | "marketStreet"
  | "tavernInterior"
  | "residentialStreet"
  | "backAlley"
  | "guildHideout"
  | "guardPost"
  | "jail"
  | "shopInterior"
  | "townExit";
```

Each generated room can carry structure metadata:

```ts
export interface GeneratedRoom {
  id: string;

  kind: RoomKind;

  structureId?: string;
  structureKind?: "humanTown";
  townDistrictKind?: TownDistrictKind;

  exits: RoomExit[];
  tiles: Tile[][];
  entities: EntitySpawn[];
  interactables: InteractableSpawn[];
}
```

---

# 3. Translation Table

| Previous Abstract Design | Correct Physical Design |
|---|---|
| `TownRoomNode` | actual `GeneratedRoom` with `townDistrictKind` |
| `TownLocationKind` | `TownDistrictKind` |
| `connections: string[]` | physical `RoomExit[]` between generated rooms |
| `Go to Market` menu button | physical exit from Square room to Market room |
| `Town mode pauses normal generation` | normal generation inserts a room cluster; player traverses it |
| Guard encounter on menu move | guard entity/patrol spawn in physical town room |
| Shop as menu in Market node | shop counter/stall interactable inside Market room |
| Back Alley as menu node | actual narrow room with crates, graffiti, hidden door |
| Guild Hideout as internal node | physical hidden room connected from Back Alley |
| Wanted roll when changing location | patrol spawns/checks during physical room transition |
| Town map as location list | town map as map of real generated rooms |
| Abstract `exitStructureAndResumeRun()` | town exit room connects to next normal generated room |

---

# 4. Physical Town Cluster Generation

## 4.1 Towns are generated room clusters

A town should be generated as a connected cluster of actual rooms.

Generation flow:

```txt
1. Normal room generation decides to spawn a town.
2. Generate TownStructure state.
3. Generate multiple physical rooms for that town.
4. Connect those rooms with normal room exits.
5. Connect town entrance to prior normal room.
6. Connect town exit to future normal room generation.
```

Pseudo-code:

```ts
function generateTownCluster(options: TownGenOptions): GeneratedTownCluster {
  const town = createTownState(options);

  const graph = generateTownDistrictGraph(options.seed);
  const rooms = graph.nodes.map(node =>
    generateTownPhysicalRoom({
      town,
      districtKind: node.kind,
      seed: deriveSeed(options.seed, node.id),
    })
  );

  connectTownRooms(rooms, graph.edges);

  town.physicalRoomIds = rooms.map(room => room.id);
  town.entranceRoomId = findDistrictRoom(rooms, "outskirts").id;
  town.exitRoomIds = rooms
    .filter(room => room.townDistrictKind === "townExit")
    .map(room => room.id);

  town.districtByRoomId = Object.fromEntries(
    rooms.map(room => [room.id, room.townDistrictKind])
  );

  return { town, rooms };
}
```

---

## 4.2 Simple MVP physical graph

Use this for the first implementation:

```txt
[Outskirts]
    |
[Gate]
    |
[Square] ---- [Market Street]
   /   \              |
[Tavern]       [Shop Counter / optional Shop Interior]
   |
[Back Alley] ---- [Guild Hideout, hidden]
   |
[Residential Street]
   |
[Town Exit]
```

If you want a slightly smaller MVP:

```txt
[Outskirts]
    |
[Gate]
    |
[Square] -- [Market Street]
    |
[Tavern]
    |
[Back Alley]
    |
[Town Exit]
```

Residential can be added shortly after.

---

# 5. Physical Room Templates

Each town district needs a physical layout generator.

```ts
function generateTownPhysicalRoom(args: {
  town: TownStructure;
  districtKind: TownDistrictKind;
  seed: number;
}): GeneratedRoom {
  switch (args.districtKind) {
    case "outskirts":
      return generateTownOutskirtsRoom(args);
    case "gate":
      return generateTownGateRoom(args);
    case "square":
      return generateTownSquareRoom(args);
    case "marketStreet":
      return generateMarketStreetRoom(args);
    case "tavernInterior":
      return generateTavernInteriorRoom(args);
    case "residentialStreet":
      return generateResidentialStreetRoom(args);
    case "backAlley":
      return generateBackAlleyRoom(args);
    case "guildHideout":
      return generateGuildHideoutRoom(args);
    case "townExit":
      return generateTownExitRoom(args);
  }
}
```

---

## 5.1 Outskirts room

Physical features:

- road tiles
- fences
- grass/dirt blend with biome
- signpost
- abandoned cart
- farmer/traveler NPC chance
- low danger
- visible town gate exit

Interactables:

```txt
Read Town Sign
Inspect Cart
Talk to Traveler
Steal Apples, if farmland prop exists
```

---

## 5.2 Gate room

Physical features:

- gate/wall tiles
- guard booth
- guard NPCs
- toll post
- main road into square
- possible side/sneaky path later

Interactables:

```txt
Talk to Guard
Pay Toll
Bribe Guard
Read Local Law
Check Wanted Poster
```

At wanted level 3+, gate may become guarded/blocked.

---

## 5.3 Town square room

Physical features:

- open plaza
- fountain/statue
- notice board
- NPCs/civilians
- guards
- exits to market, tavern, residential, gate, back alley

Interactables:

```txt
Read Notice Board
Check Wanted Poster
Talk to Town Gossip
Talk to Guard
Inspect Fountain/Statue
```

This is the hub room.

---

## 5.4 Market street room

Physical features:

- stalls
- counters
- shopkeepers
- civilians
- guard sightlines
- physical goods/items
- optional exits to shop interiors

Interactables:

```txt
Buy from General Stall
Buy Food
Buy Flowers
Buy Jewelry
Steal Display Item
Talk to Shopkeeper
```

Stealable goods should be physical pickups or interactables marked with ownership.

---

## 5.5 Tavern interior room

Physical features:

- walls/interior floor
- bar counter
- tables
- bartender
- patrons
- rumor board
- date table

Interactables:

```txt
Talk to Bartender
Buy Meal
Ask for Rumors
Rest
Start Date, if relevant NPC exists
Hide from Guards, if wanted and allowed
```

---

## 5.6 Residential street room

Physical features:

- house facades
- doors
- windows
- mailboxes
- resident NPCs
- possible lover home
- break-in targets

Interactables:

```txt
Knock on Door
Visit Lover, if available
Break In
Inspect Mailbox
Talk to Resident
```

House interiors can be generated later.

---

## 5.7 Back alley room

Physical features:

- narrow maze-like paths
- crates/barrels
- graffiti
- sewer grate
- suspicious door
- fewer civilians
- ambush spots

Interactables:

```txt
Inspect Graffiti
Search Crates
Hide from Guards
Talk to Shady Figure
Open Suspicious Door, if guild discovered
Enter Sewer, later
```

This is where thieves guild discovery happens.

---

## 5.8 Guild hideout room

Physical features:

- hidden cellar / sewer room
- fence NPC
- guild job board
- black market stall
- stash
- secret exit

Interactables:

```txt
Talk to Guild Contact
Ask for Work
Fence Stolen Goods
Lower Wanted Level
Buy Fake Papers
Use Black Market
Leave to Back Alley
```

---

## 5.9 Town exit room

Physical features:

- road leaving town
- final guard post maybe
- road sign
- transition back to biome

Interactables:

```txt
Leave Town
Read Road Sign
Talk to Gate Guard, if wanted
Use Secret Exit, if unlocked
```

At high wanted, exit may be blocked by guards.

---

# 6. Physical Exits and Room Connections

## 6.1 Exits should be normal room exits

Each physical room has normal exits to other town rooms.

Example square exits:

```ts
const squareExits: RoomExit[] = [
  {
    direction: "north",
    targetRoomId: gateRoom.id,
    label: "Gate",
  },
  {
    direction: "east",
    targetRoomId: marketRoom.id,
    label: "Market Street",
  },
  {
    direction: "south",
    targetRoomId: tavernRoom.id,
    label: "Tavern",
  },
  {
    direction: "west",
    targetRoomId: residentialRoom.id,
    label: "Residential Street",
  },
  {
    direction: "hidden",
    targetRoomId: backAlleyRoom.id,
    label: "Back Alley",
  },
];
```

The player should physically use these exits, not menu navigation.

---

## 6.2 Town map still matters

The map should show the generated physical room graph.

Example:

```txt
BRINEWICK

[Outskirts]—[Gate]—[Square]—[Market]
                       |        |
                    [Tavern] [Shop]
                       |
                  [Back Alley]—[Guild?]
                       |
                 [Residential]—[Exit]
```

This is a map of real rooms.

---

# 7. Input-Step Mode Translation

## Previous approach

Input-step mode was described as:

```txt
Town Square
- Go to Market
- Go to Tavern
- Go to Residential
```

## Correct approach

Input-step mode should be used for **interactions**, not physical town navigation.

The player physically moves to a shop counter, guard, sign, notice board, graffiti mark, or NPC.

Then input-step menu appears:

```txt
Notice Board
- Read Notices
- Check Wanted Poster
- Take Job
- Leave
```

```txt
Guard
- Talk
- Pay Fine
- Bribe
- Attack
- Leave
```

```txt
Shop Counter
- Buy
- Sell
- Steal
- Talk
- Leave
```

```txt
Guild Contact
- Ask for Work
- Fence Goods
- Reduce Wanted
- Buy Fake Papers
- Leave
```

This keeps towns physical while still using the existing input-step interaction style.

---

# 8. Wanted System Translation

## Previous approach

Wanted/police were menu events during abstract location changes.

## Correct approach

Wanted/police should affect physical rooms.

Wanted level changes:

```ts
town.wantedLevel = clampWanted(town.wantedLevel + delta);
```

But effects appear physically:

- guards spawn in town rooms
- patrol entities appear
- exits become guarded
- shopkeepers close counters
- civilians flee
- back alley becomes more useful
- guard captain spawns at high wanted

---

## 8.1 Wanted level physical effects

### 0 stars

- normal guard/civilian population

### 1 star

- extra guard awareness
- shopkeepers watch player
- guard dialogue changes

### 2 stars

- patrols spawn in square/market/gate
- guards may follow between rooms
- some NPCs refuse interaction

### 3 stars

- exits guarded
- some shop counters close
- guards may block routes physically

### 4 stars

- lockdown
- gate blocked
- back alley/guild routes become crucial
- more guards in square

### 5 stars

- guard captain / elite patrol
- town hostile crisis state
- jail/exile/fight/escape outcomes

---

## 8.2 Simple physical patrol implementation

MVP:

```ts
function populateTownGuards(room: GeneratedRoom, town: TownStructure): EntitySpawn[] {
  const base = baseGuardsForDistrict(room.townDistrictKind);
  const extra = extraGuardsForWanted(town.wantedLevel, room.townDistrictKind);

  return spawnGuardEntities(base + extra);
}
```

This means guards are placed when the room is generated or entered/refreshed.

---

## 8.3 Better physical patrol implementation

Persistent patrol state:

```ts
export interface TownPatrolState {
  id: string;
  townId: string;
  currentRoomId: string;
  route: string[];
  alertLevel: number;
  pursuingPlayer: boolean;
}
```

On town room transition:

```ts
function updateTownPatrols(town: TownStructure, playerTargetRoomId: string): void {
  for (const patrol of town.patrols) {
    updatePatrolPosition(patrol, town);

    if (town.wantedLevel >= 2 && shouldPatrolFollowPlayer(patrol, playerTargetRoomId)) {
      patrol.currentRoomId = playerTargetRoomId;
      patrol.pursuingPlayer = true;
    }
  }
}
```

---

# 9. Physical Shops and Theft

## 9.1 Shops as interactables or interiors

There are two valid models.

### MVP: market room with multiple shop interactables

Market Street contains:

```txt
General Goods Stall
Food Stall
Florist Stall
Jeweler Stall
Scribe Booth
```

Each is a physical interactable.

### Later: shop interiors

Market Street connects to:

```txt
Florist Interior
Jeweler Interior
General Store
Scribe Shop
```

These are additional real rooms.

---

## 9.2 Physical stealable goods

Items on counters should be physical entities or interactables.

```ts
interface TownOwnedItem {
  itemId: string;
  ownerFactionId: string;
  ownerNpcId?: string;

  stolenIfTaken: true;

  witnessRadius: number;
  value: number;
}
```

Taking an owned item:

```ts
function onTakeTownOwnedItem(item: TownOwnedItem, room: GeneratedRoom, town: TownStructure): void {
  const witnessed = isTheftWitnessed(item, room);

  if (witnessed) {
    applyTownCrime(town, {
      kind: "theft",
      witnessed: true,
      severity: item.value,
      roomId: room.id,
      stolenItemId: item.itemId,
    });
  } else {
    markItemStolen(item.itemId);
    maybeModifyGuildKarma(town, +1, "Clean theft.");
  }
}
```

---

## 9.3 Witness checks

Witnesses can include:

- shopkeeper
- guard
- civilian
- lover/spouse/ex
- thief contact, if they care

MVP:

```ts
function isTheftWitnessed(item: TownOwnedItem, room: GeneratedRoom): boolean {
  return room.entities.some(entity =>
    entity.canWitnessCrime &&
    distance(entity.position, item.position) <= item.witnessRadius &&
    hasLineOfSight(entity.position, item.position, room.tiles)
  );
}
```

If line-of-sight is too expensive, use distance only for MVP.

---

# 10. Thieves Guild Translation

## Previous approach

The thieves guild was a back alley menu.

## Correct approach

The thieves guild is a physical hidden room connected to the physical back alley room.

---

## 10.1 Guild entrance

Back Alley contains:

- graffiti mark
- suspicious cellar door
- hidden door behind crates
- sewer grate
- guild lookout NPC

The guild entrance is initially hidden/locked.

```ts
const guildDoor: InteractableSpawn = {
  id: "guild-door",
  kind: "hiddenDoor",
  targetRoomId: guildHideoutRoom.id,
  hidden: !town.discoveredGuild,
  locked: !canEnterGuild(town),
};
```

---

## 10.2 Guild discovery

Discovery conditions:

```txt
wantedLevel >= 1
stolen item in inventory
bought rumor
found graffiti
completed back alley event
town mood is crimeWave
random chance after repeated back alley visits
```

When discovered:

```ts
town.discoveredGuild = true;
town.thievesGuild.discovered = true;
guildDoor.hidden = false;
```

Text:

```txt
A chalk mark near the drain shows a snake biting a coin.
It was not there before.
```

---

## 10.3 Guild hideout physical room

The Guild Hideout room contains:

- fence NPC
- guild contact
- black market dealer
- job board
- stash chest
- secret exit/sewer, optional

The input menus occur when interacting with these physical objects/NPCs.

---

# 11. Guild Quests as Physical Objectives

## 11.1 Pickpocket job

Target NPC physically appears in:

- Market Street
- Tavern
- Square

Goal:

```txt
Reach target.
Interact with target.
Attempt pickpocket.
Avoid witnesses/guards.
Return to guild hideout.
```

Failure:

- target sees you
- guard sees you
- player attacks target
- player leaves town with active job, optional

---

## 11.2 House job

Residential Street contains a target house door.

Interacting creates/enters a physical House Interior room.

House Interior contains:

- sleeping resident
- item to steal
- noisy furniture
- windows/exit

Goal:

```txt
Enter house.
Take target item.
Leave.
Return to guild.
```

Failure:

- resident wakes
- guard enters
- child witness sees you
- item is missing/curse complication

---

## 11.3 Smuggle package job

Package is an item carried by the player.

Goal path:

```txt
Gate -> Square -> Tavern/Back Alley -> Guild Hideout
```

Guards can inspect in physical rooms.

At patrol interaction:

```txt
A guard asks what is in the package.
```

Options:

```txt
Show fake papers
Lie
Run
Hand it over
Bite
```

---

## 11.4 Shop job

Market item physically sits behind counter.

Goal:

```txt
Take specific item from shop.
Avoid shopkeeper/guard sight.
Return to guild.
```

This works especially well once shop interiors exist.

---

# 12. Town Rumors, Laws, and Notices in Physical Space

## 12.1 Notice board

Town Square has a physical notice board.

Interact:

```txt
Read Notices
Check Wanted Poster
Take Town Job
Read Local Law
Leave
```

---

## 12.2 Rumors from physical actions

Public crimes, public dates, public proposals, and public fights create rumors.

```ts
addTownRumor(town, {
  kind: "crime",
  summary: "The snake robbed the florist.",
  severity: 6,
  roomsRemaining: 8,
});
```

Rumors can alter physical town behavior:

- NPC dialogue
- shop prices
- guard suspicion
- lover jealousy
- guild access

---

## 12.3 Laws enforced physically

If local law says:

```txt
No biting in the square.
```

Then biting an NPC in the physical square room applies a town crime.

If local law says:

```txt
No entering the back alley unless invited.
```

Then entering Back Alley before guild discovery can raise suspicion or spawn guard warning.

---

# 13. Relationship Integration in Physical Towns

## 13.1 NPCs have physical town locations

Town romance candidates should have:

```ts
interface TownNpcSchedule {
  townId: string;
  npcId: string;
  homeRoomId?: string;
  workRoomId?: string;
  favoriteRoomId?: string;
  currentRoomId: string;
}
```

MVP can keep them static:

```txt
Bartender -> Tavern
Florist -> Market
Guard -> Gate/Square
Thief -> Back Alley
Resident -> Residential
```

Later they can move.

---

## 13.2 Dates occur in physical rooms

A date can be started by interacting with an NPC and choosing a date action.

The date can then reference the current room:

```txt
Tavern date
Market date
Town square festival date
Back alley date
Residential dinner date
```

Because rooms are physical, date interruptions can also be physical:

- ex enters tavern
- guard patrol sees you
- thief interrupts back alley date
- shopkeeper catches you buying gift for someone else
- lover physically present in same room

---

## 13.3 Lover/ex/spouse consequences

Physical town makes these stronger:

```txt
Enter town with two lovers known there.
One appears in Tavern.
One appears in Market.
Jealous confrontation can trigger if both are in same room.
```

Potential implementation:

```ts
function checkTownRelationshipRoomEvents(room: GeneratedRoom, town: TownStructure): RelationshipCutscene | undefined {
  const presentRomanceNpcs = getRomanceNpcsInRoom(room.id);

  if (presentRomanceNpcs.length >= 2) {
    return maybeTriggerJealousConfrontation(presentRomanceNpcs, town);
  }
}
```

---

# 14. Physical Town UI

## 14.1 Entry message

On entering the physical Outskirts/Gate:

```txt
You approach Brinewick.
A human town has been generated nearby.

Mood: Market Day
Local Law: No biting in the square.
Wanted Level: 0
```

## 14.2 Physical town map

Show the real town room cluster:

```txt
BRINEWICK

[Outskirts]—[Gate]—[Square]—[Market]
                       |        |
                    [Tavern] [Shop]
                       |
                  [Back Alley]—[Guild?]
                       |
                 [Residential]—[Exit]
```

## 14.3 District label

When entering a town room:

```txt
BRINEWICK — Market Street
Wanted Level: ★★☆☆☆
Town Mood: Market Day
```

---

# 15. Revised MVP Scope

## Previous MVP

The previous MVP was mostly abstract.

## Correct MVP

Implement a **physical room cluster** with:

1. Outskirts room
2. Gate room
3. Square room
4. Market Street room
5. Tavern room
6. Back Alley room
7. Town Exit room
8. Optional Residential Street room
9. Optional hidden Guild Hideout room

Each room should be physically playable.

---

## MVP physical features by room

### Outskirts

- town sign
- road/fence props
- exit to gate

### Gate

- guard NPC
- local law sign
- exit to square
- can become guarded at wanted 3+

### Square

- notice board
- fountain/statue
- several exits
- guard/civilian spawns

### Market

- larger shop interactables
- owned/stealable items
- shopkeeper NPC
- guard/civilian witnesses

### Tavern

- bartender NPC
- rumor interaction
- rest/meal
- date hook

### Back Alley

- hidden guild door
- graffiti interactable
- shady NPC
- hide from guards interaction

### Guild Hideout

- fence NPC
- job board
- lower wanted service
- black market later

### Town Exit

- leave town to resume normal run
- guarded at high wanted

---

# 16. Revised Implementation Order

## Phase 1 — Physical cluster foundation

1. Add `TownStructure` with `physicalRoomIds`.
2. Add `townDistrictKind` metadata to generated rooms.
3. Add `generateTownCluster()`.
4. Generate Outskirts, Gate, Square, Market, Tavern, Back Alley, Exit rooms.
5. Connect them with normal room exits.
6. Connect town exit back to normal room generation.

## Phase 2 — Physical templates and props

1. Add town tile/prop vocabulary:
   - road
   - fence
   - cobblestone
   - wall
   - door
   - stall
   - counter
   - table
   - signpost
   - fountain
   - notice board
   - crate
   - graffiti
   - sewer grate
2. Add district-specific layout generators.
3. Add interactable spawning.

## Phase 3 — Shops and owned items

1. Add market shop counters.
2. Add bigger town inventories.
3. Add owned item metadata.
4. Add theft interaction.
5. Add witness checks.
6. Add stolen item flag.

## Phase 4 — Wanted and guards

1. Add wanted level to town state.
2. Spawn guards based on district and wanted level.
3. Apply crimes from theft/attack/break-in.
4. Add guard interactions:
   - pay fine
   - bribe
   - talk
   - fight
5. Add high-wanted exit guards.

## Phase 5 — Back alley and physical guild

1. Add hidden guild door to Back Alley.
2. Add discovery conditions.
3. Add Guild Hideout physical room.
4. Add fence, job board, guild contact.
5. Add guild karma.
6. Add lower wanted service.

## Phase 6 — Physical guild quests

1. Pickpocket target NPC in Market/Tavern.
2. Smuggle package from Gate to Guild.
3. House job after Residential Street exists.
4. Shop job with physical owned item.
5. Job success/failure changes wanted/guild karma.

## Phase 7 — Relationship and town reactivity

1. Spawn town romance candidates in physical rooms.
2. Let dates use current physical district.
3. Create rumors from public relationship actions.
4. Trigger jealousy if multiple lovers appear in same town/room.
5. Add guard/thief romance consequences later.

---

# 17. Guardrails for Physical Towns

## 17.1 Towns should be physical, but not enormous at first

Start with 6–8 rooms.

Do not begin with a full city.

## 17.2 Every town must have clear exits

Even if wanted is high, there should be:

- main exit
- guarded exit
- guild/secret exit, later
- fight/bribe/disguise options

## 17.3 Shops should not require shop interiors at first

Use Market Street with multiple interactable stalls first.

Shop interiors can come later.

## 17.4 Patrols can start simple

Do not begin with full pathfinding between town rooms.

MVP can spawn guards per room based on wanted level.

Persistent patrols can come later.

## 17.5 Input menus are still useful

Use menus for interactables:

- guards
- shops
- notices
- guild contacts
- doors
- dates
- rumors

Do not use menus as the primary town navigation.

---

# 18. Summary

The prior town design should be translated from:

```txt
Abstract town location graph navigated by menu
```

to:

```txt
Generated physical room cluster navigated through normal room movement
```

The town remains a generated structure, but it is made of actual rooms.

Correct one-sentence spec:

> A human town is a generated physical multi-room structure embedded into the run, with each district represented by a real playable room containing town-specific tiles, NPCs, shops, guards, crimes, exits, and interactables.

This preserves everything useful from the previous plan:

- transition rooms
- bigger shops
- wanted level
- police
- thieves guild
- guild karma
- guild quests
- rumors
- laws
- romance density

But it puts all of it into physical space, which is the whole point of the system.
