# Snake for the Modern Gamer — Actor Conversation, Rumor, and Faction Reactivity Requirements & Design

## 1. Purpose

This document expands the previous voice requirements/design document.

The first version focused heavily on dialogue copy and the modular voice-line system. That was useful, but too narrow. The next implementation pass should not only add more voice lines. It should add the missing systemic context that gives those lines teeth.

The game needs:

- modular actor voice packs
- Talk / Ask Around / Ask Personally topic routing
- character beats and direct dialogue presentation
- faction tension and faction collisions
- rumors and current events
- actor-to-actor gossip
- social links that matter
- town/village/shop reactions to danger
- faction-aware dialogue
- romance and personal reveals tied into actor soul/lore
- UI that keeps options simple while letting conversations go deep

The target remains:

> **Specific mystery spoken by unmistakable freaks.**

But now the world behind those freaks must move.

The NPCs should not merely say interesting lines. They should talk because things are happening.

---

# 2. Current Branch State

The `actor-overhaul` branch already has important foundations:

- `Actor` data model
- `ActorRegistry`
- `ActorFactory`
- `ActorSystem`
- actor memory
- actor mood/opinion
- actor soul/lore profiles
- actor social links
- actor combat profiles
- actor interaction menu model
- actor indicators
- world events
- relationship bridging
- humanoid combat/eating improvements
- village/goblin/questgiver actor sync
- Talk / Ask Around / Ask Personally menu options

This means the next pass should not be “add more fields.” The next pass should make these fields matter in player-facing gameplay.

The current missing layer is:

```text
event -> memory -> rumor/current event -> faction/social interpretation -> dialogue/UI consequence
```

---

# 3. High-Level Goals

## 3.1 Keep the menu simple

Do not explode the actor interaction menu into dozens of specific topics.

Default conversation options should remain:

```text
Talk
Ask Around
Ask Personally
Romance / Be Close
Shop / Trade
Gift
Pickpocket
Threaten / Parley / Attack / Eat / Spare
Leave
```

Specific follow-ups can appear inside conversations, but the top-level menu should stay broad.

## 3.2 Make Ask Around actually about the world

Ask Around should not be a random bark.

It should answer:

```text
What is happening around here?
What are people saying?
What danger is nearby?
What factions are tense?
What did the player do publicly?
Who is connected to whom?
What current event has changed this place?
```

## 3.3 Make Ask Personally actually about the person

Ask Personally should not be generic mysterious dialogue.

It should answer:

```text
Who are you?
Who do you love/hate/fear?
What happened to you?
What secret are you carrying?
How do you personally understand the King, the goblins, the roads, war, death, debt, family, love?
```

## 3.4 Make factions conversationally visible

Faction systems should be visible mostly through NPC lines, town state, rumors, and skirmishes.

The player should hear:

```text
goblins and guards are tense
bandits are scouting the market
shopkeepers are preparing for danger
guards are pretending not to need help
goblins are converting fear into contracts
spouses are worried about faction violence
```

## 3.5 Make NPCs feel like people in a society

NPCs should reference:

- relatives
- rivals
- exes
- creditors
- debtors
- shopkeepers
- guards
- thieves
- faction members
- people who died
- people the snake ate
- people who left town
- people who are lying about being fine

The player should feel like the town existed before them and continues socially around them.

---

# 4. Conversation Architecture

## 4.1 Conversation buckets

The system should use three major non-romance conversation buckets.

### Talk

Immediate, casual, situational.

Topics:

```text
snake length
health
recent death/revival
recent hunting
recent humanoid eating
wanted level
equipment/style
current biome
current town
current danger
actor’s current mood
generic personality bark
```

### Ask Around

External, social, current-event, faction-facing.

Topics:

```text
rumors
recent public player actions
town danger
faction tension
bandit threat
goblin-human tension
shop economy
known actor gossip
quest leads
holiday/current event
recent crimes
raids/skirmishes
```

### Ask Personally

Internal, emotional, personal-history, lore-facing.

Topics:

```text
family
friends/rivals/exes
personal secret
insecurity
wound
longing
contradiction
personal King/lore tie
personal religion tie
relationship vulnerability
personal reaction to player behavior
```

---

# 5. Dialogue Presentation Requirements

## 5.1 No system-narrator framing

Do not display:

```text
Steven has something to say:
Davie heard a rumor:
Marta reveals something personal:
```

These make the NPC feel like a content dispenser.

Use direct dialogue.

## 5.2 Correct format

```markdown
*Optional short character beat.*

“Dialogue.”
```

The actor header already shows name, portrait, role, mood, and icons.

## 5.3 Character beats

Character beats should be:

- italicized
- short
- physical
- distinctive from speech
- used sparingly
- never explanatory in a bland way

Good:

```text
*He laughs once, too high.*
*The goblin checks a receipt that was not there a moment ago.*
*She stops polishing the counter.*
*He straightens his collar as if dignity can be reloaded.*
```

Bad:

```text
*He is nervous because he is afraid you might eat him.*
```

Better:

```text
*He keeps both eyes on your mouth.*
```

---

# 6. Modular Voice System Requirements

## 6.1 Voice packs

The current flat `ACTOR_VOICE_LINES` should become fallback/basic content.

Add modular packs:

```text
src/actors/voice/voiceTypes.ts
src/actors/voice/voiceSelector.ts
src/actors/voice/voiceTemplates.ts
src/actors/voice/voicePacks/talkVoice.ts
src/actors/voice/voicePacks/askAroundVoice.ts
src/actors/voice/voicePacks/askPersonalVoice.ts
src/actors/voice/voicePacks/romanceVoice.ts
src/actors/voice/voicePacks/shopVoice.ts
src/actors/voice/voicePacks/guardVoice.ts
src/actors/voice/voicePacks/goblinVoice.ts
src/actors/voice/voicePacks/factionVoice.ts
src/actors/voice/voicePacks/rumorVoice.ts
src/actors/voice/voicePacks/combatVoice.ts
src/actors/voice/voicePacks/witnessVoice.ts
src/actors/voice/voicePacks/loreVoice.ts
```

## 6.2 Actor voice entry

```ts
export interface ActorVoiceEntry {
  id: string;
  bucket:
    | 'talk'
    | 'ask-around'
    | 'ask-personal'
    | 'romance'
    | 'shop'
    | 'combat'
    | 'witness'
    | 'faction'
    | 'rumor'
    | 'lore';

  topic?: ActorVoiceTopic;

  beat?: string;
  text: string;

  priority: number;

  roles?: ActorRole[];
  kinds?: ActorKind[];
  species?: ActorSpecies[];
  factions?: string[];
  personalityTags?: ActorPersonalityTag[];
  relationshipPersonalities?: RelationshipPersonality[];
  attitudes?: ActorVoiceAttitude[];
  hostility?: ActorHostilityState[];
  relationshipStages?: RelationshipStage[];

  snakeLengthBands?: SnakeLengthBand[];
  healthBands?: PlayerHealthBand[];

  memoryTags?: string[];
  worldEventTypes?: WorldEventType[];
  factionStates?: FactionRelationState[];
  townMoodTags?: string[];

  minFocus?: number;
  maxFocus?: number;

  requiresSoul?: ActorSoulRevealKey | 'any';
  revealsSoul?: ActorSoulRevealKey;

  requiresLore?: 'king' | 'goblinReligion' | 'faction' | 'any';
  revealsLoreId?: string;

  socialLinkKinds?: ActorSocialLinkKind[];

  templateSlots?: Record<string, string[]>;

  tags: string[];
  portraitId?: string;
}
```

## 6.3 Topic taxonomy

```ts
export type ActorVoiceTopic =
  | 'talk.player.length'
  | 'talk.player.health'
  | 'talk.player.death'
  | 'talk.player.revival'
  | 'talk.player.hunt'
  | 'talk.player.humanoidEaten'
  | 'talk.player.wanted'
  | 'talk.local.biome'
  | 'talk.local.town'
  | 'talk.generic'
  | 'around.rumor'
  | 'around.currentEvent'
  | 'around.factionTension'
  | 'around.banditThreat'
  | 'around.goblinHuman'
  | 'around.actorGossip'
  | 'around.shopEconomy'
  | 'around.holiday'
  | 'around.questLead'
  | 'personal.family'
  | 'personal.socialLink'
  | 'personal.insecurity'
  | 'personal.wound'
  | 'personal.longing'
  | 'personal.contradiction'
  | 'personal.secret'
  | 'personal.king'
  | 'personal.religion'
  | 'personal.relationship'
  | 'faction.humanGoblinTension'
  | 'faction.banditRaid'
  | 'faction.guardInspection'
  | 'faction.goblinDebt'
  | 'faction.aftermath';
```

---

# 7. Faction System Requirements

## 7.1 Why factions belong in this doc

Faction stuff must be part of the same requirements/design pass because it drives:

- Ask Around content
- rumors
- current events
- town/shop reactions
- actor fear and gossip
- faction-specific voice lines
- bandit raids
- goblin-human tension
- spouse/family anxiety
- guards and goblins speaking differently about the same event

Without faction state, most voice lines are just decorative.

## 7.2 Required faction concepts

The current game has existing factions and alignment-like state. Build on that with a local relation layer.

Required faction groups:

```text
human towns / villages
guards
shopkeepers
goblin camps / goblin markets
thieves guild
bandits
wildlife
predators
angels
goblin angels
royal road office / King-law apparatus
```

## 7.3 Faction relation states

```ts
export type FactionRelationState =
  | 'allied'
  | 'friendly'
  | 'neutral'
  | 'tense'
  | 'truce'
  | 'skirmishing'
  | 'hostile'
  | 'war';
```

## 7.4 Default faction matrix

```text
humans ↔ goblins: tense truce
guards ↔ thieves guild: hostile if exposed
guards ↔ bandits: hostile
goblins ↔ bandits: hostile/opportunistic
shopkeepers ↔ bandits: hostile/fearful
humans ↔ wildlife: nuisance/danger
goblins ↔ wildlife: taxable nuisance
angels ↔ goblin angels: theological rivals
```

## 7.5 Faction state

```ts
export interface LocalFactionState {
  id: string;
  factionId: string;
  townId?: string;
  roomId?: string;

  relationToPlayer: number;
  fearOfPlayer: number;
  respectForPlayer: number;

  relations: Record<string, FactionRelationState>;

  tension: number;
  danger: number;
  resources: number;

  activeEvents: string[];
  recentEvents: string[];

  flags: Record<string, unknown>;
}
```

## 7.6 Faction current events

Add faction event records:

```ts
export interface FactionCurrentEvent {
  id: string;
  type:
    | 'argument'
    | 'inspection'
    | 'debt-collection'
    | 'trade-dispute'
    | 'raid-warning'
    | 'raid-active'
    | 'raid-aftermath'
    | 'skirmish'
    | 'market-shutdown'
    | 'guard-crackdown'
    | 'guild-exposure'
    | 'wildlife-surge';

  factionIds: string[];
  actorIds: string[];

  townId?: string;
  roomId?: string;

  severity: number;
  phase: 'brewing' | 'active' | 'aftermath' | 'resolved';

  createdAt: number;
  expiresAt?: number;

  tags: string[];
}
```

## 7.7 Faction event lifecycle

Faction events should move through phases:

```text
brewing
active
aftermath
resolved
```

Example: bandit raid on goblin market.

### Brewing

Ask Around lines:

```text
“Bandits were seen near the goblin market. Officially, we are monitoring. Unofficially, monitoring is what cowards call waiting.”
```

```text
“Bandits circle the market. Very rude. If they wanted debt, they could have applied.”
```

### Active

Gameplay:

```text
bandits spawn
goblin actors defend
guards may hesitate
civilians flee
shops may close
player can intervene
```

### Aftermath

Ask Around / Talk lines:

```text
“The market is open again. Everyone is pretending that means healed.”
```

```text
“You saved three goblins and ate two bandits. The town is deciding which part to put first.”
```

### Resolved

Longer-term rumor:

```text
“The west market still counts bandit raids by the missing receipts.”
```

---

# 8. Bandit Raid Requirements

## 8.1 Purpose

Bandit raids are a prime faction event because they involve:

- hostile humanoids
- eating-for-healing
- guards
- goblins
- shopkeepers
- faction aftermath
- rumors
- romance worry
- town danger
- Ask Around relevance

## 8.2 Raid targets

Bandits can target:

```text
human village
human town shop district
goblin camp / goblin market
roadside shop
caravan
card table
town gate
player-linked home/shop later
```

## 8.3 Raid warning

Before a raid, create:

```text
raid-warning faction current event
rumors
shopkeeper warning lines
guard lines
goblin lines
spouse worry lines
```

Example lines:

Guard:

```text
“Bandits were seen north. The official plan is vigilance. The unofficial plan is hoping you are violent nearby.”
```

Goblin:

```text
“Bandits approach. We have locked the ledgers and left the worthless merchandise visible. Humans call this bravery.”
```

Shopkeeper:

```text
“Bandits are coming? Terrible. If you need wards, I have become emotionally expensive.”
```

Romantic spouse:

```text
“Do not go north just because everyone expects you to. I hate that I know you will.”
```

## 8.4 Active raid behavior

During active raid:

```text
bandits become hostile actors
defenders become combat-capable actors
goblins use guns/slash
guards use guns/slash
civilians flee or hide
shopkeepers may lock shop or shoot from counter
player can eat hostile bandits for heart
events and witnesses fire
```

## 8.5 Raid outcomes

Track:

```text
bandits killed/eaten
defenders killed/wounded
shops damaged
player helped which side
player looted during chaos
player fled
player harmed civilians/goblins/guards
```

## 8.6 Raid aftermath effects

Effects:

```text
faction relation changes
town mood changes
shop stock changes
actor memories
rumors
spouse/family reactions
Ask Around lines
Ask Personally trauma/reveal opportunities
```

---

# 9. Goblin-Human Tension Requirements

## 9.1 Default state

Humans and goblins should generally have:

```text
tense truce
```

They should not always attack each other. They should argue, inspect, trade, accuse, and threaten.

## 9.2 Passive interaction lines

Guard to goblin:

```text
“Keep your receipts visible.”
```

Goblin to guard:

```text
“My receipts are emotionally nude.”
```

Shopkeeper about goblins:

```text
“They sell curses with better paperwork than our permits.”
```

Goblin about humans:

```text
“Humans call it law when the receipt has a flag.”
```

## 9.3 Escalation triggers

Human-goblin tension rises when:

```text
player helps one side against the other
pickpocketing is blamed on guild/goblins
bandits raid and guards fail to respond
goblins collect debt aggressively
guards inspect goblin stalls
player eats a goblin or guard
black market is exposed
town danger rises
```

## 9.4 De-escalation triggers

Tension drops when:

```text
player mediates
player saves goblins and guards
player pays debts
player exposes bandit manipulation
player completes faction quest
player prevents raid casualties
```

## 9.5 Ask Around examples

Guard:

```text
“The goblins are allowed through the east gate. Their receipts are not.”
```

Goblin:

```text
“Humans call it a tense truce. Goblins call it unpaid violence.”
```

Deadpan resident:

```text
“The guards and goblins are doing peace again. It involves fewer smiles than advertised.”
```

Cynical resident:

```text
“Both sides say they want order. That is how you know everyone brought weapons.”
```

---

# 10. Rumor System Requirements

## 10.1 Why rumors matter

Rumors are the bridge between simulation and player understanding.

A player cannot care about a faction system they cannot see.

Rumors make invisible systems visible.

## 10.2 Rumor data model

```ts
export interface Rumor {
  id: string;
  sourceEventId?: string;
  sourceActorId?: string;
  subjectActorId?: string;
  townId?: string;
  factionIds?: string[];

  type:
    | 'player-action'
    | 'crime'
    | 'romance'
    | 'faction'
    | 'danger'
    | 'shop'
    | 'gossip'
    | 'lore'
    | 'false'
    | 'exaggerated';

  truthLevel: number;
  exaggeration: number;
  severity: number;

  textSeed: string;
  tags: string[];

  createdAt: number;
  expiresAt?: number;

  knownByActorIds: string[];
  public: boolean;
}
```

## 10.3 Rumor creation

Create rumors from:

```text
humanoid eaten
town crime
pickpocket caught
pickpocket spree
marriage
divorce
death/revival
bandit raid warning
bandit raid aftermath
goblin-human argument
shop sold out
overhunting
quest completion
lore bomb revealed publicly
guild initiation
```

## 10.4 Rumor distortion

Same event can produce variants.

Event:

```text
player ate hostile bandit
```

Rumors:

```text
“The snake ate a bandit.”
“The snake ate a man with a gun and called it medicine.”
“The bandits are calling it a recruitment issue.”
“Bandit-based healthcare is now a phrase people are trying not to repeat.”
```

Event:

```text
player married shopkeeper
```

Rumors:

```text
“They married for love, or inventory access.”
“The shop has a snake discount now. Spiritually, if not legally.”
“The vows were beautiful. The aisle was mostly tail.”
```

Event:

```text
goblin market raid
```

Rumors:

```text
“Bandits hit the goblin market. The guards arrived in time to discuss jurisdiction.”
“The goblins say the humans watched. The humans say the goblins are dramatic. Everyone has guns.”
```

## 10.5 Rumor spread

Rumors spread through:

```text
actors in same town
shopkeepers
bartenders
guards
goblins
thieves guild
family/social links
spouses
witnesses
survivors
```

## 10.6 Ask Around integration

Ask Around should pick from:

```text
actor’s known rumors
actor’s memories converted to rumor-like lines
town recent rumors
faction current events
public player reputation rumors
```

Priority:

```text
urgent danger
active faction event
recent public player action
social link gossip
shop/faction rumor
older local flavor
```

---

# 11. Actor Social Graph Requirements

## 11.1 Current issue

The branch currently has local social links, but they are still early-stage.

They need to become more meaningful, mirrored, and usable by dialogue.

## 11.2 Social link types

Use current types and expand if needed:

```text
family
friend
rival
lover
spouse
ex
boss
employee
debtor
creditor
factionAlly
mentor
student
huntingPartner
cardNemesis
unknown
```

## 11.3 Mirrored links

Links should usually be mirrored.

```text
family <-> family
friend <-> friend
rival <-> rival
lover <-> lover
spouse <-> spouse
ex <-> ex
creditor <-> debtor
boss <-> employee
mentor <-> student
```

This prevents weird one-way social facts.

## 11.4 Lazy social generation

When a town/village/camp has actors:

1. Pick a few local notables.
2. Generate 1–3 social links per notable.
3. Mirror links.
4. Prefer local actors.
5. Occasionally link across factions.
6. Save persistent links for known/promoted actors.

## 11.5 Social link usage

Social links should affect:

```text
Ask Around gossip
Ask Personally family reveals
romance jealousy
grief
revenge
shop prices
faction reactions
quest hooks
rumors
combat hostility
```

## 11.6 Example lines

Ask Around:

```text
“Ryan is Lindsey’s brother. You can tell because they both lie with unnecessary confidence.”
```

Ask Personally:

```text
“Ryan is my brother. I say that before he does something that makes it sound like slander.”
```

After player harms linked actor:

```text
“That was my sister. Do not make me explain why that matters.”
```

After player saves linked actor:

```text
“Ryan said you saved him. Ryan also said he had it handled, so thank you for rescuing him twice.”
```

---

# 12. Town, Village, and Shop Reactivity Requirements

## 12.1 Town state should drive dialogue

Town/village state should influence lines.

Inputs:

```text
town mood
danger level
wanted level
recent crimes
recent raids
shop stock
guild state
faction tension
animal pressure
overhunting
biome danger
```

## 12.2 Town entry summary

When entering a town/village, optionally show a short summary:

```text
Eastmere feels tense.

- Bandits were seen near the goblin market.
- Guards are watching the east gate.
- Lindsey has new gossip.
```

Keep this compact.

## 12.3 Shopkeeper stock/voice response

Shopkeepers should react to danger.

Bandit threat:

```text
“I stocked wards, bandages, and denial. Denial is free with purchase.”
```

Forest danger:

```text
“The forest is eating hunters again. I recommend rope, bait, and humility.”
```

Goblin tension:

```text
“Goblins are nervous. Nervous goblins buy locks. Nervous humans buy excuses.”
```

Player low health:

```text
“You are bleeding in a way that suggests purchasing power.”
```

## 12.4 Village NPC lines

Villagers should be more local and practical than grand city/town NPCs.

Examples:

```text
“Road’s been quiet. Quiet roads are either safe or proud of themselves.”
```

```text
“Bandits do not raid poor villages for money. They raid us to practice.”
```

```text
“If the goblins come through, be polite. They remember tone like it earns interest.”
```

---

# 13. Actor Reaction Requirements

## 13.1 NPCs should react to visible player state

Actors should react to:

```text
snake length
health
recent death/revival
recent humanoid eating
recent hunting
high wanted level
guild membership if known
relationship status
equipment/style
minimap ownership if relevant
carrying meat/honey
```

## 13.2 Snake length bands

```ts
export type SnakeLengthBand =
  | 'tiny'       // < 10
  | 'normal'     // 10-25
  | 'long'       // 26-50
  | 'veryLong'   // 51-100
  | 'absurd'     // >100
  | 'legendary'; // >200
```

Example tiny:

```text
“Garden snake energy. Brave of you to make it everyone’s problem.”
```

Example absurd:

```text
“That is too much snake. I am surrounded by one person.”
```

## 13.3 Attitude filtering

The same state should produce different lines by attitude.

Low health:

Friendly:

```text
“Sit down before you become a rumor with teeth.”
```

Greedy:

```text
“You are bleeding in a way that suggests purchasing power.”
```

Romantic:

```text
“Do not smile like that. You are hurt and I am angry about caring.”
```

Afraid:

```text
“Please do not die near me. I have never handled a corpse with this much tail.”
```

---

# 14. Ask Personally Reveal Requirements

## 14.1 Current actor soul fields

Actors already have:

```text
wound
insecurity
longing
contradiction
secret
relationshipFear
confessionStyle
revealed flags
```

Ask Personally should reveal these.

## 14.2 Reveal order

Default:

```text
1. social link / family clue
2. insecurity
3. longing
4. wound
5. contradiction
6. secret
7. lore bomb
```

Romance can accelerate this.

## 14.3 Specific reveal mapping

Do not reveal only generic lines. Use the generated field.

Example generated wound:

```text
They lost family to a law everyone now pretends was mercy.
```

Possible lines:

Guard:

```text
*She adjusts her badge like it has become heavier.*

“My father died enforcing a road tax. The form said accident. The road said nothing, which was legally wise.”
```

Goblin:

```text
“Human law killed my cousin and called it procedure. Goblin law would at least keep the receipt.”
```

Poetic:

```text
“The law took my family in daylight. That is how I learned monsters prefer witnesses.”
```

## 14.4 Mark reveal

When revealed:

```ts
actor.soul.revealed[revealKey] = true;
```

Add known fact:

```text
Known: Guard Nina lost family to road law.
```

Emit event:

```text
actor-personal-reveal
```

---

# 15. Lore Reveal Requirements

## 15.1 Current actor lore fields

Actors have:

```text
scale
knowsAboutKing
kingOpinion
secretType
anchorEvent
anchorPlace
anchorInstitution
officialVersionBelief
bitternessTowardKing
revealedLoreIds
```

## 15.2 Lore reveal behavior

Ask Personally and Ask Around can reveal lore differently.

### Ask Around

External version:

```text
“People still argue about Bellwether Ford. Officially, retreat. Unofficially, everyone knows a word that polite people avoid.”
```

### Ask Personally

Personal version:

```text
“My father waited at Bellwether Ford for a King who had already left. That is why I do not wait well.”
```

## 15.3 King opinion variants

Loyal:

```text
“Bellgrave keeps the roads measured. Measured roads make measurable corpses, yes, but also measurable bread.”
```

Afraid:

```text
“Do not say the King’s name near gates. Gates are ears that learned carpentry.”
```

Bitter:

```text
“Bellgrave did not invent cruelty. He paved it.”
```

Mocking:

```text
“Big crown, small ledger discipline. Kingdom owes itself and calls that monarchy.”
```

Conflicted:

```text
“The King built roads that saved us from starving and carried our sons away. I have never known where to put that.”
```

Secretly royal:

```text
*They check the street before speaking.*

“If the crown asks, I drowned twenty years ago.”
```

---

# 16. Goblin Religion Requirements

## 16.1 Ledger Below

Goblin lines should repeatedly reference:

```text
Ledger Below
Final Audit
Small Ink
debt-body
receipt prayer
interest prophecy
forgiveness bankruptcy
soul collateral
competitive scream
```

## 16.2 Gameplay integration

Ledger Below references should appear in:

```text
goblin shop lines
goblin romance
debt/revival
goblin angel lines
goblin-human tension
bandit raid aftermath
pickpocketing
humanoid eating
Ask Personally
```

## 16.3 Example lines

```text
“The Ledger Below does not judge. It itemizes.”
```

```text
“Forgiveness is bankruptcy with candles.”
```

```text
“Love is a verbal contract with teeth. Very romantic. Very dangerous.”
```

```text
“Bandits stole three ledgers. The dead are one thing. The math is another.”
```

---

# 17. Romance Integration Requirements

## 17.1 Relationship state must affect actor voice

Use:

```text
relationship stage
relationship personality
affection
trust
resentment
jealousy
fear
fascination
memories
spouse status
neglect
conflict style
exclusivity preference
```

## 17.2 Romance should unlock personal reveals

Suggested mapping:

```text
friendly -> small personal detail
crush -> insecurity
dating -> longing / wound
lover -> contradiction / relationship fear
married -> secret / lore bomb
estranged -> wound through conflict
hostile -> betrayal/resentment lines
```

## 17.3 Spouse/family faction reactions

Spouses should react to:

```text
player joining thieves guild
player high wanted level
player eating humanoids
player saving/hurting their faction
player saving/hurting their family/social link
bandit raids
goblin-human tension
low health
recent death/revival
```

Examples:

```text
“I heard shots from the west. Then I heard your name, and the world got very small.”
```

```text
“You saved Ryan. He says he had it handled. He is alive, so I will only correct him once.”
```

```text
“You ate a guard. I am trying to decide whether I still know you. Do not help.”
```

---

# 18. Current Event and Holiday Requirements

## 18.1 Current events

Current events should be created from:

```text
recent world events
faction current events
town crimes
raids
guild activity
shop economy
weather/biome if relevant
holidays/seasonal flags
```

## 18.2 Holiday lines

Holiday/current date lines should be Ask Around/Talk content, not top-level menu options.

Examples:

Festival:

```text
“Festival day. Everyone smiles like the King is watching and drinks like he is not.”
```

Tax Day:

```text
“Tax day. Everyone hates the King out loud and pays him quietly.”
```

Goblin Audit Day:

```text
“Happy Audit Day. Kiss your debts on the forehead.”
```

First Snow:

```text
“First snow. Everyone pretends it is beautiful before it starts making decisions.”
```

Road Blessing:

```text
“They blessed the road this morning. It still led somewhere bad.”
```

---

# 19. UI Requirements

## 19.1 Actor dialogue panel

The actor dialogue UI should support:

```text
actor portrait
actor name
role/faction/mood
icons
optional italicized beat
spoken line
known fact learned
follow-up options
```

## 19.2 Known fact display

Known facts should be displayed outside dialogue.

Example:

```text
Known fact learned: Lindsey uses a false name.
```

Do not make the NPC say the known-fact text.

## 19.3 Follow-up options

Follow-ups are allowed but should be contextual and limited.

After Ask Around:

```text
Ask About Bandits
Ask About Goblins
Back
Leave
```

After Ask Personally:

```text
Ask More
Comfort Them
Make a Joke
Back
Leave
```

After faction reveal:

```text
Ask Who Started It
Offer Help
Back
Leave
```

## 19.4 Indicators

Actor indicators should surface:

```text
rumor available
personal reveal available
faction/current event known
shop
quest
romance milestone
hostility
wounded/surrendering
debt/guild
witness memory
```

Indicator priority:

```text
hostile
wounded
quest
personal reveal
faction event
romance
shop
rumor
guild/debt
talk
```

---

# 20. Event Integration Requirements

## 20.1 New/expanded event types

Add if missing:

```text
actor-talked
actor-asked-around
actor-asked-personally
actor-personal-reveal
actor-lore-reveal
actor-rumor-shared
rumor-created
rumor-spread
faction-event-created
faction-event-updated
bandit-raid-warning
bandit-raid-started
bandit-raid-ended
faction-skirmish-started
faction-skirmish-ended
social-link-revealed
```

## 20.2 Event to memory

Events should create memories for:

```text
direct witnesses
nearby hearers if loud
town actors through rumor spread
faction actors through reports
social links/family for major events
spouses for major player harm/risk
```

## 20.3 Event to rumor

Events should create rumors if:

```text
severity high
public
crime
romance/marriage
faction event
humanoid eaten
raid/skirmish
lore revealed publicly
guild event
```

## 20.4 Event to voice

Voice selection should be able to ask:

```text
what recent events matter to this actor?
what rumors does this actor know?
what faction events affect this town?
what player action is socially relevant?
```

---

# 21. Implementation Phases

## Phase 1 — Broaden voice infrastructure

Implement:

```text
voice packs
topic taxonomy
bucket selection
template slots
character beat return
anti-repeat history
```

## Phase 2 — Talk / Ask Around / Ask Personally handlers

Implement handlers that:

```text
choose topic
select line
apply reveals
emit events
update focus
update known facts
```

## Phase 3 — Rumor system V1

Implement:

```text
rumor model
event-to-rumor creation
Ask Around rumor selection
rumor text variants
town rumor bridge
```

## Phase 4 — Faction current events V1

Implement:

```text
faction relation state
human-goblin tense truce
bandit raid warning/active/aftermath
faction event records
Ask Around faction lines
```

## Phase 5 — Social graph V2

Implement:

```text
mirrored social links
family/rival/creditor/debtor links
Ask Around social gossip
Ask Personally social meaning
reaction to harmed/saved linked actor
```

## Phase 6 — Soul/lore reveal V1

Implement:

```text
chooseSoulReveal
specific soul line rendering
mark revealed
known facts
chooseLoreReveal
King opinion lines
Ledger Below lines
```

## Phase 7 — Romance/faction integration

Implement:

```text
spouse faction worry
romance personal reveal acceleration
reaction to player crimes/eating
reaction to saved/harmed social links
relationship personality voice bridging
```

## Phase 8 — Content expansion

Add at least:

```text
300 entries/templates first
1,000+ long-term
```

Breakdown:

```text
talkVoice: 160
askAroundVoice: 140
askPersonalVoice: 140
romanceVoice: 160
factionVoice: 100
rumorVoice: 80
goblinVoice: 80
guardVoice: 80
shopVoice: 80
combatVoice: 80
loreVoice: 80
witnessVoice: 80
```

---

# 22. Acceptance Criteria

## 22.1 Conversation

- Talk reacts to current player state and personality.
- Ask Around surfaces current events, rumors, danger, faction tension, and social gossip.
- Ask Personally reveals actual actor soul/lore/social fields.
- Top-level menu remains broad and readable.
- Dialogue is direct, not system-narrated.

## 22.2 Voice

- Voice packs exist.
- Topic selection exists.
- Personality variants exist for major topics.
- Character beats render italicized and separately.
- Repetition avoidance works.
- Lines strongly reveal personality.

## 22.3 Factions

- Human-goblin tense truce is represented.
- Bandit raid warning/active/aftermath events exist.
- Faction events create rumors and Ask Around lines.
- Guards, goblins, shopkeepers, spouses, and villagers react differently to the same faction event.

## 22.4 Rumors

- World events create rumors.
- Rumors spread locally.
- Ask Around can select rumors.
- Rumors have personality/faction-specific phrasing.
- Player actions can become public reputation.

## 22.5 Social graph

- Social links are mirrored when appropriate.
- Ask Around can reveal social gossip.
- Ask Personally can reveal personal meaning.
- NPCs react when linked actors are saved/harmed/eaten.

## 22.6 Soul/lore

- Ask Personally reveals specific soul fields.
- Lore reveals use actor lore profile.
- King opinions affect lines.
- Goblin religion appears in goblin dialogue and faction events.
- Known facts update.

## 22.7 UI

- Actor dialogue panel supports beat + dialogue + follow-ups.
- Known facts are displayed as UI, not NPC speech.
- Indicators show rumor/personal/faction opportunities.
- Follow-up options remain limited.

---

# 23. Final Target Experience

The player enters a tense goblin market.

A guard has a faction-current-event indicator. A goblin merchant has a rumor indicator. The player’s spouse has a personal/fear indicator.

The player chooses **Ask Around** on the guard.

```markdown
*The guard checks the east gate before answering.*

“Bandits were seen near the goblin market. Officially, we are monitoring. Unofficially, monitoring is what cowards call waiting.”
```

Follow-ups:

```text
Ask About Bandits
Ask About Goblins
Offer Help
Leave
```

The player chooses **Ask Around** on a goblin.

```markdown
*The goblin folds a receipt into something almost religious.*

“Bandits circle the market. Very rude. If they wanted debt, they could have applied.”
```

The player later saves the goblin market and eats two hostile bandits.

A shopkeeper says:

```text
“You saved the market and ate the raiders. Bad for bandits, good for ward sales, confusing for ethics.”
```

The spouse says:

```markdown
*They see the blood before the smile.*

“I heard shots from the west. Then I heard your name, and the world got very small.”
```

Later, after trust increases, the spouse’s **Ask Personally** reveals:

```markdown
*They check the street before speaking.*

“My name was not always Vell. If the crown asks, I drowned twenty years ago.”
```

Known fact learned:

```text
Lindsey uses a false name.
```

The player menu remained simple.

The world got deeper.

That is the goal.
