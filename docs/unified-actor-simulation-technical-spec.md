# Snake for the Modern Gamer — Unified Actor Simulation Technical Specification

## Part 3: Specs

This is the **technical specification** for the Unified Actor Simulation overhaul.

The previous documents covered:

1. **Requirements** — what the system must achieve.
2. **Design** — how the system should feel in play.

This document is the engineering-facing bridge between those ideas and the current repository. It is intended to be concrete enough that a coding agent, future developer, or sleep-deprived snake monarch can implement the system in staged pull requests without turning the game into a flaming barrel of partial rewrites.

The guiding philosophy:

> Do not rewrite the whole game.  
> Add a shared Actor layer, then progressively attach existing systems to it.

The current repository already has the bones of this:

- conditional NPC voice lines
- portrait registry
- relationship controller
- town, guild, crime, wanted, rumor, and resident runtime state
- animal spawning and behavior
- enemy/bullet systems
- item registry with food, materials, charms, and recipes
- skill tree flags
- quest popup dialogue UI
- wanderer encounters
- save flags and runtime town state

The actor system should bind these systems together.

---

# 0. Executive Implementation Summary

The short version:

```text
Add ActorSystem.
Give every meaningful being an actorId.
Emit WorldEvents from existing actions.
Let actors witness and remember events.
Let voice lines query actor facts and memories.
Let interaction menus be generated from actor state.
Let relationships, towns, shops, animals, enemies, and factions attach to actors.
Gradually migrate behavior from separate managers into actor brains.
```

The first useful version does **not** require full Dwarf Fortress simulation.

The first useful version is:

```text
Town residents, shopkeepers, guards, animals, enemies, and relationship NPCs get actor IDs.
World events are emitted for hunting, shopping, theft, romance, combat, death, and town interactions.
Nearby actors remember events.
NPC barks reference memories.
Interaction menus display actor state.
```

That alone will make the game feel dramatically more reactive.

---

# 1. Scope

## 1.1 In scope

This spec covers:

- Actor data model
- Actor registry
- Actor IDs on existing entities
- World event log
- Witness/perception system
- Actor memory
- Actor opinions
- Mood and needs
- Actor voice system
- Dynamic interaction menu
- Actor indicators and nameplates
- Actor journal
- Actor-to-actor social graph
- Relationship integration
- Town integration
- Faction integration
- Rumor integration
- Animal integration
- Enemy/humanoid combat integration
- Shopkeeper integration
- Lore profile and lore bomb system
- King myth system
- Goblin religion content hooks
- Save data and migration
- Phased implementation plan
- Testing plan
- File-by-file implementation targets

## 1.2 Out of scope for first implementation

These should **not** block V1:

- perfect pathfinding for all offscreen actors
- fully simulated economy
- full town war simulation
- procedural text generation at runtime
- fully bespoke romance scenes for every actor
- exact line-of-sight through every wall
- full People/Lore/Rumor journal polish
- total rewrite of `SnakeGame`, `SnakeScene`, `AnimalManager`, or `EnemyManager`

The system should be built so those can come later.

---

# 2. Current Systems To Build Upon

## 2.1 NPC voice

Current file:

```text
src/npcs/npcVoice.ts
```

Current responsibilities:

- Defines `NpcVoiceCondition`
- Defines `NpcVoiceLine`
- Defines `NpcVoiceContext`
- Selects a line by role, biome, conditions, and priority
- Supports conditions for biome, danger, health, flags, recent events, item, skill, and snake length

Specification:

- Keep this as the seed.
- Introduce a new `ActorVoiceSystem`.
- Keep compatibility by letting `selectNpcVoiceLine` call into actor voice when actor context exists.
- Existing `NPC_VOICE_LINES` can remain as legacy/fallback lines.
- Add new actor-aware line packs gradually.

## 2.2 Portrait registry

Current file:

```text
src/npcs/portraitRegistry.ts
```

Current responsibilities:

- Defines portrait expressions
- Maps portrait IDs to texture keys
- Has fallback portrait
- Includes roles like villager, shopkeeper, guard, thief, hunter, cook, goblin, angel, fisher, trapper, monk, etc.

Specification:

- Keep `PortraitDefinition`.
- Add optional actor-facing metadata later:
  - `species`
  - `factionId`
  - `moodTags`
  - `rarity`
  - `canUseForGeneratedActor`
- Add expression coverage:
  - neutral
  - happy
  - worried
  - angry
  - suspicious
  - grieving
  - affectionate
  - hostile
  - embarrassed
- Use this registry in actor menu headers and actor journal.

## 2.3 Relationships

Current files:

```text
src/relationships/relationshipController.ts
src/relationships/relationshipTypes.ts
```

Current responsibilities:

- Relationship stages
- Relationship species
- Relationship personality
- Relationship tags
- Conflict/exclusivity
- Relationship memories
- Dating candidate view
- Relationship choices
- Relationship outcomes
- Affection/trust/jealousy/resentment/fear/fascination
- Marriage, divorce, hostile stages, murderous stages
- Children and rewards
- Personality tag weights

Specification:

- Do not replace.
- Add `actorId` to relationship state/profile.
- Relationship state becomes actor relationship data for romance candidates.
- Actor system should be able to query relationship state.
- Relationship choices should emit `WorldEvent`.
- Relationship memories should mirror or link to `ActorMemory`.

## 2.4 Towns

Current files:

```text
src/world/town.ts
src/world/townRuntime.ts
```

Current responsibilities:

- Town mood
- Town districts
- Town tags
- Room tags
- Crime kinds
- Shop kinds
- Town residents
- Town structure
- Thieves guild state
- Town laws
- Town rumors
- Town notices
- Town crimes
- Patrol encounters
- Guild jobs
- Human town generation
- Physical town generation
- Resident generation
- Town crime application
- Wanted/suspicion/reputation
- Guild discovery
- Wanted reduction
- Guild job resolution
- Runtime state for residents

Specification:

- `TownResident` should gain `actorId`.
- `TownResidentRuntimeState` should become an actor-runtime bridge.
- Town rumors should eventually be generated from the global `RumorSystem`, but existing `TownRumor` can remain as local town rumor data.
- Town crimes should emit `WorldEvent`.
- Town wanted/suspicion/reputation should be updated by event listeners, not only direct method calls.
- Town resident hostility/death/hidden/relationship should be mirrored into Actor state.

## 2.5 Animals

Current files:

```text
src/animals/types.ts
src/animals/animalManager.ts
src/animals/animalRegistry.ts
src/animals/animalDrops.ts
```

Current responsibilities:

- Animal definitions
- Animal instances
- Biome spawning
- Behaviors: wander, flee, chase, graze, school, perch
- Encounters: harmless, dangerous, tamable, hunt
- Drops
- Hearts
- Taming flag fields

Specification:

- Add `actorId?: string` to `AnimalInstance`.
- Create actor records when animals spawn.
- Animal events:
  - spawned
  - startled
  - hunted
  - damaged player
  - tamed
  - fed bait
  - fled
- Animal brains can initially remain inside `AnimalManager`.
- Later, animal behavior can query Actor mood/memory.

## 2.6 Enemies

Current file:

```text
src/systems/enemies.ts
```

Current responsibilities:

- Enemy instances
- Enemy bullets
- Basic enemy spawning
- Shark spawning
- Hostile NPC spawning
- Goblin spawning
- Duelist spawning
- Hearts and encounter kinds

Specification:

- Add `actorId?: string` to `EnemyInstance`.
- When spawning hostile NPC/goblin/duelist/enemy, create actor or attach to actor.
- Add humanoid combat metadata:
  - species
  - factionId
  - hostility state
  - canBeEaten
  - slash cooldown
  - surrender chance
- Eating hostile humanoids should be handled through Actor/Combat event pipeline.

## 2.7 Items and skills

Current files:

```text
src/inventory/item.ts
src/inventory/itemRegistry.ts
src/systems/skillTree.ts
```

Current responsibilities:

- Equipment slots
- Equipment modifiers
- Item categories: food, material, charm, recipe, quest, consumable
- Food/meat/honey/healing items
- Rope/lead
- Animal bait
- Charms
- Skills including hunting, death marker, camp cook, thick scales, etc.

Specification:

- Actor simulation should use existing item categories.
- Charm effects should emit `WorldEvent`.
- Bait should become actor-affecting placed object or short-lived room event.
- Rope/lead should connect to animal actors.
- Skills can gate actor options:
  - pickpocket skill/background
  - camp cook
  - predator/hunting
  - death marker
  - social skills later
  - intimidation / mercy / diplomacy skills later

## 2.8 Save system

Current file:

```text
src/game/saveManager.ts
```

Current responsibilities:

- Versioned save data
- Score, snake, health, quests, inventory, equipment, flags, world generation, cosmetics, religion/class/background

Specification:

- Add actor save data in a versioned way.
- Avoid putting the entire actor system only in `flags` long-term.
- V1 can store actor state inside `flags.actor.*` for speed.
- V2 should add explicit save fields:
  - `actors`
  - `worldEvents`
  - `rumors`
  - `factionsV2`
  - `knownPeople`
  - `knownLore`

---

# 3. New File Structure

Add:

```text
src/actors/actorTypes.ts
src/actors/actorRegistry.ts
src/actors/actorSystem.ts
src/actors/actorFactory.ts
src/actors/actorMemory.ts
src/actors/actorOpinions.ts
src/actors/actorPerception.ts
src/actors/actorBrains.ts
src/actors/actorVoice.ts
src/actors/actorSoul.ts
src/actors/actorLore.ts
src/actors/actorNames.ts
src/actors/actorRelationships.ts
src/actors/actorInteractions.ts
src/actors/actorIndicators.ts

src/events/worldEventTypes.ts
src/events/worldEventLog.ts
src/events/worldEventBus.ts
src/events/worldEventRules.ts

src/rumors/rumorTypes.ts
src/rumors/rumorSystem.ts
src/rumors/rumorText.ts

src/factions/factionRelations.ts
src/factions/factionEvents.ts
src/factions/factionSimulation.ts

src/ui/actorInteractionMenu.ts
src/ui/actorNameplates.ts
src/ui/actorJournal.ts
src/ui/actorIndicatorRenderer.ts
```

Do not necessarily create all at once. The first PR can create the skeleton:

```text
actorTypes.ts
actorRegistry.ts
actorSystem.ts
worldEventTypes.ts
worldEventLog.ts
actorVoice.ts
actorInteractions.ts
```

---

# 4. Core Actor Types

## 4.1 Actor ID

Actor IDs must be stable when possible.

Format examples:

```text
town:{townId}:resident:{residentId}
town:{townId}:shopkeeper:{residentId}
town:{townId}:guard:{residentId}
animal:{roomId}:{animalInstanceId}
enemy:{roomId}:{enemyInstanceId}
relationship:{relationshipId}
wanderer:{encounterId}
summon:{source}:{counter}
```

Rules:

- Persistent town residents get stable IDs from town/resident data.
- Relationship actors use relationship IDs.
- Animals/enemies can be ephemeral unless promoted.
- Promoted animals/enemies get stable IDs persisted in actor save data.
- Avoid raw `Math.random()` for persistent actor IDs.

## 4.2 ActorKind

```ts
export type ActorKind =
  | 'civilian'
  | 'shopkeeper'
  | 'guard'
  | 'criminal'
  | 'animal'
  | 'enemy'
  | 'follower'
  | 'summon'
  | 'supernatural'
  | 'boss'
  | 'wanderer';
```

## 4.3 ActorRole

```ts
export type ActorRole =
  | 'resident'
  | 'shopkeeper'
  | 'guard'
  | 'gateGuard'
  | 'bartender'
  | 'cook'
  | 'hunter'
  | 'fisher'
  | 'trapper'
  | 'thief'
  | 'thiefContact'
  | 'guildContact'
  | 'blackMarketMerchant'
  | 'goblinMerchant'
  | 'goblinClerk'
  | 'goblinPriest'
  | 'bandit'
  | 'animalPrey'
  | 'animalPredator'
  | 'pet'
  | 'questGiver'
  | 'romanceCandidate'
  | 'angel'
  | 'goblinAngel'
  | 'summon'
  | 'wanderingCounterpart'
  | 'duelist'
  | 'boss';
```

## 4.4 ActorSpecies

```ts
export type ActorSpecies =
  | 'human'
  | 'goblin'
  | 'angel'
  | 'goblinAngel'
  | 'animal'
  | 'beast'
  | 'snake'
  | 'shark'
  | 'unknown';
```

## 4.5 ActorThickness

```ts
export type ActorThickness = 'thin' | 'medium' | 'thick';
```

Meaning:

```text
thin: minimal actor shell
medium: named, remembered, voiced
thick: social/lore/romance depth
```

## 4.6 Actor

```ts
export interface Actor {
  id: string;
  kind: ActorKind;
  role: ActorRole;
  species: ActorSpecies;
  thickness: ActorThickness;

  displayName: string;
  shortName?: string;
  epithet?: string;

  factionId?: string;
  townId?: string;
  homeRoomId?: string;
  workRoomId?: string;
  currentRoomId?: string;

  portraitId?: string;
  voiceProfileId?: string;

  personality: ActorPersonalityTag[];
  mood: ActorMood;
  needs: ActorNeeds;

  opinions: Record<string, ActorOpinion>;
  relationships: ActorSocialLink[];

  memory: ActorMemory[];

  health?: ActorHealth;
  combat?: ActorCombatProfile;
  hostility?: ActorHostilityState;

  inventory?: Record<string, number>;

  soul?: ActorSoulProfile;
  lore?: ActorLoreProfile;

  schedule?: ActorSchedule;
  brainId?: ActorBrainId;

  flags: Record<string, unknown>;

  createdAtRoomNumber?: number;
  lastSeenRoomNumber?: number;
}
```

---

# 5. Actor Mood, Needs, Opinions

## 5.1 ActorMood

```ts
export interface ActorMood {
  fear: number;
  anger: number;
  trust: number;
  affection: number;
  greed: number;
  hunger: number;
  curiosity: number;
  grief: number;
  stress: number;
}
```

Range:

```text
0 to 100
```

Default values should be generated from personality and role.

Examples:

- goblin merchant: greed 70, curiosity 50
- guard: duty/stress implied through needs, fear 20, anger 20
- wolf: hunger 80, fear 20
- spouse: affection high, stress reactive

## 5.2 ActorNeeds

```ts
export interface ActorNeeds {
  food: number;
  safety: number;
  money: number;
  social: number;
  rest: number;
  duty: number;
  curiosity: number;
  revenge: number;
  faith: number;
  status: number;
}
```

Needs are not necessarily visible to the player.

They drive:

- actor goals
- shop stock
- microquests
- fleeing
- gossip
- romance scenes
- faction behavior

## 5.3 ActorOpinion

```ts
export interface ActorOpinion {
  targetId: string;
  trust: number;
  fear: number;
  respect: number;
  affection: number;
  resentment: number;
  attraction: number;
  debt: number;
}
```

Targets can be:

```text
player
actor ID
faction ID
town ID
```

## 5.4 Opinion summary helper

Add helpers:

```ts
export function getOpinionOfPlayer(actor: Actor): ActorOpinion;
export function updateOpinion(actor: Actor, targetId: string, delta: Partial<ActorOpinion>): Actor;
export function summarizeOpinion(opinion: ActorOpinion): ActorOpinionSummary;
```

`ActorOpinionSummary` can return terms:

```text
friendly
wary
afraid
fond
resentful
hostile
complicated
commercially delighted
romantically endangered
```

---

# 6. Actor Personality

## 6.1 Personality tags

```ts
export type ActorPersonalityTag =
  | 'practical'
  | 'cowardly'
  | 'greedy'
  | 'kind'
  | 'religious'
  | 'romantic'
  | 'hungry'
  | 'paranoid'
  | 'bureaucratic'
  | 'violent'
  | 'poetic'
  | 'deadpan'
  | 'sharp'
  | 'regal'
  | 'goblin'
  | 'melancholy'
  | 'brave'
  | 'nosy'
  | 'petty'
  | 'lawful'
  | 'criminal'
  | 'sentimental'
  | 'lonely'
  | 'vengeful'
  | 'idealistic'
  | 'cynical'
  | 'softhearted'
  | 'statusHungry';
```

## 6.2 Personality generation by role

Suggested defaults:

```text
shopkeeper: practical, greedy/sharp/kind
guard: lawful, bureaucratic/brave/cowardly
thief: criminal, sharp, paranoid
goblin merchant: goblin, greedy, sharp
hunter: practical, brave, melancholy
cook: kind/hungry/practical
bandit: violent, hungry, vengeful/cowardly
romance candidate: any plus romantic/lonely/sentimental chance
```

## 6.3 Personality to voice

Voice line selection should consider:

- exact tag match
- role match
- mood match
- relationship stage
- memory tags

Example:

A cowardly guard who saw player eat a bandit:

```text
“I am choosing public safety, specifically mine.”
```

A greedy shopkeeper who sees low health:

```text
“Your emergency has excellent margins.”
```

---

# 7. Actor Soul and Lore Profiles

## 7.1 ActorSoulProfile

```ts
export interface ActorSoulProfile {
  wound?: ActorWound;
  insecurity?: ActorInsecurity;
  longing?: ActorLonging;
  contradiction?: ActorContradiction;
  secret?: ActorSecret;
  relationshipFear?: ActorRelationshipFear;
  confessionStyle?: ActorConfessionStyle;
  revealed: Partial<Record<ActorSoulRevealKey, boolean>>;
}
```

## 7.2 Soul reveal keys

```ts
export type ActorSoulRevealKey =
  | 'personalityHint'
  | 'opinionHint'
  | 'socialLink'
  | 'insecurity'
  | 'wound'
  | 'contradiction'
  | 'secret'
  | 'loreBomb';
```

## 7.3 ActorLoreProfile

```ts
export interface ActorLoreProfile {
  scale: 'none' | 'local' | 'regional' | 'kingdom' | 'mythic';
  knowsAboutKing: boolean;
  kingOpinion?: 'loyal' | 'afraid' | 'bitter' | 'mocking' | 'conflicted' | 'secretlyRoyal';
  secretType?: 'royal' | 'war' | 'religion' | 'crime' | 'family' | 'exile' | 'guild' | 'debt';
  anchorEvent?: LoreEventId;
  anchorPlace?: LorePlaceId;
  anchorInstitution?: LoreInstitutionId;
  officialVersionBelief: number;
  bitternessTowardKing: number;
  revealedLoreIds: string[];
}
```

## 7.4 Lore IDs

Use string IDs for lore atoms:

```text
king.osric-bellgrave
event.bellwether-ford
event.sable-mile
event.treaty-small-ink
place.red-tollhouse
institution.ledger-below
institution.crown-road-office
religion.bell-saint
```

## 7.5 Lore bomb record

```ts
export interface LoreBomb {
  id: string;
  actorId: string;
  loreId: string;
  weight: 1 | 2 | 3;
  text: string;
  revealedAtRoomNumber: number;
  public: boolean;
}
```

---

# 8. Actor Registry

## 8.1 Responsibilities

`ActorRegistry` owns actors.

It should:

- create actors
- retrieve actors
- update actors immutably or safely
- list actors by room/town/faction
- resolve actor IDs from existing entities
- promote actors
- serialize/deserialize actor state

## 8.2 Interface

```ts
export class ActorRegistry {
  get(actorId: string): Actor | undefined;
  has(actorId: string): boolean;
  upsert(actor: Actor): Actor;
  update(actorId: string, updater: (actor: Actor) => Actor): Actor | undefined;
  remove(actorId: string): void;

  getByRoom(roomId: string): Actor[];
  getByTown(townId: string): Actor[];
  getByFaction(factionId: string): Actor[];
  getKnownActors(): Actor[];

  ensureTownResidentActor(args: EnsureTownResidentActorArgs): Actor;
  ensureAnimalActor(args: EnsureAnimalActorArgs): Actor;
  ensureEnemyActor(args: EnsureEnemyActorArgs): Actor;
  ensureRelationshipActor(args: EnsureRelationshipActorArgs): Actor;
  ensureWandererActor(args: EnsureWandererActorArgs): Actor;

  promote(actorId: string, reason: ActorPromotionReason): Actor | undefined;

  toSaveData(): ActorSaveData;
  loadSaveData(data: ActorSaveData): void;
}
```

## 8.3 ActorSaveData

```ts
export interface ActorSaveData {
  version: number;
  actors: Record<string, Actor>;
  knownActorIds: string[];
  promotedActorIds: string[];
  deadActorIds: string[];
}
```

V1 can store this in `flags['actors.save']`.

V2 can add a direct field to `GameSaveData`.

---

# 9. Actor Factory

## 9.1 Responsibilities

`ActorFactory` generates actor defaults from existing repo entities.

It should create actors from:

- `TownResident`
- `RelationshipState`
- `RelationshipCandidateProfile`
- `AnimalInstance`
- `AnimalDefinition`
- `EnemyInstance`
- `WandererEncounter`
- quest giver
- shopkeeper
- follower
- summon

## 9.2 Town resident actor

```ts
function createActorFromTownResident(
  town: TownStructure,
  resident: TownResident,
  roomId?: string,
): Actor
```

Mapping:

```text
resident.role === shopkeeper -> kind shopkeeper, role shopkeeper
resident.role === guard -> kind guard, role guard
resident.role === thiefContact -> kind criminal, role thiefContact
resident.role === thief -> kind criminal, role thief
resident.role === bartender -> kind civilian, role bartender
resident.role === scribe -> kind civilian, role resident or scribe
```

Faction:

```text
resident.factionId if present
else town.factionId
```

Health:

```text
normal resident: 3 hearts
guard: 3 or 4 hearts
thief: 2 hearts
shopkeeper: 3 hearts
```

## 9.3 Animal actor

```ts
function createActorFromAnimal(
  animal: AnimalInstance,
  def: AnimalDefinition,
): Actor
```

Mapping:

```text
def.snakeEncounter harmless -> role animalPrey
def.snakeEncounter dangerous -> role animalPredator or enemy
def.snakeEncounter tamable -> role animalPrey/pet candidate
def.snakeEncounter hunt -> role animalPrey
```

Thickness:

```text
thin by default
medium if tamable/dangerous/rare
thick if promoted
```

## 9.4 Enemy actor

```ts
function createActorFromEnemy(enemy: EnemyInstance): Actor
```

Mapping:

```text
encounterKind enemy -> bandit-like enemy
encounterKind npc-hostile -> hostile humanoid actor
encounterKind goblin -> goblin hostile actor
encounterKind duelist -> thick duelist
encounterKind shark -> animal/beast hostile
```

## 9.5 Relationship actor

```ts
function createActorFromRelationship(state: RelationshipState): Actor
```

Mapping:

```text
stage married/lover/dating -> thick
stage stranger/friendly -> medium
stage hostile/murderous -> medium or thick
```

Opinion from relationship state:

```text
affection -> affection
trust -> trust
resentment -> resentment
fear -> fear
fascination -> attraction/respect maybe
jealousy -> flags or relationship-specific opinion
```

---

# 10. World Event System

## 10.1 Files

```text
src/events/worldEventTypes.ts
src/events/worldEventLog.ts
src/events/worldEventBus.ts
src/events/worldEventRules.ts
```

## 10.2 WorldEvent

```ts
export interface WorldEvent {
  id: string;
  type: WorldEventType;

  roomId?: string;
  townId?: string;
  biomeId?: string;

  sourceActorId?: string;
  targetActorIds?: string[];
  witnessActorIds?: string[];
  heardByActorIds?: string[];

  factionIds?: string[];
  itemIds?: string[];

  severity: number;
  visibility: number;
  loudness: number;

  tags: WorldEventTag[];

  createdAt: number;
  roomNumber?: number;
  expiresAt?: number;

  data?: Record<string, unknown>;
}
```

## 10.3 WorldEventType

```ts
export type WorldEventType =
  | 'animal-spawned'
  | 'animal-startled'
  | 'animal-hunted'
  | 'animal-tamed'
  | 'food-cooked'
  | 'item-used'
  | 'charm-used'
  | 'bait-dropped'
  | 'card-win'
  | 'card-loss'
  | 'gate-opened'
  | 'gate-tax-paid'
  | 'crime-committed'
  | 'pickpocket-attempt'
  | 'pickpocket-success'
  | 'pickpocket-failed'
  | 'npc-attacked'
  | 'humanoid-eaten'
  | 'humanoid-killed'
  | 'actor-wounded'
  | 'actor-rescued'
  | 'actor-spared'
  | 'actor-robbed'
  | 'npc-gifted'
  | 'romance-flirt'
  | 'romance-date'
  | 'romance-confession'
  | 'marriage'
  | 'breakup'
  | 'divorce'
  | 'shop-purchase'
  | 'shop-sold-out'
  | 'player-low-health'
  | 'player-died'
  | 'player-revived'
  | 'tail-shed'
  | 'body-bridge-used'
  | 'quest-offered'
  | 'quest-completed'
  | 'guild-discovered'
  | 'guild-initiation-started'
  | 'guild-initiation-pickpocket'
  | 'guild-initiation-completed'
  | 'bandit-raid-started'
  | 'bandit-raid-ended'
  | 'faction-skirmish-started'
  | 'faction-skirmish-ended'
  | 'lore-bomb-revealed';
```

## 10.4 WorldEventTag

```ts
export type WorldEventTag =
  | 'animal'
  | 'hunting'
  | 'food'
  | 'crime'
  | 'theft'
  | 'violence'
  | 'death'
  | 'revival'
  | 'healing'
  | 'hostile-kill'
  | 'cannibalism-ish'
  | 'romance'
  | 'marriage'
  | 'guild'
  | 'town'
  | 'guard'
  | 'goblin'
  | 'bandit'
  | 'shop'
  | 'faction'
  | 'lore'
  | 'king'
  | 'debt'
  | 'mercy'
  | 'betrayal'
  | 'public'
  | 'private'
  | 'supernatural';
```

## 10.5 WorldEventLog

```ts
export class WorldEventLog {
  add(event: WorldEvent): WorldEvent;
  getRecent(limit?: number): WorldEvent[];
  getById(id: string): WorldEvent | undefined;
  getByActor(actorId: string): WorldEvent[];
  getByRoom(roomId: string): WorldEvent[];
  getByTown(townId: string): WorldEvent[];
  getByTag(tag: WorldEventTag): WorldEvent[];
  prune(currentRoomNumber: number): void;

  toSaveData(): WorldEventSaveData;
  loadSaveData(data: WorldEventSaveData): void;
}
```

## 10.6 Event emission helpers

Add helper methods to `SnakeGame` or a new `ActorSimulationFacade`:

```ts
emitWorldEvent(input: CreateWorldEventInput): WorldEvent;
emitPlayerEvent(...): WorldEvent;
emitTownEvent(...): WorldEvent;
emitActorEvent(...): WorldEvent;
```

## 10.7 Event rules

After event creation:

1. Determine witnesses.
2. Determine hearers.
3. Assign actor memories.
4. Update actor opinions.
5. Update faction/town state.
6. Create rumors if appropriate.
7. Queue UI notifications if important.
8. Update recent event flags for legacy systems.

---

# 11. Perception Specification

## 11.1 Perception system

File:

```text
src/actors/actorPerception.ts
```

## 11.2 Interface

```ts
export interface PerceptionResult {
  witnesses: string[];
  hearers: string[];
}

export function resolvePerception(args: {
  event: WorldEvent;
  actors: ActorRegistry;
  currentRoomId: string;
  getNeighborRoomIds(roomId: string): string[];
  blocksSight?: (roomId: string, from: Vector2Like, to: Vector2Like) => boolean;
}): PerceptionResult;
```

## 11.3 V1 sight rules

For V1:

```text
Actors in same room witness if event.visibility >= 25.
Actors in same room always witness public high-severity events.
No wall line-of-sight required initially.
Invisible/hidden actors can be excluded by flag.
```

## 11.4 V1 hearing rules

For V1:

```text
Actors in neighboring rooms hear if event.loudness >= 70.
Actors in same town may receive rumor if event.severity >= 50.
```

## 11.5 Future sight rules

Later:

```text
line of sight
walls block vision
darkness
crowds
sneak skill
guard perception
thief perception
actor facing
```

---

# 12. Actor Memory Specification

## 12.1 File

```text
src/actors/actorMemory.ts
```

## 12.2 ActorMemory

```ts
export interface ActorMemory {
  id: string;
  eventId: string;
  type: WorldEventType;
  targetId?: string;
  sourceActorId?: string;
  roomId?: string;
  townId?: string;
  factionIds?: string[];
  tags: WorldEventTag[];
  intensity: number;
  tone: 'positive' | 'neutral' | 'negative' | 'traumatic' | 'funny';
  createdAt: number;
  roomNumber?: number;
  expiresAt?: number;
  witnessedDirectly?: boolean;
  heardAsRumor?: boolean;
  personal?: boolean;
  publicKnowledge?: boolean;
}
```

## 12.3 Memory intensity formula

Base:

```text
intensity = event.severity
```

Modifiers:

```text
+25 if direct witness
+15 if target is friend/family/spouse
+20 if actor is target
+15 if actor faction involved
+10 if actor personality is nosy
+10 if actor personality is paranoid and event is violent/crime
+10 if actor personality is romantic and event is romance
+15 if actor personality is religious and event is revival/death/goblin/angel
-20 if heard only as rumor
```

Clamp:

```text
0 to 100
```

## 12.4 Memory limits

Keep memory bounded.

Defaults:

```text
thin actor: 4 memories
medium actor: 16 memories
thick actor: 48 memories
relationship actor: existing relationship memory cap plus actor memories
```

Eviction priority:

1. Expired low-intensity memories
2. Non-personal low-intensity memories
3. Oldest neutral memories
4. Never evict permanent personal trauma/lore/marriage/death memories unless explicitly cleared

## 12.5 Memory decay

Decay categories:

```text
immediate: expires after 5 rooms
local: expires after 25 rooms
regional: expires after 75 rooms
faction: expires after 150 rooms
personal: no expiry or very long
permanent: no expiry
```

## 12.6 Memory fact extraction

Add helper:

```ts
export function deriveMemoryFacts(actor: Actor): ActorMemoryFacts;
```

Output examples:

```ts
{
  remembersPlayerDeath: true,
  remembersPlayerRevival: true,
  remembersPlayerAteHumanoid: true,
  remembersPlayerCrime: true,
  remembersGift: true,
  remembersRescue: true,
  remembersMarriage: true,
  remembersBanditRaid: true,
  remembersLoreBomb: true,
}
```

Voice and menu systems use facts.

---

# 13. Actor Voice Specification

## 13.1 File

```text
src/actors/actorVoice.ts
```

## 13.2 ActorVoiceFacts

```ts
export interface ActorVoiceFacts {
  actorId: string;
  role: ActorRole;
  kind: ActorKind;
  species: ActorSpecies;
  factionId?: string;
  townId?: string;
  biomeId?: string;

  personality: ActorPersonalityTag[];
  mood: ActorMood;
  opinionOfPlayer: ActorOpinion;

  relationshipStage?: RelationshipStage;
  isSpouse: boolean;
  isDating: boolean;
  isEx: boolean;
  isHostile: boolean;

  playerLowHealth: boolean;
  playerVeryLowHealth: boolean;
  playerLongBody: boolean;
  playerWanted: boolean;
  playerRecentlyDied: boolean;
  playerRecentlyRevived: boolean;
  playerRecentlyHunted: boolean;
  playerRecentlyAteHumanoid: boolean;
  playerOwesDebt: boolean;
  playerHasMinimap: boolean;

  remembersCrime: boolean;
  remembersGift: boolean;
  remembersRescue: boolean;
  remembersDeath: boolean;
  remembersMarriage: boolean;
  remembersEating: boolean;
  remembersRaid: boolean;

  factionTense: boolean;
  raidThreat: boolean;
  skirmishActive: boolean;

  focusLevel: number;
  loreEligible: boolean;
  soulRevealEligible: boolean;

  tags: string[];
}
```

## 13.3 ActorVoiceLine

```ts
export interface ActorVoiceLine {
  id: string;
  text: string;
  priority: number;

  roles?: ActorRole[];
  kinds?: ActorKind[];
  species?: ActorSpecies[];
  factions?: string[];
  personalityTags?: ActorPersonalityTag[];

  requiredFacts?: string[];
  blockedFacts?: string[];
  requiredTags?: string[];
  blockedTags?: string[];

  relationshipStages?: RelationshipStage[];

  minFocusLevel?: number;
  maxFocusLevel?: number;

  loreWeight?: 0 | 1 | 2 | 3;
  soulRevealKey?: ActorSoulRevealKey;

  portraitId?: string;
  tags: string[];
}
```

## 13.4 ActorVoiceResult

```ts
export interface ActorVoiceResult {
  line: ActorVoiceLine;
  text: string;
  portraitId?: string;
  revealedFacts?: ActorRevealedFact[];
  emittedEvent?: WorldEvent;
}
```

## 13.5 Selection rules

1. Build facts.
2. Filter lines by role/kind/species/faction/personality.
3. Filter by required facts and blocked facts.
4. Filter by relationship stage.
5. Filter by focus/lore eligibility.
6. Score priority:
   - base priority
   - memory relevance bonus
   - personality match bonus
   - relationship stage bonus
   - recently unseen line bonus
7. Choose from highest tier, random among ties.
8. Mark line as recently used for this actor.

## 13.6 Backward compatibility

`selectNpcVoiceLine(context)` should remain for existing calls.

Add bridge:

```ts
export function selectNpcVoiceLine(context: NpcVoiceContext): NpcVoiceLine {
  if (context.actorId && actorSystemAvailable) {
    return selectActorVoiceLine(...).asNpcVoiceLine();
  }
  return legacySelection(context);
}
```

If not possible immediately, keep separate and migrate callers gradually.

## 13.7 Voice packs

Create voice packs:

```text
src/actors/voicePacks/commonVoice.ts
src/actors/voicePacks/shopVoice.ts
src/actors/voicePacks/guardVoice.ts
src/actors/voicePacks/goblinVoice.ts
src/actors/voicePacks/romanceVoice.ts
src/actors/voicePacks/combatVoice.ts
src/actors/voicePacks/loreVoice.ts
src/actors/voicePacks/rumorVoice.ts
```

## 13.8 Template slot engine

Add optional slot replacement.

```ts
export interface VoiceTemplateSlots {
  [slotName: string]: string[];
}

export function renderVoiceTemplate(
  template: string,
  facts: ActorVoiceFacts,
  rng: () => number,
): string;
```

Example:

```text
"{greeting} You look like {injury_metaphor}. Buy {recommended_item} before the trees notice."
```

## 13.9 Required first actor voice lines

Minimum for V1:

- shopkeeper low health
- shopkeeper recent purchase
- guard wanted
- guard gate tax
- resident recent death
- resident recent hunt
- goblin debt
- romance friendly
- romance worried after low health
- hostile bandit combat bark
- witness pickpocket
- witness humanoid eating
- generic fallback

---

# 14. Actor Interaction Menu Specification

## 14.1 File

```text
src/actors/actorInteractions.ts
src/ui/actorInteractionMenu.ts
```

## 14.2 ActorInteractionOption

```ts
export interface ActorInteractionOption {
  id: ActorInteractionId;
  label: string;
  description?: string;
  enabled: boolean;
  disabledReason?: string;
  priority: number;
  category:
    | 'basic'
    | 'shop'
    | 'romance'
    | 'guild'
    | 'crime'
    | 'combat'
    | 'quest'
    | 'lore'
    | 'faction'
    | 'personal'
    | 'debug';

  danger?: 'none' | 'low' | 'medium' | 'high';
  hidden?: boolean;

  run: ActorInteractionHandlerId;
}
```

## 14.3 ActorInteractionId

```ts
export type ActorInteractionId =
  | 'talk'
  | 'ask-rumor'
  | 'ask-about-town'
  | 'ask-about-family'
  | 'ask-about-actor'
  | 'ask-about-king'
  | 'ask-about-faction'
  | 'ask-about-raid'
  | 'shop'
  | 'sell-items'
  | 'give-gift'
  | 'flirt'
  | 'date'
  | 'kiss'
  | 'propose'
  | 'apologize'
  | 'break-up'
  | 'divorce'
  | 'pickpocket'
  | 'black-market'
  | 'pay-debt'
  | 'pay-gate-tax'
  | 'bribe'
  | 'threaten'
  | 'attack'
  | 'parley'
  | 'spare'
  | 'rob'
  | 'question'
  | 'eat'
  | 'help'
  | 'leave';
```

## 14.4 Menu generation

```ts
export function buildActorInteractionMenu(args: {
  actor: Actor;
  player: PlayerActorContext;
  room: RoomSnapshot;
  town?: TownStructure;
  relationship?: RelationshipState;
  facts: ActorVoiceFacts;
  knownFacts: KnownActorFacts;
}): ActorInteractionMenuModel;
```

## 14.5 ActorInteractionMenuModel

```ts
export interface ActorInteractionMenuModel {
  actorId: string;
  title: string;
  subtitle: string;
  moodText?: string;
  portraitId?: string;
  bark?: string;
  size: 'tiny' | 'small' | 'medium' | 'large' | 'expanded';
  indicators: ActorIndicator[];
  options: ActorInteractionOption[];
}
```

## 14.6 Size rules

```text
0-3 options: tiny
4-6 options: small
7-9 options: medium
10-13 options: large
14+ options: expanded/scrollable
serious scene: expanded regardless
```

## 14.7 Required option generation rules

### Base humanoid

If non-hostile humanoid:

```text
Talk
Romance/Flirt
Ask Rumor
Attack
Leave
```

### Shopkeeper

```text
Shop
Sell Items
Ask About Stock
Ask About Local Danger
```

### Guard

```text
Ask About Law
Pay Gate Tax if gate room
Bribe if wanted/suspicious
Report Crime later
```

### Thief/guild

```text
Pickpocket if guild unlocked
Ask About Jobs
Black Market if guild discovered
Pay Debt if debt flags exist
```

### Relationship

Based on relationship stage:

```text
stranger: Talk, Flirt, Gift
crush: Talk, Flirt, Ask Out, Gift, Apologize
dating: Talk, Date, Gift, Reassure, Apologize, Break Up
lover: Talk, Date, Gift, Propose, Reassure, Apologize, Break Up
married: Talk, Kiss, Gift, Family, Discuss Arrangement, Divorce
estranged/heartbroken/vengeful: Talk, Apologize, Explain, Gift
hostile/murderous: Plead, Fight, Run
```

### Hostile wounded

```text
Question
Rob
Spare
Eat
Leave
```

### Eat option rules

Show `Eat` when:

```text
actor is humanoid
actor.hostility is hostile/surrendering/downed
actor.combat?.canBeEatenWhenHostile === true
```

Disabled reason if not:

```text
Target is not hostile.
```

## 14.8 Menu handler integration

Interaction handlers should be centralized.

```ts
export type ActorInteractionHandlerId =
  | 'handleTalk'
  | 'handleShop'
  | 'handleGift'
  | 'handleRelationshipChoice'
  | 'handlePickpocket'
  | 'handleAttack'
  | 'handleEat'
  | 'handlePayGateTax'
  | 'handleAskRumor'
  | 'handleAskLore'
  | 'handleLeave';
```

The UI should call into `SnakeScene`, which calls `SnakeGame`/ActorSystem.

---

# 15. Actor Indicators Specification

## 15.1 File

```text
src/actors/actorIndicators.ts
src/ui/actorIndicatorRenderer.ts
```

## 15.2 ActorIndicator

```ts
export interface ActorIndicator {
  id: string;
  kind:
    | 'quest'
    | 'rumor'
    | 'romance'
    | 'spouse'
    | 'shop'
    | 'cards'
    | 'hostile'
    | 'suspicious'
    | 'wounded'
    | 'witness'
    | 'debt'
    | 'locked'
    | 'personal';
  priority: number;
  label: string;
  iconKey: string;
  color?: number;
}
```

## 15.3 Build function

```ts
export function getActorIndicators(args: {
  actor: Actor;
  facts: ActorVoiceFacts;
  relationship?: RelationshipState;
  questAvailable?: boolean;
  shopAvailable?: boolean;
  rumorAvailable?: boolean;
}): ActorIndicator[];
```

## 15.4 Priority rules

```text
hostile: 100
wounded/downed: 95
quest turn-in: 90
quest available: 80
personal/secret: 70
romance milestone: 65
shop: 55
rumor: 45
debt/guild: 40
locked: 20
```

Render max:

```text
2 icons by default
3 if player is very close
```

---

# 16. Actor Journal Specification

## 16.1 Files

```text
src/ui/actorJournal.ts
src/actors/knownActors.ts
```

## 16.2 KnownActorRecord

```ts
export interface KnownActorRecord {
  actorId: string;
  displayName: string;
  role?: ActorRole;
  townId?: string;
  factionId?: string;
  portraitId?: string;

  relationshipStage?: RelationshipStage;

  knownFacts: KnownActorFact[];
  knownRelations: KnownActorRelationFact[];
  knownMemories: string[];
  knownSecrets: string[];
  knownLoreIds: string[];

  firstMetRoomNumber: number;
  lastSeenRoomNumber: number;
}
```

## 16.3 KnownActorFact

```ts
export interface KnownActorFact {
  id: string;
  text: string;
  kind:
    | 'role'
    | 'job'
    | 'personality'
    | 'like'
    | 'dislike'
    | 'fear'
    | 'wound'
    | 'secret'
    | 'memory'
    | 'lore'
    | 'rumor';
  revealedAtRoomNumber: number;
}
```

## 16.4 Tabs

Future pause menu tabs:

```text
People
Rumors
Lore
Factions
```

V1 can skip full UI and store known facts silently, but the spec should reserve the model.

---

# 17. Relationship Integration Specification

## 17.1 Add actorId to relationship types

Extend:

```ts
export interface RelationshipState {
  actorId?: string;
  ...
}
```

Extend:

```ts
export interface RelationshipCandidateProfile {
  actorId?: string;
  ...
}
```

## 17.2 Ensure actor for relationship

When `ensureCandidate(profile)` runs:

1. If `profile.actorId`, use it.
2. Else create `relationship:{profile.id}` actor.
3. Store actorId in state flags or field.
4. Sync displayName/species/faction/portrait.

## 17.3 Relationship choice events

Every relationship choice should emit event.

Examples:

```text
talk -> romance-talk
flirt -> romance-flirt
date -> romance-date
propose -> romance-proposal
marriage -> marriage
divorce -> divorce
break-up -> breakup
fight -> npc-attacked or relationship-hostility
```

## 17.4 Relationship memory bridge

When `recordMemory` is called in `RelationshipController`, also emit or mirror an `ActorMemory`.

If circular dependency is a concern:

- RelationshipController stays pure.
- It returns `RelationshipEventResult` with metadata.
- `SnakeGame`/ActorSystem emits event after applying relationship result.

## 17.5 Relationship as actor opinion

Derive opinion:

```text
affection -> opinion.affection
trust -> opinion.trust
resentment -> opinion.resentment
fear -> opinion.fear
fascination -> opinion.attraction/respect
jealousy -> actor flag or relationship-only
```

## 17.6 Universal romance

When actor is non-hostile humanoid and no relationship exists:

- `Romance` menu option should call `ensureCandidate`.
- Generate relationship profile from actor:
  - id = actor.id
  - displayName = actor.displayName
  - species = actor.species mapped to relationship species
  - factionId = actor.factionId
  - portraitId = actor.portraitId
  - personality from actor personality

## 17.7 Actor soul reveal from relationship stage

Relationship stage/focus should unlock actor soul.

Suggested rules:

```text
friendly -> personalityHint
crush -> insecurity chance
dating -> wound
lover -> contradiction or secret clue
married -> secret/loreBomb
heartbroken/estranged -> wound/conflict lines
```

---

# 18. Town Integration Specification

## 18.1 TownResident actorId

Extend `TownResident`:

```ts
export interface TownResident extends Omit<NpcProfile, 'role'> {
  actorId?: string;
  ...
}
```

When generating residents:

```ts
actorId: `town:${town.id}:resident:${resident.id}`
```

## 18.2 TownResidentRuntimeState extension

Current runtime supports:

```text
hostile
dead
hidden
relationshipId
```

Extend:

```ts
export interface TownResidentRuntimeState {
  actorId?: string;
  hostile?: boolean;
  dead?: boolean;
  hidden?: boolean;
  relationshipId?: string;
  wounded?: boolean;
  lastKnownRoomId?: string;
  mood?: Partial<ActorMood>;
}
```

## 18.3 applyTownCrime should emit events

Current `applyTownCrime` directly updates wanted/reputation/suspicion/rumors.

Keep it, but add event bridge.

When crime occurs:

```text
emit WorldEvent crime-committed
then apply town crime
then actor witnesses remember
then rumors generated
```

## 18.4 Town hostility

Current `activateTownHostility` spawns hostile NPC enemies from residents.

Spec update:

- It should attach spawned enemies to the resident actor ID.
- Resident actor hostility becomes hostile.
- If resident dies as enemy, town resident runtime marks dead.
- If resident is eaten, event `humanoid-eaten` targets that resident actor.

## 18.5 Guild initiation

Current initiation tracks pickpocket count flags per town.

Spec update:

- `guild-initiation-started` event when note slides through grate.
- `guild-initiation-pickpocket` event for each counted pickpocket.
- `guild-initiation-completed` event when grate opens.
- Thief/guild actors remember and comment.
- Pickpocket menu option appears when status active/ready/complete.

## 18.6 Town rumors bridge

Current `TownRumor` can remain.

Add conversion:

```ts
function createTownRumorFromWorldEvent(event: WorldEvent, town: TownStructure): TownRumor
```

Later replace or merge with global Rumor.

## 18.7 Town state summary

Add helper:

```ts
export function getTownActorSummary(town: TownStructure, actorSystem: ActorSystem): TownSummaryView
```

View:

```ts
interface TownSummaryView {
  title: string;
  moodText: string;
  dangerText: string;
  factionLines: string[];
  activeRumors: string[];
  notableActors: string[];
}
```

---

# 19. Animal Integration Specification

## 19.1 AnimalInstance actorId

Extend:

```ts
export interface AnimalInstance {
  actorId?: string;
  ...
}
```

## 19.2 ensureAnimals integration

When `trySpawnAnimal` creates `AnimalInstance`:

- ActorSystem creates animal actor.
- `animal.actorId = actor.id`.

Need avoid ActorSystem dependency in constructor?

Options:

### Option A: pass callback

```ts
ensureAnimals(..., createAnimalActor?: (animal, def) => string)
```

### Option B: SnakeGame post-processes animals

After `ensureAnimals`, call:

```ts
actorSystem.ensureActorsForAnimals(roomId, animalManager.getAnimalsInRoom(roomId))
```

Option B is less invasive.

## 19.3 Animal events

Emit:

```text
animal-startled when harmless animal flashes
animal-hunted when hunted
animal-tamed when tamed
animal-attacked-player when dangerous animal damages player
bait-dropped when bait used
animal-fed-bait when animal responds
```

## 19.4 Bait behavior

Implement `animal-bait`.

V1:

- Use item creates room flag/object:
  - `roomEffects.bait`
  - position = snake head or adjacent tile
  - expires in N ticks
- AnimalManager checks bait target before snake target.
- Predators prioritize bait.
- Harmless animals may avoid bait or ignore.
- Raccoons may steal bait later.

Bait actor/event:

```ts
interface BaitInstance {
  id: string;
  roomId: string;
  position: Vector2Like;
  age: number;
  maxAge: number;
  strength: number;
}
```

## 19.5 Taming

Rope/lead already exist.

V1 taming:

- `Use Lead` creates active taming mode for next tamable animal contact.
- If snake head adjacent to tamable animal:
  - roll tame
  - success sets `isTamed`
  - actor role becomes pet
  - event `animal-tamed`
- Pet follows at simple distance or becomes follower.

## 19.6 Animal actor memory

If an animal actor has memory:

- remembers bait
- remembers attack
- remembers player as owner
- remembers fear of player

Notable animals can gossip through NPCs, not directly.

---

# 20. Enemy and Humanoid Combat Integration

## 20.1 EnemyInstance actorId

Extend:

```ts
export interface EnemyInstance {
  actorId?: string;
  hostility?: ActorHostilityState;
  species?: ActorSpecies;
  factionId?: string;
}
```

## 20.2 spawnHostileNpc

Current `spawnHostileNpc` accepts name/hearts.

Spec:

Add optional:

```ts
options?: {
  actorId?: string;
  factionId?: string;
  species?: ActorSpecies;
  role?: ActorRole;
  sourceResidentId?: string;
}
```

When town resident becomes hostile:

- pass resident actorId
- enemy and actor share state

## 20.3 Humanoid combat profile

```ts
export interface ActorCombatProfile {
  maxHearts: number;
  currentHearts: number;
  hasGun: boolean;
  gunCooldown: number;
  hasSlash: boolean;
  slashCooldown: number;
  slashDamage: number;
  canBeEatenWhenHostile: boolean;
  eatingHealsHearts: number;
  surrenderThreshold?: number;
  morale?: number;
}
```

Defaults:

```text
bandit: 1 heart, gun yes, slash yes, eat heals 1
civilian: 3 hearts, gun yes, slash yes, cannot eat unless hostile
guard: 3-4 hearts, gun yes, slash yes
shopkeeper: 3 hearts, gun yes, slash yes
goblin: 1-2 hearts, gun yes, slash yes
duelist: custom hearts
```

## 20.4 Eating hostile humanoid

Add method:

```ts
tryEatActor(actorId: string): EatActorResult
```

Rules:

```text
actor must be humanoid
actor must be hostile/surrendering/downed
actor must be adjacent or on head tile depending implementation
actor.combat.canBeEatenWhenHostile must be true
```

Result:

```ts
interface EatActorResult {
  ok: boolean;
  message: string;
  healed: number;
  killedActorId?: string;
  event?: WorldEvent;
}
```

Effects:

- remove enemy/NPC from room
- heal player 1 heart
- mark actor dead
- emit `humanoid-eaten`
- witnesses react
- faction/town reacts
- rumor possible

## 20.5 Slash attack

Add enemy/humanoid slash behavior.

V1:

- If humanoid enemy adjacent to snake head and slash cooldown <= 0:
  - deal 1 heart
  - set cooldown
  - emit combat bark maybe
- Else shoot as current enemy does.

## 20.6 Surrender

V1 optional but strongly desired.

If humanoid hostile has low health or fear:

```text
hostility -> surrendering
stop shooting
menu allows Spare / Rob / Question / Eat
```

If no menu support yet, surrender can be later.

---

# 21. Faction Specification

## 21.1 Current faction limitation

Current faction file has two factions:

```text
hearthbound-remnant
goblin-camps
```

and alignment state.

Actor simulation needs broader faction relation data.

## 21.2 Faction IDs

Long-term:

```ts
export type FactionIdV2 =
  | 'hearthbound-remnant'
  | 'human-town'
  | 'goblin-camps'
  | 'ledger-below-market'
  | 'thieves-guild'
  | 'black-grate-guild'
  | 'bandits'
  | 'guards'
  | 'shopkeepers'
  | 'wildlife'
  | 'predators'
  | 'angels'
  | 'goblin-angels'
  | 'royal-road-office'
  | 'biome-spirits';
```

Do not break existing `FactionId` immediately.

Add V2 as a parallel type, then migrate.

## 21.3 FactionState

```ts
export interface FactionState {
  id: string;
  name: string;
  type: FactionType;
  opinionOfPlayer: FactionOpinion;
  relations: Record<string, FactionRelationState>;
  resources: FactionResources;
  laws: string[];
  rumors: string[];
  activeProblems: string[];
  flags: Record<string, unknown>;
}
```

## 21.4 FactionRelationState

```ts
export type FactionRelationState =
  | 'allied'
  | 'friendly'
  | 'neutral'
  | 'tense'
  | 'skirmishing'
  | 'hostile'
  | 'war'
  | 'truce';
```

## 21.5 Default relation matrix

```text
human-town ↔ ledger-below-market: tense
human-town ↔ bandits: hostile
ledger-below-market ↔ bandits: hostile/opportunistic
human-town ↔ thieves-guild: tense/hidden
ledger-below-market ↔ thieves-guild: neutral/professional
guards ↔ thieves-guild: hostile if exposed
angels ↔ goblin-angels: hostile theology
```

## 21.6 Faction events

Add:

```ts
export interface FactionEvent {
  id: string;
  type:
    | 'argument'
    | 'inspection'
    | 'debt-collection'
    | 'trade-dispute'
    | 'skirmish'
    | 'raid'
    | 'truce'
    | 'betrayal'
    | 'market-shutdown';
  factionIds: string[];
  roomId?: string;
  townId?: string;
  severity: number;
  state: 'brewing' | 'active' | 'resolved' | 'aftermath';
  cause?: string;
  participantActorIds: string[];
}
```

## 21.7 Bandit raids

Add raid state:

```ts
export interface BanditRaid {
  id: string;
  targetFactionId: string;
  targetRoomId: string;
  targetTownId?: string;
  phase: 'warning' | 'active' | 'resolved' | 'aftermath';
  banditActorIds: string[];
  defenderActorIds: string[];
  severity: number;
  startedAtRoomNumber: number;
}
```

V1 can spawn one to three hostile bandits in target room and create town/faction rumors.

---

# 22. Rumor Specification

## 22.1 Rumor

```ts
export interface Rumor {
  id: string;
  subject: string;
  eventId?: string;
  type: RumorType;
  truthLevel: number;
  exaggeration: number;
  sourceActorId?: string;
  knownByActorIds: string[];
  townId?: string;
  factionId?: string;
  tags: string[];
  text: string;
  createdAt: number;
  expiresAt?: number;
}
```

## 22.2 RumorType

```ts
export type RumorType =
  | 'mechanic-hint'
  | 'actor-relationship'
  | 'faction-tension'
  | 'nearby-danger'
  | 'shop-stock'
  | 'quest-lead'
  | 'lore'
  | 'player-reputation'
  | 'false'
  | 'exaggerated'
  | 'romance'
  | 'crime'
  | 'death';
```

## 22.3 Rumor generation from event

```ts
function maybeCreateRumorFromEvent(event: WorldEvent, context: RumorContext): Rumor[]
```

Rules:

```text
severity >= 50 -> likely rumor
public romance/marriage -> rumor
crime witnessed -> rumor
humanoid eaten -> rumor
bandit raid -> rumor
lore bomb public -> rumor
guild discovery -> rumor
```

## 22.4 Rumor text examples by event

### humanoid-eaten + bandit

```text
“The snake ate a bandit.”
“The snake ate a man with a gun and called it medicine.”
“The bandits are calling it a recruitment issue.”
```

### marriage

```text
“They married for love, or inventory access.”
“The shop has a snake discount now. Spiritually, if not legally.”
```

### pickpocket

```text
“Three pockets lighter and one grate happier. That is guild math.”
```

### faction tension

```text
“The goblins paid the gate tax in pennies and theology. The guards are still counting both.”
```

## 22.5 Rumor delivery

Rumors can surface via:

- `Ask Rumor`
- bartender barks
- shopkeeper barks
- town entry summary
- People/Rumors journal
- spouse dialogue
- goblin gossip
- thieves guild

---

# 23. Lore Specification

## 23.1 Lore atoms

Files:

```text
src/actors/actorLore.ts
src/lore/loreRegistry.ts
```

Add later if needed:

```text
src/lore/kingLore.ts
src/lore/goblinReligion.ts
src/lore/loreText.ts
```

## 23.2 LoreAtom

```ts
export interface LoreAtom {
  id: string;
  kind:
    | 'person'
    | 'place'
    | 'event'
    | 'institution'
    | 'religion'
    | 'law'
    | 'war'
    | 'treaty'
    | 'myth';
  name: string;
  shortDescription?: string;
  tags: string[];
}
```

## 23.3 Required lore atoms

### King

```text
king.osric-bellgrave
King Osric Bellgrave III
```

Epithets:

```text
The Bellgrave King
The Road King
The Taxed Saint
The Bloody King of Bellwether Ford
The Mercy-Taker
The King Behind the Gates
The Man Who Counted the Dead Twice
```

### Events

```text
event.bellwether-ford
event.lent-war
event.three-day-reign
event.ash-orchard-rebellion
event.war-seven-receipts
event.road-tax-crusade
event.third-gate-winter
event.candle-mutiny
event.sable-mile
event.treaty-small-ink
event.red-tollhouse-riots
```

### Places

```text
place.bellwether-ford
place.saint-orras-bridge
place.nine-roads
place.candlewatch-keep
place.marrow-orchard
place.red-tollhouse
place.low-hymn-valley
place.salt-gate
place.west-of-west
place.little-mourning
```

### Institutions

```text
institution.crown-road-office
institution.bell-saint-church
institution.ledger-below
institution.black-grate-guild
institution.mercy-tax-court
institution.kings-third-kitchen
institution.order-measured-roads
institution.candle-registry
```

## 23.4 Lore accounts

A lore topic can have multiple accounts.

```ts
export interface LoreAccount {
  id: string;
  loreId: string;
  sourceKind: 'official' | 'guard' | 'goblin' | 'bandit' | 'romance' | 'rumor' | 'religious' | 'personal';
  text: string;
  reliability?: 'unknown' | 'official' | 'suspect' | 'personal' | 'false';
}
```

## 23.5 Lore reveal

When actor reveals lore:

- Add known lore record.
- Add `lore-bomb-revealed` event if major.
- Add to actor known facts.
- Possibly create rumor if public.
- Possibly update relationship trust.

---

# 24. King Myth Specification

## 24.1 Goal

The King should never appear but should feel present everywhere.

## 24.2 King reference line requirements

Add king lines for:

```text
guards
shopkeepers
goblins
thieves
bandits
cooks
hunters
spouses
royal-secret actors
priests
undertakers
wanderers
```

## 24.3 King opinion generation

Actors get `kingOpinion`.

Generated from:

```text
faction
role
soul wound
lore profile
town mood
personality
```

Examples:

```text
guard + lawful -> loyal/conflicted
bandit -> bitter
goblin -> mocking/accounting
shopkeeper + debt-ruined -> bitter/practical
royal secret -> afraid/secretlyRoyal
```

## 24.4 King line examples

Guard:

```text
“Roads, gates, taxes, guns. That is civilization. Bellgrave did not invent it. He made it punctual.”
```

Goblin:

```text
“Bellgrave? Big crown, small ledger discipline. Kingdom owes itself and calls that monarchy.”
```

Bandit:

```text
“We were not bandits until the King decided hunger needed a license.”
```

Spouse:

```text
“My mother said the King was a necessary monster. My father said monsters love that sentence.”
```

---

# 25. Goblin Religion Specification

## 25.1 Core religion

```text
The Ledger Below
```

## 25.2 Required terms

```text
Final Audit
Small Ink
Debt-body
Receipt prayer
Interest prophecy
Forgiveness bankruptcy
Soul collateral
Competitive scream
```

## 25.3 Goblin religious facts

```text
All souls are debts.
Death is the final audit.
Angels are rival accountants.
A promise written twice becomes holy.
Interest is prophecy.
Forgiveness is bankruptcy with candles.
Love is a verbal contract with teeth.
A debt remembered kindly becomes ancestry.
```

## 25.4 Gameplay hooks

The Ledger Below can connect to:

- goblin angel revival
- ward scrolls
- debt contracts
- black market
- card debts
- marriage contracts
- forgiveness quests
- debt relief rewards
- goblin faction standing
- goblin spouse dialogue

## 25.5 Lines

```text
“The Ledger Below does not judge. It itemizes.”
```

```text
“Your soul has been refinanced at a competitive scream.”
```

```text
“Love is a verbal contract with teeth. Very romantic. Very dangerous.”
```

---

# 26. Save and Migration Specification

## 26.1 V1 storage

For first implementation, store actor data inside existing flags:

```text
flags['actors.save']
flags['events.save']
flags['rumors.save']
flags['factions.v2.save']
flags['journal.knownActors']
flags['journal.knownLore']
```

This avoids changing `GameSaveData` immediately.

## 26.2 V2 storage

Later extend `GameSaveData`:

```ts
actors?: ActorSaveData;
worldEvents?: WorldEventSaveData;
rumors?: RumorSaveData;
factionsV2?: FactionSaveData;
journal?: ActorJournalSaveData;
```

Increment version:

```text
1.0.0 -> 1.1.0 or 2.0.0
```

Because current `SaveManager` rejects version mismatches, version migrations need care.

## 26.3 Migration plan

Add migration helper:

```ts
export function migrateSaveData(data: unknown): GameSaveData | null
```

Instead of rejecting all version mismatches, support known older versions.

## 26.4 Save size limits

Actor memory can grow large.

Apply caps:

```text
max actors saved: maybe 500 initially
max events saved: 200 recent + permanent key events
max rumors saved: 100
max memories per actor by thickness
only save promoted or persistent actors long-term
thin ephemeral animals/enemies can be dropped unless promoted
```

## 26.5 Persistent actors

Always save:

```text
town residents
shopkeepers
guards
relationship actors
spouses/exes
guild contacts
promoted animals
promoted enemies
quest actors
wanderer counterparts if persistent
actors with known facts
actors with major memories
dead notable actors
```

Do not save every random rabbit unless notable.

---

# 27. Integration with SnakeGame

## 27.1 Add ActorSystem field

In `SnakeGame`:

```ts
private readonly actors: ActorSystem;
```

Constructor should initialize after systems needed for dependencies.

## 27.2 Expose API

```ts
getActorSystem(): ActorSystem;
getActorsInCurrentRoom(): Actor[];
getActorInteractionMenu(actorId: string): ActorInteractionMenuModel;
interactWithActor(actorId: string, optionId: ActorInteractionId): ActorInteractionResult;
emitWorldEvent(input: CreateWorldEventInput): WorldEvent;
```

## 27.3 Current room actor sync

Whenever `getRoom(roomId)` applies town runtime and quest actors:

- ensure actors for town residents in room
- ensure actors for quest givers
- ensure actors for animals/enemies after spawning
- update actor currentRoomId

## 27.4 Step integration

On each game step:

1. Existing snake movement.
2. Existing animal/enemy step.
3. ActorSystem consumes generated event hooks.
4. ActorSystem updates active-room actors.
5. Actor UI state computed for scene.

Do not put heavy simulation in every tick for offscreen actors.

## 27.5 Existing flags bridge

Existing recent events:

```text
recent.deathReason
recent.animalHunted
```

should be mirrored to WorldEvents.

During transition:

- Set existing flags for compatibility.
- Emit new events for actor systems.

---

# 28. Integration with SnakeScene

## 28.1 UI responsibilities

`SnakeScene` should render:

- actor indicators
- nameplates
- actor interaction menus
- actor dialogue popups
- actor journal eventually

## 28.2 Actor interaction menu

Build new class:

```text
src/ui/actorInteractionMenu.ts
```

It should be similar to `QuestPopup`, but support:

- dynamic height
- scrolling
- many options
- header portrait
- actor bark
- option descriptions
- disabled options
- keyboard/controller support
- close/leave action

## 28.3 Rendering indicators

Add renderer:

```text
src/ui/actorIndicatorRenderer.ts
```

It should render above actor sprites/tiles.

V1 can use text glyphs above tile positions.

Later use pixel icons.

## 28.4 Nameplates

Nameplate appears when snake is close or targeting actor.

V1:

```text
small text above actor
```

Later:

```text
styled pixel panel
```

## 28.5 Modal conflicts

Actor menu should not open if:

- quest popup active
- pause menu active
- death cutscene active
- card game active
- other modal active

Existing modal checks should be reused.

---

# 29. Interaction Handler Specs

## 29.1 Talk

`Talk` should:

- select actor voice line
- show dialogue popup/menu header
- mark actor known
- maybe reveal focus fact
- maybe emit `actor-talked`

## 29.2 Ask Rumor

Should:

- find rumor known by actor or generate role rumor
- show rumor dialogue
- add rumor to journal
- maybe reveal actor social link

## 29.3 Shop

Should:

- open existing shop UI
- route through actor shopkeeper if present
- apply actor/faction price modifiers later
- emit `shop-purchase` events on purchase

## 29.4 Gift

Should:

- use relationship controller if romance-capable
- emit `npc-gifted`
- actor remembers gift
- reveal preference/relationship fact

## 29.5 Romance

Should:

- ensure relationship candidate
- show relationship choices
- use existing relationship controller
- emit relationship events
- update actor opinion/focus

## 29.6 Pickpocket

Should:

- check thieves guild state
- check actor target validity
- roll success and witness
- emit pickpocket event
- increment guild initiation if appropriate
- apply town crime if caught
- add item/score reward if successful

## 29.7 Attack

Should:

- if non-hostile actor, mark hostile and emit `npc-attacked`
- apply town crime if witnessed and actor is town resident
- spawn/activate hostile combat actor if needed
- if already enemy, use existing combat

## 29.8 Eat

Should:

- validate hostile humanoid
- kill actor/enemy
- heal heart
- emit event
- update factions/town/relationships/rumors

## 29.9 Ask About Actor

Should:

- require known social link
- produce line based on relationship between speaker and target
- reveal or deepen known social graph

## 29.10 Ask About King

Should:

- require lore eligibility or actor role
- produce king line based on actor lore profile
- maybe reveal lore account

---

# 30. Test Specification

## 30.1 Unit tests

Add tests for pure systems:

```text
actorFactory
actorRegistry
actorMemory
actorVoice selection
actorInteractions option generation
worldEventLog
perception V1
rumor generation
faction relation updates
```

## 30.2 Actor factory tests

Cases:

- town shopkeeper becomes shopkeeper actor
- guard becomes guard actor with combat profile
- thief becomes criminal actor
- animal becomes animal actor
- hostile NPC enemy becomes humanoid hostile actor
- relationship state becomes romance actor

## 30.3 Voice tests

Cases:

- low health shopkeeper line beats generic
- recent death memory line beats generic
- spouse worried line selected with relationship stage
- lore bomb not selected below focus threshold
- hostile actor combat bark selected in combat facts

## 30.4 Interaction menu tests

Cases:

- rabbit gets tiny menu
- shopkeeper gets shop menu
- guard at gate gets pay gate tax
- non-guild player sees pickpocket locked or hidden
- guild active player sees pickpocket
- hostile humanoid sees Eat option
- non-hostile humanoid has Eat disabled or hidden
- spouse gets kiss/family/divorce options

## 30.5 Event/memory tests

Cases:

- pickpocket emits event
- same-room actor witnesses event
- neighbor actor hears loud event
- actor memory intensity higher for direct witness
- personal relationship memory persists
- low-intensity memory evicted first

## 30.6 Town tests

Cases:

- town crime emits event and updates wanted
- hostile town resident spawns enemy with same actor ID
- resident death updates runtime
- guild initiation pickpockets emit events
- town rumors generated from humanoid eating

## 30.7 Animal tests

Cases:

- spawned animal gets actor ID
- hunted animal emits event
- bait attracts predator
- tamed animal becomes pet actor
- promoted animal persists

## 30.8 Enemy/combat tests

Cases:

- hostile bandit can be eaten
- non-hostile civilian cannot be eaten
- eating hostile heals 1 heart
- guard eating creates severe event
- slash triggers when adjacent
- gun behavior still works

## 30.9 Save/load tests

Cases:

- actor save round-trips
- known actor facts persist
- actor memories persist with caps
- town resident actor state persists
- old save without actor data loads with defaults
- version migration does not wipe existing flags

---

# 31. Implementation PR Plan

## PR 1: Actor skeleton

Files:

```text
src/actors/actorTypes.ts
src/actors/actorRegistry.ts
src/actors/actorFactory.ts
src/actors/actorSystem.ts
```

Deliver:

- core types
- registry
- factory for town residents, animals, enemies, relationships
- no big behavior changes

## PR 2: Actor IDs in existing entities

Modify:

```text
src/world/town.ts
src/world/townRuntime.ts
src/animals/types.ts
src/systems/enemies.ts
src/relationships/relationshipTypes.ts
```

Deliver:

- actor ID optional fields
- stable actor ID generation
- no gameplay changes yet

## PR 3: World event log

Files:

```text
src/events/worldEventTypes.ts
src/events/worldEventLog.ts
src/events/worldEventBus.ts
```

Modify:

```text
SnakeGame hunting/shop/guild/town/death/relationship paths
```

Deliver:

- event creation
- recent events bridge
- debug view maybe

## PR 4: Witness and memory

Files:

```text
src/actors/actorPerception.ts
src/actors/actorMemory.ts
```

Deliver:

- same-room witness
- neighbor hearing for loud events
- actor memory storage
- memory caps

## PR 5: Actor voice bridge

Files:

```text
src/actors/actorVoice.ts
src/actors/voicePacks/*
```

Modify:

```text
src/npcs/npcVoice.ts
SnakeGame/SnakeScene NPC dialogue paths
```

Deliver:

- actor-aware line selection
- memory-aware barks
- fallback to existing voice

## PR 6: Actor interaction menu

Files:

```text
src/actors/actorInteractions.ts
src/ui/actorInteractionMenu.ts
src/ui/actorIndicatorRenderer.ts
```

Deliver:

- dynamic menus
- indicators
- basic talk/shop/romance/attack/leave options

## PR 7: Pickpocket/guild integration

Modify:

```text
SnakeGame guild initiation
town crime
actor events
interaction menu
```

Deliver:

- pickpocket action
- witness/caught logic
- guild initiation progress
- actor memories/rumors

## PR 8: Humanoid combat/eating

Modify:

```text
EnemyManager
SnakeGame combat interaction
ActorSystem
```

Deliver:

- hostile humanoid eating
- heal 1 heart
- slash attack
- actor death events
- town/faction consequences

## PR 9: Social graph/focus

Files:

```text
src/actors/actorRelationships.ts
src/actors/actorFocus.ts
```

Deliver:

- social links
- Ask About Actor
- focus thresholds
- known facts

## PR 10: Lore/soul

Files:

```text
src/actors/actorSoul.ts
src/actors/actorLore.ts
src/lore/loreRegistry.ts
```

Deliver:

- wounds/insecurities/secrets
- King lore
- Ledger Below lore
- lore bomb lines

## PR 11: Factions and raids

Files:

```text
src/factions/factionRelations.ts
src/factions/factionEvents.ts
src/factions/factionSimulation.ts
```

Deliver:

- faction relation matrix
- human/goblin tense truce
- bandit raid V1
- aftermath rumors

## PR 12: Journal

Files:

```text
src/ui/actorJournal.ts
```

Deliver:

- People tab
- Rumors tab
- Lore tab
- Factions tab, if practical

---

# 32. Performance Rules

## 32.1 Do not simulate all actors every tick

Simulation layers:

```text
current room: full
neighbor rooms: light
town/region: abstract
history: event records
```

## 32.2 Actor update frequency

Suggested:

```text
active actors: each game step or actor clock
neighbor actors: every 5-10 steps
town simulation: on room enter or every N rooms
rumor spread: on room enter / town enter
memory decay: on event add or room change
```

## 32.3 Avoid save bloat

Caps:

```text
events: 200 recent + permanent
rumors: 100
memories: capped by thickness
actors: persistent/promoted only long-term
```

## 32.4 Avoid UI clutter

Max overhead icons:

```text
2 default
3 close range
hostile always overrides
```

## 32.5 Avoid dialogue spam

Use cooldown:

```text
actor.lastLineIds
actor.lastBarkRoomNumber
global recent line IDs
```

---

# 33. Debugging and Diagnostics

Add debug tools.

## 33.1 Actor debug HUD

Optional dev key shows:

```text
actors in room
actor IDs
roles
factions
hostility
memory count
current mood summary
event count
rumor count
```

## 33.2 Actor inspect

Debug interaction:

```text
Inspect Actor
```

Shows:

```text
actor raw ID
role/species
mood
opinion
memories
relationships
soul/lore flags
combat profile
```

## 33.3 Event log debug

Show last 20 world events.

Fields:

```text
type
room
source
targets
witnesses
severity
tags
```

## 33.4 Performance diagnostic

Extend existing performance HUD with:

```text
active actors
neighbor actors
event count
rumor count
actor update ms
voice selection ms
indicator count
```

---

# 34. Content Minimums for First Big Pass

## 34.1 Names

Add at least:

```text
75 human first names
50 human surnames
50 goblin names
40 bandit names
25 titles/epithets
15 wandering counterpart names
```

## 34.2 Voice lines

Minimum new lines:

```text
50 generic actor barks
40 shopkeeper lines
40 guard lines
50 goblin lines
40 bandit/combat lines
60 romance stage lines
30 spouse worry/conflict lines
30 pickpocket/witness lines
30 humanoid eating witness lines
50 king/lore lines
30 Ledger Below lines
30 faction tension lines
30 rumor templates
```

Total target first content pass:

```text
~500 actor voice/template entries
```

Use templates to multiply variation.

## 34.3 Lore content

Add:

```text
1 central king
8 king epithets
12 events
12 places
8 institutions
8 historical figures
15 goblin religion terms/lines
```

## 34.4 Soul content

Add pools:

```text
20 wounds
20 insecurities
20 longings
20 contradictions
20 secrets
```

---

# 35. Acceptance Criteria for Full Spec

The actor simulation is considered meaningfully implemented when:

## 35.1 Actor identity

- Town residents, shopkeepers, guards, thieves, animals, enemies, relationship candidates, and wanderers can have actor IDs.
- Actors have names, roles, factions, mood, and memory.
- Actor state persists when appropriate.

## 35.2 UI readability

- Player can see who has quests, rumors, shops, romance, hostility, and debt/guild interactions.
- Menus resize based on options.
- Nameplates and barks communicate actor state.
- Hostile/wounded actors are readable.

## 35.3 Memory

- NPCs comment on events they witnessed or heard about.
- Memories affect romance, shops, guards, and rumors.
- Important memories persist.
- Low-level memories decay.

## 35.4 Romance

- Most non-hostile humanoids can be romanced.
- Romance uses existing relationship system.
- Relationship depth reveals actor soul/lore.
- Marriage creates social/faction consequences.

## 35.5 Combat

- Humanoids have guns.
- Humanoids can slash adjacent snake.
- Hostile humanoids can be eaten for heart heal.
- Non-hostile humanoids cannot be eaten.
- Eating/killing triggers witnesses, rumors, and faction consequences.

## 35.6 Factions

- Humans and goblins can have tense truce.
- Bandits can raid.
- Faction events create world consequences.
- Actors from factions can speak to each other.

## 35.7 Lore

- The King is referenced by many roles.
- Goblin religion appears in lines and systems.
- NPCs can reveal specific lore bombs.
- Lore accounts can contradict each other.

## 35.8 Repository health

- Existing save games do not hard-crash.
- Existing quests, relationship UI, shops, animals, enemies, and towns still function.
- Actor system is additive and phased.
- Tests cover pure actor/event/voice/menu logic.

---

# 36. First Thin Vertical Slice

The first playable vertical slice should be:

## Scenario

In a physical human town:

- shopkeeper, guard, resident, thief contact are actors
- player can talk to them
- player can see icons
- player can pickpocket after guild initiation starts
- pickpocket creates event
- nearby actor remembers
- guard reacts if witness
- shopkeeper line changes after witnessing
- rumor appears in town
- romance option creates relationship actor
- low health player gets concerned line

## Systems touched

```text
Town residents
ActorRegistry
WorldEventLog
ActorMemory
ActorVoice
ActorInteractionMenu
Town crime
RelationshipController
Guild initiation
```

## Why this slice

It proves:

```text
actor identity
menus
witnessing
memory
voice
crime
guild
romance
town consequence
```

Without requiring animals, raids, lore bombs, or full combat overhaul yet.

---

# 37. Second Vertical Slice

## Scenario

Outside town:

- wolf/rabbit actors spawn
- player drops bait
- wolf moves toward bait
- player hunts rabbit
- event emitted
- hunter/shopkeeper in nearby town later comments
- animal drops enter inventory
- cooked meat can be gifted/used
- hunting rumor appears

## Proves

```text
animal actor integration
bait loop
hunting memory
town rumor bridge
food/shop/romance intersections
```

---

# 38. Third Vertical Slice

## Scenario

Bandits raid goblin market.

- raid warning rumor appears
- goblin actors and bandit actors spawn
- human guard nearby does not instantly attack goblins
- bandits attack goblins
- player can help/eat bandits
- hostile bandit eating heals heart
- goblin thanks through store credit
- human guard comments unofficially
- rumor spreads
- faction relation shifts

## Proves

```text
faction collision
humanoid combat
hostile eating
rumors
faction aftermath
cross-faction dialogue
```

---

# 39. Final Notes

This system is intentionally huge, but it should be built in small pieces.

The heart of the system is not pathfinding or massive AI.

The heart is:

```text
The game remembers specific things.
Actors are allowed to care.
The UI shows why they matter.
The world talks back.
```

The first version can be small and still magical.

A shopkeeper saying:

```text
“You died west of town and then bought ramen. I am trying not to find that charming.”
```

is worth more than a hundred invisible simulation ticks.

Build that first.

Then let the whole kingdom get weird.
