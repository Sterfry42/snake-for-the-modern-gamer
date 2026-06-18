# Snake for the Modern Gamer — Card Table Redesign Requirements

**Document purpose:** Define the requirements, UI direction, mechanical design, and implementation plan for the redesigned card-table system in `snake-for-the-modern-gamer`.

**Primary files expected to change:**

- `src/cards/cardGame.ts`
- `src/scenes/snakeScene.ts`
- Any card/table UI helper files added during implementation
- Any test files under the existing Vitest structure

**Feature summary:** The card-table system should become a physical table experience. The house takes a visible turn by playing small rule cards onto the table. The player then selects cards from their hand and scores against the target window. Each table has distinct wager limits, payout rules, and house-card behavior.

---

## 1. Design Goals

### 1.1 Preserve the existing deck attrition idea

The existing match flow where played cards are removed from the match deck is intentional and should be preserved.

The player should be able to play between 1 and 5 cards each round. Cards that are played should not be available again later in the same match. This creates a real choice:

- Play a small number of cards to preserve the deck.
- Play many cards to win this round more reliably.
- Risk having a thin deck in round 2 or round 3.

This system should not be replaced with a full “draw/discard/recycle” deckbuilder loop unless a future design explicitly calls for that.

### 1.2 Make the house feel like an opponent

House rules should not feel like random passive modifiers. The house should feel like it takes a turn before the player.

The intended round rhythm is:

```text
Round begins.
The house plays cards.
The player sees those cards.
The player chooses their hand.
The hand scores under those conditions.
Round resolves.
```

The house can be unfair, but the unfairness must be visible before the player commits.

### 1.3 Make the UI feel like a table, not a shop menu

The card-table screen should feel like the player is sitting at a card table. It should not feel like a normal shop popup with a card row inside it.

Desired vibe:

- Dark felt table surface
- Wood edge / physical tabletop frame
- House cards physically placed on the opposite side of the table
- Player cards laid out in the player’s hand area
- Small props are okay: deck stack, candle, score tokens, little table details
- Tutorial/explanation text should be minimized on the main surface

The UI should communicate through card placement, labels, hover panels, and scoring previews rather than giant instructional boxes.

### 1.4 Give tables stronger identities

Tables should differ by more than score window. Each table should define:

- Target score window
- House-card behavior
- House-card pool
- Maximum wager
- Payout multiplier
- Risk language / table description
- Optional UI accent/tone

The player should be able to understand the table’s personality before betting.

### 1.5 Reduce score runaway

Current betting can become too generous when high wagers or percentage wagers are available. The redesign should introduce table-specific max wagers and lower payout multipliers.

The goal is not to make card tables useless. The goal is to make them risky side content with capped upside.

---

## 2. Current System Summary

The repo currently has a central card logic file and scene-driven UI.

Expected current structure:

```text
src/cards/cardGame.ts
  Card definitions
  Table definitions
  Card collection/deck helpers
  Competition state
  Hand draw helper
  Score function
  Finish-round helper

src/scenes/snakeScene.ts
  Shop/card-table interaction
  Table selection UI
  Wager selection UI
  Card hand UI
  Card selection handling
  Round resolution
  Victory/defeat payout
```

The redesign should keep the general division:

- `cardGame.ts` should own pure rules and scoring.
- `snakeScene.ts` should own Phaser UI, animations, persistence, score changes, and player collection mutation.

If implementation reveals that `snakeScene.ts` is becoming too large, card-table UI helpers may be extracted into a new file, but that is not a required first step.

---

## 3. New Table Model

### 3.1 Required table fields

Update table definitions so each table can define its own wager and house behavior.

Proposed TypeScript shape:

```ts
export type CardTableId = 'porch-table' | 'market-table' | 'dennis-dare';

export type HouseMode =
  | {
      kind: 'fixed';
      cardsPerRound: number;
      persistent: boolean;
    }
  | {
      kind: 'variable';
      minCardsPerRound: number;
      maxCardsPerRound: number;
      persistent: boolean;
    };

export interface CardTableDefinition {
  id: CardTableId;
  name: string;
  description: string;

  minScore: number;
  maxScore: number;

  maxWager: number;
  payoutMultiplier: number;

  houseMode: HouseMode;
  houseCardPool: HouseCardId[];

  riskLabel?: string;
  tableFlavor?: string;
}
```

### 3.2 Meaning of `payoutMultiplier`

The player should still pay the wager up front.

On victory, the table returns:

```ts
const payout = Math.max(
  state.wagerScore + 1,
  Math.ceil(state.wagerScore * table.payoutMultiplier),
);
```

This means `payoutMultiplier` is the total return, not just profit.

Example:

```text
Player wagers 10.
Score is reduced by 10 immediately.
Table payout multiplier is 1.4.
Player wins.
Player receives 14.
Net profit is +4.
```

The `Math.max(state.wagerScore + 1, ...)` guard prevents very small wagers from feeling pointless due to rounding.

### 3.3 Remove percentage and all-in wagers

The new wager system should not offer:

- Bet 10%
- Bet 50%
- Bet 75%
- Bet all score

Wagers should be fixed amounts capped by the table.

Recommended legal wager options:

```ts
const BASE_WAGER_AMOUNTS = [5, 10, 25, 50];
```

The actual menu should show only amounts that satisfy:

```ts
amount <= playerScore && amount <= table.maxWager
```

If the player has less than 5 score, they cannot enter the table.

---

## 4. Proposed Table Definitions

These numbers should be treated as the starting design. They are specific enough for implementation but may be adjusted after playtesting.

### 4.1 Porch Table

Beginner table. Teaches the house-card system. Lower variance. Lower payout.

```ts
{
  id: 'porch-table',
  name: 'Porch Table',
  description: 'A low-stakes table where the house only cheats a little.',
  minScore: 18,
  maxScore: 34,
  maxWager: 10,
  payoutMultiplier: 1.4,
  houseMode: {
    kind: 'fixed',
    cardsPerRound: 1,
    persistent: false,
  },
  houseCardPool: [
    'tighten-the-gap',
    'open-the-gap',
    'chip-tax',
    'big-blind',
    'burn-notice',
  ],
  riskLabel: 'Low Risk',
  tableFlavor: 'The porch table smiles like it knows your mother.',
}
```

Player-facing summary:

```text
Target: 18-34
House: 1 card each round
Max Wager: 10
Payout: 1.4x
Burn Notice: possible, rare
```

Notes:

- Burn Notice must be present here, but its weight should be very low.
- This table should usually feel fair.
- The house should teach the concept without overwhelming the player.

### 4.2 Market Table

Middle table. More volatility. Better payout. House may play multiple cards.

```ts
{
  id: 'market-table',
  name: 'Market Table',
  description: 'A busy table with flexible rules and flexible morals.',
  minScore: 36,
  maxScore: 62,
  maxWager: 25,
  payoutMultiplier: 1.65,
  houseMode: {
    kind: 'variable',
    minCardsPerRound: 1,
    maxCardsPerRound: 2,
    persistent: false,
  },
  houseCardPool: [
    'tighten-the-gap',
    'open-the-gap',
    'short-hand',
    'chip-tax',
    'dealer-skims',
    'big-blind',
    'no-cowards',
    'two-pair',
    'burn-notice',
  ],
  riskLabel: 'Medium Risk',
  tableFlavor: 'Everyone at the market table insists this is normal.',
}
```

Player-facing summary:

```text
Target: 36-62
House: 1-2 cards each round
Max Wager: 25
Payout: 1.65x
Burn Notice: possible
```

Notes:

- This table should be the first table where house-card combinations become a real puzzle.
- House cards do not persist, so each round is a fresh problem.
- Burn Notice can appear more often than on the Porch Table but should still not dominate the experience.

### 4.3 Freak Dennis Dare

High-risk table. House cards accumulate between rounds. The table gets worse as the match goes on.

```ts
{
  id: 'dennis-dare',
  name: 'Freak Dennis Dare',
  description: 'The table where the house remembers.',
  minScore: 78,
  maxScore: 118,
  maxWager: 50,
  payoutMultiplier: 1.9,
  houseMode: {
    kind: 'fixed',
    cardsPerRound: 1,
    persistent: true,
  },
  houseCardPool: [
    'tighten-the-gap',
    'short-hand',
    'chip-tax',
    'dealer-skims',
    'big-blind',
    'no-cowards',
    'two-pair',
    'burn-notice',
  ],
  riskLabel: 'High Risk',
  tableFlavor: 'Freak Dennis smiles. The house remembers.',
}
```

Player-facing summary:

```text
Target: 78-118
House: 1 card each round; cards stay active
Max Wager: 50
Payout: 1.9x
Burn Notice: possible and persistent if drawn
```

Notes:

- Round 1 has 1 active House Card.
- Round 2 has 2 active House Cards.
- Round 3 has 3 active House Cards.
- If Burn Notice appears in round 1, every scored card for the rest of the match is destroyed after scoring.
- This is brutal and correct for the table identity.

---

## 5. House Card System

### 5.1 Concept

House Cards are small rule cards played by the house before the player chooses their cards.

They are not normal player cards. They are not bought in the card shop. They are not part of the player collection. They are table-side rules represented physically as cards.

They should be visible before the player commits to scoring.

### 5.2 Round timing

Full round sequence:

```text
1. Begin round.
2. Clear previous non-persistent House Cards.
3. Roll House Cards for the current table.
4. Add rolled House Cards to active House Cards.
5. Apply before-draw House Cards.
6. Draw/display player hand.
7. Player hovers/selects cards.
8. UI previews score using active House Cards.
9. Player scores selected cards.
10. Apply before-score House Cards.
11. Score selected cards using player card effects.
12. Apply score-window House Cards.
13. Determine win/loss.
14. Apply after-round House Cards, including Burn Notice.
15. Spend played cards for the match.
16. Continue to next round or finish match.
```

Implementation detail: score-window effects may be applied before or after card effects internally, as long as the result model reports the final active window consistently. The UI should never lie about the target window.

### 5.3 Required types

Add to `src/cards/cardGame.ts`:

```ts
export type HouseCardTiming =
  | 'before-draw'
  | 'score-window'
  | 'before-score'
  | 'after-round';

export type HouseCardRarity = 'common' | 'uncommon' | 'rare' | 'freak';

export type HouseCardId =
  | 'tighten-the-gap'
  | 'open-the-gap'
  | 'short-hand'
  | 'chip-tax'
  | 'dealer-skims'
  | 'big-blind'
  | 'no-cowards'
  | 'two-pair'
  | 'burn-notice';

export interface HouseCardDefinition {
  id: HouseCardId;
  name: string;
  shortText: string;
  description: string;
  timing: HouseCardTiming;
  rarity: HouseCardRarity;
  weight: number;
}

export interface ActiveHouseCard {
  id: HouseCardId;
  roundPlayed: number;
  persistent: boolean;
}
```

### 5.4 Competition state changes

Update `CardCompetitionState`:

```ts
export interface CardCompetitionState {
  tableId: CardTableId;
  wagerScore: number;
  round: number;
  wins: number;
  losses: number;
  spentCards: CardId[];
  deck: CardId[];
  discard: CardId[];

  activeHouseCards: ActiveHouseCard[];
  houseCardsThisRound: HouseCardId[];
}
```

`activeHouseCards` is the full currently active list.

`houseCardsThisRound` is the newly played list for UI animation and messaging.

### 5.5 Rolling House Cards

Add pure helper:

```ts
export function rollHouseCardsForRound(
  table: CardTableDefinition,
  random: () => number,
): HouseCardId[];
```

Behavior:

1. Determine card count from `table.houseMode`.
2. Select from `table.houseCardPool`.
3. Use `HOUSE_CARD_DEFINITIONS[id].weight` for weighted selection.
4. Avoid duplicate House Cards in the same round.
5. Allow persistent duplicate prevention on Freak Dennis unless later design wants stacking duplicates.

Recommended rule: no duplicate active House Card on the same match.

Example:

```ts
function canRollHouseCard(
  id: HouseCardId,
  alreadyRolledThisRound: Set<HouseCardId>,
  activeHouseCards: ActiveHouseCard[],
  table: CardTableDefinition,
): boolean {
  if (alreadyRolledThisRound.has(id)) return false;
  if (table.houseMode.persistent && activeHouseCards.some((card) => card.id === id)) {
    return false;
  }
  return true;
}
```

If the pool is exhausted, roll fewer cards rather than duplicating.

### 5.6 Applying House Cards to state

At round start:

```ts
export function startCardCompetitionRound(
  state: CardCompetitionState,
  table: CardTableDefinition,
  random: () => number,
): CardCompetitionState {
  const persistentCards = state.activeHouseCards.filter((card) => card.persistent);
  const rolled = rollHouseCardsForRound(table, random);

  const newlyActive = rolled.map((id) => ({
    id,
    roundPlayed: state.round,
    persistent: table.houseMode.persistent,
  }));

  return {
    ...state,
    activeHouseCards: [...persistentCards, ...newlyActive],
    houseCardsThisRound: rolled,
  };
}
```

This helper may be implemented mutably or immutably depending on current code style, but the behavior should be covered by tests.

---

## 6. Initial House Card Definitions

### 6.1 Tighten the Gap

```text
Name: Tighten the Gap
Short text: Window narrows
Timing: score-window
Rarity: common
Effect: Increase min score by 2. Decrease max score by 2.
```

Example:

```text
Base: 18-34
Final: 20-32
```

Implementation:

```ts
minScore += 2;
maxScore -= 2;
```

If the window becomes invalid due to multiple modifiers, clamp so there is always at least a 1-point valid window.

### 6.2 Open the Gap

```text
Name: Open the Gap
Short text: Window widens
Timing: score-window
Rarity: common
Effect: Decrease min score by 5. Increase max score by 5.
```

Implementation:

```ts
minScore -= 5;
maxScore += 5;
```

Clamp minimum target to at least 0.

This card can help the player. That is okay. The house does not always need to play optimally; it plays by table rules.

### 6.3 Short Hand

```text
Name: Short Hand
Short text: Draw 4
Timing: before-draw
Rarity: uncommon
Effect: Player draws 4 cards instead of 5 this round.
```

Implementation:

- Determine hand size before calling `drawCompetitionHand`.
- Default hand size is 5.
- If Short Hand is active, hand size is 4.
- If future cards modify draw size, resolve all draw-size modifiers before drawing.

### 6.4 Chip Tax

```text
Name: Chip Tax
Short text: Each card -1
Timing: before-score
Rarity: common
Effect: Each played card contributes -1 chip, minimum 0 per card.
```

Implementation options:

Preferred: apply this at the individual-card chip contribution level before summing chips.

```ts
const adjustedChipValue = Math.max(0, card.chips - 1);
```

This matters because effects like “highest-chip card” or “lowest-chip card” should have a consistent definition. The recommended rule:

- Chip Tax changes chip contribution.
- It does not change printed chip value.
- Effects that refer to printed card value should use original `card.chips`.
- Effects that refer to scoring contribution should use adjusted contribution.

Document this in code comments.

### 6.5 Dealer Skims

```text
Name: Dealer Skims
Short text: Lowest ignored
Timing: before-score
Rarity: rare
Effect: The lowest-chip played card is removed before scoring. It is still spent.
```

Implementation:

- Determine lowest printed chip value among selected cards.
- If tied, remove one card deterministically.
- Recommended tie-breaker: remove the leftmost selected card among the tied lowest cards.
- Removed card does not contribute score or effects.
- Removed card is still considered played for match attrition.
- Removed card is still destroyed by Burn Notice if Burn Notice is active.

The result object must report the removed card so the UI can say:

```text
Dealer Skims ignored Lantern Three.
```

### 6.6 Big Blind

```text
Name: Big Blind
Short text: Score +5
Timing: before-score
Rarity: uncommon
Effect: Add 5 chips to the final score.
```

This can help or hurt. It is especially dangerous near the ceiling.

Implementation:

```ts
finalScore += 5;
```

The result should include an applied effect entry.

### 6.7 No Cowards

```text
Name: No Cowards
Short text: 1 card = -10
Timing: before-score
Rarity: uncommon
Effect: If the player scores exactly 1 card, final score gets -10.
```

Important detail:

- Count scored cards after Dealer Skims.
- If the player selected 2 cards and Dealer Skims removes 1, No Cowards should see 1 scored card.
- This creates a mean but readable combo.

Implementation:

```ts
if (scoredCards.length === 1) {
  finalScore -= 10;
}
```

Clamp final score at 0 if current scoring already does that.

### 6.8 Two Pair

```text
Name: Two Pair
Short text: Pairs score double
Timing: before-score
Rarity: rare
Effect: If the scored hand contains at least two different pairs of matching printed chip values, multiplier +1.
```

Definition of “two pair”:

- Count printed chip values among scored cards.
- A pair is any value with at least two cards.
- Two Pair requires at least two different values with pair counts.

Example:

```text
3, 3, 5, 5 = Two Pair
3, 3, 3, 5 = Not Two Pair
3, 3, 3, 5, 5 = Two Pair
```

Effect:

```ts
multiplier += 1;
```

This is a House Card that can help the player but changes selection incentives.

### 6.9 Burn Notice

```text
Name: Burn Notice
Short text: Played cards destroyed
Timing: after-round
Rarity: rare/freak
Effect: Cards played this round are permanently removed from the player's collection after scoring.
```

Burn Notice must appear in every table’s house-card pool.

Different tables should change its weight, not its availability.

Behavior:

- The card must be visible before selection.
- It applies after scoring.
- It applies whether the player wins or loses the round.
- It destroys selected cards, including cards ignored by Dealer Skims.
- It removes one owned copy per played card.
- It should show explicit result messaging.

Example result messaging:

```text
Burn Notice destroyed:
Moss Eight
Lantern Three
```

If multiple copies of the same card are played somehow, remove that many copies.

If the player owns only one copy and plays one copy, the card count becomes 0 and the card is no longer in the collection.

If a bug would cause removal beyond owned count, clamp at 0 and log a warning in development.

---

## 7. House Card Weights

Weights should be stored on the House Card definitions or in table-specific overrides.

Simple initial approach:

```ts
export interface HouseCardDefinition {
  id: HouseCardId;
  name: string;
  shortText: string;
  description: string;
  timing: HouseCardTiming;
  rarity: HouseCardRarity;
  weight: number;
}
```

Then allow optional table overrides later if needed.

Recommended base weights:

| House Card | Base Weight | Notes |
|---|---:|---|
| Tighten the Gap | 12 | Common pressure |
| Open the Gap | 8 | Helpful / chaos card |
| Chip Tax | 10 | Common pressure |
| Big Blind | 8 | Sometimes helpful, sometimes harmful |
| Short Hand | 7 | Strong but simple |
| No Cowards | 6 | Selection pressure |
| Two Pair | 4 | More complex incentive |
| Dealer Skims | 4 | Strong and mean |
| Burn Notice | 2 | Universal but scary |

Recommended table-specific Burn Notice adjustment:

| Table | Burn Notice Effective Weight |
|---|---:|
| Porch Table | 1 |
| Market Table | 2 |
| Freak Dennis Dare | 3 |

Implementation options:

1. Store base weights only and include Burn Notice less often through duplicate pool weighting.
2. Add table-specific house-card weights.

Preferred long-term shape:

```ts
export interface WeightedHouseCardEntry {
  id: HouseCardId;
  weight?: number;
}

export interface CardTableDefinition {
  // ...
  houseCardPool: WeightedHouseCardEntry[];
}
```

This lets Porch Table keep Burn Notice in the pool with a very low weight without weird special cases.

---

## 8. Scoring Integration

### 8.1 Preserve existing scoring when no House Cards are active

This is a strict requirement.

Existing tests for `scoreCardHand` should continue to pass. If no House Cards are provided, scoring should behave exactly as it does today.

### 8.2 New score function signature

Update `scoreCardHand` to accept options:

```ts
export interface ScoreCardHandOptions {
  houseCards?: HouseCardId[];
}

export function scoreCardHand(
  cardIds: CardId[],
  table: CardTableDefinition,
  options: ScoreCardHandOptions = {},
): CardScoreResult;
```

### 8.3 Expanded score result

The UI needs a richer result to preview scoring and explain house effects.

Proposed result shape:

```ts
export interface CardScoreResult {
  baseScore: number;
  finalScore: number;

  baseMinScore: number;
  baseMaxScore: number;
  minScore: number;
  maxScore: number;

  chips: number;
  multiplier: number;

  playedCards: CardId[];
  scoredCards: CardId[];
  removedBeforeScore: CardId[];

  appliedEffects: string[];
  activeHouseCards: HouseCardId[];

  destroyedCards?: CardId[];
}
```

Definitions:

- `playedCards`: cards the player selected.
- `scoredCards`: cards that actually contributed to scoring after before-score removal.
- `removedBeforeScore`: selected cards removed/ignored by a House Card such as Dealer Skims.
- `destroyedCards`: cards that should be destroyed by after-round effects. This can be calculated in scoring or by a separate helper.

### 8.4 Score preview

The same score function should be usable for live preview.

When selected cards change, the scene should call:

```ts
const preview = scoreCardHand(selectedCards, table, {
  houseCards: state.activeHouseCards.map((card) => card.id),
});
```

Then display:

```text
Selected Score: 28
Target: 20-32
HIT
```

If no cards are selected:

```text
Select 1-5 cards.
```

If a House Card affects scoring, preview should already include it.

---

## 9. Burn Notice Persistence and Collection Mutation

### 9.1 Pure scoring should not directly mutate the collection

`scoreCardHand` may identify cards that should be destroyed, but it should not modify persistent player state.

Persistent mutation should happen scene-side, likely in `snakeScene.ts`, because the scene already owns player collection and saved state.

### 9.2 Add helper to determine destroyed cards

In `cardGame.ts`:

```ts
export function getDestroyedCardsForRound(
  playedCards: CardId[],
  activeHouseCards: HouseCardId[],
): CardId[] {
  if (!activeHouseCards.includes('burn-notice')) {
    return [];
  }
  return [...playedCards];
}
```

Or include this in score result.

### 9.3 Scene-side removal

In `snakeScene.ts`, after scoring and before the next round:

```ts
const destroyedCards = getDestroyedCardsForRound(
  selectedCards,
  state.activeHouseCards.map((card) => card.id),
);

if (destroyedCards.length > 0) {
  this.removeCardsFromCollection(destroyedCards);
  this.showBurnNoticeMessage(destroyedCards);
}
```

The removal function must handle duplicates correctly.

Example behavior:

```text
Collection before:
Moss Eight x2
Lantern Three x1

Played:
Moss Eight x1
Lantern Three x1

Collection after:
Moss Eight x1
Lantern Three x0
```

### 9.4 Burn Notice and spent cards

A destroyed card is still spent for the current match. However, if it is removed from persistent collection, future matches should not include it.

During the current match:

- It does not matter if the card remains in `spentCards`; it should not return anyway.
- The important effect is persistent collection removal.

---

## 10. UI Redesign Requirements

### 10.1 Overall screen direction

The card-table UI should be rebuilt visually as a tabletop overlay.

Required layout zones:

```text
Top:        table title, round state, active target window
Upper:      house side, small house cards
Middle:     player hand, large cards
Lower:      selected card details, score preview, deck/spent counts
Bottom:     actions: Score Hand, Play All, View Deck, Fold
```

The current shop-like popup should be replaced or heavily restyled.

The screen should still preserve enough game context that it feels like an in-world overlay rather than a totally separate menu.

### 10.2 Table surface

Visual requirements:

- Dark felt or dark green/blue tabletop center
- Wood frame or table edge
- Light pixel texture, not flat black
- Space for house cards above player hand
- Space for deck stack or decorative card back on the house side
- Optional small props: candle, coin stack, plant, skull token, snake card back

Avoid:

- Giant tutorial panels
- Large boxed explanations above the cards
- UI that looks like a spreadsheet of rules

### 10.3 Header

Header should show:

```text
Porch Table R1 (0-0)
Target Window: 18-34
```

For modified windows, show active first.

Preferred format:

```text
Target Window: 20-32
Base: 18-34
```

Alternative if space is tight:

```text
Target Window: 18-34 → 20-32
```

The active window must always be clear. The player should not need to mentally apply house-card text to know the current target.

### 10.4 House side visual requirements

House Cards should look like actual small playing cards.

They should be:

- Above the player hand
- Smaller than player cards
- Card-shaped
- Laid horizontally on the table
- Visually secondary but readable
- Hoverable
- Distinct from player cards but part of the same card language

Recommended relative size:

```text
House Card height: 50-60% of player card height
House Card width: proportional to player card width
```

Suggested card contents:

```text
Name
Icon
Short rule text
```

Example:

```text
Tighten Gap
[arrows icon]
Window -2/-2
```

Example:

```text
Burn Notice
[fire icon]
Played destroyed
```

The House side label should be small:

```text
House plays this round
```

For persistent tables:

```text
House cards active
```

Do not use a big `HOUSE TURN` banner unless it is brief animation text that disappears.

### 10.5 House side behavior by table

Porch Table:

```text
House plays this round
[1 small House Card]
```

Market Table:

```text
House plays this round
[1-2 small House Cards]
```

Freak Dennis Dare:

```text
House cards active
[old card] [old card] [new card]
```

For Freak Dennis Dare:

- Older persistent House Cards may be slightly dimmed.
- New House Card should be highlighted or glow briefly.
- All active cards remain hoverable and readable.
- If the row grows too wide, cards may overlap slightly like a real card spread.

### 10.6 Player card visual redesign

Player cards should move from plain panels to more polished playing/deckbuilder cards.

Each player card should show:

- Card name
- Large chip value
- Suit name
- Suit icon
- Small sprite art
- Rarity ribbon/badge

The card face should not need full effect text. Full rules go in the detail panel.

Suggested player card structure:

```text
┌─────────────────┐
│ Card Name       │
│                 │
│       8         │
│      MOSS       │
│   [sprite art]  │
│                 │
│    UNCOMMON     │
└─────────────────┘
```

### 10.7 Suit identities

Each suit needs a strong visual identity.

| Suit | Color Direction | Icon Direction | Visual Notes |
|---|---|---|---|
| Moss | Green | moss rock / clover / plant | Damp, sturdy, earthy |
| Teeth | Bone, ivory, red | fang / tooth | Aggressive, sharp |
| Lanterns | Orange, gold | lantern | Warm, market, flame |
| Moons | Blue, silver | crescent moon | Night, careful, cool |
| Smoke | Purple, gray | smoke cloud / skull puff | Dirty, cursed, evasive |
| Jade | Teal, jade green | jade coin / gem | Valuable, polished, strange |

Cards should use modular suit accents so future cards are cheap to add.

### 10.8 Card selection behavior

Hover:

- Updates detail panel.
- Does not select.

Click:

- Toggles selection.

Selected cards:

- Raise upward slightly.
- Gain outline/glow.
- Optional small pointer beneath.
- Included in live score preview.

Selection count:

- Minimum selected to score: 1
- Maximum selected to score: current hand size
- Normal hand size: 5
- Short Hand size: 4

`Score Hand` disabled when no cards are selected.

### 10.9 Detail panel

The detail panel should be the main explanation area.

It should show whichever card is hovered, selected, or most recently interacted with.

Player card detail example:

```text
Moss Eight · MOSS · 8 Chips · Uncommon

Add 2 Chips for each other MOSS in your hand.

"It's damp. It's chill. It's 8."
```

House card detail example:

```text
Burn Notice · HOUSE CARD · Rare

Cards you play this round are permanently removed from your collection after scoring.
```

The detail panel should not be enormous. It should be readable, but the table and cards should remain the focus.

### 10.10 Score preview

A compact score preview should appear once the player selects cards.

Possible format:

```text
Selected Score: 28
Target: 20-32
HIT
```

If too low:

```text
Selected Score: 14
Target: 20-32
TOO LOW
```

If too high:

```text
Selected Score: 38
Target: 20-32
TOO HIGH
```

The score preview must use the same scoring logic as final resolution.

The preview must account for:

- Player card effects
- House Cards
- Adjusted target window
- Dealer Skims ignored card
- Chip Tax
- Big Blind
- No Cowards
- Two Pair

If a card will be destroyed by Burn Notice, the preview should warn:

```text
Burn Notice active: selected cards will be destroyed.
```

This warning can be small but should be visible before scoring.

### 10.11 Action buttons

Replace `Forfeit` with `Fold`.

Required bottom buttons:

```text
Score Hand
Play All
View Deck
Fold
```

Button behavior:

| Button | Behavior |
|---|---|
| Score Hand | Scores currently selected cards. Disabled if none selected. |
| Play All | Selects and immediately scores all cards in the current hand. |
| View Deck | Opens deck/spent overlay. |
| Fold | Ends the match and loses the wager after confirmation. |

Fold confirmation:

```text
Fold this table?
You will lose your wager.

[Fold] [Keep Playing]
```

### 10.12 Deck and spent card visibility

Because attrition is core to the match, the UI needs compact deck state.

Main table should show:

```text
Deck: 12
Spent: 4
```

`Deck` means cards still available to appear later in the match.

`Spent` means cards already played and unavailable until the match ends.

The `View Deck` overlay should show at least:

```text
Remaining Cards
Spent This Match
```

Optional third section if Burn Notice has fired:

```text
Destroyed This Match
```

The overlay does not need to show the full persistent collection at first.

---

## 11. Interaction Flow Changes

### 11.1 Current issue

The card table currently feels like a shop option. The redesign should make card play feel like a distinct table interaction.

### 11.2 Desired interaction root

When the player interacts with a card dealer or table, show a root menu like:

```text
Play Cards
Buy Cards
Leave
```

If the same NPC also acts as a regular shopkeeper:

```text
Talk
Shop
Play Cards
Buy Cards
Leave
```

But card play should not be buried as a normal shop item.

### 11.3 Table selection screen

Selecting `Play Cards` should open table selection.

Each table option should show:

- Name
- Target window
- House behavior
- Max wager
- Payout
- Risk label
- Burn Notice possibility if desired

Example table cards/options:

```text
Porch Table
Target: 18-34
House: 1 card each round
Max Wager: 10
Payout: 1.4x
Low Risk
```

```text
Market Table
Target: 36-62
House: 1-2 cards each round
Max Wager: 25
Payout: 1.65x
Medium Risk
```

```text
Freak Dennis Dare
Target: 78-118
House: 1 card each round; cards stay active
Max Wager: 50
Payout: 1.9x
High Risk
The house remembers.
```

### 11.4 Wager selection

After table selection, show legal fixed wagers only.

Example for Porch Table:

```text
Bet 5
Bet 10
Back
```

Example for Market Table:

```text
Bet 5
Bet 10
Bet 25
Back
```

Example for Freak Dennis Dare:

```text
Bet 5
Bet 10
Bet 25
Bet 50
Back
```

Only show wagers the player can afford.

If the player cannot afford the minimum wager:

```text
You need at least 5 score to sit at this table.
```

### 11.5 Card shop separation

`Buy Cards` should open card shop offers.

Card buying and card playing are related, but not the same screen.

This should make the flow clearer:

```text
Want to improve your deck? Buy Cards.
Want to gamble with it? Play Cards.
```

---

## 12. Round UI Flow

### 12.1 Enter match

After wager selection:

1. Subtract wager.
2. Create competition state.
3. Transition to table UI.
4. Start round 1.

### 12.2 Start round animation

Recommended visual sequence:

```text
House deck wiggles or glows.
House Card flips/deals to house side.
If multiple, deal one at a time.
Player hand appears/deals.
Player can act.
```

For Freak Dennis Dare:

```text
Old House Cards remain on table.
New House Card deals in and glows.
```

### 12.3 Choosing cards

The player hovers/selects cards.

The UI updates:

- Detail panel
- Selection glow
- Score preview
- Burn Notice warning if relevant

### 12.4 Scoring animation

When `Score Hand` is clicked:

1. Selected cards bump/flash.
2. House Cards that affect scoring flash in timing order.
3. Score preview becomes final score.
4. Win/loss result appears.
5. Burn Notice destruction message appears if relevant.
6. Continue to next round or match result.

### 12.5 Round result

Win messaging:

```text
Hit!
Score: 28
Round won.
```

Loss low:

```text
Too Low!
Score: 14
Round lost.
```

Loss high:

```text
Bust!
Score: 38
Round lost.
```

House effect messaging examples:

```text
Dealer Skims ignored Lantern Three.
Burn Notice destroyed Moss Eight and Moon Jack.
```

### 12.6 Match result

Victory:

```text
You beat the Porch Table.
Payout: +14
Net Profit: +4
```

Defeat:

```text
The house keeps your wager.
```

Freak Dennis defeat:

```text
Freak Dennis smiles.
The house keeps your wager.
```

Fold:

```text
You folded.
The house keeps your wager.
```

---

## 13. Code-Level Implementation Notes

### 13.1 `cardGame.ts` responsibilities

`cardGame.ts` should own:

- Card definitions
- House Card definitions
- Table definitions
- House Card rolling
- Competition state type
- Competition state creation
- Hand draw helper
- Score helper
- Destroyed-card calculation helper
- Pure helpers for active target window / hand size

Suggested new helpers:

```ts
export function getActiveHouseCardIds(state: CardCompetitionState): HouseCardId[];

export function getActiveScoreWindow(
  table: CardTableDefinition,
  houseCards: HouseCardId[],
): { minScore: number; maxScore: number };

export function getHandSizeForRound(
  houseCards: HouseCardId[],
): number;

export function rollHouseCardsForRound(
  table: CardTableDefinition,
  random: () => number,
  activeHouseCards?: ActiveHouseCard[],
): HouseCardId[];

export function beginCardRound(
  state: CardCompetitionState,
  table: CardTableDefinition,
  random: () => number,
): void;

export function scoreCardHand(
  cardIds: CardId[],
  table: CardTableDefinition,
  options?: ScoreCardHandOptions,
): CardScoreResult;

export function getDestroyedCardsForRound(
  playedCards: CardId[],
  houseCards: HouseCardId[],
): CardId[];
```

### 13.2 `snakeScene.ts` responsibilities

`snakeScene.ts` should own:

- NPC/card table interaction menu
- Table selection UI
- Wager selection UI
- Wager subtraction
- Table overlay rendering
- House Card rendering and animations
- Player card rendering
- Hover/selection handling
- Score preview rendering
- Calling score helper for preview and final scoring
- Applying persistent Burn Notice collection changes
- Payout on victory
- Fold confirmation
- View Deck overlay
- Music/sound/juice

### 13.3 Avoid duplicating scoring logic in the scene

The scene should not manually calculate score preview separately from final score.

The scene should call `scoreCardHand` for both preview and final resolution.

If the UI needs more explanation, expand `CardScoreResult` rather than reimplementing scoring in UI code.

### 13.4 Avoid hidden randomness after player commits

House Cards are rolled before the player selects cards.

After the player clicks `Score Hand`, no new House Card should appear and no new random scoring effect should happen unless it was already visible and stated.

This is especially important for Burn Notice.

---

## 14. Edge Cases

### 14.1 Player deck has fewer cards than hand size

If the match deck has fewer than the requested hand size, draw as many as available.

If zero cards are available:

```text
No cards left.
Round lost.
```

Then continue/finish according to match rules.

### 14.2 Short Hand with small deck

If Short Hand requests 4 cards but deck has 3, draw 3.

### 14.3 Dealer Skims with one selected card

Dealer Skims removes the only card.

Result:

- Scored cards list is empty.
- Final score should be 0 unless other House Cards add score.
- The selected card is still spent.
- Burn Notice still destroys it if active.

UI should say:

```text
Dealer Skims ignored your only card.
```

### 14.4 No Cowards after Dealer Skims

No Cowards checks scored cards after Dealer Skims.

If two selected cards become one scored card, No Cowards applies.

### 14.5 Burn Notice with Dealer Skims

Burn Notice destroys played/selected cards, not only scored cards.

Example:

```text
Selected: Moss Eight, Lantern Three
Dealer Skims ignores Lantern Three.
Burn Notice destroys Moss Eight and Lantern Three.
```

### 14.6 Burn Notice and duplicate cards

Destroy only the copies actually played.

If the player owns 3 copies and plays 1, they should have 2 after the match effect.

### 14.7 Persistent House Cards and duplicate rolls

Freak Dennis Dare should not roll duplicate active House Cards unless explicitly allowed later.

If the active persistent pool is exhausted, roll fewer cards.

### 14.8 Invalid score window

If score-window modifiers would cause `minScore > maxScore`, clamp to a tiny valid window.

Suggested helper:

```ts
function normalizeScoreWindow(minScore: number, maxScore: number) {
  const clampedMin = Math.max(0, minScore);
  const clampedMax = Math.max(clampedMin, maxScore);
  return { minScore: clampedMin, maxScore: clampedMax };
}
```

Alternative: enforce at least width 1.

### 14.9 Player folds after Burn Notice appears

Fold should end the match and lose the wager.

Burn Notice should not destroy cards if the player folds before scoring.

Reason: Burn Notice destroys played cards. Fold plays no cards.

### 14.10 Match ends after Burn Notice round

Burn Notice should still apply even if the round ends the match.

Example:

- Player wins second round.
- Match victory triggers.
- Burn Notice was active.
- Played cards are destroyed before returning to normal game.

---

## 15. Testing Requirements

Use the existing Vitest setup.

### 15.1 Existing behavior regression tests

Required:

- `scoreCardHand` returns the same results as before when no House Cards are active.
- Existing card effects still work.
- Existing table score windows still apply when no House Cards are active.

### 15.2 House Card rolling tests

Test cases:

```text
Porch Table rolls exactly 1 House Card.
Market Table rolls either 1 or 2 House Cards.
Freak Dennis Dare rolls exactly 1 House Card.
Rolls come from the table's house-card pool.
Rolls avoid duplicate cards within a round.
Persistent tables avoid rolling cards already active.
Burn Notice is present in every table pool.
```

### 15.3 House Card scoring tests

Test cases:

```text
Tighten the Gap changes 18-34 to 20-32.
Open the Gap changes 18-34 to 13-39.
Chip Tax reduces each card contribution by 1, minimum 0.
Dealer Skims removes the lowest printed-chip selected card from scoring.
Big Blind adds 5 final score.
No Cowards applies when exactly 1 card is scored.
Two Pair adds multiplier when two different pairs are present.
Burn Notice returns selected cards as destroyed cards.
```

### 15.4 Combination tests

Test cases:

```text
Dealer Skims + No Cowards can turn two selected cards into one scored card and trigger No Cowards.
Dealer Skims + Burn Notice destroys both selected and ignored cards.
Tighten the Gap + Open the Gap produce a correct final window.
Freak Dennis persistent House Cards accumulate across rounds.
Non-persistent House Cards clear between rounds.
```

### 15.5 Wager tests

Test cases:

```text
Wager options do not exceed player score.
Wager options do not exceed table maxWager.
Porch Table only offers 5 and 10 when player can afford both.
Market Table offers up to 25.
Freak Dennis Dare offers up to 50.
Victory payout uses table payoutMultiplier.
Fold loses wager and does not pay out.
```

### 15.6 Burn Notice collection tests

If collection helpers are testable outside Phaser, add tests for:

```text
Destroying one copy of a card decrements count by 1.
Destroying multiple played cards decrements each correctly.
Destroying duplicate played card IDs removes multiple copies.
Removal clamps at 0.
Burn Notice does nothing if no cards are played.
Fold does not trigger Burn Notice destruction.
```

---

## 16. Acceptance Criteria

The feature is complete when all of the following are true:

### Table structure

- Each table defines `maxWager`.
- Each table defines `payoutMultiplier`.
- Each table defines `houseMode`.
- Each table defines a `houseCardPool`.
- Burn Notice is present in every table’s pool.

### Wagers and payouts

- Percentage wagers are removed.
- Bet-all is removed.
- Wager options are fixed amounts capped by table max.
- Player cannot wager more than current score.
- Victory payout uses table payout multiplier.
- Fold loses wager.

### House Cards

- House Cards are rolled before the player selects cards.
- House Cards are visible on the table before selection.
- Porch Table plays 1 non-persistent House Card per round.
- Market Table plays 1-2 non-persistent House Cards per round.
- Freak Dennis Dare plays 1 persistent House Card per round.
- Active Freak Dennis House Cards accumulate between rounds.
- Burn Notice permanently destroys played cards after scoring.
- Burn Notice applies across all tables.

### UI

- Card table uses a physical tabletop layout.
- House Cards appear as small actual card-like objects on the house side.
- Player cards use redesigned card faces with name, chip value, suit, icon/art, and rarity.
- Detail panel explains hovered/selected player cards and House Cards.
- Score preview updates based on selected cards and active House Cards.
- `Forfeit` is renamed to `Fold`.
- `View Deck` shows remaining and spent cards.

### Scoring

- Existing scoring behavior is unchanged when no House Cards are active.
- Score preview and final scoring use the same rules.
- Score result exposes enough information for UI explanations.

### Tests

- House Card rolling is tested.
- House Card scoring is tested.
- Wager caps and payouts are tested.
- Burn Notice collection removal is tested.
- Existing scoring regression tests pass.

---

## 17. Suggested Implementation Checklist

This is an implementation checklist, not a request to reduce scope.

### Core data and rules

- [ ] Add House Card types.
- [ ] Add House Card definitions.
- [ ] Add `HouseMode`.
- [ ] Extend `CardTableDefinition`.
- [ ] Update all `CARD_TABLES`.
- [ ] Add House Card rolling helper.
- [ ] Extend `CardCompetitionState`.
- [ ] Add active House Cards to competition creation/round start.
- [ ] Add hand-size helper for Short Hand.
- [ ] Extend `scoreCardHand` with options.
- [ ] Extend `CardScoreResult`.
- [ ] Add destroyed-card helper for Burn Notice.

### Scene integration

- [ ] Update table selection to show house behavior, max wager, payout.
- [ ] Replace wager options with capped fixed wagers.
- [ ] Start each round by rolling House Cards.
- [ ] Pass active House Cards into hand size/scoring.
- [ ] Add score preview using `scoreCardHand`.
- [ ] Apply Burn Notice to persistent collection after scoring.
- [ ] Rename Forfeit to Fold.
- [ ] Add Fold confirmation.
- [ ] Add View Deck overlay.

### UI redesign

- [ ] Build tabletop panel/background.
- [ ] Render small House Cards on house side.
- [ ] Render redesigned player cards.
- [ ] Add selected-card raise/glow.
- [ ] Add hover detail panel for player cards.
- [ ] Add hover detail panel for House Cards.
- [ ] Add active target window display.
- [ ] Add deck/spent counts.
- [ ] Add compact round result messaging.

### Tests

- [ ] Add House Card rolling tests.
- [ ] Add House Card scoring tests.
- [ ] Add combination tests.
- [ ] Add wager/payout tests.
- [ ] Add Burn Notice collection tests if helper is extractable.
- [ ] Run `npm test`.
- [ ] Run `npm run typecheck`.

---

## 18. Tone and Copy Guidelines

The UI should be readable, but it should still sound like this game.

Good labels:

```text
House plays this round
House cards active
The house remembers
Fold
Burn Notice
Dealer Skims
No Cowards
Freak Dennis smiles
```

Avoid overly technical labels on the main UI:

```text
Modifier phase
Rules engine active
Persistent effect stack
```

The player should understand the game without the UI sounding like a spreadsheet.

Recommended table copy:

```text
Porch Table
A low-stakes table where the house only cheats a little.
```

```text
Market Table
A busy table with flexible rules and flexible morals.
```

```text
Freak Dennis Dare
The house remembers.
```

Recommended fold copy:

```text
Fold this table?
You will lose your wager.
```

Recommended Burn Notice copy:

```text
Played cards will be destroyed after scoring.
```

Recommended Freak Dennis match loss:

```text
Freak Dennis smiles.
The house keeps your wager.
```

---

## 19. Final Design Summary

The redesigned card-table system should feel like a real card game inside the world of `Snake for the Modern Gamer`.

The house does not merely apply invisible rules. The house plays cards.

The player does not read a giant instruction panel. The player looks across the table, sees what the house played, checks their hand, and decides what to risk.

The three tables should form a clear escalation:

```text
Porch Table:
  1 temporary House Card each round.
  Low max wager.
  Low payout.
  Burn Notice possible but rare.

Market Table:
  1-2 temporary House Cards each round.
  Medium max wager.
  Medium payout.
  Burn Notice possible.

Freak Dennis Dare:
  1 persistent House Card each round.
  High max wager.
  Highest payout.
  House Cards accumulate.
  Burn Notice can become a match-long disaster.
```

The final experience should be readable, strategic, unfair in a funny way, and visually grounded in the feeling of sitting at a cursed little card table.
