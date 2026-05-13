# Dating, Romance, and Relationship System Design

## Goal

Add an opt-in dating sim layer for village humans, goblins, wanderers, the Angel, and the Goblin Angel. The system should create deeper personal relationships without forcing the player into romance content. A player who never chooses flirt/romance options should be able to ignore the entire feature.

The core fantasy:

- People and goblins have names, preferences, moods, jealousy, memory, and non-binary disposition.
- Gifts matter because each person has tastes, boundaries, and current emotional state.
- Lovers can become recurring random encounters who help, give gifts, ask for attention, or confront the player.
- Neglect and betrayal can sour relationships. Extreme betrayal can produce hostility, ambushes, or murderous lover encounters.
- The Angel and Goblin Angel can become romance routes only through rare, deliberate choices in death/revival dialogue.
- Sprites and portraits should become much more expressive and anime-inspired than current low-detail residents.

## Existing Codebase Hooks

### NPC and random encounters

- `src/npcs/encounters.ts`
  - Defines `WANDERER_ENCOUNTERS`, `WandererEncounter`, `EncounterHistoryEntry`, and `chooseWandererEncounter`.
  - Current encounter history tracks `seen`, `accepted`, and `rejected`.
  - This is the natural place to add relationship-aware encounter weighting and lover encounters.

- `src/game/snakeGame.ts`
  - `maybeQueueFreakJoeyEncounter()` currently selects random wanderers and writes `npc.randomEncounter`.
  - `resolveRandomEncounter()` resolves accepted/rejected wanderers.
  - `wandererHistory` is currently in-memory and can be extended or mirrored into relationship state.

- `src/scenes/snakeScene.ts`
  - `maybePresentRandomEncounter()` reads `npc.randomEncounter` and displays dialogue through `showQuestDialogue`.
  - This is where flirt/gift/date choices should be surfaced after an encounter is presented.

### Villages, goblin camps, and residents

- `src/scenes/snakeScene.ts`
  - `updateVillageResidentSprites()` renders village residents and goblin camp residents.
  - `tryInteractVillageShopkeeper()` and `tryInteractGoblinShopkeeper()` are existing interaction routes.
  - Current village/goblin residents are visually present but not individually interactive beyond shopkeeper/camp systems.

- `src/world/types.ts`
  - Room snapshots already carry `village`, `goblinCamp`, `residents`, `guards`, and `shopkeeper` data.
  - Relationship candidates can be keyed by resident `id` plus room id.

### Disposition and hostility

- `src/game/snakeGame.ts`
  - `npcDisposition` currently stores per-room `{ anger, hostility }`.
  - `angerNpc()` turns insults or shots into warning/hostile states.
  - `insultNpc()` exposes a simple escalation path.

This should be replaced or wrapped by a richer relationship model rather than extended as a pile of booleans.

### Factions

- `src/factions/factions.ts`
  - Factions currently include `hearthbound-remnant` and `goblin-camps`.
  - `FactionStanding` is `friendly | neutral | wary | angry | violent`.
  - Romance should be individual-first, but faction standing should bias starting disposition and consequences.

### Death angel flow

- `src/scenes/snakeScene.ts`
  - `startDeathSequence()` and `startDeathCutscene()` start Angel/Goblin Angel scenes.
  - `showAngelDeathDialogue()` currently offers accept/reject style choices:
    - Angel: `Return` / `Taunt`
    - Goblin Angel: `Pay the debt` / `Complain`
  - This is the route for the rare third option: `Romance`.

### Sprite pipeline

- `src/ui/snakeRenderer.ts`
  - Draws room, snake, animals, enemies, and resident-like sprites.
  - Uses runtime sprite recipes and Phaser image/sprite objects.

- `src/ui/spriteRecipes/enemyRecipe.ts`
  - Current combat sprites are 8x8-ish pixel recipes.

- `src/ui/spriteRecipes/animalRecipe.ts`, `src/ui/spriteRecipes/snakeRecipe.ts`
  - Good references for recipe-driven runtime sprites.

- `src/scenes/snakeScene.ts`
  - `getDefaultNpcTextures()` currently uses `questGiverSpriteRecipe`.
  - `updateVillageResidentSprites()` recolors basic NPC sprites per resident.

The romance system needs a new portrait/sprite layer. It should not try to make the existing tiny resident sprite carry all emotional and anime visual detail.

## Design Principles

1. Opt-in only
   - No romance route starts unless the player chooses `Flirt`, `Give gift`, `Ask out`, or equivalent.
   - Normal shop, quest, death, faction, and random encounter flows remain available.

2. Adults only
   - Romance candidates must be adult-coded characters.
   - Any ambiguous NPC should be excluded from romance.

3. Non-binary disposition
   - Relationship state should not be `likesPlayer: boolean`.
   - Track affection, trust, jealousy, resentment, fear, fascination, and neglect independently.

4. Consequences without surprise lock-in
   - Jealousy and anger can create conflict, but the player should understand why it happened through dialogue/history.

5. Art depth lives in portraits
   - Map sprites remain readable at tile scale.
   - Detailed anime-inspired art should appear in dialogue portraits, dating scenes, and relationship tabs.

## Relationship Data Model

Add `src/relationships/relationshipTypes.ts`.

```ts
export type RelationshipSpecies = 'human' | 'goblin' | 'angel' | 'goblin-angel';

export type RelationshipStage =
  | 'stranger'
  | 'acquaintance'
  | 'friendly'
  | 'crush'
  | 'dating'
  | 'lover'
  | 'estranged'
  | 'hostile'
  | 'murderous';

export interface RelationshipPreferenceProfile {
  likedItemTags: string[];
  lovedItemTags: string[];
  dislikedItemTags: string[];
  hatedItemTags: string[];
  favoriteItemIds?: string[];
  tabooItemIds?: string[];
  personalityTags: string[];
}

export interface RelationshipState {
  id: string;
  displayName: string;
  species: RelationshipSpecies;
  homeRoomId?: string;
  factionId?: FactionId;
  portraitId: string;
  stage: RelationshipStage;
  affection: number;   // -100..100
  trust: number;       // -100..100
  jealousy: number;    // 0..100
  resentment: number;  // 0..100
  fear: number;        // 0..100
  fascination: number; // -100..100
  lastSeenRoomsVisited: number;
  lastGiftRoomsVisited?: number;
  acceptedDates: number;
  rejectedDates: number;
  ignoredEncounters: number;
  flags: Record<string, unknown>;
}
```

Persist under a new save flag:

- `relationships.states`
- `relationships.routeFlags`
- `relationships.lastEncountered`

Update `SnakeGame.getSaveData()` to include these flags beside existing persisted flags such as `factions.alignment`, `wards.contracts`, `skills.ranks`, and `quest.staged.instances`.

## Relationship Controller

Add `src/relationships/relationshipController.ts`.

Responsibilities:

- Create or retrieve relationship profiles for village residents, goblins, wanderers, Angel, and Goblin Angel.
- Apply gift outcomes.
- Apply dialogue outcomes.
- Tick neglect/jealousy over room visits.
- Select lover random encounters.
- Escalate hostility when resentment and jealousy cross thresholds.
- Generate Dating tab view models.

Suggested API:

```ts
class RelationshipController {
  getState(id: string): RelationshipState;
  getDatingTabView(): DatingCandidateView[];
  applyGift(id: string, itemId: string): RelationshipEventResult;
  applyDialogueChoice(id: string, choice: RelationshipChoice): RelationshipEventResult;
  recordEncounterSeen(id: string): void;
  tickRoomVisit(currentRoomId: string, roomsVisited: number): RelationshipTickResult[];
  chooseRelationshipEncounter(context: RelationshipEncounterContext): RelationshipEncounter | null;
}
```

Integrate it into `SnakeGame`, similar to `QuestController`, `InventorySystem`, `EnemyManager`, and `AnimalManager`.

## Disposition Math

Use multiple axes, then derive stage.

### Axes

- `affection`: warmth, attraction, fondness.
- `trust`: belief that the player is safe and consistent.
- `jealousy`: spikes when the player flirts/dates others.
- `resentment`: grows from insults, ignored meetings, broken promises, bad gifts, violence, or betrayal.
- `fear`: grows from violence and monstrous behavior.
- `fascination`: interest in the player's weirdness, power, danger, or style.

### Derived stage examples

- `stranger`: affection < 10, trust < 10.
- `friendly`: affection >= 25, trust >= 10.
- `crush`: affection >= 45, trust >= 20, resentment < 30.
- `dating`: explicit accepted date.
- `lover`: dating plus affection >= 70 and trust >= 50.
- `estranged`: was dating/lover, resentment >= 45 or trust <= -20.
- `hostile`: resentment >= 65 or fear >= 75.
- `murderous`: was lover/dating, resentment >= 80, jealousy >= 70, trust <= -40.

This gives room for outcomes like:

- Likes you but does not trust you.
- Fears you but is fascinated.
- Loves you but is jealous.
- Is friendly but not romanceable.
- Was a lover, now actively dangerous.

## Gifts

### Inventory integration

Use existing inventory APIs in `SnakeGame`:

- `getInventory()`
- `addItem(itemId, count)`
- existing item registry in `src/inventory/itemRegistry.ts`

Add item tags for gift preferences:

```ts
interface ItemGiftMetadata {
  tags: string[];
  romanceValue?: number;
  rarity?: 'common' | 'uncommon' | 'rare' | 'legendary';
}
```

Do not hardcode every gift in relationship code. Relationship profiles should compare item tags and favorite ids.

### Gift outcome examples

- Loved gift:
  - affection +12
  - trust +4
  - jealousy -4 if currently jealous
- Liked gift:
  - affection +6
  - trust +2
- Neutral gift:
  - affection +1
- Disliked gift:
  - affection -5
  - resentment +4
- Taboo gift:
  - affection -15
  - resentment +20
  - possible `hostile` if already unstable

### Personal preferences

Human village resident examples:

- Likes: cards, food, warm clothing, house goods, village hats.
- Dislikes: cursed contracts, gore-coded trophies, goblin debt items.

Goblin examples:

- Likes: receipts, ward scrolls, teeth-coded valuables, ledgers, weird contracts.
- Dislikes: overly holy items, debt forgiveness, sentimental village gifts.

Angel examples:

- Likes: restraint, mercy, luminous relics, nonviolent choices.
- Dislikes: insults, repeated refusal to accept consequences, boss trophies.

Goblin Angel examples:

- Likes: paid debts, clever loopholes, ward contracts, legalistic gifts.
- Dislikes: complaining without payment, fake receipts, oath-breaking.

## Dating Tab

Add a new tab to `SkillTreeOverlay`:

- Primary group: likely `World`
- Tab id: `dating`
- Label: `Dating`

Current tabs are defined in `src/ui/skillTreeOverlay.ts` via `TAB_DEFINITIONS`.

The Dating tab should show:

- Candidate name.
- Species/faction.
- Stage.
- Affection/trust/jealousy/resentment.
- Last seen.
- Gift preferences discovered so far.
- Active promise/date.
- Warning line if someone is angry, jealous, or neglected.

Example layout:

```text
Dating

Maribel Cardwright
Human / Hearthbound Remnant
Stage: Friendly
Affection +38 | Trust +22 | Jealousy 0 | Resentment 3
Likes: cards, careful wagers
Last seen: 4 rooms ago

Nackle the Receipt-Biter
Goblin / Goblin Camps
Stage: Crush
Affection +51 | Trust +8 | Jealousy 26 | Resentment 12
Likes: ledgers, ugly bargains
Warning: wants attention soon
```

The tab should be read-only at first. Gift/date actions should happen in dialogue popups, not from the tab, to preserve diegetic interactions.

## Dialogue Choices

Current dialogue supports accept/reject/close through `showQuestDialogue()` and `ChoicePopup`.

Add a relationship-aware choice layer:

- `Talk`
- `Gift`
- `Flirt`
- `Ask out`
- `Apologize`
- `Set boundary`
- `Leave`

Important: `Flirt` and `Ask out` are the explicit opt-in line. If the player never chooses these, no romance route starts.

### Choice availability rules

- `Flirt`: candidate is romanceable, adult-coded, not hostile, opt-in not disabled.
- `Gift`: player has giftable inventory.
- `Ask out`: affection/trust thresholds met, not already dating, not too jealous/resentful.
- `Apologize`: resentment > 15 or trust < 0.
- `Set boundary`: player wants to stop romance route without hostility spike.

## Jealousy

Jealousy should be understandable and not random.

Triggers:

- Flirting with another candidate while dating.
- Accepting a date with another candidate while lover is active.
- Ignoring a lover encounter repeatedly.
- Giving a loved gift to someone else if the lover is present or later hears about it.
- Accepting Angel/Goblin Angel romance while already in a serious route.

Modifiers:

- Some personalities are low-jealousy and prefer independence.
- Some are dramatic, possessive, or rivalry-prone.
- High trust softens jealousy.
- Honest boundary-setting reduces future resentment.

Consequences:

- Mild jealousy: teasing dialogue, small affection/trust shifts.
- Moderate jealousy: lover random encounter asks for reassurance.
- High jealousy: refuses gifts, starts rival event, may sabotage a shop price.
- Extreme jealousy + resentment: `murderous` route can spawn hostile encounter.

## Neglect

Ignoring lovers should matter, but not punish casual players.

Rules:

- Neglect only starts after explicit dating/lover stage.
- Track `lastSeenRoomsVisited`.
- Every N rooms, increase `ignoredEncounters` if the player avoids or rejects lover encounters.
- High trust delays neglect.
- A clear `Set boundary` choice pauses/ends the relationship cleanly.

Suggested thresholds:

- 8 rooms since lover seen: longing encounter can appear.
- 14 rooms: jealousy/resentment tick.
- 20 rooms: confrontation encounter.
- 30 rooms with no apology: estranged.

## Lover Random Encounters

Extend `chooseWandererEncounter()` flow in `src/npcs/encounters.ts` or add a pre-pass in `SnakeGame.maybeQueueFreakJoeyEncounter()`.

Selection order:

1. Critical hostile/murderous relationship encounter.
2. Neglected lover confrontation.
3. Lover gift/help encounter.
4. Existing `WANDERER_ENCOUNTERS`.

Possible lover encounter types:

- Gift: lover gives item/card/score/ward.
- Warning: lover reveals nearby boss/biome hazard.
- Date scene: short opt-in dialogue chain.
- Jealous confrontation.
- Apology/reconciliation.
- Ambush if murderous.

## Murderous Routes

This should be rare, telegraphed, and avoid cheap surprise.

Conditions:

- Relationship was at least `dating`.
- Trust very low.
- Resentment very high.
- Jealousy very high or direct betrayal flag.
- Player ignored a confrontation or insulted them.

Implementation:

- Use existing enemy spawning patterns:
  - `EnemyManager.spawnHostileNpc()`
  - `EnemyManager.spawnGoblin()`
  - `SnakeGame.angerNpc()`
- Spawn as named hostile NPC or goblin depending on species.
- Death/defeat can close the route, create a quest, or leave a permanent faction penalty.

## Angel Romance Route

The Angel route should not appear on normal death unless the player has established eligibility.

Current flow:

- `startDeathSequence()` begins a cutscene.
- `showAngelDeathDialogue()` presents `Return` or `Taunt`.
- `tauntAngel()` can escalate to an Angel boss.

Add a third option only when eligible:

- `Romance`

Eligibility examples:

- Player has died/revived multiple times without taunting.
- Player has high mercy flags.
- Player did not insult Angel.
- Player has a luminous/rare gift or completed a mercy route.
- Player is not in a messy unresolved lover state, or accepts jealousy consequences.

Outcomes:

- Failure: Angel gently rejects, normal revive/death continues.
- Partial success: Angel grants a small boon, opens Dating tab entry.
- Strong success: Angel route starts; future death scenes can become dating sim scenes.
- Perfect route: player may survive a death without consuming a life source.

Implementation:

- Add `relationships.angel` state.
- Add `romance` option to `showAngelDeathDialogue()` when `RelationshipController.canRomanceDeathRescuer('angel')`.
- Add `resolveDeathRescuerRomance('angel')` result.
- Avoid replacing the existing `Return` and `Taunt` options.

## Goblin Angel Romance Route

Current Goblin Angel appears for ward-based rescue:

- `startDeathSequence('revive', reason, { rescuer: 'goblin-angel' })`
- Dialogue labels are `Pay the debt` / `Complain`.

Add third option:

- `Flirt with the fine print`

Eligibility examples:

- Uses ward contracts responsibly.
- Has positive `goblin-camps` alignment.
- Paid debts or completed `goblin-ledger-debt`.
- Did not repeatedly complain to Goblin Angel.
- Has a contract/gift that fits Goblin Angel preferences.

Outcomes:

- Goblin Angel gives a discount/extra ward.
- Goblin Angel becomes Dating tab entry.
- Future ward rescues may become affectionate, jealous, or contractually absurd.
- Bad choices can create a supernatural debt route.

## Art Direction

The current resident sprites are small runtime pixel sprites. The dating system needs a separate high-detail portrait layer.

### Map sprites

Keep map sprites readable and simple:

- 16-24 px tile sprites.
- Species silhouette should read instantly: human, goblin, angel, goblin angel.
- Add expressive palette changes and animation, but do not overload map readability.

Implementation options:

- Add `src/ui/spriteRecipes/relationshipNpcRecipe.ts`.
- Use larger recipe size than `questGiverSpriteRecipe`.
- Add variants:
  - `idle`
  - `blink`
  - `happy`
  - `annoyed`
  - `blush`
  - `hostile`

### Portraits

Use a dedicated portrait system:

- `src/ui/relationshipPortraits.ts`
- `src/ui/spriteRecipes/animePortraitRecipe.ts`

Portrait requirements:

- Larger canvas, e.g. 96x96 or 128x128.
- Expressive eyes, face shape, hair/horns/halo/ears, outfit silhouette.
- Emotion variants:
  - neutral
  - happy
  - blush
  - sad
  - jealous
  - angry
  - murderous
  - holy
  - contract-smug

Anime-inspired means:

- Strong eye shapes.
- Hair/face silhouette.
- Dramatic blush/anger marks.
- Expressive mouth shapes.
- Clear emotional poses.

Avoid:

- Copying a specific anime franchise or character.
- Making every portrait visually identical with palette swaps.
- Replacing readable gameplay sprites with oversized art on the board.

### Asset strategy

Three viable paths:

1. Runtime canvas portraits
   - Fits existing recipe architecture.
   - Cheap to generate.
   - Good for many variants.
   - Harder to reach “unlike anything the game has seen before.”

2. Hand-authored bitmap assets
   - Best visual quality.
   - Requires asset pipeline and source files.
   - Good for Angel/Goblin Angel and major love interests.

3. Hybrid
   - Runtime map sprites.
   - Authored/generated portraits for relationship scenes.
   - Recommended.

## Dating Scene UI

Create a new UI surface rather than overloading quest popups too much:

- `src/ui/datingScenePopup.ts`

Features:

- Character portrait.
- Name/title.
- Relationship meter summary.
- Dialogue text.
- Choice list.
- Gift selector.
- Result animation.

Can reuse ideas from:

- `src/ui/choicePopup.ts` for scrollable choices.
- `src/ui/questPopup.ts` for dialogue pages and portraits.
- `src/ui/skillTreeOverlay.ts` for tab layout and detail panels.

## Rewards

Lovers should give useful things, but not dominate progression.

Reward types:

- Score gifts.
- Cards.
- Ward contracts.
- Village shop discounts.
- Temporary buffs.
- Hints to quests/biomes.
- Unique cosmetics.
- Emergency rescue chance.

Angel/Goblin Angel rewards should be rare and dramatic:

- Angel: one-time mercy, veil-like protection, luminous cosmetic.
- Goblin Angel: extra ward, debt loophole, contract discount, goblin cosmetic.

## Avoiding the System

The entire system remains avoidable if:

- No romance choices are selected.
- Dating tab can remain empty or show “No active relationships.”
- Random encounters from lovers only happen after opt-in.
- Angel/Goblin Angel romance option appears only when eligible and explicit.
- Gift choices are optional and never block shop/quest essentials.

## Implementation Plan

### Phase 1: Foundations

- Add `src/relationships/relationshipTypes.ts`.
- Add `src/relationships/relationshipController.ts`.
- Persist `relationships.states`.
- Add Dating tab to `SkillTreeOverlay`.
- Create read-only relationship list.

### Phase 2: Village and Goblin Candidates

- Generate candidate profiles from village residents and goblin camp residents.
- Add `Talk / Gift / Flirt / Leave` choices when interacting with eligible residents.
- Add gift preference resolution.
- Add simple affection/trust/resentment changes.

### Phase 3: Lover Encounters

- Add relationship encounter pre-pass before normal wanderer selection in `SnakeGame.maybeQueueFreakJoeyEncounter()`.
- Add gift/help/neglect/jealousy encounter types.
- Add ignore tracking.

### Phase 4: Jealousy and Hostility

- Add jealousy events when flirting/dating multiple candidates.
- Add confrontation scenes.
- Add `estranged`, `hostile`, and `murderous` stage transitions.
- Spawn hostile lover encounters through existing enemy manager APIs.

### Phase 5: Angel and Goblin Angel Routes

- Add relationship ids for `angel` and `goblin-angel`.
- Add eligible third option in `showAngelDeathDialogue()`.
- Resolve romance attempts inside death cutscene flow.
- Add special survival/boon outcomes.

### Phase 6: Art Upgrade

- Add portrait recipe or bitmap asset loader.
- Add major portrait variants for:
  - generic village human
  - generic goblin
  - major wanderers
  - Angel
  - Goblin Angel
- Add Dating scene portrait display.
- Later, add unique major-character portraits.

## Open Questions

- Should dating routes survive across save files as character progression, or reset per run?
- Can the player date multiple people openly, or is jealousy always framed as betrayal?
- Should gifts consume normal inventory items or use a dedicated “giftable” tag set?
- Should romance affect factions globally, or only the individual?
- How punishing should murderous lovers be?
- Should Angel/Goblin Angel routes be mutually exclusive?

## Recommended First Slice

Build this in the smallest useful vertical slice:

1. Add relationship state/controller.
2. Add Dating tab.
3. Make village residents inspectable.
4. Allow one interaction: `Gift`.
5. Show affection/trust changes in Dating tab.
6. Add one explicit `Flirt` opt-in.
7. Add one lover random encounter that gives a small gift.

After that, add jealousy, then Angel/Goblin Angel routes.
