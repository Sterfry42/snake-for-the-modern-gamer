# Tiny Deckbuilder Card Game Design

## Goal

Add a very small Balatro-like village card game where the snake builds a personal card deck by buying cards. The card game should not assume a standard 52-card deck. If the snake owns no cards, they can still enter a match and almost certainly lose. If they have bought 10 weird cards with strong effects, they can compete and win.

## Working Title

**Snake Stakes**

## Core Fantasy

The snake slithers up to a roadside card table, buys strange cards from villages, then uses that small personal deck in quick competitions. The fun is not "I know poker perfectly." The fun is "I found a busted little card combo."

## Big Rule

The player's deck is made only from cards they own.

No free 52-card deck. No default full deck.

A new run might start with:

- 0 cards, if we want the player to buy into the system
- or 3 bad starter cards, if pure 0-card start feels too punishing

I prefer 0 cards as the cleanest joke and clearest economy hook: you can enter with nothing and get embarrassed.

## Round Flow

1. Player chooses to enter a match.
2. Game shuffles the player's owned card deck.
3. Player draws up to 5 cards.
4. If player has fewer than 5 cards, they draw only what exists.
5. Player plays up to 5 cards as a hand.
6. Cards score chips and multipliers.
7. Score must land inside that table's target window.

This is simpler than dealer poker. The opponent is a target score.

Example:

- Village table target window: 40-65
- Player plays 4 cards
- Cards total 38 chips
- Effects add +20 chips
- Final score 58
- Player wins

If the player scored 39, they lose for being too weak.

If the player scored 66, they lose for overplaying the table.

## Match Structure

Each competition has 3 rounds.

- Win 2 out of 3 rounds to beat the table.
- Each round draws fresh from the same deck.
- Used cards go to discard.
- If deck runs out, shuffle discard back into deck.
- If the player has 0 cards, their round score is 0.

This gives tiny decks a real identity:

- 3-card deck: very consistent, but limited.
- 10-card deck: stronger variety, but less predictable.
- 25-card deck: lots of effects, but harder to find combos.

## Score Window

Each table has a minimum and maximum score.

To win a round:

`minimum <= final score <= maximum`

Examples:

- Beginner table: 20-45
- Village table: 40-65
- Sharp table: 80-120
- Mythic table: 150-210

This is more interesting than "make number bigger" because deckbuilding becomes about control. A huge rare card can be dangerous if it overshoots. Weak cards can become useful because they help tune the final hand.

This also makes card effects more varied:

- Some cards add score.
- Some cards reduce score.
- Some cards clamp score.
- Some cards reward exact scores.
- Some cards widen the target window.
- Some cards convert overage into bonus rewards.

## Scoring Model

Each card has:

- Rank or face name
- Suit or type
- Chips
- Multiplier
- Effect text

Final round score:

`(sum of chips + bonus chips) * multiplier`

Keep numbers small at first.

Example cards:

- **Two of Moss**: 2 chips
- **Seven of Teeth**: 7 chips
- **Queen of Lanterns**: 12 chips, +1 multiplier if played with another Lantern
- **Freak Dennis Smog**: 3 chips, doubles score if this is your only purple card
- **Careful Five**: 5 chips. If you would bust over max, subtract 8 chips.
- **Snake Accountant**: 1 chip. Expands the target window by 5 on both sides.
- **Too Much Sauce**: +30 chips, but lose if this makes you exceed max.

## Card Families

Instead of normal suits, use weird snake-world suits:

- **Moss**: growth, healing, steady chip gains
- **Teeth**: aggressive multipliers
- **Lanterns**: village/card economy effects
- **Moons**: redraws, copying, strange manipulation
- **Smoke**: risky Freak Dennis effects

These can still visually resemble poker suits, but they belong to this world.

## Starter Card Ideas

If we decide to avoid true 0-card starts, the starter deck could be:

- Bent Two: 2 chips
- Dull Three: 3 chips
- Muddy Four: 4 chips

But again, 0 cards is funnier and makes the shop matter immediately.

## Shop Integration

Village shops should gain a third tab:

- Equipment
- Styles/Hats
- Cards

Card offers should be cheap early:

- Common cards: 3-8 score
- Uncommon cards: 10-20 score
- Rare cards: 25-50 score

Cards are permanent for the run and saved in game save data.

## Card Rarity

### Common

Simple chip cards and small conditional bonuses.

Examples:

- **Moss 5**: 5 chips.
- **Lantern 3**: 3 chips. +3 chips if played in a village.
- **Tooth 2**: 2 chips. +1 multiplier if your hand has exactly 2 cards.

### Uncommon

Combo-builders.

Examples:

- **Market Ace**: 11 chips. Cards bought this village cost 1 less after winning.
- **Moon Jack**: copies the chip value of the card to its left.
- **Coiled Pair**: +12 chips if two cards share a suit.

### Rare

Run-defining effects.

Examples:

- **Freak Dennis Smog**: x2 multiplier, but -10 chips if you played more than 3 cards.
- **Angel's Audit**: x3 multiplier if your hand has no Smoke cards.
- **Royal Scale**: +50 chips if this is the highest chip card in hand.
- **The Revolver Card**: destroys the lowest card in hand, then adds x2 multiplier.

## Competition Tables

Each village can have one card-table NPC or card stall.

Table tiers:

- Village Table: target window 40-65, reward 12 score
- Sharp Table: target window 80-120, reward 30 score
- Mythic Table: target window 150-210, reward rare card or cosmetic

The player should be able to inspect target and reward before entering.

Harder tables can have narrower windows:

- Beginner: broad window, easy to land in
- Normal: medium window
- Expert: narrow window with better rewards

## Failure

If you lose:

- Lose the entry fee
- No death, no snake damage
- Maybe the NPC says something rude

Entry fee should be low enough that experimenting is not painful.

## Why This Is Better Than Standard Poker

Standard poker is mostly about recognizing hands. This game should be about owning a weird little deck and making numbers explode.

It also connects naturally to the economy:

- Buy cards in villages
- Win competitions for score/cards/cosmetics
- Build a deck over the run
- Find busted combos

## MVP Scope

First implementation should include:

- Card inventory on the player/run
- Card shop offers in village shop
- Tiny deck shuffle/draw/discard
- 3-round score-window match
- Card modal UI
- 15-25 initial cards
- Basic effects:
  - flat chips
  - flat multiplier
  - conditional chips by suit
  - conditional multiplier by hand size
  - copy left card chips
  - reduce score if above max
  - widen score window

Skip for MVP:

- Full deck editing screen
- Animations beyond basic card movement
- Rare card destruction/exile effects
- Boss card opponents

## Open Questions

- Should all owned cards be in the deck automatically, or should the player choose an active deck?
- Should cards persist across runs eventually, or only within a run?
- Should the title "Snake Stakes" be serious enough, or do we need something dumber?
- Should card rewards appear in quests too?
