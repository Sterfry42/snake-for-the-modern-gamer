# Snake Mayoral Elections — Product, Test & Architecture Plan

**Status:** Implementation design for Lil' Tony  
**Target branch reviewed:** `sterlings-bs`  
**Architecture review:** Tony + Meryl + Pyromancer  
**Goal:** Make human towns feel politically alive before player town-building ships, while using the feature to clean the town/runtime seams it exposes.

---

# 1. Product North Star

A town should stop feeling like a procedural collection of shops and start feeling like a place with people, institutions, opinions, and local politics.

The player experience is:

```text
arrive in town
→ discover Town Hall
→ meet the sitting Mayor
→ declare candidacy
→ choose a platform
→ campaign for at least one full day
→ physically see supporters appear around town
→ election resolves at dawn two days after declaration
→ return to Town Hall / town and learn the result
→ if victorious, become Mayor
→ the chosen platform immediately changes how this town behaves
```

This is **not** a political strategy minigame.

It is a living-town event built from systems Snake already has:

- persistent Actors
- Actor opinions and memories
- interaction verbs
- rumors and WorldEvents
- town reputation
- canonical world day / phase
- enterable town interiors
- businesses
- resident schedules
- world presentation

The campaign should feel like **the town reacting to the player**, not like filling a campaign XP bar.

---

# 2. Product Tenets

## 2.1 Every voter is a real person

Do not resolve elections from one global `campaignScore`.

The town's actual persistent living residents vote.

Each eligible resident's choice is influenced by:

- town reputation toward the player
- that Actor's opinion of the player
- campaign interactions with that Actor
- the chosen platform
- what that Actor actually knows about the player
- the incumbent's existing support
- the town's current condition
- a small deterministic uncertainty component

The final result is the aggregate of individual resident ballots.

---

## 2.2 Support must be visible

A resident wearing the player's campaign button is a **clear supporter**.

The button appears at the **bottom-left** of their world sprite, opposite the existing bottom-right Actor activity prop.

There are exactly three button outcomes:

```text
HARD REFUSAL
"Absolutely not."

POLITE REFUSAL
"No thanks. Good luck."

ACCEPT
The NPC immediately wears the button.
```

There is no "accept but do not wear" state.

If the player sees the button, that person is publicly backing them.

No button does not necessarily mean opposition.

---

## 2.3 Reuse the town's existing social truth

Do not create:

```text
CampaignRelationship
ElectionReputation
CampaignRumorSystem
CampaignMood
```

The election consumes existing:

- town reputation
- Actor opinion
- Actor mood
- Actor memories
- modern RumorSystem knowledge
- guild knowledge
- Actor personality

Campaign-specific state only stores things the general systems cannot answer, such as:

```text
Did we already shake hands?
Was a button already offered?
What was the button outcome?
Was the Mayor smear attempted?
Has the tavern round already been purchased?
```

---

## 2.4 Voters know what they know

Election scoring must not use omniscient save-state facts when the voter would not know them.

Example:

```text
publicly squeaky clean
+ secretly in the Thieves Guild
+ platform = Law & Order
```

A guard can sincerely support the clean Law & Order candidate.

A thief who knows the guild connection can strongly support putting one of their own in City Hall.

If the guild connection becomes public through normal rumor/memory systems, guard support may collapse.

This is an intentional first-class product interaction.

---

## 2.5 Winning must matter immediately

Do not ship:

```text
YOU ARE MAYOR!
...nothing changes.
```

Before town construction exists, winning still must:

1. transfer the Mayor office;
2. visibly change how the town recognizes the player;
3. immediately enact the chosen platform;
4. provide at least one real, town-local mechanical consequence.

The campaign promise is the first small form of governing.

---

## 2.6 The election is orthogonal to town mood

Do **not** use `TownMood = 'election'` as the active election source of truth.

A town may simultaneously be:

```text
crimeWave
+ holding an election
```

or:

```text
foodShortage
+ holding an election
```

Those combinations are part of the product.

Election state belongs to civic runtime, not the single-value mood field.

---

# 3. Architectural North Star

> **Generated town defines what the town was born as. Runtime town state defines what has happened to it. Civic state defines who governs it and what election is underway. Actors define the people. WorldEvents define what happened. Rumors define what spread. Presentation shows the consequences.**

The election should not require a parallel political game bolted beside Snake.

It should make the existing town systems capable of politics.

---

# 4. Clean/Burn Project Before Civic Build

The civic feature exposes several existing architectural seams.

We should simplify the seams that make the feature unnecessarily complicated **before** or **while** building the product.

Do not perform broad vanity rewrites.

The rule is:

> **Burn architecture only where the election is forced to understand accidental implementation detail.**

The cleanup work is part of this project.

---

# 5. Cleanup PR 1 — Town Runtime Ownership

## Problem

Current town state is split awkwardly:

```text
TownStructure
+
TownRuntimeState
+
SnakeGame save/reapply helpers
```

The existing runtime persistence path rebuilds `TownRuntimeState` from `TownStructure` and overwrites it.

That makes this unsafe:

```ts
TownRuntimeState {
  ...
  civic: TownCivicState
}
```

because an unrelated gate/crime/guild save path could reconstruct runtime data and accidentally erase civic state.

The current runtime type also contains placeholder/legacy fields that are not meaningful ownership boundaries.

---

## Desired destination

Introduce a typed runtime owner:

```ts
interface TownRuntimeStore {
  get(townId: string): TownRuntimeState;

  update(
    townId: string,
    update: (state: TownRuntimeState) => TownRuntimeState
  ): TownRuntimeState;

  applyToTown(base: TownStructure): TownStructure;
}
```

Conceptually:

```text
Generated Town
     |
     v
TownRuntimeStore
     |
     +-- crime / wanted
     +-- suspicion
     +-- reputation
     +-- gates
     +-- guild runtime
     +-- civic runtime
     |
     v
Effective Town View
```

The exact field nesting is not sacred.

The ownership is.

---

## Runtime invariant

An unrelated update must preserve unrelated runtime slices.

Example:

```text
active mayoral election
→ open town gate
→ save/update gate runtime
→ election still exists
```

This should have a regression test.

---

## Characterization tests before cleanup

Before replacing the current persistence path, lock down:

- wanted level persistence
- suspicion persistence
- reputation persistence
- open-gate persistence
- thieves-guild discovery
- completed/failed guild jobs
- existing town rumors behavior
- save/load round trip

Only then replace reconstruct-and-overwrite runtime persistence.

---

# 6. Cleanup PR 2 — Town Interior Definition Catalog

## Problem

Adding a Town Hall currently requires several systems to remember the same metadata independently:

```text
TownBuildingKind
LayerTemplateId
template → district mapping
template → business/service policy
building → template relationship
public/private access
```

This is genuine duplication.

Town Hall should not add another copy.

---

## Desired destination

Introduce a small metadata catalog:

```ts
interface TownInteriorDefinition {
  buildingKind: TownBuildingKind;
  templateId: LayerTemplateId;
  district: TownDistrictKind;

  publicAccess: boolean;
  crimeTarget?: boolean;

  servicePolicyId?: TownServicePolicyId;
}
```

Example:

```ts
const TOWN_INTERIORS = {
  tavern: {
    buildingKind: 'tavern',
    templateId: 'tavern',
    district: 'townCenter',
    publicAccess: true,
    servicePolicyId: 'tavern-service',
  },

  townHall: {
    buildingKind: 'townHall',
    templateId: 'townHall',
    district: 'townCenter',
    publicAccess: true,
    servicePolicyId: 'civic-office',
  },
};
```

Derive the duplicated metadata lookups from this catalog.

---

## Do not over-generalize

Do **not** turn town geometry itself into a huge data-driven construction framework as part of this cleanup.

`createTownBuildings()` may continue to author actual physical placement.

The catalog owns metadata.

Authored town generation owns geometry.

---

# 7. Cleanup PR 3 — Actor Interaction Composition

## Problem

`buildActorInteractionMenu()` is already the correct unified player interaction surface.

But its context and implementation are becoming a junk drawer.

It currently carries unrelated concepts such as:

```text
guild eligibility
pickpocket
relationships
rumors
shop availability
tavern rest
```

Civic would otherwise add:

```text
can declare
active campaign
handshake used
button eligibility
smear eligibility
round eligibility
```

Do not keep adding optional booleans forever.

---

## Desired destination

Keep one menu and one UI.

Split option contributions by domain:

```ts
function buildActorInteractionMenu(actor, context) {
  const options = [
    ...buildBaseInteractionOptions(actor, context.base),
    ...buildServiceInteractionOptions(actor, context.services),
    ...buildSocialInteractionOptions(actor, context.social),
    ...buildCrimeInteractionOptions(actor, context.crime),
    ...buildCombatInteractionOptions(actor, context.combat),
    ...buildCivicInteractionOptions(actor, context.civic),
  ];

  return finalizeActorMenu(actor, options);
}
```

Context becomes namespaced:

```ts
interface ActorInteractionContext {
  base?: ActorBaseInteractionContext;
  services?: ActorServiceInteractionContext;
  social?: ActorSocialInteractionContext;
  crime?: ActorCrimeInteractionContext;
  combat?: ActorCombatInteractionContext;
  civic?: CivicInteractionContext;
}
```

Do not create a generic plugin SDK.

Do not change the UI contract.

Do not sacrifice existing verbs.

Just give domains clean contribution seams.

---

# 8. Small Shared Seams to Add During Civic Work

These do not need separate heroic refactors.

Add them as the feature needs them.

## 8.1 Canonical world-time transition hook

Today atmosphere advancement already detects day/phase changes.

Create a small transition boundary:

```ts
handleWorldTimeTransition(before, after)
```

Consumers:

```text
Actor schedules
Civic election resolution
future day/phase systems
```

Do not build an event-bus framework.

---

## 8.2 ActorSystem town query

Civic should not understand ActorRegistry internals.

Add:

```ts
getActorsForTown(townId: string): Actor[]
```

ActorSystem answers:

> Which persistent Actors belong to this town?

Civic decides:

> Which of them are eligible voters?

---

## 8.3 Actor presentation context

Do not duplicate button state into `actor.flags`.

Extend presentation with external adornment context:

```ts
getActorPresentation(actor, {
  badges: civic.getActorBadges(actor.id),
});
```

or an equivalently narrow model.

The civic system remains the source of truth.

Presentation projects it.

---

## 8.4 Town policy projection

Do not mutate generated town fields when the player wins.

Expose policy effects as a town-local projection:

```ts
interface TownPolicyModifiers {
  shopPriceScalar: number;
  positiveReputationScalar: number;
  positiveOpinionScalar: number;
  guardPresenceBonus: number;
  crimePressureScalar: number;
}
```

Then:

```ts
civic.getPolicyModifiers(townId)
```

Consumers use only the modifiers they understand.

---

# 9. Debt to Quarantine, Not Burn Yet

Do **not** block this feature on fixing everything.

## Legacy TownRumor representation

The repo already has:

```text
modern RumorSystem
+
legacy TownRumor[]
```

Civic must treat the **modern RumorSystem / Actor knowledge** as canonical.

Do not create a third political rumor system.

Legacy `TownRumor[]` may remain a compatibility/presentation projection for now.

---

## Role-dependent Actor IDs

Current town Actor identity includes role.

That is deeper identity debt.

Do not migrate all Actor IDs for this feature.

Instead, Mayor is modeled as a separate office relationship so the Actor's stable role never changes.

Document the broader debt for later.

---

## Large SnakeGame orchestration

Do not turn this project into a total `SnakeGame` decomposition.

Move new domain logic into CivicService and use clean seams.

Leave broader orchestration cleanup for a project that actually needs it.

---

# 10. Existing Systems Civic Must Reuse

## Actor System

Use persistent `Actor` for:

- Mayor/civic official
- voters
- opinions
- moods
- memories
- schedules
- presence
- health/death
- speech
- save/load

Do not create:

```text
ElectionNpc
MayorNpc
VoterNpc
```

---

## WorldEvent pipeline

Campaign actions should produce one canonical event.

Do **not** directly mutate:

```text
Actor opinion
Actor memory
Town rumor
```

in three separate places.

Flow:

```text
campaign action
    ↓
WorldEvent
    ↓
Actor consequences / memories
    ↓
RumorSystem
    ↓
normal sharing / knowledge
```

Add civic WorldEvent types or a restrained civic event family.

Examples:

```text
campaign-handshake
campaign-button
campaign-smear
campaign-round
mayoral-election-result
```

The exact type set may be collapsed if the existing WorldEvent conventions suggest a cleaner representation.

---

## RumorSystem

Use normal RumorSystem behavior for campaign word-of-mouth.

Campaign events should intentionally map to normal rumor creation.

Do not fake rumor eligibility by giving harmless campaign events absurd severity values.

Add campaign tags/types to the normal rumor policy where needed.

---

## World Atmosphere

Canonical election timing uses:

```text
worldDay
dayPhase
```

Tavern rest already advances canonical atmosphere.

No:

```text
campaignTimerMs
campaignTicksRemaining
```

---

## Town interior layers

Town Hall is a normal:

```text
townInterior
```

with:

```text
LayerEntrance
LayerTemplateId = townHall
```

No `TownHallScene`.

---

## Town service/business policy

Extend the existing service-hours/schedule abstraction with:

```text
civic-office
```

Suggested policy:

```text
dawn: prepare / go to Town Hall
day: work
dusk: go home / socialize
night: sleep

public hours: day
```

Town Hall opening behavior and the civic official's schedule should use the same policy.

---

## Shop pricing

Business First composes a **town-local** civic scalar at the final local shop pricing boundary.

Do not alter the global derived shop scalar.

---

# 11. Town Hall Product

Every physical human town receives exactly one Town Hall.

It is mandatory civic infrastructure.

Do not treat it as optional leftover commercial placement.

---

## Exterior

Town Hall:

- is in the town center;
- has a recognizable exterior;
- has an enterable door;
- is public during civic hours;
- appears in the normal town building collection.

---

## Interior

MVP needs:

```text
public entrance
front desk / civic area
Mayor/civic official desk
chairs / municipal dressing
exit
```

No government simulation required.

The product requirement is:

> The player physically enters City Hall and finds the sitting Mayor at work.

---

# 12. Civic Official and Mayor Office

## Stable person

Do **not** create a mutable Actor role named `mayor`.

Current Actor identity incorporates role.

Changing the incumbent from `mayor` to `resident` after losing can create identity problems / duplicate Actors.

Instead introduce a stable generated town role such as:

```text
civicOfficial
```

That person remains the same Actor before and after an election.

---

## Dynamic office

Mayor is a civic office relationship:

```ts
type CivicOfficeHolder =
  | { kind: 'actor'; actorId: string }
  | { kind: 'player'; playerId: string }
  | { kind: 'vacant' };
```

Civic state answers:

```text
Who is Mayor right now?
```

Actor role answers:

```text
Who is this person?
```

---

## Former Mayor

If the incumbent loses:

- they remain alive and persistent;
- Actor ID stays unchanged;
- they stop holding Mayor office;
- they stop using the active Mayor work assignment if appropriate;
- they get former-Mayor dialogue;
- they return to a normal civic-official/home/social schedule.

Do not delete them.

---

# 13. Civic Runtime State

After the TownRuntimeStore cleanup, civic becomes a normal town-runtime slice.

Conceptually:

```ts
interface TownCivicState {
  mayor: CivicOfficeHolder;

  activeElection?: TownElectionState;
  electionHistory: TownElectionResult[];

  enactedPlatformId?: MayoralPlatformId;

  dailyPolicyState?: {
    communityBeerRedeemedDay?: number;
  };
}
```

No town reputation copies.

No Actor opinion copies.

No rumor copies.

---

# 14. Campaign Runtime State

Keep election-specific state narrow:

```ts
interface TownElectionState {
  id: string;
  townId: string;

  incumbentActorId?: string;
  candidatePlayerId: string;

  platformId: MayoralPlatformId;

  declaredAtWorldDay: number;
  resolveAtWorldDay: number;

  boughtRound: boolean;

  voterActions: Record<string, VoterCampaignState>;
}
```

Per-voter:

```ts
interface VoterCampaignState {
  shookHands: boolean;

  buttonAttempted: boolean;
  buttonOutcome?: 'hard-refusal' | 'polite-refusal' | 'wearing';

  smearAttempted: boolean;
  smearOutcome?: 'landed' | 'neutral' | 'backfired';
}
```

Do not duplicate normal social state here.

---

# 15. Campaign Eligibility Rules

The player may run in a town when:

- it is a human town with civic infrastructure;
- the player is not already Mayor there;
- the player has never previously been a candidate there;
- no active election already involves that player;
- MVP allows only one active player mayoral campaign globally.

The player may later be Mayor of multiple towns sequentially.

Example:

```text
Mayor of Brinewick
→ travel to Mossford
→ run there
→ potentially become Mayor of both
```

All enacted policies therefore must remain town-local.

---

# 16. One Run Per Town

Win or lose:

```text
electionHistory contains this player candidacy
→ player can never run here again
```

They must find another town.

This keeps campaigns consequential and encourages world travel.

---

# 17. Declaring Candidacy

The sitting Mayor/civic official exposes:

```text
Run for Mayor
```

through the existing Actor interaction menu.

Selecting it:

1. begins declaration dialogue;
2. asks the player to choose a platform;
3. creates the active election;
4. records the target resolution dawn.

---

# 18. Election Timing

Declaration:

```ts
declaredAtWorldDay = currentWorldDay;
resolveAtWorldDay = currentWorldDay + 2;
```

Resolution phase:

```text
dawn
```

Example:

```text
Night Day 5: declare
Day 6: full campaign day
Dawn Day 7: election resolves
```

The player is guaranteed at least one full campaign day.

---

## Resolution rules

Election resolution must work through:

- normal time passage;
- tavern rest;
- large time skips;
- player outside town;
- save/load immediately before resolution;
- load after the target resolution time.

Resolution must be idempotent.

An election resolves once.

---

# 19. Campaign Verb 1 — Shake Hands

Available:

- only during the active campaign in this town;
- only for eligible town residents;
- once per NPC.

Product meaning:

```text
"I personally met the candidate."
```

Outcome:

- small positive social effect;
- campaign memory / WorldEvent;
- modest support benefit.

No repeated farming.

After use:

```text
Shake Hands — Already met
```

or the verb disappears.

---

# 20. Campaign Verb 2 — Offer Campaign Button

Available once per eligible NPC.

Exactly three outcomes.

## Hard refusal

```text
"Absolutely not."
```

Effects:

- no button;
- strong opposition signal;
- may worsen opinion slightly.

## Polite refusal

```text
"No thanks, but good luck."
```

Effects:

- no button;
- little/no social penalty;
- still not publicly endorsing the player.

## Accept and wear

```text
"Sure. You've got my vote."
```

Effects:

- campaign state becomes `wearing`;
- bottom-left campaign button appears immediately;
- resident becomes a committed public supporter;
- positive campaign event/memory is emitted;
- normal word-of-mouth may spread.

There is no accept-without-wearing state.

---

## Button determinism

Outcome may consider:

```text
Actor opinion
town reputation
handshake status
platform affinity
known public record
known campaign rumors
personality
seeded uncertainty
```

Use a stable seed such as:

```text
electionId + actorId + button
```

Reloading cannot reroll the same person's answer.

---

## Button truth

A worn button should be a truthful strong support signal.

For MVP:

> A living eligible Actor still wearing the button at election resolution votes for the player.

If the Actor becomes:

```text
dead
or
explicitly player-hostile
or
subject to an endorsement-revoked civic consequence
```

the button should be removed.

Do not leave a hostile NPC wearing your campaign pin.

---

# 21. Campaign Verb 3 — Talk Shit About the Mayor

High risk, high reward.

Available once per eligible NPC.

The player attacks the incumbent's record.

Possible outcomes:

## Landed

- strong support swing;
- listener becomes more favorable to player;
- listener becomes less favorable to incumbent;
- anti-incumbent campaign event/rumor may spread.

## Neutral

```text
"I don't know about that."
```

Little change.

## Backfired

- player resentment rises;
- listener moves toward incumbent;
- counter-rumor may spread:

```text
"Candidate Snake spends all day badmouthing the Mayor."
```

This action should be significantly stronger and riskier than Shake Hands.

---

# 22. Campaign Verb 4 — Buy Everyone a Round

Available through the bartender when:

- campaign active in this town;
- not already used this election;
- tavern service is available;
- player can afford it.

Cost:

```text
20 × canonical resolved beer price
```

Do not duplicate the beer base cost inside civic code.

---

## Effects

Only Actors physically present in the tavern receive the direct social benefit.

Effects:

- strong positive local opinion/mood impact;
- campaign memories;
- one loud campaign WorldEvent;
- favorable rumor may spread town-wide through normal RumorSystem behavior.

Residents outside the tavern receive no direct benefit.

They may hear about it later.

---

## Atomicity

If the player cannot afford it:

```text
no charge
no social effect
no rumor
round remains available
```

---

# 23. Campaign Word-of-Mouth

Campaign actions emit normal WorldEvents.

Examples:

```text
Debbie is openly supporting Candidate Snake.
Candidate Snake bought everyone at the Copper Ladle a round.
Candidate Snake made a convincing case against Mayor Jenkins.
Candidate Snake's attack on Mayor Jenkins backfired.
```

RumorSystem handles:

- town scope;
- Actor knowledge;
- sharing;
- persistence;
- deduplication.

Civic scoring reads the canonical knowledge state.

Do not read legacy `TownRumor[]` as election truth.

---

# 24. Campaign Button Presentation

Add a bottom-left Actor adornment.

Layout:

```text
ABOVE:
speech / Zzz / urgent indicators

BOTTOM-RIGHT:
activity prop

BOTTOM-LEFT:
campaign / affiliation badge
```

CivicService owns:

```text
whether this Actor currently wears the button
```

Actor presentation receives that as context.

Renderer only renders the badge.

No election logic in:

```text
SnakeRenderer
FirstPersonRenderer
```

---

# 25. Platforms

Initial platforms:

```text
Law & Order
Business First
People First
Community & Celebration
```

A platform does two jobs:

1. influence voter affinity;
2. become automatically enacted if the player wins.

Define platforms in a registry.

Conceptually:

```ts
interface MayoralPlatformDefinition {
  id: MayoralPlatformId;
  name: string;
  description: string;

  voterAffinity(context: PlatformVoterContext): number;
  policy: TownCivicPolicy;
}
```

Do not create a giant election switch.

---

# 26. Law & Order

## Campaign appeal

Positive with:

- guards;
- lawful personalities;
- merchants worried about crime;
- frightened residents;
- towns suffering crime/danger;
- clean public player history.

Negative if publicly known for:

- high wanted level;
- theft;
- murder;
- repeated violence;
- poor local reputation.

---

## Secret Thieves Guild interaction

If:

```text
publicly clean
+ secretly in Thieves Guild
```

then:

- guards may support the clean Law & Order candidate;
- thieves who know the guild connection may strongly support a guild ally in City Hall.

If guild affiliation becomes publicly known:

```text
guard support may sharply fall
```

This is an explicit regression test.

---

## Enacted policy

Expose through `TownPolicyModifiers`.

Suggested MVP:

```text
guardPresenceBonus > 0
crimePressureScalar < 1
```

There must be at least one **visible** immediate effect.

Preferred:

> More visible guard presence/patrol activity in the governed town.

Do not permanently mutate generated `town.danger`.

---

# 27. Business First

## Appeal

Positive with:

- merchants;
- practical/status-hungry Actors;
- prosperous residents;
- residents impressed by player commercial success.

Potentially negative with:

- poor/cynical residents;
- anti-merchant personalities.

---

## Enacted policy

Recommended:

```text
town-local merchant price discount
```

Target example:

```text
15%
```

Compose the civic scalar at the local shop pricing boundary.

Never modify global shop prices.

---

# 28. People First

## Appeal

Positive from:

- high town reputation;
- broad Actor trust/respect/affection;
- helpful memories;
- ordinary resident support.

Weak for a pure outsider.

---

## Enacted policy

Recommended:

```text
positive town reputation gains get a modest multiplier
positive Actor opinion gains get a modest multiplier
```

Town-local only.

Also provide an immediate visible consequence after victory:

> ordinary resident barks/reactions become noticeably warmer.

---

# 29. Community & Celebration

Official name:

```text
Community & Celebration
```

Everyone calls it:

```text
Free Beer Fridays
```

## Appeal

Positive with:

- bartender;
- social personalities;
- hungry/playful residents;
- festival-minded residents.

Negative with:

- severe bureaucrats;
- highly practical residents;
- people focused on an active serious crisis.

---

## Enacted policy

Recommended:

```text
Mayor receives one free basic beer per world day from local tavern
+ modest town-local social/tavern benefit
```

Track redemption using canonical `worldDay`.

No reopen-dialogue exploit.

Buying the campaign round while running on this platform should provide a small synergy.

---

# 30. Incumbent Support

Do not give the incumbent a flat arbitrary 50 support points.

Create deterministic/persisted incumbent approval from town conditions.

Possible inputs:

```text
prosperity
danger
town mood / active crisis
civic official personality
```

Individual voter inclination may then add:

```text
role
personality
known rumors
current town crisis
```

MVP does not require a full Actor-to-Actor relationship graph for the incumbent.

---

# 31. Voter Enumeration

Voters come from persistent Actors.

Do not enumerate:

```text
currently rendered NPCs
materialized NPC bodies
current room residents only
```

Use:

```ts
ActorSystem.getActorsForTown(townId)
```

Then CivicService filters eligibility.

Suggested MVP voter requirements:

- Actor belongs to this town;
- Actor represents a town resident;
- Actor is living;
- Actor is not the incumbent candidate;
- Actor has not been duplicated through materialization;
- Actor ID is the ballot identity.

Dead Actors do not vote.

---

# 32. Ballot Resolution

Use a pure voter resolver.

Conceptually:

```ts
resolveVoterBallot({
  voter,
  town,
  civicState,
  election,
  publicPlayerState,
  knownRumors,
  incumbentApproval,
})
```

Output:

```ts
interface VoterBallotResult {
  actorId: string;
  vote: 'player' | 'incumbent';

  challengerScore: number;
  incumbentScore: number;

  reasons: ElectionReason[];
}
```

`reasons` are for tests/debugging.

Do not expose exact scoring as a polling UI in MVP.

---

## Suggested challenger inputs

```text
town reputation
Actor trust
Actor respect
Actor affection
Actor resentment/fear penalties
handshake state
button endorsement
smear outcome
platform affinity
known campaign rumors
known player public record
small deterministic uncertainty
```

---

## Determinism

Do not consume unrelated global RNG.

Use stable voter uncertainty:

```text
electionId
+ actorId
+ resolution
```

Same saved world state resolves to the same result.

---

# 33. Election Outcome

Persist enough election history to enforce the one-run rule and report results.

Conceptually:

```ts
interface TownElectionResult {
  electionId: string;
  townId: string;
  playerId: string;

  incumbentActorId?: string;
  platformId: MayoralPlatformId;

  resolvedAtWorldDay: number;

  playerVotes: number;
  incumbentVotes: number;

  winner: 'player' | 'incumbent' | 'player-unopposed';
}
```

Full ballot breakdown can be retained for diagnostics/runtime tests without bloating permanent save format if desired.

---

# 34. Office Vacancy

The office may be:

```text
actor-held
player-held
vacant
```

The system must tolerate vacancy.

If the incumbent dies during an active election:

- the election remains valid;
- the dead incumbent is not an eligible final candidate;
- the player effectively runs against a vacant office.

Do not build a complete succession simulation for MVP.

Just make vacancy representable and safe.

---

# 35. If the Player Loses

- incumbent remains Mayor;
- election enters history;
- enacted platform does not change;
- campaign supporter buttons clear;
- player can never run here again;
- incumbent gets victory dialogue;
- result becomes normal civic/world announcement data.

---

# 36. If the Player Wins

Immediately:

- office holder becomes player;
- incumbent Actor remains a persistent former Mayor/civic official;
- election enters history;
- campaign buttons clear after result;
- chosen platform becomes enacted;
- town-local policy modifiers activate;
- town/Mayor dialogue recognizes the player as Mayor;
- result is exposed through normal announcement/event presentation.

No legislature required.

Snake Mayor promised it.

Snake Mayor enacted it.

---

# 37. Result Presentation / Notices

Do not append election results into generated town notice data and hope they persist.

Dynamic civic notices should be **projected from persisted civic/world-event state**.

Examples:

```text
SNAKE DEFEATS JENKINS, 9–6
MAYOR JENKINS HOLDS OFFICE, 11–4
```

Town notice/bulletin presentation can combine:

```text
generated static notices
+
runtime/world-event/civic announcements
```

Do not create another independently persisted notice array unless the existing notice architecture is intentionally generalized.

---

# 38. Initial Mayor Recognition

Victory needs visible payoff even before construction exists.

At minimum:

- former Mayor acknowledges defeat;
- Town Hall recognizes player as office holder;
- ordinary residents occasionally call the player "Mayor";
- enacted platform effect is active;
- relevant merchant/tavern/guard behavior reflects policy.

Avoid adding a permanent giant Mayor HUD.

Show governance through the town.

---

# 39. Mayor Voice States

The civic official / former Mayor should have dedicated world-aware conversation buckets.

Suggested states:

```text
ordinary incumbent
declaration
campaign comfortably ahead
campaign close
campaign behind
incumbent victory
incumbent defeat
former mayor
player already mayor
player already ran here
vacant-office fallback where appropriate
```

Use the existing Actor voice/conversation architecture.

No scene-local dialogue switch.

---

# 40. Testing Philosophy

This feature is test-forward.

Use pure tests for deterministic domain rules.

Use `HeadlessScenario` for player-observable stories.

Do not boot Phaser to prove election legality.

Do not test the primary acceptance flow by calling private CivicService helpers directly when the real player reaches the behavior through Actor interaction verbs.

---

# 41. Cleanup Tests — Town Runtime Store

Before civic feature work proceeds, prove:

```text
crime update does not erase gate state
gate update does not erase reputation
guild update does not erase unrelated runtime state
runtime save/load round-trips
```

Then add civic:

```text
active election
→ open gate
→ election survives

active election
→ commit crime
→ election survives

active election
→ complete guild job
→ election survives
```

This is the key regression that justifies Cleanup PR 1.

---

# 42. Cleanup Tests — Interior Catalog

Catalog health test:

For every registered town interior definition:

- building kind unique where expected;
- template maps to known district;
- service policy ID exists when specified;
- public access defined;
- generated building/template metadata agrees with catalog.

Town Hall-specific:

```text
every physical human town has exactly one Town Hall
Town Hall is in town center
Town Hall has a layer entrance
Town Hall uses townHall template
```

Existing deterministic town-generation tests remain green.

---

# 43. Cleanup Tests — Actor Interaction Composition

Characterize current menus before refactor.

For representative Actors:

```text
ordinary resident
bartender
merchant
guard
hostile humanoid
relationship-capable humanoid
quest giver
```

Assert existing verbs/options remain equivalent after compositional split.

Then civic tests prove civic options appear without altering unrelated options.

---

# 44. Pure Civic Tests

Suggested:

```text
src/civic/__tests__/
  electionTiming.test.ts
  campaignOutcome.test.ts
  voterSupport.test.ts
  platformAffinity.test.ts
  townPolicyModifiers.test.ts
```

Cover:

- declaration day + 2;
- dawn resolution;
- deterministic ballots;
- dead voter exclusion;
- button support guarantee;
- public-vs-secret information;
- platform affinity;
- incumbent approval;
- one active campaign globally;
- one candidacy per town;
- vacancy safety;
- town-local platform modifiers.

---

# 45. Mayor Actor Life Test

Headless:

```text
Given a generated human town

At day:
the civic official holding Mayor office works inside Town Hall

At night:
they follow normal off-hours/home behavior

After save/load:
same Actor identity remains
same office holder remains
no duplicate civic official exists
```

After player victory:

```text
same incumbent Actor remains alive
office holder changes to player
former Mayor no longer behaves as current Mayor
Actor ID remains unchanged
```

---

# 46. Declaration Story

## `CIVIC-STORY-001`

```text
Given I enter a generated human town
And enter Town Hall
And approach the sitting Mayor

Then "Run for Mayor" is available

When I select it
And choose Law & Order

Then a town election exists
And I am the candidate
And Law & Order is the platform
And resolution is dawn two world days later
```

Interacting again:

```text
Run for Mayor
→ unavailable
```

---

# 47. One Candidacy Per Town Story

After victory or defeat:

```text
attempt to declare again in same town
→ rejected
```

Travel to another generated town:

```text
new civic office
→ declaration available
```

---

# 48. Shake Hands Story

## `CIVIC-STORY-002`

```text
Given an active campaign
And Debbie has not been canvassed

Then Shake Hands is available

When chosen
Then one campaign WorldEvent occurs
And Debbie receives the intended social consequence/memory

When I interact again
Then Shake Hands is unavailable
```

No duplicate benefit.

---

# 49. Button Outcome Tests

Create deterministic contexts for:

```text
hard refusal
polite refusal
wearing
```

Headless acceptance:

```text
When Debbie accepts
Then civic voter state says wearing
And Actor presentation exposes campaign button
```

Refusals:

```text
no badge
```

No fourth outcome.

---

# 50. Button Word-of-Mouth Test

After a resident becomes a supporter:

- appropriate normal WorldEvent exists;
- RumorSystem may create campaign gossip;
- another Actor can learn it through normal social sharing;
- CivicService does not run a separate campaign rumor tick.

---

# 51. Button Revocation Test

Given a button-wearing supporter:

```text
When they become explicitly player-hostile
Then the public campaign endorsement is revoked
And Actor presentation no longer shows the button
```

Dead supporters likewise do not remain visually endorsed.

---

# 52. Smear Tests

## Landed

```text
listener dislikes incumbent / likes player
→ smear lands
→ support moves toward player
→ normal campaign event/rumor created
```

## Backfire

```text
listener supports incumbent
→ smear backfires
→ resentment/support moves away from player
→ counter-rumor may spread
```

Second attempt on same voter unavailable.

---

# 53. Buy-the-Round Story

## `CIVIC-STORY-005`

Given:

- active campaign;
- bartender present;
- three resident Actors physically in tavern;
- two residents elsewhere;
- enough score.

When:

```text
Buy Everyone a Round
```

Then:

- cost = `20 × resolved canonical beer price`;
- charged once;
- only present tavern residents get direct effect;
- one normal campaign WorldEvent occurs;
- rumor can spread;
- action unavailable afterward.

Insufficient score:

```text
no charge
no effects
no event/rumor
action remains available
```

---

# 54. Law & Order Spicy Meatball Regression

## `CIVIC-STORY-006 — Clean thief coalition`

Given:

```text
player wanted level = 0
player has strong public town reputation
player secretly belongs to town Thieves Guild
guild status is not publicly known
platform = Law & Order
```

Then:

```text
guard voter receives clean-record / Law & Order benefit
thief voter who knows guild affiliation receives insider benefit
guard voter receives NO secret-guild penalty
```

Then expose guild connection through normal public rumor/knowledge.

Re-score:

```text
guard support falls
```

This proves knowledge boundaries.

---

# 55. Time and Resolution Tests

Declare at night.

Advance canonical atmosphere.

Assert:

```text
not resolved before target dawn
resolved exactly once at/after target dawn
```

Repeat with:

- tavern rest;
- time skip;
- player outside town;
- save/load immediately before dawn;
- load after target time.

---

# 56. Resident Ballot Test

Construct known voter states:

```text
3 button supporters
2 strong incumbent supporters
1 undecided voter favorable to player
```

Resolve.

Assert:

- one ballot per eligible Actor ID;
- materialization does not affect voter count;
- dead resident excluded;
- current Mayor excluded as normal voter;
- no duplicate rendered NPC produces duplicate vote.

---

# 57. Victory Enacts Platform Tests

For each platform, resolve a win through normal civic flow.

Assert:

```text
player is Mayor
former Mayor no longer holds office
platform enacted
town-local effect active
another town unaffected
save/load preserves it
```

Specific examples:

## Business First

```text
merchant in governed town gets local discount
merchant in another town does not
```

## Community & Celebration

```text
Mayor gets one free local beer this world day
second same-day redemption fails
next world day succeeds
```

## People First

```text
eligible positive social/reputation gain boosted only in governed town
```

## Law & Order

```text
local guard/patrol policy active
other town unchanged
```

---

# 58. Defeat Test

Resolve loss.

Assert:

```text
incumbent remains Mayor
platform not enacted
candidate history records defeat
player cannot run again here
campaign buttons cleared
```

---

# 59. Vacancy Test

Kill incumbent during active election.

Assert:

- office can become vacant;
- election remains valid;
- dead incumbent does not receive ballots / cannot win;
- player resolves as unopposed if still eligible;
- save/load preserves safe civic state.

---

# 60. Presentation Tests

Prefer model tests over screenshot tests.

```text
wearing supporter
→ ActorPresentation receives campaign badge

hard/polite refusal
→ no campaign badge

post-election
→ no campaign badge
```

Renderer does not query CivicService.

---

# 61. Broad Headless Acceptance Test

## `CIVIC-FOUNDATION-001`

```text
Given I enter a generated human town
And enter Town Hall
And speak to the persistent civic official currently holding Mayor office

When I declare a campaign on a platform

Then election-only verbs become available to eligible residents

When I shake a resident's hand
And successfully give them a campaign button

Then Actor presentation shows that resident wearing my button

When I buy the tavern a round

Then only people physically there receive the direct benefit
And campaign word can spread through normal rumor infrastructure

When canonical time reaches dawn two days after declaration

Then every eligible living resident Actor casts exactly one ballot

If I win

Then I become Mayor
And the incumbent remains as a former Mayor/civic official
And my platform is immediately enacted
And the town visibly reflects the policy

When I save and reload

Then I am still Mayor
And the town-local policy still applies
And I cannot run in this town again
```

If this is green, the civic system exists.

If one hundred unit tests are green and this fails, we built paperwork.

---

# 62. Implementation Sequence

## Phase 0 — Characterize before burning

Add tests around:

```text
TownRuntime persistence
town generation
Actor interactions
existing town interiors
```

No behavior change yet.

---

## Phase 1 — TownRuntimeStore cleanup

Replace reconstruct-and-overwrite runtime ownership.

Preserve existing behavior.

Do not add civic until runtime slice preservation is proven.

---

## Phase 2 — Town interior metadata cleanup

Introduce the small interior definition catalog.

Migrate existing template/district/service metadata.

Keep authored geometry.

---

## Phase 3 — Actor interaction composition

Split menu contributions by domain.

Characterization tests prove existing menus remain functionally equivalent.

---

## Phase 4 — Civic domain

Create approximately:

```text
src/civic/
  civicTypes.ts
  civicService.ts
  electionResolver.ts
  mayoralPlatforms.ts
  townPolicyModifiers.ts
```

Start pure.

No presentation.

---

## Phase 5 — Town Hall + civic official

Add:

```text
TownBuildingKind: townHall
LayerTemplateId: townHall
TownResidentRole / ActorRole: civicOfficial
civic-office schedule/service policy
Town Hall physical generation
Town Hall interior
```

Prove the Mayor actually lives/works correctly headlessly.

---

## Phase 6 — Declaration

Wire:

```text
Run for Mayor
```

through civic interaction contributor and normal interaction dispatch.

Add platform selection.

Persist active election in town runtime store.

---

## Phase 7 — Campaign verbs

Implement in order:

```text
Shake Hands
Offer Campaign Button
Talk Shit About Mayor
Buy Everyone a Round
```

Each gets pure tests + headless story before next.

All social consequences flow through WorldEvents.

---

## Phase 8 — Campaign presentation + rumors

Add:

```text
bottom-left campaign badge
campaign voice/barks
campaign WorldEvent → rumor mappings
```

No renderer election logic.

---

## Phase 9 — Election resolution

Connect CivicService to canonical world-time transition seam.

Resolve persistent Actor ballots deterministically.

Handle vacancy and save/load.

---

## Phase 10 — Victory / defeat

Implement:

```text
office transfer
former Mayor
button cleanup
election history
result announcement
one-run enforcement
```

---

## Phase 11 — Platform enactment

Implement one real town-local effect for each platform.

Every effect:

- meaningful;
- preferably visible;
- local;
- derived through TownPolicyModifiers;
- persistent.

---

# 63. Meryl's Scope Guardrails

The product fantasy is non-negotiable:

- real Town Hall;
- real persistent civic official / Mayor;
- real resident voters;
- visible buttons;
- four campaign verbs;
- platforms;
- two-day election;
- actual result;
- victory changes town.

MVP does **not** need:

- debates;
- campaign posters;
- polling UI;
- campaign finance;
- AI challengers;
- primaries;
- legislature;
- tax policy;
- zoning;
- player construction;
- political parties;
- campaign staff;
- separate election currency;
- full incumbent Actor-to-Actor relationship graph;
- broad Actor identity migration;
- complete rumor-system rewrite;
- complete SnakeGame decomposition.

Do not sacrifice the product.

Do not solve futures that are not here.

---

# 64. Pyromancer's Burn Rules

Burn when:

- two systems own the same mutable truth;
- adding civic requires another copy of existing state;
- one unrelated runtime update can erase another domain;
- four switches encode the same town-interior metadata;
- one giant interaction conditional keeps absorbing domains.

Do **not** burn when:

- an old compatibility projection is isolated and harmless;
- migration risk exceeds the value needed for this feature;
- the proposed rewrite is prettier but does not simplify product implementation.

---

# 65. Architectural Red Flags

Stop and reconsider if implementation introduces:

```text
SnakeScene mayor state
CampaignNPC
MayorNPC
VoterNPC
campaignRelationshipScore
campaignRumorSystem
campaignTimer
campaign points as election result
renderer querying election state
actor.flags.campaignButton as source of truth
global Mayor merchant discount
TownHallScene
mutable Mayor Actor role
direct mutation of generated town.danger for policy
civic code manually updating opinion + memory + rumor separately
civic code reading legacy TownRumor[] as voter knowledge
TownRuntimeState reconstructed from TownStructure after runtime cleanup
```

---

# 66. Definition of Done — Architecture

- [ ] Town runtime has an owner that preserves independent runtime slices.
- [ ] Town runtime updates cannot erase civic state.
- [ ] Town interior metadata duplication is reduced through a small catalog.
- [ ] Actor interaction options are composed by domain.
- [ ] Existing interaction behavior remains characterized and green.
- [ ] World-time transitions expose one canonical seam for civic resolution.
- [ ] ActorSystem exposes a town-level Actor query.
- [ ] Actor presentation can receive external affiliation/badge context.
- [ ] Civic social effects flow through WorldEvents.
- [ ] Modern RumorSystem / Actor knowledge is canonical for civic rumor knowledge.
- [ ] Platform effects are projected, town-local modifiers.
- [ ] Civic office is separate from stable Actor identity.

---

# 67. Definition of Done — Product

- [ ] Every generated human town has one enterable Town Hall.
- [ ] Every town has a safe representable Mayor office state.
- [ ] A stable persistent civic official exists as initial office holder.
- [ ] Mayor works in Town Hall on normal schedule.
- [ ] Mayor dialogue uses normal Actor conversation architecture.
- [ ] Player declares through normal Actor interaction menu.
- [ ] Player chooses one of four platforms.
- [ ] Election resolves at dawn two world days later.
- [ ] Player receives at least one full campaign day.
- [ ] Only one active player mayoral campaign globally in MVP.
- [ ] Player may only run once per town.
- [ ] Player may later become Mayor of multiple towns sequentially.
- [ ] Shake Hands is once per NPC.
- [ ] Button outcome is exactly hard refusal / polite refusal / wear.
- [ ] Accepted button physically appears bottom-left.
- [ ] Button is a truthful strong supporter signal.
- [ ] Hostile/dead supporters do not keep invalid endorsements.
- [ ] Campaign word spreads through normal WorldEvent/Rumor infrastructure.
- [ ] Talk Shit About Mayor can land, do nothing, or backfire.
- [ ] Buy a Round costs 20× canonical beer price and is once per campaign.
- [ ] Round directly affects only Actors physically present.
- [ ] Voters come from persistent town Actors.
- [ ] Each eligible Actor casts at most one ballot.
- [ ] Ballots use reputation, Actor opinion, campaign state, platform, knowledge, and incumbent support.
- [ ] Hidden guild status does not magically inform guards.
- [ ] Election resolution is deterministic from the same state.
- [ ] Incumbent death/vacancy does not break the election.
- [ ] Losing preserves incumbent office and blocks another run.
- [ ] Winning transfers Mayor office to player.
- [ ] Former Mayor remains a persistent person.
- [ ] Winning immediately enacts chosen platform.
- [ ] Every platform has a meaningful town-local effect.
- [ ] Every platform has at least one visible/obvious consequence.
- [ ] Save/load preserves election history, office, and enacted platform.
- [ ] Campaign presentation clears after election.
- [ ] `CIVIC-FOUNDATION-001` passes through real headless gameplay boundaries.
- [ ] Existing town-life and town-generation tests remain green.

---

# 68. Final Architectural Rule

> **The town generator owns what a town was born as. TownRuntimeStore owns what happened to the town. CivicService owns government and elections. Actors own people and their opinions. WorldEvents own what happened socially. RumorSystem owns what spread. Atmosphere owns time. Interaction contributors expose what the player can do. Presentation shows the consequences.**

Lil' Tony should not build a political game beside Snake.

He should clean the town seams that politics exposes, then make the existing town capable of electing a snake.
