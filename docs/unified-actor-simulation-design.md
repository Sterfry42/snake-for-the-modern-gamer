# Snake for the Modern Gamer — Unified Actor Simulation Design

## Part 2: Design

This document is the **design expansion** for the Unified Actor Simulation system.

The earlier requirements document describes what the system needs to support. This document focuses on how the system should **feel**, how it should **live in the UI**, how the world should **simulate actors and factions**, and how to build on the systems already present in the repository.

The goal is not to turn the game into a giant life sim overnight. The goal is to make the existing world feel alive by giving every being a place in the same simulation language:

```text
Actors have identity.
Actors perceive.
Actors remember.
Actors react.
Actors gossip.
Actors form relationships.
Actors belong to factions.
Actors carry lore.
Actors can become important if the player keeps looking.
```

The game should become a bizarre survival-snake RPG where the player travels through a kingdom of armed, dateable, tragic, funny, killable, marriable, debt-ridden weirdos who remember what happened.

---

# 1. Repository Grounding

The current repository already contains several systems that should become the foundation for actor simulation.

This design should build on them, not replace them all at once.

## 1.1 Existing NPC voice system

There is already a conditional NPC voice system with:

- roles
- biome conditions
- danger conditions
- health conditions
- flags
- recent events
- item checks
- skill checks
- snake length checks
- portrait IDs

This is a strong first draft of actor voice. The new design should evolve it into an `ActorVoiceSystem`, rather than throwing it away.

Current shape:

```ts
NpcVoiceLine {
  id
  text
  priority
  roles
  biomeIds
  tags
  conditions
  portraitId
}
```

The next step is to move from simple contextual NPC lines to actor-aware lines driven by:

```text
actor identity
actor memory
actor mood
actor personality
actor faction
relationship state
witnessed events
lore profile
focus depth
```

## 1.2 Existing portrait registry

There is already a small portrait registry with roles and expressions:

```ts
PortraitDefinition {
  id
  textureKey
  role
  expression
  biomeFlavor
}
```

This should become the basis for normal small NPC portraits.

Dating portraits can remain special. Actor portraits should be used for:

- interaction menu headers
- bark panels
- shop dialogue
- rumor dialogue
- faction scenes
- romance scenes
- combat barks where appropriate

## 1.3 Existing relationship system

The relationship system is already surprisingly deep.

It includes:

- relationship stages
- species
- faction ID
- portrait ID
- affection
- trust
- jealousy
- resentment
- fear
- fascination
- memories
- children
- conflict style
- exclusivity preference
- personality tags and weights
- talk/flirt/date/propose/divorce/plead/fight/run-style choices

This should not be replaced.

Instead, the Actor System should treat relationship state as a major part of actor state.

Existing relationship state should become one expression of a wider actor model.

Relationship candidates are actors.

Spouses are actors.

Hostile exes are actors.

Romance memories should eventually become actor memories or be cross-linked to actor memories.

## 1.4 Existing town/guild/crime systems

Towns already include:

- mood
- danger
- prosperity
- wanted level
- suspicion
- reputation
- laws
- rumors
- notices
- residents
- shopkeepers
- thieves guild state
- guild jobs
- patrol encounters
- town room types
- district types
- physical town districts

This is extremely relevant.

The Actor System should not invent towns from scratch.

It should attach actors to the existing town structure and let towns become local actor ecosystems.

Town residents should become actors.

Thieves guild contacts should become actors.

Town rumors should eventually become part of the broader Rumor System.

Town crimes should emit world events.

Patrol encounters should involve guard actors.

## 1.5 Existing animal system

Animals already have:

- definitions
- biome spawning
- behaviors
- hunting/taming/danger encounter types
- hearts
- drops
- movement behavior such as wander/flee/chase/graze/school/perch

Animals should become actors too.

Animal actors can be thin, but they should still participate in:

- memory
- bait reactions
- fear
- territory
- taming
- ecology
- predator/prey behavior
- rumors if promoted to notable animals

## 1.6 Existing enemy system

Enemies already have:

- room ID
- position
- fire cooldown
- move cooldown
- aim direction
- hearts
- names
- encounter kinds such as enemy, duelist, npc-hostile, shark, goblin
- bullets
- hostile NPC spawning
- goblin spawning
- duelist spawning

This should evolve into actor combat.

Enemies should get actor IDs.

Hostile humanoids should become actors with:

- faction
- hostility state
- combat profile
- possible surrender
- memory
- voice barks
- eating rules

## 1.7 Existing encounter system

Wanderer encounters already support:

- names
- kinds
- weights
- room/zone/biome gating
- portraits
- pages
- repeat pages
- cards
- quests
- duels
- one-shot behavior

This is a very strong source for thick procedural actors and wandering counterparts.

The actor simulation can eventually turn these encounters into persistent or semi-persistent actors.

Ryan and Lindsey already exist as wanderer-style encounters. They should become special “wandering counterpart” archetypes in the Actor System.

## 1.8 Existing quest popup UI

The quest popup currently supports:

- title
- pages
- portrait
- accept/reject
- next/close
- bottom-screen panel
- runtime portrait recipe generation

This can become the first visual foundation for actor interaction menus, but it is currently too rigid for the desired dynamic actor menus.

The future `ActorInteractionMenu` should borrow from it, but support:

- dynamic sizing
- multiple options
- menu headers
- portrait states
- indicators
- relationship summaries
- actor mood
- scrollable options
- nested questions such as Ask About Ryan / Ask About the King / Ask About the Raid

---

# 2. Core Design Thesis

## 2.1 The game should feel like a living idiot kingdom

The target feel:

```text
You enter a town.
NPCs have jobs, families, debts, fears, factions, guns, crushes, rumors, and opinions.
You talk, flirt, shop, steal, hunt, eat hostile bandits, pay gate taxes, join guilds, start skirmishes, and marry weirdos.
The world remembers.
People gossip.
Shops change.
Factions react.
Romances become strangely sincere.
The King is blamed by someone who was not even there.
```

## 2.2 The comedy comes from sincerity

The system should not wink every time an NPC has feelings.

The funniest version is not:

```text
lol random NPC trauma
```

The funniest version is:

```text
This snake game is suddenly treating a procedural shopkeeper’s abandonment issues with prestige-drama seriousness.
```

The absurd premise and the sincere emotion should collide.

Example:

```text
“You keep calling it route planning. I call it leaving me in towns that keep score.”
```

This line is funny because it is emotionally real in a game where the player can eat hostile bandits for hearts.

## 2.3 The player chooses depth

Not every NPC needs a giant backstory up front.

Actors should become deeper when the player focuses on them.

The player should be able to pick a random shopkeeper as a joke and later discover:

```text
She has a brother.
She hates the King.
She keeps old war medals in a drawer.
She lied about her name.
She is afraid the snake will survive and still not come back.
```

The player’s attention turns procedural actors into characters.

## 2.4 Specificity creates world size

NPCs should say very specific things:

```text
Bellwether Ford
The Treaty of Small Ink
The King’s Third Kitchen
The Road-Tax Crusade
The Ledger Below
King Osric Bellgrave III
```

The game does not need to show all of these places and events.

Specific references make the world feel huge.

Contradictory references make it feel older than the player.

---

# 3. Actor Design Pillars

## 3.1 Identity

Every actor should answer:

```text
Who are they?
What are they?
What do they do?
Where do they belong?
Who do they know?
What do they want?
What are they afraid of?
```

Even thin actors can answer a few of these.

A rabbit:

```text
species: rabbit
role: prey
need: safety
fear: snake
memory: snake startled it
```

A shopkeeper:

```text
name: Lindsey Vell
role: shopkeeper
faction: human town
need: money/safety
fear: west road
memory: player bought ramen after dying
secret: born Bellgrave
```

## 3.2 Perception

Actors should not know everything.

They know through:

```text
sight
hearing
rumor
faction report
family gossip
shop ledger
direct conversation
supernatural weirdness
```

This is what makes the simulation feel fair.

If the player pickpockets someone in front of a guard, the guard can react.

If the player eats a hostile bandit in the woods, a town should not instantly know unless someone saw it, heard it, or the rumor spreads.

## 3.3 Memory

Actors remember events.

Memory should affect:

- greetings
- prices
- romance
- fear
- hostility
- gossip
- quest availability
- faction reaction
- marriage conflict
- family reaction
- actor-to-actor relationships

## 3.4 Mood

Actors have mood.

Mood is not just flavor. It changes behavior.

A fearful shopkeeper stocks wards.

An angry guard escalates.

A lonely resident becomes romance-receptive.

A grieving spouse gets serious lines.

A greedy goblin sees every emergency as a business model.

## 3.5 Relationships

Actors can relate to:

- the player
- other actors
- factions
- towns
- dead actors
- exes
- siblings
- debtors
- rivals
- spouses
- bosses
- guilds

Relationships should create consequences.

If you hurt Ryan, Lindsey should care if she is his sister.

If you marry a goblin merchant, other goblins should make contract jokes.

If you eat a hostile guard, their spouse should remember.

## 3.6 Lore

Actors carry lore.

Lore can be:

- personal
- local
- factional
- royal
- religious
- contradictory
- false
- trauma-colored
- propaganda
- rumor
- secret

Lore should not be dumped through a codex first.

Lore should emerge through people.

---

# 4. Actor Thickness Design

## 4.1 Thin actors

Thin actors are simple entities.

Examples:

- rabbit
- fish
- basic enemy
- temporary summon
- background town resident

They need:

- actor ID
- role/species
- room
- simple faction
- simple mood
- minimal memory
- simple behavior

They do not need:

- tragic backstory
- romance
- family
- lore bombs
- deep voice

## 4.2 Medium actors

Medium actors have identity and memory.

Examples:

- regular villager
- shopkeeper
- guard
- bandit
- goblin merchant
- wolf
- thief
- hunter

They need:

- name
- role
- personality
- faction
- memory
- opinion of player
- simple voice
- possible relationships
- role-specific menu

## 4.3 Thick actors

Thick actors are major emergent characters.

Examples:

- spouse
- recurring shopkeeper
- notable guard
- named bandit
- guild contact
- promoted animal
- wandering Ryan/Lindsey
- lore-bearing NPC

They need:

- soul profile
- lore profile
- actor-to-actor relationships
- deeper memory
- unique or semi-unique voice lines
- focus progression
- confessions
- personal quests
- emotional scenes

## 4.4 Promotion design

Actors should be promotable.

Promotion triggers:

```text
the player talks to them repeatedly
the player romances them
the player marries them
they survive a raid
they wound the player
they are spared
they witness a major event
they are tied to a quest
they are a family member of someone important
they are randomly selected as a town notable
```

Promotion should add:

- surname or epithet
- thicker memory retention
- more voice eligibility
- possible soul profile
- possible relationships
- possible lore profile

Example:

```text
Rabbit escapes player twice.
Promoted to “The Witness Rabbit.”
Nearby hunter eventually says:
“That rabbit has seen too much. I respect it and resent it.”
```

---

# 5. UI Design: Making the Simulation Readable

Systemic actors will fail if the player cannot understand them.

The UI needs to communicate:

```text
who matters
why they matter
what they can do
what they feel
what they remember
what danger they pose
what opportunity they offer
```

## 5.1 Overhead indicators

Actors should show small icons only when relevant.

Recommended indicators:

```text
!    quest available / urgent
?    rumor or new information
♥    romance interaction available
💍   spouse / committed partner
$    shop / trade
♠    card table / gambling
🗡    hostile / dangerous
⚠    suspicious / near hostile
☠    wounded / downed / lethal
👁    witnessed something important
🧾   debt / guild / black market
🔒   locked interaction gated by faction/skill
◇    personal secret or deep conversation available
```

In the actual game these should be pixel icons, not emoji.

## 5.2 Indicator priority

Never show every possible icon at once.

Priority:

```text
1. Hostile / immediate danger
2. Quest / turn-in
3. Relationship milestone
4. Shop / trade
5. New rumor / personal reveal
6. Guild / debt / pickpocket
7. Generic talk
```

If an actor is hostile and has gossip, show hostile first.

If spouse has a serious personal scene, show romance/deep marker.

## 5.3 Indicator examples

```text
Marta Gristle
♥ ?
```

Meaning: romance available, new gossip.

```text
Gate Guard Nina
! ⚠
```

Meaning: interaction/quest available, suspicious or tense.

```text
Goblin Pim
🧾 $
```

Meaning: debt/business.

```text
Bandit Lowry
🗡
```

Meaning: hostile.

## 5.4 Nameplates

When the snake is close, show a nameplate.

Basic:

```text
Lindsey Vell
Shopkeeper · Wary · Has gossip
```

Flavor version:

```text
Lindsey Vell watches you like she remembers the bear.
```

The flavor version is more on-tone.

Nameplates should be short and readable.

## 5.5 Mood phrase design

Instead of exposing raw numbers, show mood phrases.

Examples:

```text
calm
wary
fond
afraid
furious
grieving
intrigued
romantically endangered
commercially delighted
legally concerned
```

Mood phrase can be composed from actor mood/opinion:

```text
fear high + affection high = worried for you
greed high + player low health = commercially delighted
anger high + trust low = hostile
affection high + resentment high = complicated
```

## 5.6 Visual reaction blips

When an actor witnesses something, show short-lived reaction blips.

Examples:

```text
!  surprise
?  suspicion / gossip seed
♥  affection
💢 anger
$  greed
☠ fear / death witnessed
```

Use them sparingly.

Examples:

- pickpocket attempt witnessed: `?`
- player eats hostile bandit: `!` then maybe `☠`
- player gifts spouse meaningful item: `♥`
- shopkeeper sees low health: `$`
- guard sees crime: `!` then `⚠`

## 5.7 Actor interaction preview

Before opening a menu, optionally show:

```text
Talk to Lindsey Vell
Shopkeeper · Has new gossip · Friendly
```

This helps the player decide whether to engage.

---

# 6. Dynamic Interaction Menu Design

## 6.1 Core idea

The interaction menu should be generated from actor state.

It should resize depending on the number and importance of options.

A rabbit, a shopkeeper, a spouse, and a wounded bandit should not have the same menu.

## 6.2 Menu sizes

### Tiny menu

For very simple actors.

```text
Rabbit
“...”

[Inspect]
[Feed]
[Leave]
```

### Small menu

For simple residents or animals.

```text
Resident
“Roads are safer after someone else tests them.”

[Talk]
[Ask Rumor]
[Leave]
```

### Medium menu

For normal humanoids.

```text
Guard Nina
“Road tax is law. Law is fear with a hat.”

[Talk]
[Romance]
[Ask About Town]
[Pay Gate Tax]
[Attack]
[Leave]
```

### Large menu

For complex actors.

```text
Lindsey Vell
“You died west of town and then bought ramen. I am trying not to find that charming.”

[Talk]
[Romance]
[Give Gift]
[Ask About Ryan]
[Ask About the Goblins]
[Shop]
[Ask Rumor]
[Pickpocket]
[Threaten]
[Attack]
[Leave]
```

### Expanded menu

For thick actors during serious scenes, faction events, spouse conflict, or lore reveals.

```text
Lindsey Vell trusts you enough to stop being funny.

[Ask what you’re afraid of]
[Ask about your family]
[Ask why you hate the King]
[Tell them you came back]
[Promise nothing]
[Promise everything]
[Hold them]
[Make a terrible joke]
[Leave]
```

## 6.3 Menu header

The actor menu header should include:

- portrait
- name
- job/role
- faction/town
- mood/prose state
- bark line
- key relationship/faction icons

Example:

```text
[portrait] Lindsey Vell
Shopkeeper · Eastmere Market · Fond, worried

“I heard the shots. Then I heard you were nearby, which was worse.”
```

## 6.4 Option generation

Menu options come from actor modules.

Sources:

```text
base humanoid options
role options
relationship options
faction options
guild options
shop options
quest options
combat options
memory options
lore options
event options
item-gated options
skill-gated options
```

Example for a non-hostile shopkeeper:

```text
Talk
Romance
Shop
Sell Items
Give Gift
Ask Rumor
Ask About Local Danger
Pickpocket, if guild unlocked
Attack
Leave
```

Example for a spouse shopkeeper:

```text
Talk
Kiss
Shop
Share Food
Plan Route
Ask About Family
Ask About the King
Give Gift
Apologize
Separate
Leave
```

Example for a hostile wounded bandit:

```text
Question
Rob
Spare
Eat
Finish
Leave
```

## 6.5 Disabled / locked options

Locked options should sometimes appear with a reason.

Examples:

```text
Pickpocket [Locked: Join the thieves guild]
Cook [Needs cooking source]
Ask About Ryan [Unknown person]
Romance [Too hostile]
Eat [Target is not hostile]
```

This teaches systems.

## 6.6 Menu emotional state

The menu should change language based on relationship.

For a stranger:

```text
[Flirt]
```

For a lover:

```text
[Touch their face]
```

For an estranged spouse:

```text
[Apologize badly]
[Ask if they still want you here]
```

For a hostile ex:

```text
[Plead]
[Argue]
[Threaten]
[Leave before this becomes a scene]
```

## 6.7 Fast interactions

Do not make simple interactions too slow.

For common shops and guards, allow the bark and menu to appear together:

```text
Bark in header.
Options available immediately.
```

For serious scenes, use paged dialogue.

---

# 7. Actor Journal Design

A systemic actor game needs memory support for the player too.

## 7.1 People tab

Add eventually:

```text
People
Rumors
Lore
Factions
```

The People tab tracks known actors.

Example:

```text
Lindsey Vell
Shopkeeper, Eastmere
Stage: Flirtation
Known:
- Ryan’s sister
- owes Goblin Pim
- hates King Bellgrave
- remembers you buying ramen after dying
```

## 7.2 Known fact categories

For each actor:

```text
name
role
town
faction
job
relationship to player
relationships to other actors
known fears
known likes
known dislikes
known memories
known secrets
known lore ties
```

## 7.3 Discovery pacing

Facts should not all appear at once.

They unlock by:

```text
talking
romance
gifts
quests
witnessed scenes
rumors
focus thresholds
saving/harming actor
talking to relatives
```

## 7.4 Lore tab

Tracks lore topics and contradictory accounts.

Example:

```text
Bellwether Ford

Known versions:
- Official: tactical retreat.
- Lindsey: royal abandonment.
- Goblin Pim: wet accounting disaster.
- Bandit Lowry: wage theft with corpses.
```

## 7.5 Rumors tab

Tracks known rumors.

Example:

```text
Bandits are scouting the goblin market.
Source: bartender
Reliability: questionable
Expires: soon
```

## 7.6 Factions tab

Tracks faction states.

Example:

```text
Eastmere Guard
Relation to player: wary
Relation to Goblins: tense truce
Recent: opened gate after tax

Ledger Below Market
Relation to player: amused
Relation to Humans: tense truce
Recent: black market unlocked
```

## 7.7 Why the journal matters

Without a journal, systemic NPC depth becomes noise.

The journal lets players:

- remember who people are
- care about relationships
- understand faction politics
- track rumors
- revisit lore
- notice that the world is remembering them

---

# 8. Perception and Witness Design

## 8.1 Design principle

Actors should react to what they reasonably perceive.

They should not be omniscient.

## 8.2 Perception channels

```text
Sight
Hearing
Rumor
Faction report
Family/friend gossip
Shop ledger
Direct conversation
Supernatural awareness
```

## 8.3 Sight design

Actors in the same room can witness:

```text
pickpocketing
attacking
eating hostile humanoids
killing
sparing
robbing
giving gifts
flirting
kissing
using charms
cooking
dropping bait
opening gates
joining guild interactions
using body abilities
being low health
buying weird items
```

Line of sight does not need to be perfect at first.

A simple same-room witness system is enough for V1.

Later:

- walls block vision
- darkness reduces visibility
- crowds obscure
- guard training improves perception
- thief skill reduces visibility

## 8.4 Hearing design

Loud events can spread to nearby rooms.

Loud event examples:

```text
gunshot
slash combat
explosion
raiju lightning
humanoid death
humanoid eaten
boss death
raid
skirmish
marriage celebration
public confession
angel/goblin angel revival
```

## 8.5 Event loudness tiers

```text
Silent:
- gift
- quiet conversation
- successful stealth pickpocket

Low:
- flirt
- small trade
- cooking

Medium:
- argument
- failed pickpocket
- animal hunted
- slash attack

High:
- gunshot
- humanoid eaten
- guard attack
- raid
- public crime

Legendary:
- marriage
- boss death
- resurrection
- faction skirmish
- royal secret revealed publicly
```

## 8.6 Pickpocket witnessing

Pickpocketing should be a major systemic test case.

When player pickpockets:

1. Target rolls awareness.
2. Same-room actors roll witness chance.
3. Guards get bonus.
4. Thieves get bonus but may approve.
5. Romance actors judge based on personality.
6. Goblins may react as debt clergy.

Possible outcomes:

```text
success unnoticed
success noticed by target
success noticed by witness
failure unnoticed
failure noticed by guard
target becomes hostile
rumor created
guild progress gained
romance modified
wanted level increased
```

## 8.7 Witness reaction examples

Target:

```text
“Your hands are fast. Your apology should be faster.”
```

Guard:

```text
“I saw that. Worse, I understood it.”
```

Thief:

```text
“Not bad. Loud wrist, though.”
```

Goblin:

```text
“Unlicensed pocket audit. Beautiful. Illegal. Taxable.”
```

Romance NPC:

```text
“I am attracted to competence and concerned by evidence.”
```

---

# 9. Event and Memory Design

## 9.1 World events are the backbone

Every meaningful action should emit an event.

The actor system consumes events.

Events produce:

```text
actor memory
rumors
faction changes
voice facts
relationship shifts
shop reactions
quest hooks
town mood changes
witness reactions
```

## 9.2 Event anatomy

Each event should answer:

```text
What happened?
Who did it?
Who was affected?
Where did it happen?
Who saw it?
Who heard it?
How severe was it?
What tags describe it?
How long should it matter?
```

## 9.3 Event examples

### Player eats hostile bandit

```text
type: humanoid-eaten
actorIds: [player]
targetActorIds: [bandit]
roomId: current
severity: 65
visibility: high
loudness: high
tags: violence, hostile-kill, healing, cannibalism-ish, bandit
```

Effects:

```text
snake heals 1 heart
bandit faction anger/fear up
town may approve if bandit threat existed
witnesses fear player
rumor may spread
spouse may react
```

### Player pickpockets resident

```text
type: pickpocket-success
severity: 25
visibility: medium
loudness: low
tags: theft, guild, crime
```

Effects:

```text
target memory
witness memory
guild progress maybe
wanted if caught
romance reaction if seen
rumor if public
```

### Player buys all healing potions

```text
type: shop-purchase
tags: shop, low-health-maybe, healing
```

Effects:

```text
shopkeeper remembers
shopkeeper barks about fragility
stock changes later
spouse may worry if close
```

### Player reveals royal secret publicly

```text
type: lore-bomb-revealed
severity: 90
visibility: high
loudness: high
tags: royal, king, secret, dangerous
```

Effects:

```text
guards react
royal agents maybe later
romance actor fear
rumors distort
faction state shifts
```

## 9.4 Memory intensity

Memory intensity is based on:

```text
event severity
direct witness bonus
personal relevance
relationship relevance
faction relevance
actor personality
existing mood
```

Example:

Player eats a hostile bandit.

- random villager: intensity 45
- bandit’s brother: intensity 95
- player’s spouse: intensity 70
- goblin merchant: intensity 55 and amused
- guard: intensity 65 and legally alarmed

## 9.5 Memory decay

Memory decay by category:

```text
Immediate: minutes / rooms
Local: town duration
Regional: many rooms
Faction: long-term
Personal: permanent or near-permanent
Trauma: permanent
Romance: permanent-ish
Major lore: permanent
```

## 9.6 Memory into voice

Memory should not just sit in data.

It should drive lines.

Examples:

Actor remembers player death:

```text
“You died. Then you came back and asked if the ramen was still warm. I hated how relieved I was.”
```

Actor remembers player eating bandit:

```text
“You eat bandits. I sell to bandit-eaters. We all adapt.”
```

Actor remembers gift:

```text
“I kept the honey. Not because it was honey. Because you remembered I liked sweet things when the town did not.”
```

---

# 10. Romance Design: Serious Procedural Intimacy

## 10.1 Romance goal

Romance should be broadly available and emotionally escalating.

Almost every non-hostile humanoid should support romance unless explicitly excluded.

## 10.2 Romance should be systemic, not only bespoke

Existing relationship systems already support stages, personality, memories, children, conflict, jealousy, resentment, and marriage.

The design should expand this with actor data:

```text
actor soul
actor lore profile
actor family links
actor memories
actor faction
actor witnessed events
actor fears
actor secrets
```

## 10.3 Relationship stages as narrative unlocks

### Stranger

They show role/personality.

```text
“Local danger, local prices. That is what makes it culture.”
```

### Acquaintance

They reveal opinions.

```text
“The King’s roads make people feel safe. That is how roads get away with things.”
```

### Friendly

They reveal a small personal detail.

```text
“Ryan is my brother. Do not buy soup from him unless you enjoy risk as a texture.”
```

### Flirtation

They reveal insecurity.

```text
“You always look like you’re leaving. I dislike how early I noticed.”
```

### Dating

They reveal wound.

```text
“My brother marched under Bellgrave. Came home with a medal and no laugh. Then no home. Then no brother.”
```

### Committed

They reveal contradiction or deeper fear.

```text
“I keep wanting you to promise you’ll stay. I know that is cruel. Staying is not what you are shaped for.”
```

### Married

They reveal secret / lore bomb.

```text
“My name is not Vell. It is Bellgrave. I am the King’s third child, and the kingdom has spent twenty years pretending I drowned.”
```

## 10.4 Romance memories

Relationship lines should reference actual shared events.

Input facts:

```text
player saved actor
player returned low health
player died and revived
player hunted nearby
player ate hostile humanoid
player helped actor’s sibling
player harmed actor’s faction
player cooked for actor
player ignored actor
player married actor
player divorced actor
player gave meaningful gift
```

Example:

```text
“I knew I was in trouble when you came back from the west road with one heart, two hides, and the same stupid hat.”
```

## 10.5 Serious relationship scenes

Add procedural personal scenes.

### Fear scene

Trigger:

```text
dating or higher
player returns low health
actor has affection/trust high
```

Scene:

```text
They see the blood before the hat, which is how you know it is bad.

“I heard shots from the west. Then I heard your name, and the world got very small.”
```

Options:

```text
Apologize
Say you handled it
Make a joke
Ask them to come with you
```

### Secret name scene

Trigger:

```text
intimate bond
secret: false-name / royal-blood
```

Scene:

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

### Grief scene

Trigger:

```text
high trust
wound revealed
```

Scene:

```text
“I sold my mother’s ring for a gate tax. The guard said it was policy. I said it was my mother. We were both right, which is what made me hate him.”
```

Options:

```text
Listen
Offer revenge
Offer money
Say the King did this
```

### Marriage scene

Trigger:

```text
proposal accepted
```

Scene:

```text
“Marriage is a door people pretend is a wall. If we do this, do not vanish through it.”
```

Options:

```text
Marry them
Not yet
Ask what they need
Make a joke and regret it
```

## 10.6 Romance conflict

Conflict should not be random.

It should come from:

```text
neglect
recklessness
crimes
eating relatives
helping rival faction
jealousy
repeated near-death
lying
public humiliation
debt
refusing to stay
```

Example:

```text
“You keep mistaking returning for staying.”
```

## 10.7 Romance as lore delivery

Romance should become one of the deepest lore paths.

A spouse can reveal:

```text
royal secret
war memory
religious doubt
family scandal
guild debt
hated King story
old treaty
hidden faction relation
```

This makes the player care about lore because it comes from someone they care about.

---

# 11. Actor-to-Actor Social Graph Design

## 11.1 Why it matters

NPCs become much more alive when they know each other.

The player should not be the only social object in the world.

## 11.2 Relationship types

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
war comrade
adopted family
```

## 11.3 Lazy generation

Social links can generate lazily.

When the player focuses on an NPC, the game may generate:

```text
one family link
one friend/rival/ex link
one economic/faction link
```

Example:

```text
Lindsey Vell
- sibling: Ryan Vell
- rival: Marta Gristle
- creditor: Goblin Pim
```

## 11.4 Revealing links

Links are revealed through:

```text
gossip
romance
family questions
quest hooks
witnessed scenes
town rumors
journal updates
```

Example line:

```text
“My brother Ryan runs the west stall. If he says the soup is fresh, ask fresh from what.”
```

## 11.5 Consequences

Social links create consequences.

If the player attacks Ryan:

```text
Lindsey loses trust.
Ryan’s friends spread rumor.
His rival may secretly approve.
A guard cousin may become hostile.
```

If the player marries Lindsey:

```text
Ryan comments.
Goblin Pim may pursue shared debt.
Marta gets rival lines.
Shop discounts or liabilities appear.
```

If the player eats a hostile humanoid:

```text
their relatives react even if the kill was justified.
```

## 11.6 Cross-faction relationships

Allow relationships across faction lines.

Examples:

```text
human guard secretly dating goblin merchant
goblin accountant adopted by human cook
bandit used to be town guard
thief is mayor’s cousin
shopkeeper owes goblin priest
```

This makes faction conflict emotionally complicated.

---

# 12. Lore Design

## 12.1 Lore should be character-first

Lore should come from actors, not just signs.

A guard tells one version.

A goblin tells another.

A spouse tells the version that hurts.

## 12.2 Lore atoms

Build reusable lore atoms:

```text
people
places
wars
laws
treaties
religions
institutions
royal scandals
old defeats
saints
crimes
provinces
```

## 12.3 The absent King

Recommended monarch:

```text
King Osric Bellgrave III
```

He never appears.

He is constantly referenced.

He is blamed, praised, misunderstood, mythologized, defended, and used as shorthand for everything wrong or orderly in the world.

## 12.4 King epithets

```text
The Bellgrave King
The Road King
The Taxed Saint
The Bloody King of Bellwether Ford
The Mercy-Taker
The King Behind the Gates
The Man Who Counted the Dead Twice
```

## 12.5 Faction views of the King

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

## 12.6 Goblin religion: The Ledger Below

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

Goblin line:

```text
“The Ledger Below does not judge. It itemizes.”
```

Goblin angel line:

```text
“Your soul has been refinanced at a competitive scream.”
```

## 12.7 Lore contradiction

The same event should have multiple accounts.

Example: Bellwether Ford.

Official guard version:

```text
“Bellwether Ford was a necessary retreat.”
```

Bandit version:

```text
“Bellwether Ford was where the King learned dead men do not collect wages.”
```

Goblin version:

```text
“Bellwether Ford? Human debt ritual. Very wet. Poor accounting.”
```

Royal bastard version:

```text
“My father called it mercy because he left before the screaming started.”
```

No need to resolve it.

## 12.8 Lore bomb frequency

Lore bombs should be rare.

Use tiers:

```text
0: generic flavor
1: local flavor
2: specific history
3: major secret / lore bomb
```

Tier 3 lines should require:

```text
high focus
romance depth
rescue
shared trauma
serious conversation
lore question
faction event
```

---

# 13. Faction Design

## 13.1 Factions should exist as relationships, not only standings

Current factions are alignment-style. The actor simulation needs faction-to-faction relations too.

Faction state should include:

```text
opinion of player
relation to other factions
resources
laws
rumors
active problems
recent events
```

## 13.2 Core factions

Suggested major factions:

```text
human towns / Hearthbound Remnant
goblin camps / Ledger Below markets
thieves guild / Black Grate Guild
bandits
guards
shopkeepers
wildlife
predators
angels
goblin angels
royal road office
biome spirits
```

## 13.3 Human-goblin relationship

Default:

```text
tense truce
```

Meaning:

- they do not attack on sight
- they argue
- they inspect each other
- they trade under protest
- they spread rumors
- they can skirmish if provoked
- full war requires escalation

## 13.4 Faction matrix

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

## 13.5 Cross-faction speech

Faction actors should talk to each other before violence.

Human guard to goblin:

```text
“Keep your receipts visible.”
```

Goblin:

```text
“My receipts are emotionally nude.”
```

Bandit to goblin:

```text
“Hand over the purse.”
```

Goblin:

```text
“Gladly. It is a loan now.”
```

## 13.6 Faction collision events

Collisions can be:

```text
argument
inspection
debt collection
trade dispute
religious insult
small skirmish
raid
market shutdown
guard intervention
black market exposure
```

## 13.7 Bandit raids

Bandit raids are high-value systemic events.

Raid targets:

```text
human village
goblin market
roadside shop
caravan
player house
card table
town gate
```

Raid phases:

```text
warning rumor
bandits arrive
fight/robbery
resolution
aftermath
```

Player choices:

```text
help humans
help goblins
help bandits
eat bandits
loot during chaos
hide
rescue specific actor
make romance promise during crisis
```

## 13.8 Aftermath

After a raid/skirmish:

```text
actors may be wounded/dead
rumors spread
shops change stock
town mood changes
faction relations shift
romance scenes unlock
microquests appear
people grieve
people blame the King
```

---

# 14. Humanoid Combat Design

## 14.1 All humanoids have guns

This is a world rule.

Humanoids are armed.

This makes them socially and tactically dangerous.

## 14.2 Humanoid health rules

```text
normal non-hostile humanoid: 3 hearts
bandit/basic hostile humanoid: 1 heart
tough hostile humanoid: 2-3 hearts
boss/special humanoid: more
```

## 14.3 Eating rules

```text
Non-hostile humanoids cannot be eaten.
Hostile humanoids can be eaten.
Eating a hostile humanoid is an instant kill.
Eating a hostile humanoid heals the snake 1 heart.
```

This creates a tactical and moral line.

## 14.4 Hostility states

```text
friendly
neutral
suspicious
afraid
hostile
fleeing
surrendering
downed
dead
```

## 14.5 Hostility triggers

```text
player attacks actor
player threatens actor
player pickpockets actor
player kills/eats actor’s friend or family
player has high wanted level
player enters restricted area
player owes debt
player helps enemy faction
player uses terrifying charm
```

## 14.6 Guns and slashes

Humanoids can:

```text
shoot at range
slash at close range
flee
call allies
surrender
reload / pause
move for cover
```

### Close slash

If snake head is adjacent, humanoid may slash.

Slash:

```text
deals 1 heart
has cooldown
prevents safe adjacency
varies by role
```

Examples:

```text
guard: sword/club
shopkeeper: counter knife
goblin: receipt knife
bandit: blade
thief: dagger
cook: pan
```

## 14.7 Role combat behaviors

### Civilian

```text
panic
flee
shoot if threatened
slash if cornered
call guards
beg if wounded
```

### Guard

```text
stand ground
shoot rhythmically
slash when close
call other guards
block exits
```

### Bandit

```text
shoot aggressively
strafe
rush if player low
flee if alone
surrender if afraid
```

### Shopkeeper

```text
shoot from behind counter
throw item/potion
lock shop
call guards
remember forever
```

### Thief

```text
slash
smoke step
steal item
retreat
use guild route
```

## 14.8 Surrender and mercy

At low health or high fear, hostile humanoids can surrender.

Options:

```text
Spare
Rob
Question
Eat
Leave
```

Surrender creates memory and reputation opportunities.

## 14.9 Eating social consequences

Eating hostile humanoids heals, but creates events.

Examples:

### Eat bandit

```text
town may approve
bandits fear/hate player
rumor spreads
spouse may worry
```

### Eat guard

```text
massive crime
guard faction hostile
family reacts
town panic
rumor spreads hard
```

### Eat hostile ex

```text
possible
emotionally catastrophic
unique rumor category
```

Line:

```text
“You ate your ex-husband in the market.”
```

---

# 15. Animal Actor Design

## 15.1 Animals should use actor principles

Animal actors should have:

```text
species
temperament
hunger
fear
territory
pack/herd id
tame affinity
favorite food
predator/prey tags
memory
```

## 15.2 Animal behavior expansion

Existing movement behaviors can evolve.

Current-like categories:

```text
wander
flee
chase
graze
school
perch
```

Future categories:

```text
eat bait
hunt prey
avoid fire
follow owner
guard owner
sleep
panic at gunfire
scavenge carcass
return to territory
```

## 15.3 Animal memories

Animals can remember:

```text
player attacked them
player dropped bait
player killed nearby animal
player has lantern
player tamed them
player fed them
player is dangerous
```

## 15.4 Ecology

Examples:

```text
wolves chase rabbits/deer
bears chase honey/meat
birds flee gunfire
raccoons steal bait
fish school around bait
predators flee fire/lantern
```

## 15.5 Animal promotion

Animals can become notable.

Examples:

```text
Old Bitey
The Witness Rabbit
Mayor Thump
The Debt Fox
```

Notable animals can become rumors.

---

# 16. Shopkeeper Actor Design

## 16.1 Shops should be run by people

A shop is not just a menu.

The shopkeeper actor should affect:

```text
stock
prices
voice lines
romance
rumors
faction interaction
reactions to theft
memory of purchases
response to local danger
```

## 16.2 Shop memory

Shopkeepers remember:

```text
player bought all healing items
player returned low health
player killed bear nearby
player stole from town
player married shopkeeper
player owes goblin debt
player ate bandit outside
player saved shop during raid
```

## 16.3 Shop stock logic

Stock should react to:

```text
biome
town mood
danger level
animal population
faction tension
recent raid
player health
player relationship
shopkeeper personality
player background
known rumors
```

Examples:

```text
forest danger -> hunter knife, bait, lantern, cooked meat
ocean danger -> fins, fish bait, cooked fish
cold danger -> ramen, cooked meat, cloak
hot danger -> cooling food, heat gear
bandit threat -> healing items, wards, bullets maybe
goblin tension -> contracts, charms, suspicious discounts
```

## 16.4 Shopkeeper lines

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

# 17. Rumor Design

## 17.1 Rumors make simulation visible

Rumors are the player-facing form of offscreen social simulation.

They should:

```text
teach mechanics
spread consequences
reveal relationships
point to quests
show faction tension
distort player actions
carry lore
make NPCs feel like they talk when the player is absent
```

## 17.2 Rumor types

```text
mechanic hint
actor relationship
faction tension
nearby danger
shop stock
quest lead
lore
player reputation
false/exaggerated
romance
crime
death
```

## 17.3 Rumor distortion

Original event:

```text
Player ate hostile bandit.
```

Rumors:

```text
“The snake ate a bandit.”
“The snake ate a man with a gun and called it medicine.”
“The snake has discovered bandit-based healthcare.”
“The bandits are avoiding town because of digestive concerns.”
```

## 17.4 Rumor propagation

Rumors spread through:

```text
townsfolk
shopkeepers
bartenders
goblins
thieves guild
guards
spouses
family/friends
wandering counterparts
```

## 17.5 Rumor reliability

Rumors can be:

```text
true
mostly true
exaggerated
false
misleading
faction propaganda
romantic distortion
religious interpretation
```

## 17.6 Rumors as soft tutorials

Examples:

```text
“Bears love honey. Hate competition. Respect neither.”
```

```text
“Cooked meat fixes more than hunger. Raw meat fixes mostly regret.”
```

```text
“Long snakes survive water if they are willing to become infrastructure.”
```

```text
“Smoke cards win big until they do not. That is why goblins love them.”
```

---

# 18. Faction Event Design

## 18.1 Skirmish state machine

Faction skirmishes should have phases:

```text
brewing
active
resolved
aftermath
```

## 18.2 Brewing

Signs:

```text
rumors
guards gathering
goblins hiding stock
shopkeepers warning player
bandits sighted
spouse worried
```

## 18.3 Active

During active skirmish:

```text
actors fight
civilians flee
shops close
guards shoot
goblins use guns/charms
bandits raid
player can intervene
```

## 18.4 Resolved

Resolution determines:

```text
deaths
wounds
loot
faction changes
shop consequences
quest outcomes
rumors
romance consequences
```

## 18.5 Aftermath

Aftermath lines:

Goblin saved:

```text
“You saved my life. Very inconvenient. I have converted gratitude into store credit.”
```

Human guard after player helped goblins:

```text
“Good work. Strange work. Do not make it a philosophy.”
```

Spouse after raid:

```text
“I heard the shots. Then I heard you were nearby, which was worse.”
```

---

# 19. Voice System Design

## 19.1 Voice should be fact-driven

The voice system should build a `VoiceFacts` object from:

```text
actor
player
room
biome
town
faction
relationship
memories
recent events
lore eligibility
```

Then choose lines based on facts.

## 19.2 Voice categories

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
system hint
```

## 19.3 Voice template slots

Support reusable templates.

Template:

```text
"{greeting} You look like {injury_metaphor}. Buy {recommended_item} before the trees notice."
```

Slots:

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

This creates many lines from few templates.

## 19.4 Voice escalation

Voice should escalate with focus/relationship.

Early:

```text
“Roads are safer after someone else tests them.”
```

Mid:

```text
“You always look like you’re leaving.”
```

Late:

```text
“I am afraid you will survive and still not come back.”
```

Lore bomb:

```text
“My name is not Vell. It is Bellgrave.”
```

---

# 20. Simulation Layer Design

## 20.1 Active room

Full simulation:

```text
movement
combat
perception
interactions
local goals
immediate reactions
```

## 20.2 Neighbor rooms

Light simulation:

```text
hear loud events
move occasionally
follow trails
prepare ambush
spread immediate rumor
```

## 20.3 Town/region

Abstract simulation:

```text
shop restock
rumor spread
faction tension
guard patrol
animal population
actor mood drift
raid brewing
```

## 20.4 Historical layer

Past events remain as:

```text
memories
rumors
journal facts
faction logs
relationship memories
```

## 20.5 Avoiding overload

Do not fully pathfind every actor every tick.

Use:

```text
active actors for current room
lazy actor creation
abstract schedules
event-driven memory
low-frequency town updates
promotion only for important actors
```

---

# 21. Actor Schedules and Jobs

## 21.1 Schedules

Simple schedules:

```text
morning: home/street
day: work/shop/patrol
evening: tavern/market
night: home/back alley/guild
danger: shelter/guard post
festival: plaza
```

## 21.2 Jobs

Jobs affect location, voice, stock, quests, and knowledge.

Jobs:

```text
shopkeeper
guard
cook
hunter
thief
priest
cardwright
farmer
gate clerk
debt collector
fisher
tailor
undertaker
cartographer
gossip
animal handler
bartender
```

## 21.3 Job-based knowledge

Guard knows:

```text
laws
wanted level
gate tax
faction tension
patrol routes
King propaganda
```

Cook knows:

```text
food
healing
gossip
who is dating whom
who is hungry
```

Goblin knows:

```text
debt
contracts
black market
Ledger Below
human hypocrisy
```

Hunter knows:

```text
animals
tracks
biome danger
overhunting
bait
```

Thief knows:

```text
guild
pickpocket
grates
black market
guards
rumors
```

---

# 22. Player-Facing Gameplay Loops

## 22.1 Town loop

```text
Enter town
Read town state
See actor indicators
Talk/shop/flirt/gossip
Learn local problems
Prepare for route
Leave town
Return with consequences
```

## 22.2 Romance loop

```text
Meet actor
Banter
Focus
Learn personal detail
Share event
Flirt/date
Reveal insecurity
Reveal wound
Reveal secret/lore
Commit/marry/conflict
World reacts
```

## 22.3 Faction loop

```text
Hear rumor
See faction tension
Encounter skirmish/raid
Choose side or exploit chaos
Resolve event
Factions react
Rumors spread
Shops/actors change
```

## 22.4 Crime loop

```text
Join guild
Pickpocket
Check witnesses
Avoid guards
Gain loot/guild progress
Rumors/wanted level change
Relationships react
```

## 22.5 Combat/eating loop

```text
Encounter hostile humanoid
Dodge guns/slashes
Eat if close and hostile
Heal 1 heart
Witnesses react
Factions remember
Rumors spread
```

---

# 23. Content Design Banks

## 23.1 Name banks

Need large pools by category.

Add:

```text
human common names
human surnames
goblin names
bandit names
guard names
shopkeeper names
wandering counterpart names
royal/lore names
epithets
```

## 23.2 Backstory banks

Add pools for:

```text
wounds
insecurities
longings
contradictions
secrets
lore anchors
family relations
guild relations
debt relations
war memories
king opinions
```

## 23.3 Voice banks

Add voice by:

```text
role
personality
mood
faction
biome
relationship stage
memory type
combat state
lore tier
```

## 23.4 Lore banks

Add named pools for:

```text
king epithets
wars
treaties
places
institutions
saints
royal scandals
goblin religious terms
bandit myths
town founding myths
```

---

# 24. First Design Milestones

## 24.1 Milestone A: Actors become readable

Deliver:

```text
actor IDs for existing residents/shopkeepers/guards/animals/enemies
basic actor registry
overhead indicators
dynamic interaction menu shell
actor nameplates
```

Visible result:

```text
The player can tell who has a quest, rumor, shop, romance, hostility, or debt interaction.
```

## 24.2 Milestone B: Actors remember

Deliver:

```text
world event log
witness detection
actor memory
memory-based bark lines
rumor seeds
```

Visible result:

```text
NPCs comment on what they saw or heard.
```

## 24.3 Milestone C: Actors relate

Deliver:

```text
actor-to-actor links
focus thresholds
family/rival/ex gossip
relationship-aware menus
romance deepening
```

Visible result:

```text
NPCs are embedded in social webs.
```

## 24.4 Milestone D: Actors fight and fear

Deliver:

```text
humanoid combat profiles
guns/slashes
hostility states
hostile eating for heart heal
surrender/mercy basics
violence memories
```

Visible result:

```text
Humanoids become social combatants instead of disposable sprites.
```

## 24.5 Milestone E: Factions collide

Deliver:

```text
faction matrix
human/goblin tense truce
bandit raids
skirmish events
faction aftermath
faction UI summaries
```

Visible result:

```text
Towns feel politically alive.
```

## 24.6 Milestone F: Lore and tragedy bloom

Deliver:

```text
ActorSoul profiles
lore profiles
King references
goblin religion
lore bomb scenes
romance vulnerability scenes
People/Lore/Rumor journal
```

Visible result:

```text
A random NPC can become devastatingly specific.
```

---

# 25. Final Design Target

The dream moment:

The player enters a goblin market after a bandit raid.

The minimap shows hostile remnants north.

A goblin shopkeeper has `!` and `$`.

A human guard has `⚠`.

Lindsey, the player’s spouse, has `♥◇`.

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
Ask About Bellgrave
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

```text
help goblins
help humans
eat bandits
exploit chaos
rescue one person
make a romance promise
rob everyone
start a war
```

Afterward:

```text
people remember
shops change
rumors spread
families react
the spouse worries
the goblins invoice gratitude
the guards rewrite the official story
the King is blamed by someone who was not even there
```

That is the target design.
