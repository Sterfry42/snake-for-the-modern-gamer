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
