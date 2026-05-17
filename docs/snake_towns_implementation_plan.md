# Snake for the Modern Gamer — Multiroom Human Towns Implementation Plan

## Purpose

This document describes how to implement **multiroom human towns** in *Snake for the Modern Gamer*.

The goal is to create generated town structures that act like small, navigable social hubs inside a run:

- transition rooms from wilderness/biome into town
- multiroom generated town layouts
- bigger town shops than villages
- taverns, residential districts, town squares, markets, back alleys
- a town wanted/police system
- a thieves guild hidden in back alleys
- thieves guild quests and karma
- town rumors, laws, notices, and reactive consequences
- integration points for relationships, dating, marriage, crime, and future systems

The core fantasy:

> You enter what seems like a safe human town, steal a flower, get one wanted star, find the thieves guild, date the bartender, get chased by police, and leave through a sewer with a fake marriage permit.

---

# 1. High-Level Concept

## 1.1 What is a town?

A town is a **multiroom generated structure**.

A village is usually a settlement contained in one room.

A town is a connected graph of rooms:

```txt
Outskirts -> Town Gate -> Town Square -> Market
                              |           |
                           Tavern     Residential
                              |
                          Back Alley -> Thieves Guild
                              |
                            Exit
```

A town temporarily shifts the player from normal biome room progression into a generated local structure.

Normal run flow:

```txt
Normal room -> Normal room -> Normal room -> Town transition -> Town graph -> Town exit -> Normal room
```

---

## 1.2 Human towns first

Initial implementation should support **human towns only**.

This keeps the first version grounded:

- roads
- fences
- gates
- town guards
- shops
- taverns
- homes
- police/wanted logic
- thieves guild
- social/relationship density

Later variants can add:

- goblin camp-towns
- mixed frontier towns
- angel/death towns
- dead towns
- biome-specific weird towns

---

# 2. Core Data Structures

## 2.1 Town structure

```ts
export interface TownStructure {
  id: string;
  name: string;

  biomeId: string;
  seed: number;

  factionId: string;
  rooms: TownRoomNode[];

  entranceRoomId: string;
  exitRoomIds: string[];

  townTags: TownTag[];
  mood: TownMood;

  prosperity: number; // 0-100
  danger: number;     // 0-100

  wantedLevel: WantedLevel;
  suspicion?: number; // optional soft version

  reputation: number; // -100 to 100

  discoveredGuild: boolean;
  thievesGuild?: ThievesGuildState;

  laws: TownLaw[];
  rumors: TownRumor[];
  notices: TownNotice[];

  createdAtRoomNumber: number;
}
```

## 2.2 Town room node

```ts
export interface TownRoomNode {
  id: string;
  townId: string;

  kind: TownRoomKind;
  displayName: string;

  connections: string[];

  tags: TownRoomTag[];

  npcSlots: number;
  shopSlots: number;
  eventSlots: number;

  visited: boolean;
  discovered: boolean;

  locked?: boolean;
  hidden?: boolean;
  controlledByGuild?: boolean;
  guarded?: boolean;
}
```

## 2.3 Town room kinds

Initial required room kinds:

```ts
export type TownRoomKind =
  | "outskirts"
  | "gate"
  | "square"
  | "market"
  | "tavern"
  | "residential"
  | "backAlley"
  | "exit";
```

Optional later room kinds:

```ts
export type TownRoomKind =
  | "outskirts"
  | "gate"
  | "square"
  | "market"
  | "bigShop"
  | "tavern"
  | "residential"
  | "townHall"
  | "guardPost"
  | "clinic"
  | "shrine"
  | "backAlley"
  | "guildHideout"
  | "jail"
  | "special"
  | "exit";
```

## 2.4 Town tags

```ts
export type TownTag =
  | "human"
  | "safeHub"
  | "marketTown"
  | "frontier"
  | "coldTown"
  | "roadTown"
  | "festival"
  | "curfew"
  | "crimeWave"
  | "weddingSeason"
  | "foodShortage"
  | "funeralWeek"
  | "plagueScare"
  | "rich"
  | "poor"
  | "guarded"
  | "guildPresence";
```

## 2.5 Town room tags

```ts
export type TownRoomTag =
  | "commerce"
  | "social"
  | "law"
  | "residential"
  | "crime"
  | "romance"
  | "healing"
  | "quest"
  | "exit"
  | "danger"
  | "hidden";
```

---

# 3. Town Generation

## 3.1 Generation placement

A town should be placed as a generated structure off the normal room path.

Basic flow:

```txt
1. Normal room generation determines that a town may spawn.
2. Generate a transition room.
3. Generate the town structure graph.
4. Enter town mode at the transition/gate.
5. Player navigates town rooms.
6. Exit returns to normal room generation.
```

Pseudo-code:

```ts
function maybeGenerateTown(currentBiome: BiomeId, runState: RunState): TownStructure | undefined {
  if (!canSpawnTown(currentBiome, runState)) return undefined;
  if (!rollTownChance(currentBiome, runState)) return undefined;

  return generateHumanTown({
    biomeId: currentBiome,
    seed: runState.rng.next(),
    roomNumber: runState.roomsVisited,
  });
}
```

## 3.2 Spawn constraints

Towns should not spawn too frequently.

```ts
interface TownSpawnRules {
  minRoomsBeforeFirstTown: number;
  minRoomsBetweenTowns: number;
  maxTownsPerRun?: number;
  allowedBiomes: BiomeId[];
}
```

Example:

```ts
const HUMAN_TOWN_SPAWN_RULES = {
  minRoomsBeforeFirstTown: 8,
  minRoomsBetweenTowns: 14,
  maxTownsPerRun: 3,
};
```

## 3.3 MVP town layout

The first version can use a semi-fixed graph with random optional branches.

```txt
Outskirts
   |
Gate
   |
Square -- Market
   |       |
Tavern  Residential
   |
Back Alley
   |
Exit
```

Hidden branch:

```txt
Back Alley -> Guild Hideout
```

Pseudo-code:

```ts
function generateHumanTown(options: TownGenOptions): TownStructure {
  const townId = makeTownId(options.seed);
  const name = generateTownName(options.seed);
  const mood = rollTownMood(options.seed);
  const laws = rollTownLaws(options.seed, mood);

  const rooms = createBaseHumanTownRooms(townId);

  connect(rooms, "outskirts", "gate");
  connect(rooms, "gate", "square");
  connect(rooms, "square", "market");
  connect(rooms, "square", "tavern");
  connect(rooms, "square", "residential");
  connect(rooms, "tavern", "backAlley");
  connect(rooms, "backAlley", "exit");

  maybeAddOptionalRoom(rooms, "townHall");
  maybeAddOptionalRoom(rooms, "clinic");
  maybeAddHiddenGuildRoom(rooms);

  return {
    id: townId,
    name,
    biomeId: options.biomeId,
    seed: options.seed,
    factionId: "human-town",
    rooms,
    entranceRoomId: roomId(townId, "outskirts"),
    exitRoomIds: [roomId(townId, "exit")],
    townTags: ["human", "safeHub"],
    mood,
    prosperity: rollProsperity(options.seed),
    danger: rollDanger(options.seed),
    wantedLevel: 0,
    reputation: 0,
    discoveredGuild: false,
    laws,
    rumors: [],
    notices: generateTownNotices(name, mood, laws),
    createdAtRoomNumber: options.roomNumber,
  };
}
```

---

# 4. Transition Rooms

## 4.1 Purpose

Transition rooms create a sense of arrival.

Instead of instantly entering a town from wilderness, the player sees signs of civilization:

```txt
Forest Room -> Outskirts -> Town Gate -> Town Square
```

## 4.2 Transition room types

### Outskirts

Semi-wilderness with signs of civilization:

- fences
- road
- distant rooftops
- abandoned cart
- town sign
- traveler NPC
- low encounter chance

Example:

```txt
The trees thin.
Fenceposts appear.
Someone has nailed a sign to a stump:

WELCOME TO BRINEWICK.
NO BITING.
```

### Roadside Shrine

Good for shrine/death/marriage foreshadowing:

```txt
A small roadside shrine leans under the weight of old flowers.
Someone has tied a ribbon around a snake-shaped stone.
```

### Toll Road

Law/faction entry point.

Options:

```txt
Pay Toll
Charm Guard
Sneak Around
Bite Guard
Turn Back
```

### Farmland Edge

Food economy and theft temptation:

```txt
Rows of frost-bitten vegetables lead toward town.
A farmer watches you look at the apples.
```

### Town Gate

The official entry:

```txt
You enter Brinewick.

Town Mood: Market Day
Local Law: No biting in the square.
Wanted Level: 0
```

---

# 5. Town Navigation

## 5.1 Town mode

When inside a town, normal room generation pauses.

```ts
interface ActiveStructureState {
  type: "town";
  townId: string;
  roomId: string;
}
```

## 5.2 Input-step mode integration

Towns are ideal for input-step mode.

Each town room presents actions:

```txt
You are in Town Square.

Go to Market
Go to Tavern
Go to Residential District
Read Notice Board
Talk to Guard
Leave Town
```

Suggested action type:

```ts
interface TownAction {
  id: string;
  label: string;
  kind:
    | "move"
    | "shop"
    | "talk"
    | "steal"
    | "quest"
    | "guild"
    | "notice"
    | "rest"
    | "leave";
  targetRoomId?: string;
  disabled?: boolean;
  hidden?: boolean;
}
```

## 5.3 Movement

```ts
function getTownMovementActions(town: TownStructure, room: TownRoomNode): TownAction[] {
  return room.connections.map(connectionId => {
    const target = getTownRoom(town, connectionId);

    return {
      id: `move:${target.id}`,
      label: `Go to ${target.displayName}`,
      kind: "move",
      targetRoomId: target.id,
      disabled: isRouteBlockedByWanted(town, room, target),
      hidden: target.hidden && !target.discovered,
    };
  });
}
```

## 5.4 Leaving town

Possible exit types:

```txt
Main Exit
Back Road
Sewer Exit
Guild Escape Route
Guarded Gate
```

At wanted level 3+, exits may be guarded.

At wanted level 4-5, leaving may require:

- bribe
- fight
- guild help
- disguise
- secret route
- successful escape roll

---

# 6. Town Shops

## 6.1 Shops should be bigger than village shops

```ts
const SHOP_SIZES = {
  village: { min: 4, max: 7 },
  townMarket: { min: 10, max: 18 },
  townSpecialty: { min: 6, max: 10 },
  blackMarket: { min: 8, max: 14 },
};
```

## 6.2 Town shop categories

```ts
export type TownShopKind =
  | "general"
  | "food"
  | "florist"
  | "jeweler"
  | "tailor"
  | "scribe"
  | "clinic"
  | "blackMarket";
```

## 6.3 Shop functions

### General Store

Basics, tools, common cards, low-tier gifts.

### Food Stall

Food, healing, cooked meals, hungry-personality gifts, town specialty food.

### Florist

Relationship-heavy shop:

- cheap flowers
- apology flowers
- fancy flowers
- region-specific flowers
- bouquet clue
- fake bouquet
- wedding bouquet ingredient

Potential action:

```txt
Ask About Deep-Lying Bouquet
```

### Jeweler

- rings
- fancy rings
- charms
- earrings
- apology necklace
- engagement ring

### Tailor

- cosmetics
- disguises
- town clothing
- relationship gifts

Disguises can lower guard checks if wanted.

### Scribe / Bookshop

- cards
- maps
- letters
- apology note
- fake papers
- divorce forms
- proposal permit
- town law guide

### Black Market

Unlocked via thieves guild or back alley:

- stolen goods
- rare cards
- illegal tools
- lockpicks
- fake documents
- cursed gifts
- romance sabotage items
- wanted-reduction services

---

# 7. Town Wanted System

## 7.1 Wanted level

```ts
export type WantedLevel = 0 | 1 | 2 | 3 | 4 | 5;
```

Simplest implementation uses only stars.

Better implementation:

```ts
wantedHeat: number;
wantedLevel = Math.floor(wantedHeat / 20);
```

## 7.2 Crimes

```ts
export type TownCrimeKind =
  | "theft"
  | "assault"
  | "murder"
  | "shopRobbery"
  | "breakIn"
  | "refuseFine"
  | "guildJobDiscovered"
  | "romanticPublicMurder"
  | "biteGuard"
  | "curfewViolation"
  | "fakePermit";
```

Crime definition:

```ts
interface TownCrime {
  kind: TownCrimeKind;
  witnessed: boolean;
  severity: number;
  roomId: string;
  targetNpcId?: string;
  stolenItemId?: string;
}
```

## 7.3 Applying crimes

```ts
function applyTownCrime(town: TownStructure, crime: TownCrime): TownStructure {
  const wantedDelta = getWantedDelta(crime);
  const reputationDelta = getReputationDelta(crime);

  town.wantedLevel = clampWanted(town.wantedLevel + wantedDelta);
  town.reputation = clamp(town.reputation + reputationDelta, -100, 100);

  addTownRumor(town, rumorFromCrime(crime));

  if (crime.kind === "guildJobDiscovered") {
    modifyGuildKarma(town, -5, "Sloppy guild work brought heat.");
  }

  return town;
}
```

## 7.4 Suggested wanted deltas

```txt
Steal small item, unseen: +0
Steal small item, seen: +1
Break into house: +1
Rob shop: +2
Bite guard: +2
Attack citizen: +2
Kill citizen: +4 or instant 5
Romantic public murder: 5
Refuse fine: +1
Guild job discovered: +1 to +3
```

## 7.5 Wanted level effects

### 0 stars

Normal town.

### 1 star

Suspicious guards:

- slight shop price increase
- occasional guard check

### 2 stars

Police/guards begin following:

- patrol encounter chance on district change
- some NPCs refuse to talk
- thieves guild notices you

### 3 stars

Active pursuit:

- guards block some routes
- shops may close
- bribes possible
- patrol chance high

### 4 stars

Lockdown:

- gates close
- guard post patrols
- tavern hiding possible if relationship/guild standing is high
- bounty hunters possible

### 5 stars

Town crisis:

- elite guard / captain encounter
- exits guarded
- town faction reputation damage
- jail/exile/fight outcomes
- guild may help or sell you out

---

# 8. Guard / Police Patrols

## 8.1 Patrol roll

At wanted level 2+, moving between town rooms should be able to trigger patrol events.

```ts
function maybeTriggerPatrol(
  town: TownStructure,
  from: TownRoomNode,
  to: TownRoomNode,
): TownPatrolEncounter | undefined {
  if (town.wantedLevel < 2) return undefined;

  const chance = getPatrolChance(town.wantedLevel, to.kind, town.thievesGuild?.karma ?? 0);

  if (!roll(chance)) return undefined;

  return createTownPatrolEncounter(town, to);
}
```

## 8.2 Patrol chance

```ts
function getPatrolChance(wantedLevel: WantedLevel, roomKind: TownRoomKind, guildKarma: number): number {
  let chance = wantedLevel * 0.08;

  if (roomKind === "square" || roomKind === "gate") chance += 0.08;
  if (roomKind === "backAlley") chance -= 0.06;
  if (guildKarma >= 50) chance -= 0.05;

  return clamp(chance, 0, 0.75);
}
```

## 8.3 Patrol encounter options

Possible guard encounters:

```txt
A guard asks for papers.
A patrol blocks the market road.
A whistle sounds behind you.
A guard captain recognizes your snake crimes.
A nervous recruit tries to arrest you.
```

Options:

```txt
Pay Fine
Bribe
Talk Your Way Out
Run
Hide
Fight
Flash Thieves Guild Token
Use Lover/Spouse Connection
Bite
```

---

# 9. Jail, Fines, Exile

High wanted should not always mean combat.

Possible consequences:

```txt
Fine
Confiscation
Jail
Exile
Trial
Community Service
Fight
Escape
```

## 9.1 Fine

```ts
function payFine(town: TownStructure, amount: number): void {
  removeCurrency(amount);
  town.wantedLevel = clampWanted(town.wantedLevel - 1);
}
```

## 9.2 Confiscation

Lose stolen goods or illegal items.

```ts
removeItemsWithFlag("stolen");
```

## 9.3 Jail

Transport to jail room or guard post.

```ts
currentTownRoomId = getOrCreateTownRoom(town, "jail").id;
```

Jail options:

```txt
Serve Time
Pay Fine
Call Lover
Call Thieves Guild
Escape
Bite Bars
```

## 9.4 Exile

Town ejects player and locks re-entry for some room count.

```ts
town.flags.exiledUntilRoom = currentRunRoom + 10;
```

## 9.5 Community service

Ridiculous punishment quest.

```txt
You are sentenced to recover three stolen turnips.
The judge says this with the gravity of murder.
```

---

# 10. Thieves Guild

## 10.1 Overview

The thieves guild is a hidden faction inside town back alleys.

It has:

- discovery state
- karma/reputation
- rank
- quests
- services
- black market
- relationship with town wanted system

## 10.2 Thieves guild state

```ts
export interface ThievesGuildState {
  townId: string;

  discovered: boolean;

  karma: number; // -100 to 100

  rank:
    | "unknown"
    | "contact"
    | "runner"
    | "cutpurse"
    | "fixer"
    | "guildFriend"
    | "guildEnemy";

  completedJobs: string[];
  failedJobs: string[];

  betrayedGuild: boolean;

  lastJobRoom?: number;
  activeJobId?: string;
}
```

## 10.3 Guild karma tiers

```txt
-100 to -50: Marked
-49 to -10: Distrusted
-9 to 9: Unknown / Neutral
10 to 29: Useful Snake
30 to 59: Associate
60 to 84: Trusted
85 to 100: Guild Darling
```

## 10.4 Discovering the guild

Possible unlock conditions:

```txt
Enter Back Alley with wanted level >= 1
Steal something successfully
Buy rumor from tavern
Talk to suspicious NPC
Find graffiti mark
Have thieves token
Town mood is Crime Wave
Random chance after back alley visits
```

Example discovery text:

```txt
A chalk mark near the drain shows a snake biting a coin.
It was not there before.
```

Initial options:

```txt
Investigate Graffiti
Knock on Cellar Door
Leave
```

After discovery:

```txt
Enter Thieves Guild
Fence Stolen Goods
Ask for Work
Ask for Help with Guards
Leave
```

## 10.5 Guild karma gains

```txt
Complete theft jobs
Avoid killing during stealth jobs
Bring stolen goods back
Refuse to snitch
Pay guild cut
Help guild member escape
Sell rare stolen item to fence
Frame town official
```

## 10.6 Guild karma losses

```txt
Fail jobs
Get caught and name the guild
Kill guild members
Steal from guild
Keep target item
Help guards
Romance guard captain, if guild dislikes it
Bring too much heat to town
```

---

# 11. Thieves Guild Services

## 11.1 Services list

```ts
export type GuildServiceKind =
  | "fenceStolenGoods"
  | "lowerWanted"
  | "buyFakePapers"
  | "hireDistraction"
  | "getRumor"
  | "findBlackMarket"
  | "hideFromGuards"
  | "forgeMarriagePapers"
  | "locateBouquet"
  | "trackLover";
```

## 11.2 Fence stolen goods

Sell items marked `stolen`.

```ts
function fenceStolenGoods(items: Item[]): CurrencyReward {
  return calculateFenceValue(items, guildKarma);
}
```

Higher guild karma gives better prices.

## 11.3 Lower wanted level

```txt
Pay guild: wanted -1
Owe favor: wanted -2
High karma: first reduction discounted/free
Low karma: they may sell you out
```

Implementation:

```ts
function requestGuildWantedReduction(town: TownStructure): GuildServiceResult {
  if (!town.thievesGuild?.discovered) return fail();

  if (town.thievesGuild.karma < -20) {
    increaseWanted(town, 1);
    return { text: "They sell you out before you finish asking." };
  }

  town.wantedLevel = clampWanted(town.wantedLevel - getReductionAmount(town.thievesGuild));
  town.thievesGuild.karma -= 5;

  return { text: "The guild makes the posters less accurate." };
}
```

## 11.4 Hide from guards

At wanted 3+, back alley can hide player if guild standing is good enough.

```txt
The guild pulls you through a door that was not there.
```

Effects:

- skip patrol
- lower wanted heat slightly
- consume favor or karma

## 11.5 Fake papers

Fake papers can help with:

- gate checks
- patrol checks
- marriage paperwork
- proposal permits
- divorce forms

Fake papers can fail.

---

# 12. Thieves Guild Quests

## 12.1 Guild job type

```ts
export interface ThievesGuildJob {
  id: string;
  townId: string;

  kind:
    | "pickpocket"
    | "houseJob"
    | "shopJob"
    | "plantEvidence"
    | "smugglePackage"
    | "jailbreak"
    | "blackmail"
    | "rivalGuild"
    | "weddingHeist"
    | "cleanup";

  targetRoomId: string;
  targetNpcId?: string;
  targetItemId?: string;

  status: "available" | "active" | "completed" | "failed";

  reward: GuildJobReward;
  wantedRisk: number;
  karmaReward: number;
  karmaPenalty: number;

  complications: GuildJobComplication[];
}
```

## 12.2 Job rewards

```ts
type GuildJobReward =
  | { kind: "currency"; amount: number }
  | { kind: "item"; itemId: string }
  | { kind: "wantedReduction"; amount: number }
  | { kind: "guildKarma"; amount: number }
  | { kind: "blackMarketUnlock" }
  | { kind: "relationshipMemory"; relationshipId: string };
```

## 12.3 Job complications

```ts
type GuildJobComplication =
  | "targetIsLover"
  | "targetIsEx"
  | "targetIsShopkeeper"
  | "guardPatrol"
  | "rivalThief"
  | "cursedItem"
  | "childWitness"
  | "guildLied"
  | "romanceEvidence"
  | "weddingRelated";
```

## 12.4 Pickpocket Job

Target room:

- Market
- Tavern
- Square

Goal:

```txt
Steal item from target NPC.
Avoid guards.
Return to guild.
```

Complications:

```txt
Target is your lover.
Target is a shopkeeper.
Target is already being robbed.
Guard patrol arrives.
```

## 12.5 House Job

Target room:

- Residential

Goal:

```txt
Break in.
Steal jewel/ledger/key.
Avoid waking resident.
Return to guild.
```

Complications:

```txt
Resident is home.
Resident is romance candidate.
Child NPC sees you.
Resident is dead and this became a ghost problem.
```

## 12.6 Shop Job

Target room:

- Market
- Big Shop
- Jeweler
- Florist

Goal:

```txt
Steal specific item from shop.
```

Complications:

```txt
Shopkeeper has guard contract.
Guild only wants one item, but you can steal more.
Lover asks why you smell like burglary.
```

## 12.7 Smuggle Package

Target path:

```txt
Gate -> Back Alley
```

Goal:

```txt
Move package without guard search.
```

Complications:

```txt
Package whispers.
Guards search you.
Package is a wedding ring.
Package is cursed bouquet.
Package is a living rat.
```

## 12.8 Romantic Homicide Cleanup

Triggered by:

- lover kills rival in town
- spouse kills lover
- player causes romantic death

Guild offer:

```txt
“We can make the body boring.”
```

Options:

```txt
Pay
Owe Favor
Refuse
Snitch
```

---

# 13. Town Crime and Guild Tension

Each crime can produce:

```ts
townWantedDelta
townReputationDelta
guildKarmaDelta
```

Examples:

```txt
Steal apple unseen:
Wanted +0
Guild Karma +1
Town Reputation +0

Steal apple seen:
Wanted +1
Guild Karma -1 if sloppy
Town Reputation -2

Rob tax office unseen:
Wanted +0 initially
Guild Karma +8
Town Reputation -5 later

Rob tax office seen:
Wanted +3
Guild Karma +3, because bold but stupid
Town Reputation -15

Snitch on guild:
Wanted -1
Guild Karma -40
Town Reputation +5

Kill random civilian:
Wanted +5
Guild Karma -10 unless job-specific
Town Reputation -50
```

---

# 14. Town Rumors and Notices

## 14.1 Town rumors

```ts
export interface TownRumor {
  id: string;
  townId: string;

  kind:
    | "crime"
    | "romance"
    | "marriage"
    | "divorce"
    | "guild"
    | "heroic"
    | "weird";

  summary: string;
  roomsRemaining: number;
  severity: number;

  relatedRelationshipId?: string;
  relatedNpcId?: string;
}
```

Rumors affect:

- shop prices
- NPC dialogue
- lover jealousy
- guard suspicion
- thieves guild access

Example rumors:

```txt
The snake robbed the florist.
The snake is dating the bartender.
The snake proposed too early.
The snake was seen entering the back alley.
The snake paid off a guard.
The snake bit the mayor's cousin.
```

## 14.2 Town notices

```ts
export interface TownNotice {
  id: string;
  townId: string;

  kind:
    | "law"
    | "job"
    | "wanted"
    | "rumor"
    | "event"
    | "warning";

  title: string;
  body: string;
}
```

Examples:

```txt
WANTED: A snake matching your exact length.
MISSING: One ceremonial bouquet.
NOTICE: Public flirting requires a permit during market hours.
JOB: Rats in cellar. Again.
WARNING: The Back Alley is not a shortcut. This is legal advice.
```

---

# 15. Town Laws

## 15.1 Town law type

```ts
export interface TownLaw {
  id: string;
  description: string;

  brokenBy:
    | "biting"
    | "stealing"
    | "publicProposal"
    | "appleTransport"
    | "weaponDrawn"
    | "backAlleyEntry"
    | "curfew"
    | "fakePermit";

  wantedDelta: number;
  reputationDelta: number;
}
```

Example laws:

```txt
No apples after sundown.
No biting in the square.
All snakes must be carried or declared.
No public proposals without witness.
No selling flowers to reptiles.
No entering the back alley unless invited.
No weapon drawn in market.
All debts transferable through marriage.
```

---

# 16. Town Moods / Events

```ts
export type TownMood =
  | "normal"
  | "marketDay"
  | "festival"
  | "curfew"
  | "election"
  | "weddingSeason"
  | "foodShortage"
  | "crimeWave"
  | "funeralWeek"
  | "plagueScare";
```

Mood effects:

```txt
Market Day:
- bigger shop inventory
- more civilians
- more theft opportunities
- pickpocket jobs more common

Festival:
- dating bonuses
- public jealousy higher
- special gifts available
- guard checks lower unless chaos starts

Curfew:
- guards stronger
- tavern/back alley more important
- moving at night increases wanted/suspicion

Election:
- town hall active
- bribery quests
- blackmail jobs common

Wedding Season:
- marriage/proposal items more common
- jewelry/florist shops stronger
- jealousy more volatile

Food Shortage:
- food prices up
- hungry personalities stressed
- food theft more serious

Crime Wave:
- thieves guild easier to find
- guards suspicious
- black market stronger

Funeral Week:
- angel/death dialogue more likely
- town mood sad
- shrine/clinic more important

Plague Scare:
- clinic important
- guards enforce movement
- some shops closed
```

---

# 17. Town Dating / Relationship Integration

## 17.1 Town NPC roles

Possible human town NPC roles:

```txt
Shopkeeper
Bartender
Guard
Guard Captain
Mayor / Clerk
Florist
Jeweler
Resident
Thief Contact
Town Gossip
Doctor / Priest
Courier
```

## 17.2 Romance candidate roles

Good town romance candidates:

```txt
Confident shopkeeper
Tired guard
Flirty thief
Poetic florist
Deadpan bartender
Hungry cook
Sharp scribe
Regal mayor's child
Mysterious clinic worker
```

Each can have:

```ts
homeRoomId
workRoomId
townId
factionId
relationshipId
```

## 17.3 Town date locations

### Tavern date

```txt
Food/drink
Ex walks in
Bard sings wrong song
Bar fight
```

### Market date

```txt
Choose gift together
Haggle
Theft temptation
Lover sees gift for someone else
```

### Shrine date

```txt
Serious conversation
Marriage foreshadowing
Death/angel foreshadowing
```

### Back alley date

```txt
Dangerous meeting
Thief interruption
Ambush
Secret relationship
```

### Residential date

```txt
Meet family
Dinner
Awkward neighbor
```

### Town square date

```txt
Festival
Public gossip
Jealousy risk
```

---

# 18. Town Map UI

Show a simple map or district list.

Example:

```txt
BRINEWICK

Gate
 └─ Square
     ├─ Market
     ├─ Tavern
     ├─ Residential
     └─ Back Alley
          └─ ???
```

If the guild is undiscovered:

```txt
Back Alley
 └─ Locked Door?
```

Entry message:

```txt
You enter Brinewick.
A seven-room human town.

Mood: Market Day
Local Law: No biting in the square.
Wanted Level: 0
Known Residents: 3
```

---

# 19. Town Secrets

Each town can have one secret.

```ts
export type TownSecretKind =
  | "mayorIsThiefBoss"
  | "floristSellsIllegalBouquet"
  | "guardCaptainDatingGuildLeader"
  | "hollowStatue"
  | "tavernAngelShrine"
  | "fakeWeddingIndustry"
  | "hiddenSewerExit";
```

Secrets unlock:

- quests
- blackmail
- guild services
- romance interactions
- special exits

---

# 20. MVP Scope

## 20.1 First pass town generation

Implement:

- human towns only
- 6-8 rooms
- transition/outskirts room
- gate
- square
- market
- tavern
- residential
- back alley
- exit
- optional hidden guild room

## 20.2 First pass systems

Implement:

- town wanted level 0-5
- larger town shops
- town notices
- basic rumors
- back alley thieves guild discovery
- guild karma
- three guild quest types
- patrol encounters at wanted level >= 2
- guild service to reduce wanted
- town exit back to normal room generation

## 20.3 First three guild quests

1. Pickpocket in Market
2. Break into Residential house
3. Smuggle package from Gate to Back Alley

---

# 21. Suggested Implementation Order

## Phase 1 — Town structure and navigation

1. Add `TownStructure`.
2. Add `TownRoomNode`.
3. Add human town generator.
4. Add town mode / active structure state.
5. Add movement between town rooms.
6. Add town exit back to normal room generation.

## Phase 2 — Transition rooms

1. Add outskirts transition room.
2. Add town gate room.
3. Add entry message with name/mood/law/wanted.
4. Add town map/district display.

## Phase 3 — Shops

1. Add town market shop.
2. Make town shop inventory larger than village.
3. Add shop categories.
4. Add florist/jeweler/scribe later.

## Phase 4 — Wanted system

1. Add wanted level to town state.
2. Add crime application helper.
3. Add theft/witness hooks.
4. Add guard patrol checks at wanted >= 2.
5. Add fines/bribes/run/fight outcomes.
6. Add exit guards at wanted >= 3.

## Phase 5 — Back alley and thieves guild

1. Add back alley room.
2. Add guild discovery conditions.
3. Add `ThievesGuildState`.
4. Add guild karma.
5. Add basic guild menu.
6. Add fence stolen goods.
7. Add lower wanted service.

## Phase 6 — Guild quests

1. Add `ThievesGuildJob`.
2. Implement pickpocket job.
3. Implement house job.
4. Implement smuggle package job.
5. Add job rewards and karma changes.
6. Add job failure/wanted consequences.

## Phase 7 — Rumors, laws, notices

1. Add town laws.
2. Add notice board.
3. Add rumors from crimes.
4. Make rumors affect dialogue/shop prices later.

## Phase 8 — Relationship integration

1. Add town NPC roles.
2. Add romance candidates with home/work rooms.
3. Add town date locations.
4. Add gossip from romance actions.
5. Add guard/thief romance consequences later.

## Phase 9 — Advanced town systems

1. Jail.
2. Trial.
3. Disguises/fake papers.
4. Town secrets.
5. Town property/inn.
6. Public events.
7. Rival NPC movement.
8. Town dungeon/sewer.
9. Marriage/divorce/family integration.

---

# 22. Guardrails

## 22.1 Do not trap the player too long

Every town needs a clear exit.

At high wanted, exits can become risky, but there should still be escape paths.

## 22.2 Avoid town event spam

Only one major town event per step/room transition.

Examples:

- guard patrol
- guild reveal
- romance confrontation
- shop robbery consequence
- jail/exile event

## 22.3 Keep the first version human and readable

Initial towns should be understandable:

```txt
Outskirts
Gate
Square
Market
Tavern
Residential
Back Alley
Exit
```

## 22.4 Back alley should be tempting, not mandatory

The thieves guild is powerful, but town core gameplay should work without it.

## 22.5 Wanted should create options, not just punishment

Wanted level should open:

- bribes
- hiding
- guild help
- fake papers
- escape routes
- guard romance consequences
- jail/trial weirdness

It should not only spawn enemies.

---

# 23. Summary

Human towns should become generated multiroom social structures.

They support:

- bigger shops
- transition rooms
- town districts
- law and wanted systems
- police pursuit
- thieves guild
- guild karma
- guild quests
- rumors and notices
- town laws
- romance density
- future marriage/family/crime consequences

The first implementation should be modest:

```txt
Outskirts -> Gate -> Square -> Market/Tavern/Residential/Back Alley -> Exit
```

But the system should be built to grow into:

```txt
A snake enters town, joins a thieves guild, dates the guard captain, steals a wedding bouquet, gets five stars, hides in a tavern, pays a florist, and escapes through the sewer with forged marriage papers.
```

That is the correct amount of town for this game.
