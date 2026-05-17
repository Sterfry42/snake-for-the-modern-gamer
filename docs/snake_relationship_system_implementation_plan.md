# Snake for the Modern Gamer — Relationship System Implementation Plan

## Purpose

This document lays out implementation details for improving the dating / relationship system in *Snake for the Modern Gamer*.

The target is not to remove stats or make the system invisible. The target is to make the stats feel like they are being interpreted by **specific personalities**, remembered over time, and allowed to collide with other relationships in the world.

The guiding principle:

> A relationship system becomes interesting when two NPCs can witness the same player action and come to different emotional conclusions.

The system can remain ridiculous, stat-driven, and dating-sim-parody flavored. It just needs stronger personality interpretation, memory, cooldowns, and world-reactive consequences.

---

# 1. Core Problems Being Addressed

## 1.1 Branch choices are too obvious

Current issue:

- Date / dialogue choices can feel like obvious tiers.
- “Protect them” is good.
- “Run away” is bad.
- “Be sincere” is good.
- “Be mean” is bad.

Desired behavior:

- The choice should be interpreted through personality.
- Some NPCs should respect self-preservation.
- Some should hate heroic stupidity.
- Some should love theatrical bravery.
- Some should value honesty over charm.
- Some should enjoy danger.
- Some should be frightened by danger.

Example:

```txt
A bear crashes the date.

Choice A: Protect them.
Choice B: Run away.
Choice C: Fight together.
Choice D: Make a joke.
```

These should not have fixed universal outcomes.

Possible personality readings:

```txt
Regal:
- Protect them: Loved
- Run away: Hated
- Fight together: Liked
- Joke: Disliked

Sharp:
- Protect them: Liked
- Run away: Liked, if framed as smart survival
- Fight together: Loved, if it creates advantage
- Joke: Neutral or Liked

Deadpan:
- Protect them: Liked
- Run away: Neutral or Liked if trust is low
- Fight together: Disliked if reckless
- Joke: Liked if dry, Hated if goofy

Poetic:
- Protect them: Loved
- Run away: Hated if it feels like abandonment
- Fight together: Loved if framed romantically
- Joke: Depends on timing

Hungry:
- Protect them: Loved
- Run away: Disliked
- Fight together: Liked
- Joke: Neutral unless food-related
```

---

## 1.2 Personality affects flavor more than mechanics

Personality should not only choose dialogue lines. It should affect:

- branch choice outcomes
- gift interpretation
- hostility paths
- jealousy reactions
- breakup fallout
- apology effectiveness
- neglect responses
- proposal acceptance
- marriage fallout
- divorce outcomes
- lover-rival conflict

The same action should not always produce the same result.

---

## 1.3 Murderous state may not be reachable enough

There appears to be a mismatch between manually setting a relationship to `murderous` and derived stage logic potentially downgrading it.

If the system sets a state to murderous because of a major event, that should be respected.

Suggested fix:

```ts
flags.forceStage = "murderous";
flags.stageReason = "eatenByPlayer";
```

Then stage derivation checks:

```ts
if (state.flags.forceStage === "murderous") return "murderous";
```

This same system can support other forced stages:

```ts
flags.forceStage = "dead";
flags.forceStage = "heartbroken";
flags.forceStage = "vengeful";
```

---

## 1.4 Neglect warning spam

Current issue:

- After enough room transitions, neglected lovers can warn the player every room.
- This is annoying and turns emotional pressure into UI noise.

Desired behavior:

- Neglect should be tiered.
- Each tier should trigger once.
- New warnings should happen only when the relationship crosses a new emotional threshold.

Suggested tiers:

```ts
type NeglectTier = 0 | 1 | 2 | 3 | 4;
```

Example thresholds:

```txt
Tier 0: Normal
Tier 1: 10 rooms ignored — they notice
Tier 2: 18 rooms ignored — hurt / confrontation possible
Tier 3: 28 rooms ignored — estranged or serious resentment
Tier 4: 40 rooms ignored — personality-specific consequence
```

Each tier should store the room where it last triggered.

```ts
flags.neglectTier = 2;
flags.lastNeglectTierRoom = currentRoom;
```

Interacting positively can lower the tier or reset it.

---

## 1.5 Lover rewards should be more interesting than score

Score is acceptable for some characters, but it should not be the default lover reward.

Better reward types:

```ts
type RelationshipReward =
  | { kind: "item"; itemId: string; count: number }
  | { kind: "card"; cardId: string | "random" }
  | { kind: "perk"; perkId: string }
  | { kind: "temporaryBuff"; buffId: string; durationRooms: number }
  | { kind: "shopDiscount"; factionId?: string; rooms: number }
  | { kind: "mapHint"; roomId: string }
  | { kind: "rescueChance"; percent: number }
  | { kind: "cosmetic"; cosmeticId: string }
  | { kind: "score"; amount: number };
```

Examples:

```txt
Sharp Goblin:
- contract discount
- ward
- strange invoice item
- debt shield perk

Hungry NPC:
- cooked food
- healing item
- comfort buff

Poetic NPC:
- charm
- feather
- cosmetic
- memory-based perk

Deadpan NPC:
- practical item
- cooldown reduction
- anti-jealousy perk

Regal NPC:
- formal blessing
- combat advantage
- duel-related perk

Angel:
- mercy effect
- one-time death protection
- revive-related boon

Goblin Angel:
- legal loophole
- provisional life extension
- audit shield
```

---

# 2. Relationship Memories

## 2.1 Why memories matter

Memories are the core of the improved system.

Numbers alone cannot support:

- “You gave me the same gift three times.”
- “You ran during the bear date.”
- “You apologized after I confronted you.”
- “You flirted with someone else three rooms later.”
- “You proposed before you understood the relationship.”
- “You married someone else without telling me.”
- “They killed your spouse.”
- “Your spouse died during the bouquet quest.”

A memory log makes relationships feel continuous.

---

## 2.2 Proposed memory type

```ts
export interface RelationshipMemory {
  id: string;
  relationshipId: string;
  roomsVisited: number;

  kind:
    | "talk"
    | "gift"
    | "flirt"
    | "date"
    | "proposal"
    | "proposalRejected"
    | "marriage"
    | "child"
    | "divorce"
    | "neglect"
    | "apology"
    | "betrayal"
    | "breakup"
    | "confession"
    | "hurt"
    | "hostility"
    | "quest"
    | "rivalConflict"
    | "rivalMurder"
    | "death"
    | "deathScene";

  tags: RelationshipTag[];
  intensity: number;

  tone:
    | "positive"
    | "neutral"
    | "negative"
    | "traumatic";

  summary: string;

  // Optional cross-relationship references.
  targetRelationshipId?: string;
  itemId?: string;
  questId?: string;

  // For dedupe / once-only processing.
  uniqueKey?: string;
}
```

---

## 2.3 Example memories

```ts
{
  id: "mem_001",
  relationshipId: "village:maribel",
  roomsVisited: 42,
  kind: "gift",
  tags: ["gift", "card", "thoughtful"],
  intensity: 8,
  tone: "positive",
  itemId: "rare-card",
  summary: "You gave Maribel a rare card. She loved that you remembered."
}
```

```ts
{
  id: "mem_002",
  relationshipId: "goblin:nackle",
  roomsVisited: 48,
  kind: "date",
  tags: ["self-preserving", "pragmatic", "danger"],
  intensity: 5,
  tone: "positive",
  summary: "You ran during the bear date. Nackle respected the survival instinct."
}
```

```ts
{
  id: "mem_003",
  relationshipId: "village:maribel",
  roomsVisited: 64,
  kind: "proposalRejected",
  tags: ["commitment", "premature", "vulnerable"],
  intensity: 10,
  tone: "neutral",
  summary: "You proposed before Maribel was ready. She said no, but remembered the sincerity."
}
```

```ts
{
  id: "mem_004",
  relationshipId: "goblin:nackle",
  targetRelationshipId: "village:maribel",
  roomsVisited: 90,
  kind: "rivalMurder",
  tags: ["jealousy", "violence", "rival", "trauma"],
  intensity: 100,
  tone: "traumatic",
  summary: "Nackle killed Maribel after learning about the marriage."
}
```

---

## 2.4 Memory storage

Minimum implementation:

```ts
interface RelationshipState {
  ...
  memories?: RelationshipMemory[];
}
```

Recommended limit:

```ts
const MAX_MEMORIES_PER_RELATIONSHIP = 24;
```

Keep:

- all major memories
- latest normal memories
- traumatic memories
- relationship graph events
- proposal / marriage / divorce / child events

If trimming memories, never trim:

```ts
memory.tone === "traumatic"
memory.kind === "marriage"
memory.kind === "divorce"
memory.kind === "child"
memory.kind === "rivalMurder"
memory.kind === "death"
```

---

# 3. Relationship Tags

## 3.1 Purpose

Choices, gifts, and events should be tagged. Personalities interpret tags.

Instead of:

```ts
choice = "protect"
result = "loved"
```

Use:

```ts
choice = "protect"
tags = ["protective", "brave", "selfless", "publicAffection"]
```

Then personality determines whether that is loved, liked, neutral, disliked, or hated.

---

## 3.2 Suggested tag union

```ts
export type RelationshipTag =
  | "bravery"
  | "recklessness"
  | "selfPreserving"
  | "protective"
  | "selfless"
  | "pragmatic"
  | "honesty"
  | "avoidance"
  | "loyalty"
  | "betrayal"
  | "competence"
  | "neediness"
  | "restraint"
  | "violence"
  | "mercy"
  | "ambition"
  | "humility"
  | "transaction"
  | "ritual"
  | "deathDefiance"
  | "deathAcceptance"
  | "publicAffection"
  | "privateAffection"
  | "giftGiving"
  | "giftSpamming"
  | "neglect"
  | "rivalAttention"
  | "secrecy"
  | "commitment"
  | "premature"
  | "dramatic"
  | "clever"
  | "food"
  | "comfort"
  | "danger"
  | "contract"
  | "ledger"
  | "holy"
  | "goblin"
  | "camp"
  | "marriage"
  | "family"
  | "divorce";
```

Add tags as needed. It is fine if this grows.

---

# 4. Personality Interpretation

## 4.1 Personality should produce outcome tier

Define outcome tier:

```ts
export type RelationshipOutcomeTier =
  | "loved"
  | "liked"
  | "neutral"
  | "disliked"
  | "hated";
```

Simpler implementation:

```ts
type PersonalityTagWeights = Partial<Record<RelationshipTag, number>>;
```

Then calculate score:

```ts
function interpretTags(
  personality: RelationshipPersonality,
  state: RelationshipState,
  tags: RelationshipTag[],
): RelationshipOutcomeTier {
  const score = tags.reduce((sum, tag) => sum + getWeight(personality, tag, state), 0);

  if (score >= 10) return "loved";
  if (score >= 4) return "liked";
  if (score <= -10) return "hated";
  if (score <= -4) return "disliked";
  return "neutral";
}
```

---

## 4.2 Example personality weights

```ts
const personalityWeights = {
  poetic: {
    dramatic: +3,
    honesty: +4,
    privateAffection: +3,
    commitment: +4,
    bravery: +2,
    selfPreserving: -2,
    avoidance: -4,
    betrayal: -8,
    giftSpamming: -5,
  },

  deadpan: {
    honesty: +4,
    competence: +3,
    pragmatic: +4,
    clever: +2,
    dramatic: -3,
    neediness: -2,
    giftSpamming: -4,
    publicAffection: -1,
  },

  hungry: {
    food: +6,
    comfort: +4,
    protective: +3,
    loyalty: +4,
    neglect: -5,
    betrayal: -8,
    selfPreserving: -1,
  },

  regal: {
    bravery: +4,
    protective: +4,
    ritual: +5,
    commitment: +5,
    humility: +3,
    avoidance: -4,
    publicAffection: +2,
    betrayal: -10,
    secrecy: -6,
  },

  sharp: {
    clever: +5,
    pragmatic: +5,
    selfPreserving: +3,
    transaction: +4,
    contract: +5,
    competence: +4,
    dramatic: -1,
    neediness: -3,
    betrayal: -7,
  },
};
```

---

# 5. Branch Choices

## 5.1 Branch choice structure

```ts
interface DatingBranchChoice {
  id: string;
  label: string;
  line: string;

  tags: RelationshipTag[];

  // Optional specific text per outcome tier.
  outcomeLines?: Partial<Record<RelationshipOutcomeTier, string>>;

  // Optional special result.
  effect?: "escape" | "protect" | "gift" | "quest" | "hostility" | "none";
}
```

---

## 5.2 Branch resolution

```ts
function resolveBranchChoice(
  state: RelationshipState,
  choice: DatingBranchChoice,
): RelationshipEventResult {
  const tier = interpretTags(state.personality, state, choice.tags);
  const delta = deltaForTier(tier, choice.tags, state);
  const memory = createMemoryFromBranch(state, choice, tier, delta);

  return applyRelationshipEvent(state.id, {
    kind: "date",
    tags: choice.tags,
    tier,
    delta,
    memory,
  });
}
```

---

## 5.3 Tier deltas

Suggested default:

```ts
const TIER_DELTAS = {
  loved: {
    affection: +8,
    trust: +4,
    fascination: +3,
    resentment: -3,
  },
  liked: {
    affection: +4,
    trust: +2,
    fascination: +1,
  },
  neutral: {
    fascination: +1,
  },
  disliked: {
    affection: -3,
    trust: -2,
    resentment: +3,
  },
  hated: {
    affection: -8,
    trust: -6,
    resentment: +8,
    jealousy: +2,
  },
};
```

Then adjust by personality if desired.

---

# 6. Conflict Styles and Hostility Paths

## 6.1 Add conflict style

```ts
export type ConflictStyle =
  | "heartbroken"
  | "withdrawn"
  | "vengeful"
  | "murderous"
  | "petty"
  | "formalDuel"
  | "contractual"
  | "forgiving";
```

Each candidate can have one generated or assigned.

```ts
interface RelationshipState {
  ...
  conflictStyle: ConflictStyle;
}
```

If the system already has personality and species but no conflict style, derive it from both.

```ts
function deriveConflictStyle(profile: RelationshipCandidateProfile): ConflictStyle {
  if (profile.species === "goblin-angel") return "contractual";
  if (profile.species === "angel") return "formalDuel";

  switch (profile.personality) {
    case "poetic": return "heartbroken";
    case "deadpan": return "withdrawn";
    case "hungry": return "forgiving";
    case "regal": return "formalDuel";
    case "sharp": return profile.species === "goblin" ? "contractual" : "vengeful";
    default: return "withdrawn";
  }
}
```

---

## 6.2 Conflict outcomes

When a relationship goes bad, choose path by conflict style.

```ts
function resolveConflictEscalation(state: RelationshipState): RelationshipStage {
  if (state.flags.forceStage) return state.flags.forceStage;

  switch (state.conflictStyle) {
    case "heartbroken":
      if (state.resentment >= 70) return "heartbroken";
      return "estranged";

    case "withdrawn":
      if (state.trust <= -30) return "estranged";
      return "friendly";

    case "vengeful":
      if (state.resentment >= 80) return "hostile";
      return "estranged";

    case "murderous":
      if (state.resentment >= 80 && state.jealousy >= 70) return "murderous";
      return "hostile";

    case "petty":
      return "vengeful";

    case "formalDuel":
      if (state.trust <= -30 || state.resentment >= 70) return "hostile";
      return "estranged";

    case "contractual":
      if (state.resentment >= 80) return "hostile";
      return "estranged";

    case "forgiving":
      if (state.resentment >= 90 && state.trust <= -60) return "heartbroken";
      return "estranged";
  }
}
```

If `heartbroken` and `vengeful` are not actual relationship stages yet, they can be flags or tab descriptors.

---

# 7. Neglect Tiers

## 7.1 State fields

Add either as flags or top-level fields:

```ts
flags.neglectTier: 0 | 1 | 2 | 3 | 4;
flags.lastNeglectTierRoom: number;
```

---

## 7.2 Tier calculation

```ts
function calculateNeglectTier(roomsSinceSeen: number): NeglectTier {
  if (roomsSinceSeen >= 40) return 4;
  if (roomsSinceSeen >= 28) return 3;
  if (roomsSinceSeen >= 18) return 2;
  if (roomsSinceSeen >= 10) return 1;
  return 0;
}
```

---

## 7.3 Applying tier changes

Only apply effects when tier increases.

```ts
function tickNeglect(state: RelationshipState, currentRoom: number): RelationshipState {
  if (!isSeriousRelationship(state)) return state;

  const roomsSinceSeen = currentRoom - state.lastSeenRoomsVisited;
  const nextTier = calculateNeglectTier(roomsSinceSeen);
  const currentTier = state.flags.neglectTier ?? 0;

  if (nextTier <= currentTier) return state;

  const updated = applyNeglectTierEffect(state, nextTier);
  updated.flags.neglectTier = nextTier;
  updated.flags.lastNeglectTierRoom = currentRoom;

  updated.memories.push({
    id: makeMemoryId(),
    relationshipId: state.id,
    roomsVisited: currentRoom,
    kind: "neglect",
    tags: ["neglect", "avoidance"],
    intensity: nextTier * 10,
    tone: nextTier >= 3 ? "negative" : "neutral",
    summary: neglectSummaryFor(updated, nextTier),
    uniqueKey: `neglect:${state.id}:${nextTier}`,
  });

  return updated;
}
```

---

# 8. Relationship Graph Awareness

## 8.1 Core concept

The system should not only evaluate:

```txt
Snake ↔ NPC
```

It should evaluate:

```txt
Snake ↔ NPC A
Snake ↔ NPC B
NPC A knows about NPC B
NPC B has opinions about NPC A
Marriage to NPC C changes NPC A and NPC B
```

Every major relationship event should ask:

> Who else would care about this?

---

## 8.2 Commitment rules

Recommended:

```ts
type RelationshipCommitment =
  | "none"
  | "crush"
  | "dating"
  | "lover"
  | "spouse"
  | "ex"
  | "dead";
```

Rules:

```txt
You can have many crushes.
You can date multiple people.
You can have multiple lovers.
You can only have one spouse.
Dead romances remain in history.
```

---

## 8.3 Relationship social context

```ts
interface RelationshipSocialContext {
  spouseId?: string;
  lovers: string[];
  dating: string[];
  crushes: string[];
  exes: string[];
  deadRomances: string[];
}
```

---

## 8.4 Exclusivity preference

Each NPC should have an exclusivity preference.

```ts
type ExclusivityPreference =
  | "open"
  | "tolerant"
  | "jealous"
  | "possessive"
  | "monogamous"
  | "territorial"
  | "transactional"
  | "devotional";
```

Derive from personality/species unless explicitly assigned.

```ts
function deriveExclusivityPreference(profile: RelationshipCandidateProfile): ExclusivityPreference {
  if (profile.species === "goblin-angel") return "transactional";
  if (profile.species === "angel") return "monogamous";

  switch (profile.personality) {
    case "deadpan": return "tolerant";
    case "poetic": return "devotional";
    case "hungry": return "jealous";
    case "regal": return "monogamous";
    case "sharp": return profile.species === "goblin" ? "transactional" : "possessive";
    default: return "jealous";
  }
}
```

---

# 9. Marriage, Proposal, Bouquet Quest

## 9.1 Proposal availability

Show `Propose` only when:

```txt
stage === lover
```

Option can appear before acceptance conditions are met. That is funny and useful.

Acceptance conditions:

```ts
function canAcceptProposal(state: RelationshipState): boolean {
  return (
    state.stage === "lover" &&
    state.affection >= 100 &&
    state.trust >= 70 &&
    state.resentment < 20 &&
    state.jealousy < 30 &&
    !hasUnresolvedMajorBetrayal(state)
  );
}
```

If rejected, create memory:

```ts
kind: "proposalRejected"
tags: ["commitment", "premature"]
summary: "You proposed before they were ready."
```

---

## 9.2 Only one spouse

Before accepting proposal or completing wedding:

```ts
const currentSpouse = getCurrentSpouse();

if (currentSpouse && currentSpouse.id !== state.id) {
  return {
    ok: false,
    message: "You are already married.",
  };
}
```

Alternatively, allow attempted proposal while married but cause fallout:

```txt
Confess existing marriage
Lie
Ask them to be lover anyway
Divorce spouse first
Leave
```

---

## 9.3 Bouquet quest

Accepted proposal starts a quest:

```ts
interface RelationshipQuest {
  id: string;
  relationshipId: string;
  kind: "weddingBouquet";
  targetBiome: "cold";
  minDistanceRooms: 7;
  maxDistanceRooms: 15;
  targetItemId: "deepLyingBouquet";
  status: "active" | "completed" | "failed";
}
```

Suggested item names:

```txt
Deep-Lying Bouquet
Frost-Buried Bouquet
The Last Warm Flowers
Bouquet Beneath the Snow
Marriage Weed
```

Quest summary:

```txt
Find the Deep-Lying Bouquet 7–15 rooms into the cold region and bring it back to complete the wedding.
```

---

# 10. Marriage, Family, Divorce

## 10.1 Marriage

Completing bouquet quest:

```ts
state.stage = "married"; // or "spouse"
state.flags.married = true;
state.flags.marriedRoom = currentRoom;
```

Create memory:

```ts
kind: "marriage"
tags: ["commitment", "ritual", "marriage"]
tone: "positive"
summary: "You married them after bringing back the Deep-Lying Bouquet."
```

Marriage should unlock:

- spouse cutscenes
- spouse-specific rewards
- family tab/actions
- higher jealousy stakes
- divorce option
- possible kid option

---

## 10.2 Kid option

Available after:

```txt
stage === married
roomsSinceMarriage >= threshold
trust >= threshold
resentment low
```

Possible child types:

```txt
Egg
Snakelet
Adopted goblin child
Cosmic child
Legally recognized family unit
```

Implementation:

```ts
interface RelationshipChild {
  id: string;
  parentRelationshipId: string;
  name: string;
  type: "egg" | "snakelet" | "adoptedGoblin" | "cosmic" | "legalUnit";
  createdRoom: number;
  memories: RelationshipMemory[];
}
```

Kid effects:

- family encounter
- small passive perk
- emotional stakes for divorce/death
- weird drawings that can be items/buffs

---

## 10.3 Divorce

Available when married.

```txt
Talk
Gift
Date
Family
Discuss Other Lovers
Divorce
Leave
```

Divorce creates major memory:

```ts
kind: "divorce"
tags: ["divorce", "commitment", "betrayal"]
tone: "negative"
summary: "You divorced them."
```

Personality determines fallout.

---

# 11. Rivalry and Lover-on-Lover Reactions

## 11.1 Rival opinions

Full NPC-to-NPC simulation is not necessary. Start with lightweight rival flags.

```ts
interface RivalOpinion {
  targetId: string;
  jealousy: number;
  respect: number;
  hatred: number;
  fear: number;
  lastIncidentRoom: number;
  flags: Record<string, boolean>;
}
```

Or simpler:

```ts
state.flags[`rival.${otherId}.seen`] = true;
state.flags[`rival.${otherId}.hatred`] = 40;
```

---

## 11.2 Marriage fallout pass

When the player marries someone, evaluate all existing lovers.

```ts
function resolveMarriageFallout(newSpouseId: string): RelationshipConsequence[] {
  const lovers = getSeriousRelationships().filter(r => r.id !== newSpouseId);

  return lovers.flatMap(lover =>
    evaluateMarriageFallout(lover, newSpouseId)
  );
}
```

Possible fallout:

```ts
type MarriageFallout =
  | "accepts"
  | "congratulates"
  | "demandsChoice"
  | "heartbroken"
  | "breaksUp"
  | "becomesEx"
  | "becomesRival"
  | "sabotagesMarriage"
  | "attacksPlayer"
  | "attacksSpouse"
  | "killsSpouse"
  | "leavesForever";
```

---

## 11.3 Rival murder event

Rare but important.

Trigger conditions:

```txt
Actor is lover/ex/obsessed.
Target is spouse or lover.
Actor jealousy >= 85.
Actor resentment >= 60.
Actor conflictStyle is murderous / possessive / territorial / vengeful.
Target is not protected by a special flag.
No prior rival murder memory for this pair.
```

Effect:

```ts
target.stage = "dead";
target.flags.dead = true;
target.flags.causeOfDeath = `Killed by ${actor.displayName}`;

actor.memories.push({
  kind: "rivalMurder",
  targetRelationshipId: target.id,
  tone: "traumatic",
  intensity: 100,
  tags: ["jealousy", "violence", "rival", "murder"],
  summary: `${actor.displayName} killed ${target.displayName}.`,
});
```

Scene idea:

```txt
They find you before the room has finished loading.

There is no weapon in their hand.

That is worse.

“I want you to know something,” they say. “I do not blame you.”

They smile with the careful tenderness of someone arranging flowers on a grave.

“I blamed them.”
```

Important: The killer may not become hostile to the player. Depending on personality, they may become:

```txt
murderous
obsessed
calm-lover
vengeful
hostile
```

---

## 11.4 Not all rivalry is murder

Other possible outcomes:

```txt
Soft rivalry:
- sends better gift than rival

Passive-aggression:
- comments on rival’s charm/item

Demand choice:
- “Me or them.”

Sabotage:
- steals bouquet
- curses gift
- misdirects quest

Duel:
- challenges player or rival

Clean breakup:
- leaves without violence

Heartbreak:
- remains hurt but non-hostile

Murder:
- rare peak consequence
```

---

# 12. Character-Initiated Cutscenes

## 12.1 Purpose

The romance screen should not always be player-driven.

Sometimes the character should seize control:

- confession
- hurt admission
- jealousy confrontation
- breakup
- proposal response
- rival murder reveal
- marriage fallout
- divorce reaction
- child/family event

---

## 12.2 Cutscene type

```ts
export interface RelationshipCutscene {
  id: string;
  relationshipId: string;

  trigger:
    | "onEnterRomanceScreen"
    | "afterChoice"
    | "afterRoomChange"
    | "afterGift"
    | "afterDate"
    | "afterProposal"
    | "afterMarriage"
    | "afterDivorce"
    | "afterNeglectTier"
    | "afterRelationshipGraphEvent";

  priority: number;
  once: boolean;

  condition?: (state: RelationshipState, context: RelationshipSocialContext) => boolean;

  pages: DatingSequencePage[];

  outcome?: RelationshipEvent;
}
```

---

## 12.3 Cutscene queue

Relationship controller can queue events.

```ts
interface RelationshipController {
  enqueueCutscene(cutscene: RelationshipCutscene): void;
  popNextCutscene(relationshipId?: string): RelationshipCutscene | undefined;
}
```

Scene layer:

```ts
const cutscene = snakeGame.popRelationshipCutscene(profile?.id);

if (cutscene) {
  showDatingCutscene(cutscene);
}
```

Rule:

```txt
Only one major relationship cutscene per room.
```

Store:

```ts
flags.lastMajorRelationshipEventRoom = currentRoom;
```

---

# 13. Dynamic Romance Buttons

## 13.1 Principle

Buttons should appear and disappear based on state.

Do not show everything gray all the time.

Use disabled buttons sparingly for comedic or important reasons.

---

## 13.2 Suggested action sets

### Stranger

```txt
Talk
Gift
Flirt
Leave
```

### Crush

```txt
Talk
Gift
Flirt
Ask Out
Apologize, if needed
Leave
```

### Dating

```txt
Talk
Gift
Date
Reassure, if jealous
Apologize, if hurt
Break Up
Leave
```

### Lover

```txt
Talk
Gift
Date
Propose
Reassure
Apologize
Break Up
Leave
```

### Married

```txt
Talk
Gift
Date
Family
Discuss Other Lovers
Divorce
Leave
```

### Hurt

```txt
Talk
Apologize
Explain Yourself
Give Gift
Leave
```

### Hostile / Murderous

```txt
Plead
Fight
Run
```

---

## 13.3 Propose button

`Propose` appears during lover stage even if acceptance conditions are not met.

This allows early rejection.

If rejected:

- create memory
- apply personality-specific response
- possibly keep button available after cooldown

Suggested cooldown:

```ts
flags.lastProposalRoom = currentRoom;
```

Do not allow proposal every room.

---

# 14. Open Arrangements and Multiple Lovers

## 14.1 Multiple lovers allowed

The system should allow:

```txt
multiple crushes
multiple dates
multiple lovers
one spouse
```

This creates drama instead of blocking it.

---

## 14.2 Discuss arrangement

If player has multiple lovers or spouse + lover, show:

```txt
Discuss Arrangement
```

Personality outcomes:

```txt
Open: accepts if honest.
Tolerant: accepts with reassurance.
Jealous: may accept but needs attention.
Possessive: likely refuses.
Monogamous: refuses.
Territorial: may demand choice.
Transactional: requires contract.
Devotional: may say yes while secretly suffering.
```

For goblins:

```txt
“Undisclosed affection is affection fraud.”
```

For goblin angel:

```txt
“Existing affection instruments must be disclosed before emotional consolidation.”
```

---

# 15. Dead Romance State

## 15.1 Add dead stage or flag

Recommended:

```ts
RelationshipStage includes "dead"
```

If stage expansion is risky, use:

```ts
state.flags.dead = true;
```

Dead relationships:

- cannot be dated
- cannot receive gifts
- remain visible in relationship history
- can affect angel/goblin angel dialogue
- can affect spouse/ex/killer memories
- can trigger faction consequences

---

## 15.2 Death memory

```ts
{
  kind: "death",
  tone: "traumatic",
  tags: ["death", "relationship", "trauma"],
  summary: "Maribel was killed by Nackle.",
  targetRelationshipId: "goblin:nackle"
}
```

---

## 15.3 Dead tab presentation

```txt
Past Relationships

Maribel Cardwright
Status: Dead
Cause: Killed by Nackle after marriage fallout.
Remembered: You married someone else. Nackle acted.
```

---

# 16. Implementation Order

## Phase 1 — Immediate bug fixes and annoyance fixes

1. Fix forced murderous stage with `forceStage`.
2. Add neglect tiers and stop repeated per-room warnings.
3. Add branch tags and personality interpretation.
4. Make loved/liked/hated branch outcomes apply mechanical deltas.

## Phase 2 — Memories

1. Add `RelationshipMemory`.
2. Store memories on relationship state.
3. Add helper `recordMemory`.
4. Write memories for gifts, choices, dates, neglect, apologies, breakups, proposals.
5. Display recent/major memories in relationship tab.

## Phase 3 — Personality conflict styles

1. Add `ConflictStyle`.
2. Derive conflict style from personality/species.
3. Make bad outcomes resolve differently.
4. Add heartbroken/vengeful if desired.
5. Make murderous reachable only for appropriate conflict styles.

## Phase 4 — Lover rewards

1. Replace generic score gifts with reward table.
2. Add item/card/perk/buff/map hint reward types.
3. Make reward type personality/species-specific.
4. Keep score as fallback for money-coded NPCs.

## Phase 5 — Character-initiated cutscenes

1. Add relationship cutscene queue.
2. Add confession cutscene.
3. Add hurt cutscene.
4. Add jealousy cutscene.
5. Add breakup cutscene.
6. Add major graph-event cutscenes later.

## Phase 6 — Dynamic buttons

1. Build actions from relationship state.
2. Hide irrelevant buttons.
3. Keep `Propose` visible during lover stage.
4. Add state-specific buttons:
   - Reassure
   - Discuss Other Lovers
   - Family
   - Divorce
   - Plead / Fight / Run

## Phase 7 — Proposal, marriage, bouquet quest

1. Add proposal action.
2. Add proposal rejection memory.
3. Add accepted proposal -> bouquet quest.
4. Add cold-region bouquet item 7–15 rooms deep.
5. Add marriage state.
6. Add spouse rewards/events.

## Phase 8 — Relationship graph events

1. Build social context.
2. Add exclusivity preference.
3. Add marriage fallout pass.
4. Add lover-rival conflict outcomes.
5. Add rival murder event.
6. Add dead romance state.
7. Add one-major-event-per-room guard.

## Phase 9 — Family and divorce

1. Add family action.
2. Add child state.
3. Add spouse/kid events.
4. Add divorce action.
5. Add divorce fallout by personality.
6. Add custody/goblin court/etc. later.

---

# 17. Guardrails

## 17.1 Avoid event spam

Only one major relationship event per room.

```ts
flags.lastMajorRelationshipEventRoom = currentRoom;
```

## 17.2 Deduplicate memories

Use `uniqueKey`.

```ts
uniqueKey: `discoveredMarriage:${loverId}:${spouseId}`
```

## 17.3 Do not make every NPC murderous

Murder should require:

- correct conflict style
- high jealousy
- high resentment
- serious betrayal
- major rival target
- no prior murder event

## 17.4 Keep romance opt-in explicit

Loved gifts, friendly scenes, and non-romantic relationship growth should not automatically opt into romance.

Only explicit romantic actions should set:

```ts
romanceOptIn = true;
```

Actions that may opt in:

```txt
Flirt
Ask Out
Accept Confession
Propose
Romance-specific death option
```

---

# 18. Summary

The relationship system should become a machine for producing consequences from:

- personality
- memory
- commitment
- jealousy
- neglect
- marriage
- rivalry
- death
- player choice

The goal is not to hide the numbers. It is to make the numbers feel like a specific person is interpreting them.

The strongest version is:

```txt
You can have multiple lovers.
You can marry only one.
Others can react.
Some leave.
Some forgive.
Some demand a choice.
Some become heartbroken.
Some turn contractual.
Some turn murderous.
Some kill each other.
Some become memories in the death system.
```

That is the correct level of overbuilt for a modern gamer snake dating sim.
