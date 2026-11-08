# Questlines and contextual actions

## Architecture
The existing `QuestController` owns offers, active capacity, and completions. New stories
use `StoryQuestDefinition` and serializable `StoryQuestState` under
`quest.story.<questId>` flags. The engine evaluates contextual action availability
and transitions without manipulating world state. `SnakeGame` revalidates the
target's proximity, stage and role on authoritative action execution, applies
score/karma/faction rewards through existing APIs, then records world events.

## First questline: The Crystal Clause
A wizard offers two binding crystals. Accept, decline, imprison two distinct
goblins, report the wizard to guards for a smaller lawful payout, free the
captives, or deliver the victims for a large but evil reward. Binding is
quest-scoped; captured goblin actors become non-interactable and dematerialized
until freed. The next chapter, After the Crystals, is unlocked by the first
chapter's outcome. Delivering unlocks confession or hush money; defending
goblins unlocks a ward-contract reward from goblin merchants.

The story journal tracks stage and captured count. The world map points back
to the wizard for delivery or a known goblin camp during capture. No fake
map marker is shown when no camp has been discovered yet.

## Remaining work
Existing bespoke staged quests continue to use their preexisting
`SnakeGame` handlers, preserving saves. This extension does not simulate
an actual wizard arrest, physical inventory crystals, or a persistent
criminal court case. Extend the domain handlers as story content grows.

## Character-first expansion

The new chapters are organized around *people's material incentives*, not just objectives.
A guard wants to know why the ration books are wrong; a merchant wants to keep people fed
without losing the business; an outlaw knows the ledgers can be sold as leverage; and a
goblin merchant wants a legal road rather than a heroic rescue.

| Chapter | Giver and stakes | Actual choices and outcomes |
| --- | --- | --- |
| Ink and Ashes | Town guard, missing ration ledger | Hear a shopkeeper, thief, or goblin; expose the scheme, bury the books, sell evidence, or accept a crooked guard's bribe |
| The Last Ration | Families affected by the ledger | Feed families, forgive debt, reform the records, profit, or license hunger |
| Paper Bridges | Goblin trader seeking passage | Secure a legitimate guard seal, forge one, pay a crooked officer, or betray the request |
| The Tollkeeper's Debt | The road agreement's consequences | Celebrate peace, confess forgery, blackmail, demand a refund, or make reparations, conditional on the earlier ending |
| The Open Table | Town official and both communities | Hear one human guard **and** one goblin trader, write a shared charter, award a monopoly, auction the road, or expose *both* earlier cover-ups |

### Character mechanics

- **Motives are readable:** each contextual option includes a short description
  of who benefits and what it costs. Action text can have dialogue variants for the
  involved actor's existing personality tags (for example, lawful and cynical guards).
- **Temptations are contextual:** corrupt offers require suitable personality tags.
  Paid forgery/toll actions require enough score, revalidated on execution.
  Quest-giver-bound contracts only accept delivery back to the same Actor.
- **NPCs remember you:** the Actor who participates receives a bounded persistent
  personal memory record; consequence policies can alter the Actor's opinion of the
  player (trust, respect and resentment) and mood. This reuses Actor state; it does
  not create a parallel relationship profile.
- **World consequences are independent of dialogue:** scores, faction alignment,
  karma, ward contracts and quest flags change only in the game authority.
- **Story collisions are explicit:** chapter prerequisites require completed
  predecessor outcomes. The final public hearing requires resolution of *both*
  ration and goblin road lines, then one unique guard testimony and one goblin
  testimony before a decision can be recorded. The cover-up reckoning option only exists if
  both the ledger and the seal were deliberately compromised.
- **Run persistence:** chapters live in `quest.story.<id>` flags and Actor memories,
  are included in game saves and can be rehydrated without reapplying rewards.
- **Navigation:** the journal lists the actual current objective; when a giver
  must receive a return item or verdict, the map marks that Actor's original room
  without generating unvisited rooms.

### Authoring a chapter

Register a `StoryQuestDefinition` in `storyQuestChapters.ts` and the
`StoryChapterQuest` wrapper through the built-in loader. Add consequence policy to
`storyQuestConsequences.ts`. Declare `prerequisites`, `objectives`, and
`returnStages` in the definition, rather than writing a second state machine.
`availableStoryActions` and `applyStoryAction` accept a read-only story lookup so
they can gate individual actions on independent completed questlines.
`storyQuestCharacterLine` and `rememberStoryChoice` are the canonical hooks for
NPC-specific dialogue, opinions and persistent personal memories.

Progress flags and stage state are per player; NPC memories are stored on the
world Actor. New cross-player stories should explicitly design and test which
consequences belong to a shared world and which belong to each player.

### Design guardrails

A personality-exclusive action **must be optional**: a randomly generated actor
must never be required to have a rare tag to complete the base storyline.
Never accept a client-submitted payout, increment a progress counter twice for one
unique target, silently invent a destination, or auto-reward a chapter that was
never legally completed.

This feature does not yet rewrite town shop inventories, implement a judicial
trial simulation, or physically spawn paper permits in inventory. Those remain
separate gameplay work, not implied by the narrative.
