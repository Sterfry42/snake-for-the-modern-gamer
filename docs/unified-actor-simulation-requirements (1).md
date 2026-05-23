# Snake for the Modern Gamer — Unified Actor Simulation Overhaul

## 1. Purpose

This document outlines a large, staged requirements and design plan for turning **Snake for the Modern Gamer** into a more systemic, reactive, emotionally alive game.

The goal is to build on the existing repository rather than replace it. The repository already contains many powerful systems:

- animals
- hunting and drops
- items, food, charms, and materials
- equipment
- skills
- shops
- towns
- black markets
- guilds
- romance
- card games
- minimap
- NPC barks
- portraits
- performance diagnostics
- biome hazards
- factions in early form
- quests
- death/revival systems

The next major cohesion layer should be a unified **Actor Simulation System**.

The goal is not merely “more NPC dialogue.” The goal is to make every creature, villager, shopkeeper, bandit, goblin, guard, romance candidate, animal, enemy, and wandering freak part of one simulated social world.

Core target:

> The game should treat procedural NPC feelings as real.

That is the central joke and the central sincerity. The world is ridiculous. The feelings are not.

---

## 2. Core Fantasy

The player is a snake moving through a living, absurdist survival-RPG kingdom full of people who:

- have guns
- have names
- have jobs
- have families
- have factions
- have grudges
- have crushes
- have debts
- have religious beliefs
- have secrets
- have tragic backstories
- have rumors
- have opinions about the King
- can be married
- can be robbed
- can be attacked
- can become hostile
- can witness crimes
- can remember what the player did
- can talk about the player to other people
- can fall in love with the player and mean it
- can die and leave emotional consequences behind

The game loop should eventually feel like:

```text
Enter town.
Read the room.
Talk to strange armed people.
Learn rumors, jobs, debts, romances, faction tensions, and lore.
Buy supplies.
Flirt with someone.
Pickpocket someone else.
Leave town.
Fight, hunt, eat, survive, raid, rescue, betray, or flee.
Return.
The town remembers.
```

---

## 3. Design Pillars

### 3.1 One Actor System

All living beings should be represented by a shared Actor model:

- villagers
- shopkeepers
- guards
- goblins
- bandits
- thieves
- romance candidates
- animals
- enemies
- bosses
- wandering NPCs
- pets
- followers
- summons
- angels
- goblin angels

This does not mean every actor has the same complexity. A rabbit can be a thin actor. A spouse can be a thick actor. But they should live under the same simulation roof.

### 3.2 Readability First

Systemic simulation must be readable.

If actors have quests, hostility, romance, faction allegiance, gossip, family, shop access, pickpocket status, combat danger, and memory, the UI needs to make that legible.

Required readability tools:

- overhead icons
- nameplates
- dynamic interaction menus
- mood/state summaries
- faction indicators
- rumor notifications
- relationship/focus cues
- hostile/suspicious markers
- witness reaction bubbles
- People/Rumor/Lore journal eventually

### 3.3 Memory Creates Life

The most important part of the simulation is memory.

Actors should not be omniscient, but they should remember what they see, hear, learn, and care about.

NPCs should react to:

- being pickpocketed
- witnessing pickpocketing
- seeing a humanoid eaten
- hearing gunshots
- seeing the player low-health
- seeing the player revive
- seeing the player flirt with someone
- seeing the player marry someone
- seeing the player kill a bandit
- seeing the player kill a guard
- seeing the player cook meat
- hearing rumors about a raid
- knowing the player owes debt
- knowing the player saved their sibling
- knowing the player ate their cousin
- knowing the player keeps coming back from death

### 3.4 Emotional Seriousness

Romance and personal drama should become sincere quickly.

The parody is not that NPCs have fake feelings. The parody is that a procedurally generated shopkeeper in a snake game can reveal a devastating insecurity and the game means it.

Example target line:

```text
“You died. Then you came back and asked if the ramen was still warm. I hated how relieved I was.”
```

### 3.5 Specific Lore Without Heavy Canon Locking

NPCs should drop specific lore bombs:

- names of kings
- names of battles
- names of massacres
- goblin theology
- royal scandals
- old treaties
- gate laws
- road taxes
- families
- dead siblings
- hidden heirs
- old wars

These should make the world feel huge without requiring the game to show all of it.

The lore can be contradictory. A guard, goblin, bandit, and royal bastard can all describe the same historical event differently.

---

## 4. Existing Systems To Build Upon

This overhaul should not be a blank rewrite.

It should build upon:

### 4.1 Existing NPC and dialogue systems

The repository already has basic NPC barks, quest dialogue, choice popups, and portrait definitions. These should become actor-driven.

### 4.2 Existing relationship systems

Dating and romance already exist. The overhaul should expand them:

- more lines
- more personalities
- more actors eligible for romance
- deeper emotional progression
- actor-to-actor relationship consequences
- marriage consequences
- focus-based secrets and confessions

### 4.3 Existing animals and hunting

Animals already have definitions, behaviors, drops, and hunting hooks. They should become animal actors with memory, fear, hunger, bait response, predator/prey logic, and taming potential.

### 4.4 Existing combat/enemies

Current enemies should become hostile actors. Bandits can become the basic one-heart humanoid enemy archetype.

### 4.5 Existing shops

Shops already sell supplies, equipment, cosmetics, cards, and black-market goods. Shopkeepers should become actors with personalities, memories, regional reactions, faction ties, and romance eligibility.

### 4.6 Existing guild and town systems

The thieves guild, black market, gate taxes, guild initiation, and town districts should be folded into faction/actor simulation.

### 4.7 Existing item and charm systems

Food, healing, charms, bait, ofuda, meat, honey, and supplies should become actor-readable. Actors can comment on items, ask for them, sell them, steal them, gift them, or use them.

### 4.8 Existing minimap and UI

The minimap and performance UI are already strong examples of readability. Actor state should eventually be visible on or near the world/minimap when relevant.

---

## 5. Core Actor Model

### 5.1 Actor shape

Suggested TypeScript shape:

```ts
export interface Actor {
  id: string;
  kind: ActorKind;
  role: ActorRole;
  displayName: string;

  species?: ActorSpecies;
  factionId?: string;
  townId?: string;

  currentRoomId?: string;
  homeRoomId?: string;

  thickness: ActorThickness;

  personality: ActorPersonalityTag[];
  mood: ActorMood;
  needs: ActorNeeds;
  opinions: Record<string, ActorOpinion>;

  relationships: ActorRelationshipLink[];
  memory: ActorMemory[];

  health?: ActorHealth;
  combat?: ActorCombatProfile;

  inventory?: Record<string, number>;

  portraitId?: string;
  voiceProfileId?: string;
  brainId: ActorBrainId;

  soul?: ActorSoulProfile;
  loreProfile?: ActorLoreProfile;

  knownToPlayer?: boolean;
  focus?: number;

  flags: Record<string, unknown>;
}
```

### 5.2 Actor kinds

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

### 5.3 Actor roles

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
  | 'wanderingCounterpart';
```

### 5.4 Actor thickness

Actors should have simulation thickness.

```ts
export type ActorThickness = 'thin' | 'medium' | 'thick';
```

#### Thin actors

Examples:

- rabbit
- fish
- basic bird
- simple temporary summon

Have:

- id
- role
- current room
- faction
- simple behavior
- minimal memory

#### Medium actors

Examples:

- villager
- guard
- shopkeeper
- wolf
- bandit
- thief

Have:

- name
- personality
- faction
- mood
- memory
- voice
- behavior brain

#### Thick actors

Examples:

- romance candidate
- spouse
- major shopkeeper
- special guard
- guild contact
- wandering Ryan/Lindsey
- named pet
- named enemy
- actor the player focuses on

Have:

- soul profile
- lore profile
- deeper memory
- relationships
- secrets
- confessions
- tragic backstories
- specific lore bombs

### 5.5 Actor promotion

Thin or medium actors can become thick.

Promotion triggers:

- repeatedly encountered
- romanced
- spared
- wounded but survives
- saves the player
- harms the player
- witnesses a major event
- becomes a pet
- becomes rival/ex/spouse/friend
- survives multiple dangerous situations
- becomes subject of rumors

Examples:

```text
Rabbit escapes twice → “The Witness Rabbit”
Wolf survives three fights → “Old Bitey”
Bandit surrenders and is spared → named outlaw
Shopkeeper visited repeatedly → gains backstory
Guard opens gate after major event → becomes notable
```

---

## 6. Actor Mood, Needs, and Opinions

### 6.1 Mood

Actors should have moods that affect dialogue and behavior.

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

Mood values range from 0 to 100.

Mood changes based on events.

Examples:

- player eats hostile bandit → fear + respect
- player gives gift → affection + trust
- player pickpockets actor → anger + resentment
- player saves sibling → trust + affection
- raid occurs → stress + fear
- player repeatedly returns low-health → affection + fear for close NPC
- player ignores spouse → resentment
- player buys lots of healing → shopkeeper greed/concern
- player owes goblin debt → goblin greed/interest

### 6.2 Needs

Actors should have needs that generate goals.

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

Needs can drive:

- shop restocking
- quests
- schedules
- rumors
- combat/flee decisions
- relationship scenes
- faction events
- requests for items
- moving to safer rooms

### 6.3 Opinions

Actors should have nuanced opinions of the player and other actors.

```ts
export interface ActorOpinion {
  trust: number;
  fear: number;
  respect: number;
  affection: number;
  attraction: number;
  resentment: number;
  debt: number;
}
```

An actor can:

- fear the player but love them
- respect the player but dislike them
- resent the player but rely on them
- be attracted to danger
- hate the player but still sell to them
- forgive a crime because of family ties
- report a crime despite affection

This nuance should feed menus, voice, shop prices, romance, faction reaction, and combat.

---

## 7. Personality System

### 7.1 Personality tags

Actors should have personality tags.

```text
practical
cowardly
greedy
kind
religious
romantic
hungry
paranoid
bureaucratic
violent
poetic
deadpan
sharp
regal
goblin
melancholy
brave
nosy
petty
lawful
criminal
sentimental
lonely
vengeful
idealistic
cynical
softhearted
statusHungry
```

### 7.2 Personality effects

Personality affects:

- voice line selection
- romance preference
- gift reaction
- shop prices
- fear response
- crime response
- faction loyalty
- willingness to fight
- willingness to flee
- gossip style
- confession style
- insecurity reveal
- lore perspective
- reaction to hostile humanoid eating
- reaction to death/revival
- reaction to goblins/humans/bandits

### 7.3 Examples

#### Cowardly guard

- likely to flee raids
- may open gate if player is terrifying
- may report player later
- line: “I am choosing public safety, specifically mine.”

#### Greedy shopkeeper

- raises prices when player is desperate
- loves black market opportunities
- line: “Your emergency has excellent margins.”

#### Kind cook

- gives discounts when player is wounded
- offers food-based help
- line: “Do not make me regret being decent in a market economy.”

#### Sharp goblin

- respects clever theft
- frames romance as debt/contract
- line: “My ledger has a column for bad investments. You were there. I moved you.”

---

## 8. Actor Souls: Tragedy, Insecurity, and Secrets

### 8.1 Purpose

To create emotional depth, thick actors should have optional `ActorSoulProfile`.

```ts
export interface ActorSoulProfile {
  wound?: ActorWound;
  insecurity?: ActorInsecurity;
  longing?: ActorLonging;
  contradiction?: ActorContradiction;
  secret?: ActorSecret;
  relationshipFear?: string;
  confessionStyle?: string;
}
```

### 8.2 Wounds

Possible wounds:

```text
lost-family
war-survivor
debt-ruined
abandoned
exiled
failed-hero
royal-bastard
religious-disillusionment
betrayed-by-lover
widowed
orphaned
former-bandit
former-guard
sibling-lost-to-war
parent-lost-to-tax
kingdom-betrayal
goblin-debt-trauma
```

### 8.3 Insecurities

Possible insecurities:

```text
cowardice
being ordinary
being replaceable
being used
being unlovable
being monstrous
being poor
being complicit
being forgotten
not brave enough
not worthy of love
being only useful
being abandoned
being seen too clearly
```

### 8.4 Longings

Possible longings:

```text
safety
recognition
revenge
home
forgiveness
adventure
ordinary love
escape from town
to be chosen
to stop running
to matter
to be believed
to be remembered
to be free of debt
to be more than a job
```

### 8.5 Contradictions

Examples:

```text
shopkeeper who hates capitalism
guard who hates the king
goblin who believes in forgiveness
bandit who wants domestic peace
cook who hates eating
hunter who loves animals
priest who lost faith
thief who needs rules
romantic who fears intimacy
coward who keeps saving people
```

### 8.6 Secrets

Possible secrets:

```text
is-royal-blood
is-king-bastard
was-at-battle
killed-someone
betrayed-family
owes-goblin-debt
former-bandit
former-guard
secret-thief
secret-priest
lost-name
false-name
angel-touched
goblin-convert
hiding-from-crown
hiding-from-guild
```

### 8.7 Reveal pacing

Soul details reveal through focus and relationship.

```text
Focus 0: no reveal
Focus 1: personality hint
Focus 2: opinion/fear hint
Focus 3: relationship/family clue
Focus 4: insecurity
Focus 5: wound
Focus 6: secret
Focus 7: lore bomb or confession scene
```

---

## 9. Lore Bomb System

### 9.1 Purpose

NPCs should occasionally reveal huge, very specific lore.

This lore should make the world feel large without requiring huge new levels, regions, or quests.

### 9.2 Lore weight

Voice lines can have lore weight.

```ts
export type LoreWeight = 0 | 1 | 2 | 3;
```

- `0`: generic bark
- `1`: local flavor
- `2`: specific history
- `3`: major secret / lore bomb

Lore weight 3 should be rare and usually earned.

### 9.3 Named lore atoms

The system should define pools of names, events, places, and institutions.

#### Central King

Recommended recurring absent monarch:

```text
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

He should never show up. He should be referenced constantly.

#### Wars and events

```text
The Bellwether Ford Massacre
The Lent War
The Three-Day Reign
The Ash Orchard Rebellion
The War of Seven Receipts
The Road-Tax Crusade
The Third Gate Winter
The Candle Mutiny
The Battle of Sable Mile
The Treaty of Small Ink
The Red Tollhouse Riots
The Salt Gate Retreat
```

#### Places

```text
Bellwether Ford
Saint Orra’s Bridge
The Nine Roads
Candlewatch Keep
Marrow Orchard
The Red Tollhouse
Low Hymn Valley
The Salt Gate
West-of-West
The Province of Little Mourning
Crown Road Office
The King’s Third Kitchen
```

#### Institutions

```text
The Crown Road Office
The Bell Saint Church
The Ledger Below
The Black Grate Guild
The Mercy Tax Court
The King’s Third Kitchen
The Order of Measured Roads
The Candle Registry
The Royal Road Survey
```

#### Historical figures

```text
Queen Maerla the Unmourned
Saint Orra of the Broken Bell
General Cask Vey
The Goblin Prophet Nim Receipta
Lord Halven of Red Toll
Captain Ryan Marrow
Lindsey of the West Road
The Soup Widow
High Auditor Bratch
The Last Bell Clerk
```

### 9.4 Contradictory lore

Lore should be perspectival.

The same event can have contradictory accounts.

Example: Bellwether Ford.

Guard:

```text
“Bellwether Ford was a necessary retreat.”
```

Bandit:

```text
“Bellwether Ford was where the King learned dead men do not collect wages.”
```

Goblin:

```text
“Bellwether Ford? Human debt ritual. Very wet. Poor accounting.”
```

Royal bastard:

```text
“My father called it mercy because he left before the screaming started.”
```

The game does not need to resolve the truth.

### 9.5 Lore bomb examples

Royal blood:

```text
“My name is not Lindsey Vell. It is Lindsey Bellgrave. Third child of Osric, second survivor of Bellwether Ford, and first coward to run before the crown could call it strategy.”
```

War survivor:

```text
“I was at Sable Mile when the King ordered the lanterns snuffed. Do you know what an army sounds like in the dark? It sounds like everyone becoming honest at once.”
```

Goblin religion:

```text
“The Ledger Below teaches that every promise has a body. That is why goblins write small. We are trying not to create giants.”
```

Guard disillusionment:

```text
“I joined the gate watch because my father said the King’s roads protected people. Then I learned roads protect whatever owns the toll.”
```

Shopkeeper grief:

```text
“My wife was not killed by bandits. She was killed by the three minutes the guard spent deciding whose jurisdiction her blood was in.”
```

Bandit sympathy:

```text
“I was a farmer before the King measured my field into a road. Then a ditch. Then an apology. Then nothing.”
```

Romance vulnerability:

```text
“I keep wanting you to promise you’ll stay. I know that is cruel. Staying is not what you are shaped for.”
```

---

## 10. The Absent King System

### 10.1 Purpose

The King should be a mythic absence.

The player should feel his influence everywhere:

- road taxes
- guards
- gates
- war stories
- bandits
- royal bastards
- goblin treaties
- old massacres
- shopkeepers’ grief
- faction conflict
- contradictory rumors

### 10.2 Faction views

Guard:

```text
“Roads, gates, taxes, guns. That is civilization. Bellgrave did not invent it. He made it punctual.”
```

Goblin:

```text
“Bellgrave? Big crown, small ledger discipline. Kingdom owes itself and calls that monarchy.”
```

Thief:

```text
“The King owns every locked door he can afford to name. We specialize in unnamed doors.”
```

Cook:

```text
“The King’s army ate here once. Paid in medals. Medals do not boil.”
```

Bandit:

```text
“We were not bandits until the King decided hunger needed a license.”
```

Romance NPC:

```text
“My mother said the King was a necessary monster. My father said monsters love that sentence.”
```

### 10.3 Rumor variants

NPCs can claim:

```text
The King is dead.
The King cannot die until the roads do.
The King is three men and a seal.
The King is a boy in Candlewatch Keep.
The King is whoever signs the tax receipt.
The King is hiding among his illegitimate children.
The King has not slept since Bellwether Ford.
```

These do not need to be confirmed.

---

## 11. Goblin Religion

### 11.1 The Ledger Below

Goblins should have a specific religion:

```text
The Ledger Below
```

Beliefs:

```text
All souls are debts.
Death is the final audit.
Angels are rival accountants.
A promise written twice becomes holy.
Interest is a form of prophecy.
Forgiveness is bankruptcy with candles.
Love is a verbal contract with teeth.
A debt remembered kindly becomes ancestry.
```

### 11.2 Lines

```text
“The Ledger Below does not judge. It itemizes.”
```

```text
“Your soul has been refinanced at a competitive scream.”
```

```text
“My son died owing nothing. Do you understand how frightening that is to a goblin? Nothing to carry forward. No thread. No proof he touched the world.”
```

```text
“The first goblin did not steal fire. He borrowed darkness and charged interest.”
```

### 11.3 Gameplay ties

Goblin religion can tie to:

- debt revives
- goblin angels
- black markets
- card debt
- contracts
- marriage contracts
- shop prices
- forgiveness quests
- afterlife jokes
- faction conflict

---

## 12. Event System and Memory

### 12.1 World events

Every meaningful action should emit an event.

```ts
export interface WorldEvent {
  id: string;
  type: WorldEventType;

  roomId?: string;
  townId?: string;
  biomeId?: string;

  actorIds?: string[];
  targetActorIds?: string[];
  factionIds?: string[];
  itemIds?: string[];

  severity: number;
  visibility: number;
  loudness: number;

  tags: string[];

  createdAt: number;
  expiresAt?: number;
}
```

### 12.2 Event types

```text
animal-hunted
animal-startled
animal-tamed
food-cooked
item-used
charm-used
card-win
card-loss
gate-opened
gate-tax-paid
crime-committed
pickpocket-attempt
pickpocket-success
pickpocket-failed
npc-attacked
humanoid-eaten
humanoid-killed
actor-wounded
actor-rescued
actor-spared
actor-robbed
npc-gifted
romance-flirt
romance-confession
marriage
breakup
divorce
shop-purchase
shop-sold-out
player-low-health
player-died
player-revived
tail-shed
body-bridge-used
quest-completed
guild-discovered
guild-initiation-started
guild-initiation-completed
bandit-raid-started
bandit-raid-ended
faction-skirmish-started
faction-skirmish-ended
lore-bomb-revealed
```

### 12.3 Actor memory

```ts
export interface ActorMemory {
  eventId: string;
  type: WorldEventType;
  targetId?: string;
  roomId?: string;
  townId?: string;
  tags: string[];
  intensity: number;
  createdAt: number;
  expiresAt?: number;
  witnessedDirectly?: boolean;
  heardAsRumor?: boolean;
}
```

### 12.4 Memory classes

```text
immediate
local
regional
faction
personal
permanent
```

Examples:

- rabbit startled → immediate
- player hunted five rabbits near village → local/regional
- player murdered guard → faction/permanent
- player married NPC → personal/permanent
- player paid goblin debt → faction
- player revealed royal secret → personal/permanent

---

## 13. Perception and Witnessing

### 13.1 Perception channels

Actors can know through:

```text
sight
hearing
town rumor
faction report
family/friend gossip
direct conversation
shop ledger
supernatural awareness
```

### 13.2 Sight

Actors in the same room may witness:

- pickpocketing
- stealing
- attacks
- eating humanoids
- killing
- sparing
- giving gifts
- flirting
- kissing
- charm use
- cooking
- bait dropping
- opening gates
- buying suspicious items
- low health
- tail shedding
- body bridge use

### 13.3 Hearing

Loud events can be heard in neighboring rooms:

- gunshots
- explosions
- lightning
- death
- eating humanoids
- boss death
- raids
- skirmishes
- major shouting
- marriage, absurdly

### 13.4 Pickpocket witnessing

Pickpocket should depend on:

- target awareness
- player skill
- actor personality
- nearby witnesses
- guards
- town suspicion
- player guild membership

Outcomes:

```text
success unnoticed
success noticed
failure noticed
failure not noticed
witness reports
target becomes hostile
thief approves
romance NPC reacts
rumor created
```

---

## 14. Dynamic Interaction Menu

### 14.1 Purpose

The interaction menu should be dynamic and sized based on available options.

### 14.2 Menu size categories

```text
tiny
small
medium
large
expanded
```

### 14.3 Base non-hostile humanoid options

```text
Talk
Romance
Ask Rumor
Inspect
Attack
Leave
```

### 14.4 Role-specific options

Shopkeeper:

```text
Shop
Sell Items
Ask About Stock
Ask About Local Danger
```

Guard:

```text
Ask About Law
Pay Gate Tax
Bribe
Report Crime
Ask Patrol Route
```

Thief/Guild:

```text
Pickpocket
Ask About Jobs
Black Market
Pay Debt
Sell Contraband
```

Resident:

```text
Ask About Town
Ask About Family
Ask About Gossip
Request Help
```

Romance candidate:

```text
Flirt
Date
Give Gift
Ask About Them
Ask About Family
Confess
Propose
Kiss
Apologize
Break Up
```

Suspicious/hostile:

```text
Threaten
Parley
Bribe
Surrender Demand
Attack
Leave Slowly
```

Downed hostile:

```text
Spare
Question
Rob
Eat
Help
Leave
```

### 14.5 Menu header

Display:

- name
- portrait
- role/job
- faction
- mood summary
- bark line
- key icons

Example:

```text
Lindsey Vell
Shopkeeper · Wary · Has gossip

“You died west of town and then bought ramen. I am trying not to find that charming.”
```

---

## 15. Actor UI Readability

### 15.1 Overhead indicators

Use small pixel icons for:

```text
!    quest
?    rumor/new info
♥    romance
💍   spouse
$    shop/trade
♠    card table
🗡    hostile
⚠    suspicious
☠    wounded/downed
👁    witnessed something
🧾   debt/guild/black market
🔒   locked interaction
◇    personal secret/deep talk
```

Actual in-game icons should be pixel art, not necessarily emoji.

### 15.2 Priority

Only show the most relevant icons.

Priority:

1. Hostile/danger
2. Quest/turn-in
3. Relationship milestone
4. Shop/trade
5. New rumor/personal reveal
6. Pickpocket/guild
7. Generic talk

### 15.3 Nameplate

When close:

```text
Lindsey Vell
Shopkeeper · Wary · Has gossip
```

Or flavor:

```text
Lindsey Vell watches you like she remembers the bear.
```

### 15.4 Reaction bubbles

Short-lived bubbles for actor reactions:

```text
! surprised
? suspicious/gossip
♥ affectionate
💢 angry
$ greedy
☠ afraid/death witnessed
```

Examples:

- pickpocket nearby actor → `?`
- eat hostile bandit → witness gets `!`
- spouse sees player low health → `♥!`
- guard sees player steal → `⚠`

---

## 16. Romance System Expansion

### 16.1 Universal romance

Almost all non-hostile humanoids should be romanceable.

Exceptions:

- explicitly blocked actors
- animals
- hostile actors
- abstract thin actors unless promoted
- some supernatural actors unless intentionally supported

### 16.2 Relationship stages

```text
Stranger
Acquaintance
Friendly
Flirtation
Dating
Committed
Married
Estranged
Divorced
Hostile Ex
Widowed / Grieving
```

### 16.3 Intimacy unlocks

As relationship deepens:

- new greetings
- private lines
- gifts
- serious talks
- insecurities
- wounds
- secrets
- lore bombs
- family introductions
- jealousy
- spouse bonuses
- conflict scenes

### 16.4 Tone

Start funny. Become sincere.

Early:

```text
“You again. That is either fate or poor navigation.”
```

Concern:

```text
“You were bleeding when you came in. Do not make me ask twice.”
```

Confession:

```text
“I have watched you turn survival into a route. I do not want to be another room you pass through.”
```

Conflict:

```text
“You keep mistaking returning for staying.”
```

### 16.5 Shared event acceleration

Shared events can accelerate intimacy:

- actor saw player die
- player returned low-health
- player saved actor
- player saved actor’s family
- player protected town
- player cooked for actor
- player gifted meaningful item
- player spared someone actor cares about
- player ate hostile enemy to survive
- player helped actor’s faction

Line:

```text
“I do not know you well enough to be this relieved. That is the problem.”
```

### 16.6 Marriage

Marriage creates:

- spouse lines
- family reactions
- ex/rival reactions
- town gossip
- faction consequences
- shared home bonuses
- route advice
- conflict if player is reckless
- conflict if player harms spouse’s faction/family

### 16.7 Serious personal scenes

Add procedural scene templates:

#### Fear scene

Trigger: dating/friendly + player returns low health.

```text
They do not smile when they see you.

“I heard shots from the west. Then I heard your name, and the world got very small.”
```

Options:

```text
Apologize
Say you handled it
Make a joke
Ask them to come with you
```

#### Secret name scene

Trigger: intimacy + royal secret.

```text
“I need you to know the name I was born with. I need you not to say it loudly.”

“Bellgrave.”
```

Options:

```text
Ask if they mean the King
Say nothing
Use their chosen name
Promise to protect them
```

#### Grief scene

```text
“I sold my mother’s ring for a gate tax. The guard said it was policy. I said it was my mother. We were both right, which is what made me hate him.”
```

---

## 17. Actor-to-Actor Relationships

### 17.1 Relationship types

```text
sibling
parent
child
cousin
spouse
ex
crush
rival
debtor
creditor
boss
employee
friend
enemy
mentor
student
card-table nemesis
hunting partner
religious sponsor
goblin accountant
secret lover
adopted family
war comrade
```

### 17.2 Generation

For notable actors, generate:

- one family/social link
- one friend/rival/ex link
- one economic/faction link

Not all are revealed immediately.

### 17.3 Discovery through gossip

Examples:

```text
“My brother Ryan runs the west stall. If he says the soup is fresh, ask fresh from what.”
```

```text
“Do not flirt with Marta in front of Oscar. He says he is over it, which is how I know he is not.”
```

### 17.4 Consequences

Actions ripple through relationships.

Examples:

- attack Ryan → Lindsey reacts
- marry Lindsey → Ryan comments
- save Goblin Pim → debt-linked humans react
- kill someone’s ex → complicated reaction
- eat someone’s sibling → major relationship damage
- help someone’s rival → jealousy/resentment
- rescue someone’s spouse → trust/respect gain

---

## 18. Focus System

### 18.1 Purpose

The player can deepen NPCs by focusing on them.

Focus increases through:

- talking
- gifts
- dates
- repeated shopping
- gossip
- quests
- rescue
- harm
- sparing
- marriage
- witnessing emotional events together

### 18.2 Thresholds

```text
Focus 0: name, role
Focus 1: personality hint
Focus 2: local opinion / small rumor
Focus 3: relationship link
Focus 4: insecurity
Focus 5: wound
Focus 6: secret
Focus 7: personal quest or lore bomb
```

### 18.3 UI

Examples:

```text
Lindsey Vell trusts you enough to stop being funny.
```

```text
Known: shopkeeper, Ryan’s sister, afraid of the west road
```

---

## 19. Names and Identity

### 19.1 Large name pools

Use large pools to reduce repetition.

Human names:

```text
Ryan
Lindsey
Marta
Dennis
Clara
Gideon
Nina
Oscar
June
Harold
Bea
Tomas
Anika
Wes
Darla
Mina
Caleb
Iris
Nolan
Petra
Simon
Ruth
Vera
Lyle
Edith
Marcy
Jonah
Tessa
Hank
Mabel
Cora
Silas
Nell
Victor
Iona
Miles
Greta
Orin
Blythe
Elsa
Quinn
Dorian
Faye
Leon
```

Goblin names:

```text
Grib
Nackle
Vorz
Tibbit
Crunt
Ledger Pim
Skoba
Marnk
Greeble
Poxley
Nim-Nim
Bratch
Owing Jim
Fennik
Receipta
Dorb
Clink
Mizzit
Yorb
Scraw
Pellem
Grindle
```

Bandit names:

```text
Cask
Lowry
Muzzle Dan
Brine
Pike
Voss
Serrin
Old Callow
Nail
Hobb
Red Tully
Marrow
Latch
Fenn
Rusk
Bitter Harlan
Candle Mae
Jory Pike
```

### 19.2 Wandering counterparts

Special rare names:

```text
Wandering Ryan
Road Lindsey
Far Dennis
Other Marta
Gate Oscar
Old June
False Harold
Lucky Bea
Red Jonah
Mirror Tessa
```

These actors can recur across regions with eerie continuity.

### 19.3 Epithets

Actors can gain epithets.

```text
the Gate-Taxed
the Soup Witness
the Bear-Liar
the Rabbit Accountant
the Twice-Married
the Almost Eaten
the Back-Alley Honest
the Knife Polite
the Ramen Widow
the Bandit-Eaten
the Legally Alive
```

---

## 20. Humanoid Combat

### 20.1 Baseline rules

All humanoids have guns.

Most humanoids have a close-range slash.

Non-hostile humanoids:

- cannot be eaten while non-hostile
- have 3 hearts by default
- can be attacked with weapons
- may become hostile
- may flee, shoot, slash, call guards, surrender, or beg

Hostile humanoids:

- can be eaten for instant kill
- eating hostile humanoid heals 1 heart
- creates event
- creates witness/faction/rumor consequences

### 20.2 Bandits

Bandits are basic hostile humanoid enemies.

Rules:

```text
1 heart
usually hostile
shoot
slash when close
can be eaten for 1 heart
```

### 20.3 Hostility states

```ts
export type ActorHostility =
  | 'friendly'
  | 'neutral'
  | 'suspicious'
  | 'afraid'
  | 'hostile'
  | 'fleeing'
  | 'surrendering'
  | 'downed'
  | 'dead';
```

### 20.4 Slash attack

Adjacent humanoids may slash.

Examples:

- guard sword
- shopkeeper counter knife
- goblin receipt knife
- bandit blade
- thief dagger
- cook pan

### 20.5 Eating hostile humanoids

If actor is hostile and snake enters their tile:

```text
actor dies
snake heals 1 heart
event: humanoid-eaten
witnesses react
factions react
rumors spread
```

Eating hostile bandit:

- towns may approve
- bandits hate/fear player

Eating hostile guard:

- massive crime
- faction hostility
- witness panic

Eating hostile ex/spouse/family:

- possible but emotionally catastrophic
- unique rumors and relationship consequences

### 20.6 Surrender and mercy

Low-health/fearful hostile actors can surrender.

Menu options:

```text
Spare
Rob
Question
Eat
Help
Leave
```

---

## 21. Pickpocketing and Thieves Guild

### 21.1 Unlock

Pickpocketing unlocks after joining/initiating into a city thieves guild.

### 21.2 Guild test

Possible flow:

```text
Investigate grate
Get test
Pickpocket three townsfolk
Return to grate
Unlock guild hideout / black market / pickpocket
```

### 21.3 Risk factors

Pickpocket depends on:

- target awareness
- player skill/background
- witnesses
- guards
- actor personality
- actor relationship
- town suspicion
- guild state

### 21.4 Outcomes

```text
success unnoticed
success noticed
failure noticed
failure not noticed
witness reports
target hostile
thief approves
romance NPC reacts
rumor created
```

---

## 22. Factions

### 22.1 Faction model

```ts
export interface Faction {
  id: string;
  name: string;
  type: FactionType;
  opinionOfPlayer: FactionOpinion;
  resources: FactionResources;
  laws: string[];
  rumors: string[];
  activeProblems: string[];
  relationToFactionIds: Record<string, FactionRelationState>;
}
```

### 22.2 Faction states

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

### 22.3 Defaults

```text
Humans ↔ Goblins: tense truce
Humans ↔ Bandits: hostile
Goblins ↔ Bandits: opportunistic hostility
Humans ↔ Wildlife: local problem
Goblins ↔ Wildlife: taxable nuisance
Thieves Guild ↔ Human Town: hidden parasite
Thieves Guild ↔ Goblin Market: professional respect/disgust
Guards ↔ Thieves Guild: hostile if exposed
Angels ↔ Goblin Angels: theological rivals
```

### 22.4 Faction effects

Player actions affect factions:

- save goblins → goblin opinion up
- help humans → human opinion up
- eat bandits → bandit fear/anger up
- eat guard → human hostility up
- join thieves guild → guard suspicion if discovered
- pay goblin debt → goblin respect
- default debt → goblin hostility
- marry faction member → social/faction consequences

---

## 23. Faction Collision, Raids, and Skirmishes

### 23.1 Tense truce

Humans and goblins should not automatically fight.

They can:

- argue
- trade
- inspect receipts
- accuse
- debt collect
- insult
- create rumors
- escalate if provoked

### 23.2 Cross-faction dialogue

Guard to goblin:

```text
“Keep your receipts visible.”
```

Goblin:

```text
“My receipts are emotionally nude.”
```

Goblin to shopkeeper:

```text
“You sell without spiritual debt. Empty little business.”
```

Shopkeeper:

```text
“You sell curses with itemized formatting.”
```

### 23.3 Skirmish event

```ts
export interface FactionSkirmish {
  id: string;
  factionA: string;
  factionB: string;
  roomId: string;
  severity: number;
  cause: string;
  participants: string[];
  state: 'brewing' | 'active' | 'resolved' | 'aftermath';
}
```

### 23.4 Skirmish causes

```text
debt dispute
stolen item
religious insult
bandit raid
gate tax conflict
player crime
overhunting blamed on goblins
goblin charm accident
human guard inspection
black market exposure
```

### 23.5 Bandit raids

Targets:

- human village
- goblin market
- roadside shop
- caravan
- player house
- card table
- town gate

Phases:

```text
warning rumor
bandits arrive
fight/robbery
resolution
aftermath
```

Player can:

- help humans
- help goblins
- help bandits
- eat bandits
- loot chaos
- hide
- rescue one actor
- exploit conflict
- start bigger war

### 23.6 Aftermath

After faction events:

- wounded actors
- dead actors
- grief lines
- shop changes
- faction shifts
- rumors
- quests
- relationship scenes
- town mood changes

---

## 24. Rumor System

### 24.1 Purpose

Rumors make simulation visible.

Rumors should:

- teach mechanics
- expose faction tension
- spread consequences
- reveal relationships
- point to quests
- distort player actions
- deliver lore
- create comedy
- create stakes

### 24.2 Rumor model

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
  createdAt: number;
  expiresAt?: number;
}
```

### 24.3 Rumor types

```text
mechanic-hint
actor-relationship
faction-tension
nearby-danger
shop-stock
quest-lead
lore
player-reputation
false
exaggerated
romance
crime
death
```

### 24.4 Examples

Player ate bandit:

```text
“The snake ate a bandit.”
“The snake ate a man with a gun and called it medicine.”
“The snake has discovered bandit-based healthcare.”
“The bandits are avoiding town because of digestive concerns.”
```

Player married shopkeeper:

```text
“The shop has a snake discount now.”
“They married for love, or inventory access.”
“I give it a week, unless the snake eats the priest.”
```

Gate tax:

```text
“The snake paid a tax. The guards are emotional.”
“Civilization works. No one tell the goblins.”
```

Pickpocket:

```text
“Three pockets lighter and one grate happier. That is guild math.”
```

Faction tension:

```text
“The goblins paid the gate tax in pennies and theology. The guards are still counting both.”
```

---

## 25. Actor Voice System 2.0

### 25.1 Voice facts

Build voice from actor context.

```ts
export interface VoiceFacts {
  actorId: string;
  role: ActorRole;
  factionId?: string;
  personality: ActorPersonalityTag[];

  biomeId?: string;
  townId?: string;

  playerLowHealth: boolean;
  playerLongBody: boolean;
  playerWanted: boolean;
  playerRecentlyDied: boolean;
  playerRecentlyRevived: boolean;
  playerRecentlyHunted: boolean;
  playerRecentlyAteHumanoid: boolean;
  playerOwesDebt: boolean;
  playerHasMinimap: boolean;

  relationshipStage?: RelationshipStage;
  actorLikesPlayer: boolean;
  actorFearsPlayer: boolean;
  actorResentsPlayer: boolean;
  actorAttractedToPlayer: boolean;

  remembersCrime: boolean;
  remembersGift: boolean;
  remembersRescue: boolean;
  remembersDeath: boolean;
  remembersMarriage: boolean;

  factionTense: boolean;
  raidThreat: boolean;
  skirmishActive: boolean;

  loreEligible: boolean;
}
```

### 25.2 Voice line model

```ts
export interface ActorVoiceLine {
  id: string;
  text: string;
  priority: number;
  roles?: ActorRole[];
  factions?: string[];
  personalityTags?: ActorPersonalityTag[];
  requiredFacts?: string[];
  blockedFacts?: string[];
  relationshipStages?: RelationshipStage[];
  loreWeight?: 0 | 1 | 2 | 3;
  tags: string[];
  portraitId?: string;
}
```

### 25.3 Template slots

Support slots.

```text
"{greeting} You look like {injury_metaphor}. Buy {recommended_item} before the trees notice."
```

Slot examples:

```text
{greeting}
- Oh good.
- Fantastic.
- There you are.
- Look what crawled in.

{injury_metaphor}
- a before picture
- a lawsuit with scales
- soup that learned fear
- a medical anecdote

{recommended_item}
- ramen
- a healing potion
- anything with a cork
```

### 25.4 Voice categories

```text
bark
shop
quest
gossip
romance
confession
combat
faction
lore
memory
grief
jealousy
marriage
breakup
rumor
system-hint
```

---

## 26. Actor Brains and Simulation Layers

### 26.1 Brain modules

```text
ResidentBrain
ShopkeeperBrain
GuardBrain
ThiefBrain
AnimalPreyBrain
AnimalPredatorBrain
EnemyMeleeBrain
EnemyRangedBrain
FollowerBrain
SummonBrain
RomanceBrain
EventBrain
```

### 26.2 Brain tasks

Brains decide:

- movement
- combat
- fear/flee
- voice priorities
- shop stock
- quest offering
- gossip spreading
- romance availability
- faction responses
- schedules
- reactions to events

### 26.3 Simulation layers

#### Active room

Full simulation:

- movement
- perception
- combat
- immediate reaction
- interaction

#### Neighbor rooms

Light simulation:

- hear loud events
- move occasionally
- prepare ambush
- follow trails
- remember nearby events

#### Town/region

Abstract simulation:

- shop restock
- rumors spread
- faction tension changes
- patrol movement
- animal population changes
- raid brewing

#### Historical memory

Past events remain as records, memories, rumors, and journal entries.

---

## 27. Animals as Actors

Animals should be actorized.

Fields:

- species
- temperament
- hunger
- fear
- territory
- pack/herd
- tame affinity
- favorite food
- predator/prey tags

Behaviors:

```text
graze
flee
hunt
school
perch
sleep
follow
guard
scavenge
eat bait
avoid fire
panic at death
```

Animals remember:

- player attacked
- player dropped bait
- player killed animal nearby
- player has lantern/fire
- player tamed them
- predator/prey presence

Ecology:

- wolves chase rabbits/deer
- bears chase honey/meat
- birds flee gunshots
- raccoons steal bait
- fish school around bait
- predators flee fire/lantern

---

## 28. Shops as Actors

Shopkeepers should be actors, not menus.

Shopkeepers have:

- personality
- inventory
- faction
- memory
- prices
- fears
- opinions
- relationships
- voice lines
- romance path

Stock can react to:

- biome
- danger
- town mood
- raid
- local animal population
- player health
- faction relation
- actor personality
- actor memory
- player background
- player relationship

Examples:

```text
“You look like a before picture. Buy soup.”
```

```text
“You killed the bear? Good. Bad for bears, good for retail.”
```

```text
“You married into the shop. That is not a discount. That is a liability with kissing.”
```

---

## 29. Town / Faction UI

### 29.1 Town summary

When entering town:

```text
Eastmere feels tense.

- Goblin traders are arguing with guards.
- Bandits were seen near the north road.
- Lindsey has new gossip.
```

### 29.2 Faction panel

```text
Town Mood: Nervous
Goblin Relations: Tense Truce
Bandit Threat: Rising
Guild Presence: Whispered
Recent Rumor: “Three pockets lighter, one grate happier.”
```

### 29.3 Actor faction line

```text
Goblin Pim
Faction: Ledger Below Market
Town relation: Tense Truce
Mood: delighted by your legal vulnerability
```

---

## 30. People / Rumors / Lore Journal

### 30.1 People tab

Tracks known actors.

```text
Lindsey Vell
- Shopkeeper, Eastmere
- Friendly / Flirtation
- Ryan’s sister
- Hates King Bellgrave
- Remembers you buying ramen after dying
```

### 30.2 Rumors tab

```text
Bandits are scouting the goblin market.
Source: bartender
Reliability: questionable
```

### 30.3 Lore tab

Contradictory accounts:

```text
Bellwether Ford

Known versions:
- Official: tactical retreat.
- Lindsey: royal abandonment.
- Goblin Pim: wet accounting disaster.
```

### 30.4 Factions tab

```text
Eastmere Guard
Opinion: wary
Relation to Goblins: tense truce

Ledger Below Market
Opinion: amused
Relation to Humans: tense truce
```

---

## 31. Emergent Microquests

Actor needs and relationships generate quests.

Examples:

### Family quest

```text
“My brother Ryan went east after a card debt. If you see him, tell him Lindsey is furious in the traditional way.”
```

### Romance quest

```text
“I want to go somewhere that does not smell like gun oil. Take me to the ramen stand.”
```

### Shop quest

```text
“Bring me hide and I’ll stock better cloaks.”
```

### Guard quest

```text
“Clear the bandits by the north gate and I’ll waive the tax.”
```

### Thief quest

```text
“Lift three pockets. Not mine. That is the tutorial.”
```

### Cook quest

```text
“Bring honey. The soup needs sweetness and legal ambiguity.”
```

### Faction quest

```text
“Bandits are hitting the goblin market tonight. Officially, the guards know nothing. Unofficially, I know where they keep the back door.”
```

Quest results affect:

- actor opinion
- faction opinion
- shop stock
- rumors
- relationships
- town mood
- future menus

---

## 32. Suggested Repository Additions

Suggested new files/modules:

```text
src/actors/actorTypes.ts
src/actors/actorRegistry.ts
src/actors/actorSystem.ts
src/actors/actorFactory.ts
src/actors/actorMemory.ts
src/actors/actorOpinions.ts
src/actors/actorBrains.ts
src/actors/actorVoice.ts
src/actors/actorSoul.ts
src/actors/actorLore.ts
src/actors/actorNames.ts
src/actors/actorRelationships.ts

src/events/worldEvents.ts
src/events/eventLog.ts

src/rumors/rumorSystem.ts

src/factions/factionSystem.ts
src/factions/factionDefinitions.ts

src/ui/actorInteractionMenu.ts
src/ui/actorIndicators.ts
src/ui/peopleJournal.ts
```

---

## 33. Migration Strategy

### 33.1 Phase 1: Identity

Attach actor IDs to existing entities.

- animals
- enemies
- residents
- shopkeepers
- guards
- romance candidates
- guild contacts
- black market merchants

### 33.2 Phase 2: Event log

Emit events from existing systems:

- hunting
- food
- item use
- charm use
- card win/loss
- shop purchase
- pickpocket
- crime
- combat
- death
- revival
- romance
- marriage
- guild
- gates
- faction events

### 33.3 Phase 3: Memory and voice

Actors remember events and voice lines read actor memory.

### 33.4 Phase 4: UI readability

Add actor indicators, dynamic menu sizing, nameplates, and initial People/Rumor records.

### 33.5 Phase 5: Deeper social simulation

Add actor relationships, focus, secrets, confessions, lore bombs.

### 33.6 Phase 6: Combat/factions

Add humanoid combat rules, eating, hostility, witnesses, faction raids, skirmishes.

### 33.7 Phase 7: Actor brains

Gradually migrate behavior into actor brains and layered simulation.

---

## 34. Save Data Requirements

Save:

- actor identities
- actor memory
- actor opinions
- actor relationships
- focus/bond levels
- faction states
- rumors
- known lore
- generated names
- actor death states
- marriages
- hostile/ex/spouse states
- known secrets
- promoted actors

Use save versioning.

Old saves must not crash if actor data is missing. Generate actors lazily if needed.

---

## 35. Performance Requirements

The simulation must not run every actor fully every frame.

Use layers:

```text
Active room: full
Neighbor rooms: light
Town/region: abstract
History: memory only
```

Avoid expensive pathfinding for offscreen actors.

Update offscreen social state at low frequency.

Do not render UI indicators for far actors unless needed.

---

## 36. Acceptance Criteria

### Actor identity

- Existing animals, enemies, NPCs, shopkeepers, guards, and romance candidates can map to actors.
- Actors have roles, names, factions, and personalities.
- Actor data persists.

### Readability

- Actor indicators show quest/rumor/romance/shop/hostility states.
- Interaction menus resize based on options.
- Hostile and quest actors are readable.
- Actor nameplates communicate role and mood.

### Memory

- Player actions emit world events.
- Actors witness events.
- Actors remember important events.
- Voice lines can reference memory.
- Rumors can be generated.

### Romance

- Most non-hostile humanoids are romanceable.
- Relationship depth unlocks new lines.
- NPCs can reveal insecurities, wounds, secrets, and lore bombs.
- Marriage creates consequences.
- Actor-to-actor relationships affect romance.

### Combat

- Humanoids have guns.
- Humanoids can slash in close range.
- Non-hostile humanoids cannot be eaten until hostile.
- Hostile humanoids can be eaten for 1 heart.
- Bandits have one-heart combat profile.
- Witness/faction consequences occur.

### Factions

- Factions have relation states.
- Humans/goblins can be in tense truce.
- Bandits can raid humans or goblins.
- Faction collisions create events, rumors, and consequences.
- Cross-faction actors can argue before violence.

### Lore

- The King is frequently referenced but absent.
- Goblin religion appears in lines and systems.
- Lore bombs can be revealed.
- Lore can be contradictory.
- People/Rumor/Lore journal can track discoveries if implemented.

---

## 37. Implementation Order

Recommended order:

### Phase 1 — Visible foundation

1. Actor IDs attached to existing entities.
2. Basic actor registry.
3. Actor name/personality/faction.
4. Overhead indicators.
5. Dynamic interaction menu sizing.
6. Nameplates.

### Phase 2 — Memory foundation

1. WorldEvent model.
2. Event emission from major existing systems.
3. Witness detection.
4. Actor memory.
5. Voice lines reading memory.
6. Basic rumor creation.

### Phase 3 — Relationship depth

1. Actor-to-actor relationships.
2. Focus thresholds.
3. Expanded romance lines.
4. Confessions.
5. Insecurities.
6. Wounds/secrets.
7. Marriage consequences.

### Phase 4 — Lore and world depth

1. King reference system.
2. Goblin religion lines.
3. Lore atom pools.
4. Lore bombs.
5. People/Rumor/Lore journal.

### Phase 5 — Combat and crime

1. Humanoid guns/slash.
2. Hostility states.
3. Humanoid hearts.
4. Hostile humanoid eating.
5. Pickpocket witnessing.
6. Surrender/downed state if feasible.

### Phase 6 — Factions

1. Faction relation matrix.
2. Human/goblin tense truce.
3. Cross-faction dialogue.
4. Bandit raids.
5. Skirmish events.
6. Aftermath consequences.

### Phase 7 — Full simulation

1. Actor brains.
2. Schedules.
3. Animal ecology.
4. Shopkeeper behavior.
5. Abstract town simulation.
6. Rumor propagation.
7. Emergent microquests.

---

## 38. Final Target Experience

The player enters a goblin market after a bandit raid.

The minimap shows hostile remnants north.

A goblin shopkeeper has `!` and `$`.

A human guard nearby has `⚠`.

Lindsey, the player’s spouse, has `♥?`.

The goblin says:

```text
“Bandits shot my cousin and stole three ledgers. The humans watched until the math became embarrassing.”
```

Options:

```text
Shop
Ask About Raid
Offer Meat
Ask About Humans
Pickpocket
Romance
Attack
Leave
```

Lindsey says:

```text
“I heard the shots. Then I heard you were nearby, which was worse.”
```

Options:

```text
Reassure
Ask Her To Stay Inside
Ask About Ryan
Give Gift
Plan Route
Kiss
Leave
```

Guard Nina says:

```text
“Help the goblins if you want. Officially, I did not ask. Unofficially, I am tired of burying merchants.”
```

The player can:

- help goblins
- help humans
- eat bandits
- exploit chaos
- save one person
- make a romance promise
- rob everyone
- start a war

Afterward:

- people remember
- rumors spread
- shops change
- factions react
- family members comment
- spouses worry
- goblins invoice gratitude
- guards rewrite the official story
- someone blames King Osric Bellgrave III

That is the target.

---

## 39. Final Design Rule

Every actor interaction should answer at least one of these questions:

```text
What do they want?
What do they fear?
Who do they care about?
What did they see?
What did they hear?
What do they remember about you?
Who will they tell?
What faction do they answer to?
What secret are they hiding?
What lore do they carry?
What would make them change?
```

If the answer is none of these, the interaction should probably be cut, simplified, or made more systemic.
