# SPECIAL Stats + Player-Facing Chance Pane Requirements and Design

## Purpose

Add a SPECIAL-style stat system to the pause menu that exposes player-facing chances and derived modifiers without silently changing the current game balance.

The core design rule is:

> A SPECIAL value of **5** means **current game behavior**.  
> Stats are routed through every displayed chance/modifier, but at all 5s the output must match today's game exactly.

This document defines the requirements, player-facing model, implementation design, repo integration plan, and first-pass stat/chance mapping.

---

## Cemented Requirements

### Baseline rule

- SPECIAL stats use a neutral baseline of `5`.
- All derived chance math must use `statValue - 5`.
- At all stats equal to `5`, every effective chance, reward modifier, reduction, and display value must match the current game.
- Do **not** mutate base config values. Stats produce derived effective values.

Bad:

```ts
gameConfig.treasureChance += luckBonus;
```

Good:

```ts
const effectiveTreasureChance = getTreasureDiscoveryChance(gameConfig, stats);
```

### Player-facing chance pane

The right side of the stats tab should show derived, understandable, player-facing values.

Examples:

```txt
Treasure Discovery Chance: 10%
Powerup Discovery Chance: 10%
Special Apple Chance: 32%
Animal Bonus Drop Chance: +0%
Fishing Stability: +0%
Resentment Reduction: 0%
```

Avoid exposing internal seeded/world-generation math unless the number represents a player-facing non-seeded modifier.

### Seeded / world-generation rule

Avoid using SPECIAL to alter systems that should feel like stable world generation.

Do **not** make these primary stat effects:

- Ladder spawn/discovery chance.
- Structure spawn chance.
- Settlement spawn chance.
- Biome animal spawn chance.
- Raw biome room generation odds.
- Phase vs. smite powerup split.

These can remain internal or appear in debug/dev views, but they should not be the main player-facing stat fantasy.

### Positive-stat presentation rule

Where the backend has a negative probability, display the positive player-facing inverse.

Prefer:

```txt
Fishing Stability: +12%
Fish Retention: +8%
Suspicion Reduction: 14%
Resentment Reduction: 10%
```

Instead of:

```txt
Line Break Chance: 13.2%
Escape Chance: 46%
Suspicion Gain: 86%
Resentment Gain: 90%
```

The game can still calculate reductions against negative rolls internally.

### Weight-table rule

For weighted systems, the UI should convert weights into player-facing runtime percentages.

Examples:

- Apple type tables should produce `Special Apple Chance` and `Rare Apple Chance`.
- Fish tables should produce `Rare Fish Chance` or category-weight percentages.
- Animal drop tables should produce bonus/drop/recovery chances, not raw spawn weights.

### Scope rule for first implementation

The first implementation should prioritize architecture and display correctness over final balance.

First-pass deliverables:

1. SPECIAL data model.
2. Derived chance service.
3. Pause-menu stats tab.
4. Chance pane grouped by domain.
5. All stats wired into formulas with `5 = baseline`.
6. Selected runtime systems consume derived values only where low-risk.
7. Save/load support for stats and unspent points.

---

## Current Repository Findings

### Existing pause-menu architecture

The current pause menu is already centered around `SkillTreeManager` and `SkillTreeOverlay`.

`SkillTreeManager` constructs a `SkillTreeSystem`, an `ActionSlotController`, and a `SkillTreeOverlay`. It passes the overlay callbacks for spell slots, dating views, people, destiny, and artifacts. This makes it a natural place to pass a `getStatsView` or `getSpecialView` callback rather than making the overlay query every game system directly.

Relevant files:

- `src/systems/skillTreeManager.ts`
- `src/ui/skillTreeOverlay.ts`
- `src/systems/skillTree.ts`
- `src/systems/skillTypes.ts`

Current manager pattern:

```ts
this.overlay = new SkillTreeOverlay(this.scene, this.system, {
  onRequestPurchase: ...,
  getSpellSlotView: ...,
  getDatingView: ...,
  getPeopleView: ...,
  getDestinyView: ...,
  getArtifactView: ...,
});
```

Recommendation:

```ts
getSpecialView: () => this.scene.getSpecialStatsView(),
onPreviewSpecialChange: (statId, delta) => this.scene.previewSpecialStatChange(statId, delta),
onApplySpecialChanges: () => this.scene.applySpecialStatChanges(),
onResetSpecialPreview: () => this.scene.resetSpecialStatPreview(),
```

### Existing overlay tab model

`SkillTreeOverlay` currently defines primary tab groups and specific tab IDs in one file. The Growth group currently contains `skills` and `spells`.

Recommended addition:

```ts
type TabId =
  | 'skills'
  | 'special'
  | 'spells'
  ...
```

And:

```ts
{ id: 'special', i18nKey: 'tabSpecial', group: 'growth' }
```

The overlay already supports tab switching, active tab detection, scroll offsets, and text-based scrollable panels. The stats tab can reuse this architecture but should probably get its own left/right text objects rather than overloading `questListText`.

### Existing scroll/text pattern

The overlay already has:

- `scrollOffsets: Partial<Record<TabId, number>>`
- `scrollMaskGraphics`
- `scrollHintText`
- `getScrollableViewportHeight()`
- `applyScrollableTextOffset(...)`
- `resetScrollableText(...)`

The right-hand chance pane should be scrollable. Because the SPECIAL tab has a two-column layout, the implementation should add a second scrollable text target or a small helper class instead of reusing `questListText`.

Recommended helper:

```ts
interface ScrollTextPanel {
  tab: TabId;
  text: Phaser.GameObjects.Text;
  mask: Phaser.Display.Masks.GeometryMask;
  baseY: number;
  viewportHeight: number;
}
```

But for a first pass, adding `specialStatsText` and `specialChanceText` is enough.

### Existing skill system

`SkillTreeSystem` already handles perk definitions, ranks, effects, score costs, flag effects, mana, score multipliers, and reset behavior. It is currently a progression/perk system, not a general character stat system.

Important conclusion:

- Do **not** shove SPECIAL directly into `SkillTreeStats`.
- SPECIAL should be a separate domain model.
- The pause menu can show both `skills` and `special` under Growth.
- Some existing skill perks may eventually grant SPECIAL points or stat bonuses, but that should be a later integration.

Suggested new files:

```txt
src/stats/specialTypes.ts
src/stats/specialStats.ts
src/stats/statModifiers.ts
src/stats/chanceBreakdowns.ts
src/stats/specialStatsService.ts
```

### Save/load

`GameSaveData` currently includes score, snake body, player health, quests, inventory, equipment, flags, world generation identity, cosmetics, Minecraft fields, and fishing state. It does not currently have a SPECIAL stat payload.

Recommended addition:

```ts
special?: {
  version: 1;
  stats: Record<SpecialStatId, number>;
  unspentPoints: number;
};
```

Migration/default rule:

- Missing `special` means all stats are `5`, unspent points `0`.
- This preserves existing saves exactly.

### Existing chance/reward systems suitable for SPECIAL

#### Exploration

Current good candidates:

- Treasure Discovery Chance.
- Powerup Discovery Chance.

Current world room generation has direct `0.1` chances for treasure and powerups. These are player-facing enough if reframed as discovery outcomes and kept baseline-stable.

Design:

```ts
treasureDiscoveryChance = additiveChance(0.10, stats, {
  perception: 0.015,
  luck: 0.005,
});

powerupDiscoveryChance = additiveChance(0.10, stats, {
  perception: 0.0125,
  intelligence: 0.0025,
});
```

At `PER = 5`, `LCK = 5`, `INT = 5`, both remain `10%`.

Do not include ladder chance here.

#### Apples

Apple definitions are weight-based and threshold-gated. This should not be displayed as raw weights.

Current good player-facing stats:

- Special Apple Chance.
- Rare Apple Chance.
- Apple Quality Bonus.
- Apple Score Bonus, if eventually desired.

Runtime calculation:

```ts
const eligible = getEligibleAppleWeights(score, tileContext, stats);
const totalWeight = sum(eligible.map((x) => x.weight));
const standardWeight = weightOf('standard');
const specialWeight = totalWeight - standardWeight;
const rareWeight = sum(weights for configured rare apple types);

specialAppleChance = specialWeight / totalWeight;
rareAppleChance = rareWeight / totalWeight;
```

Recommended stat effects:

```ts
effectiveAppleWeight = baseWeight * appleWeightScalarForType(type, stats);
```

At Luck 5 / Perception 5, scalar is `1`.

Candidate formula:

```ts
specialScalar = 1 + statDelta(stats.luck) * 0.06;
rareScalar = 1 + statDelta(stats.luck) * 0.05 + statDelta(stats.perception) * 0.015;
```

The UI should show computed percentages, not `+weight`.

#### Animals / Hunting

Do not boost `animalSpawnChance`. More animals is not universally desirable.

Current good player-facing stats:

- Animal Bonus Drop Chance.
- Animal Double Drop Chance.
- Meat Recovery Chance.
- Rare Animal Drop Chance, future-facing.

Current animal drop plumbing already supports a bonus chance, double roll, and guaranteed meat style modifiers. SPECIAL should feed those modifiers.

Design:

```ts
animalDropModifiers = {
  bonusChance: additivePercent(stats, {
    luck: 0.02,
    strength: 0.005,
  }),
  doubleRollChance: additivePercent(stats, {
    luck: 0.01,
    strength: 0.005,
  }),
  meatRecoveryChance: additivePercent(stats, {
    strength: 0.02,
    endurance: 0.005,
  }),
};
```

Implementation detail:

- Existing `doubleRoll` is boolean.
- Convert it to a roll at the call site:

```ts
const doubleRoll = rng() < getAnimalDoubleDropChance(stats);
rollAnimalDrops(def.drops, rng, {
  bonusChance,
  doubleRoll,
  guaranteedMeat,
});
```

Do not make biome animal spawn chance part of the stat pane.

#### Fishing

Fishing should show positive modifiers, not raw negative chances.

Current good player-facing stats:

- Fishing Control.
- Fishing Stability.
- Fish Retention.
- Catch Progress Bonus.
- Rare Fish Chance.

Suggested backend mapping:

```ts
fishingControl = additivePercent(stats, {
  agility: 0.025,
  intelligence: 0.005,
});

fishingStability = additivePercent(stats, {
  endurance: 0.025,
  agility: 0.01,
});

fishRetention = additivePercent(stats, {
  endurance: 0.015,
  luck: 0.01,
});

catchProgressBonus = additivePercent(stats, {
  agility: 0.015,
  intelligence: 0.01,
});

rareFishChance = additivePercent(stats, {
  luck: 0.02,
  perception: 0.005,
});
```

Apply as derived effects:

```ts
effectiveLineBreakChance = baseLineBreakChance * (1 - fishingStability);
effectiveEscapeChance = baseEscapeChance * (1 - fishRetention);
effectiveProgressGain = baseProgressGain * (1 + catchProgressBonus);
```

At all 5s, each modifier is `0`, and fishing remains unchanged.

#### Archaeology

Archaeology is a strong fit for Intelligence + Luck.

Current good player-facing stats:

- Excavation Reward Chance.
- Equipment Recovery Chance.
- Artifact Recovery Chance.
- Rare Artifact Chance.
- Excavation Apple Bonus.
- Cache Discovery Chance, future-facing.

Suggested mapping:

```ts
excavationRewardChanceBonus = additivePercent(stats, {
  intelligence: 0.0125,
  luck: 0.0125,
});

equipmentRecoveryChanceBonus = additivePercent(stats, {
  intelligence: 0.015,
  luck: 0.0075,
});

artifactRecoveryChanceBonus = additivePercent(stats, {
  intelligence: 0.0125,
  luck: 0.0125,
});

rareArtifactChanceBonus = additivePercent(stats, {
  luck: 0.02,
  intelligence: 0.005,
});

excavationAppleBonusChance = additivePercent(stats, {
  intelligence: 0.015,
  luck: 0.005,
});
```

This can map cleanly to the existing `ArchaeologyTuning` concept:

```ts
const tuning: ArchaeologyTuning = {
  rewardLuck: excavationRewardChanceBonus,
  equipmentRewardChance: equipmentRecoveryChanceBonus,
  excavationAppleBonus: computedAppleBonus,
  goldAppleFrequency: ...,
};
```

At 5s, tuning should be equivalent to no modifier.

#### Social / Relationships / Town

Do not display Wanted Level as a stat effect.

Current good player-facing stats:

- Affection Gain Bonus.
- Trust Gain Bonus.
- Resentment Reduction.
- Jealousy Reduction.
- Suspicion Reduction.
- Fine Reduction.
- Apology Effectiveness.
- Intimidation Control.

Suggested mapping:

```ts
affectionGainBonus = additivePercent(stats, {
  charisma: 0.025,
  intelligence: 0.005,
});

trustGainBonus = additivePercent(stats, {
  charisma: 0.015,
  intelligence: 0.01,
});

resentmentReduction = additivePercent(stats, {
  charisma: 0.025,
});

jealousyReduction = additivePercent(stats, {
  charisma: 0.02,
});

suspicionReduction = additivePercent(stats, {
  charisma: 0.02,
  agility: 0.01,
});

fineReduction = additivePercent(stats, {
  charisma: 0.025,
});

apologyEffectiveness = additivePercent(stats, {
  charisma: 0.03,
  intelligence: 0.005,
});

intimidationControl = additivePercent(stats, {
  strength: 0.015,
  charisma: 0.015,
});
```

Apply these to deltas, not to raw state.

Example:

```ts
effectiveAffectionDelta = positiveDelta * (1 + affectionGainBonus);
effectiveResentmentDelta = negativeResentmentDelta * (1 - resentmentReduction);
effectiveSuspicionGain = baseSuspicionGain * (1 - suspicionReduction);
```

At all 5s, all modifiers are `0`.

---

## SPECIAL Stat Identity

### Strength

Fantasy: physical force, predation, intimidation.

Primary effects:

- Meat Recovery Chance.
- Animal Double Drop Chance.
- Intimidation Control.
- Future bite/combat damage.

Avoid making Strength the generic loot stat.

### Perception

Fantasy: finding things and understanding the room.

Primary effects:

- Treasure Discovery Chance.
- Powerup Discovery Chance.
- Cache Discovery Chance.
- Rare Apple visibility/odds support.
- Rare Fish support.
- More detailed chance pane visibility later.

### Endurance

Fantasy: survival, stability, forgiveness.

Primary effects:

- Fishing Stability.
- Fish Retention.
- Heat/cold/hunger resistance later.
- Max hearts at thresholds later.

### Charisma

Fantasy: social upside and social damage control.

Primary effects:

- Affection Gain Bonus.
- Trust Gain Bonus.
- Resentment Reduction.
- Jealousy Reduction.
- Suspicion Reduction.
- Fine Reduction.
- Apology Effectiveness.

### Intelligence

Fantasy: system mastery, extraction, readouts, better use of minigames.

Primary effects:

- Archaeology reward bonuses.
- Equipment/artifact recovery.
- Catch Progress Bonus.
- Trust Gain support.
- More detailed chance pane visibility later.

### Agility

Fantasy: control, movement precision, escapes.

Primary effects:

- Fishing Control.
- Catch Progress Bonus.
- Suspicion Reduction support.
- Future dodge/escape/stealth modifiers.

### Luck

Fantasy: rare outcomes, loot quality, bonus rolls.

Primary effects:

- Special Apple Chance.
- Rare Apple Chance.
- Animal Bonus Drop Chance.
- Animal Double Drop Chance.
- Rare Fish Chance.
- Rare Artifact Chance.

---

## Recommended New Domain Model

### `src/stats/specialTypes.ts`

```ts
export const SPECIAL_STAT_IDS = [
  'strength',
  'perception',
  'endurance',
  'charisma',
  'intelligence',
  'agility',
  'luck',
] as const;

export type SpecialStatId = (typeof SPECIAL_STAT_IDS)[number];

export type SpecialStats = Record<SpecialStatId, number>;

export interface SpecialStatsState {
  version: 1;
  stats: SpecialStats;
  unspentPoints: number;
}

export interface SpecialStatsPreviewState {
  committed: SpecialStatsState;
  previewStats: SpecialStats;
  previewUnspentPoints: number;
}
```

### `src/stats/specialStats.ts`

```ts
import { SPECIAL_STAT_IDS, type SpecialStats, type SpecialStatsState } from './specialTypes.js';

export const SPECIAL_BASELINE = 5;
export const SPECIAL_MIN = 1;
export const SPECIAL_MAX = 10;

export function createDefaultSpecialStats(): SpecialStats {
  return {
    strength: SPECIAL_BASELINE,
    perception: SPECIAL_BASELINE,
    endurance: SPECIAL_BASELINE,
    charisma: SPECIAL_BASELINE,
    intelligence: SPECIAL_BASELINE,
    agility: SPECIAL_BASELINE,
    luck: SPECIAL_BASELINE,
  };
}

export function createDefaultSpecialState(): SpecialStatsState {
  return {
    version: 1,
    stats: createDefaultSpecialStats(),
    unspentPoints: 0,
  };
}

export function getStatDelta(stats: SpecialStats, stat: SpecialStatId): number {
  return clampStat(stats[stat]) - SPECIAL_BASELINE;
}

export function clampStat(value: number): number {
  if (!Number.isFinite(value)) return SPECIAL_BASELINE;
  return Math.max(SPECIAL_MIN, Math.min(SPECIAL_MAX, Math.floor(value)));
}

export function normalizeSpecialStats(input?: Partial<Record<SpecialStatId, number>>): SpecialStats {
  const base = createDefaultSpecialStats();
  for (const id of SPECIAL_STAT_IDS) {
    if (input && id in input) {
      base[id] = clampStat(input[id]);
    }
  }
  return base;
}
```

### `src/stats/statModifiers.ts`

```ts
import type { SpecialStatId, SpecialStats } from './specialTypes.js';
import { getStatDelta } from './specialStats.js';

export type StatModifierMap = Partial<Record<SpecialStatId, number>>;

export function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

export function clampPercentModifier(value: number, min = -0.75, max = 0.75): number {
  return Math.max(min, Math.min(max, value));
}

export function additiveChance(
  baseChance: number,
  stats: SpecialStats,
  modifiers: StatModifierMap,
): number {
  let result = baseChance;
  for (const [stat, perPoint] of Object.entries(modifiers) as [SpecialStatId, number][]) {
    result += getStatDelta(stats, stat) * perPoint;
  }
  return clamp01(result);
}

export function additivePercent(
  stats: SpecialStats,
  modifiers: StatModifierMap,
  min = -0.75,
  max = 0.75,
): number {
  let result = 0;
  for (const [stat, perPoint] of Object.entries(modifiers) as [SpecialStatId, number][]) {
    result += getStatDelta(stats, stat) * perPoint;
  }
  return clampPercentModifier(result, min, max);
}

export function applyReduction(baseValue: number, reduction: number): number {
  return baseValue * (1 - reduction);
}

export function applyBonus(baseValue: number, bonus: number): number {
  return baseValue * (1 + bonus);
}
```

### `src/stats/chanceBreakdowns.ts`

```ts
import type { SpecialStatId } from './specialTypes.js';

export type ChanceBreakdownSection =
  | 'Exploration'
  | 'Apples'
  | 'Hunting'
  | 'Fishing'
  | 'Archaeology'
  | 'Social';

export interface ChanceBreakdownLine {
  id: string;
  label: string;
  value: string;
  detail?: string;
  affectedBy?: readonly SpecialStatId[];
  visibleAtIntelligence?: number;
}

export interface ChanceBreakdownSectionView {
  section: ChanceBreakdownSection;
  lines: ChanceBreakdownLine[];
}

export interface SpecialStatsView {
  stats: Array<{
    id: SpecialStatId;
    label: string;
    value: number;
    delta: number;
    description: string;
  }>;
  unspentPoints: number;
  sections: ChanceBreakdownSectionView[];
}
```

### `src/stats/specialStatsService.ts`

This should be the main source of truth for UI view and derived values.

Responsibilities:

- Store committed SPECIAL stats.
- Store preview stats.
- Handle increment/decrement/apply/reset.
- Build `SpecialStatsView`.
- Expose runtime derived modifiers.
- Normalize save/load data.
- Never mutate `gameConfig`.

Suggested methods:

```ts
export class SpecialStatsService {
  getCommittedState(): SpecialStatsState;
  restore(state?: Partial<SpecialStatsState>): void;
  exportState(): SpecialStatsState;

  getPreviewStats(): SpecialStats;
  previewIncrease(stat: SpecialStatId): boolean;
  previewDecrease(stat: SpecialStatId): boolean;
  applyPreview(): void;
  resetPreview(): void;

  getChanceView(context: SpecialChanceContext): SpecialStatsView;

  getExplorationModifiers(): ExplorationSpecialModifiers;
  getAnimalDropModifiers(rng: RandomGenerator): AnimalDropModifiers;
  getFishingModifiers(): FishingSpecialModifiers;
  getArchaeologyTuning(): ArchaeologyTuning;
  getSocialModifiers(): SocialSpecialModifiers;
}
```

---

## Runtime Context for Chance View

The chance pane should be context-aware but stable.

Suggested context:

```ts
export interface SpecialChanceContext {
  score: number;
  currentRoomId?: string;
  currentBiomeId?: string;
  currentTileKind?: string;
  isWaterTile?: boolean;
  fishingBiomeId?: string;
  datingCandidateId?: string;
}
```

Use context to compute current apple/fish weighted odds and current eligible information.

Do not require every context field for first pass.

---

## UI Design

### Tab placement

Add a new tab under Growth:

```txt
Growth
- Skills
- SPECIAL
- Spells
```

### Layout

Left pane:

```txt
SPECIAL

Strength       5   [-] [+]
Perception     5   [-] [+]
Endurance      5   [-] [+]
Charisma       5   [-] [+]
Intelligence   5   [-] [+]
Agility        5   [-] [+]
Luck           5   [-] [+]

Unspent Points: 0

[Apply Points]
[Reset Preview]
```

Right pane:

```txt
CHANCES

Exploration
Treasure Discovery Chance: 10%
  Base 10% · PER +0% · LCK +0%
Powerup Discovery Chance: 10%
  Base 10% · PER +0% · INT +0%

Apples
Special Apple Chance: 32%
  Current eligible apple table · LCK +0%
Rare Apple Chance: 12%
  Current eligible apple table · LCK +0% · PER +0%

Hunting
Animal Bonus Drop Chance: +0%
Animal Double Drop Chance: 0%
Meat Recovery Chance: 0%

Fishing
Fishing Control: +0%
Fishing Stability: +0%
Fish Retention: +0%
Catch Progress Bonus: +0%
Rare Fish Chance: +0%

Archaeology
Excavation Reward Chance: +0%
Equipment Recovery Chance: +0%
Artifact Recovery Chance: +0%
Rare Artifact Chance: +0%

Social
Affection Gain Bonus: +0%
Trust Gain Bonus: +0%
Resentment Reduction: 0%
Jealousy Reduction: 0%
Suspicion Reduction: 0%
Fine Reduction: 0%
```

### Preview behavior

When the player clicks `+` or `-`, the chance pane should update immediately using preview stats.

If the preview is unapplied, show visual indicators:

```txt
Luck 5 -> 6
Special Apple Chance: 32% -> 35%
Animal Bonus Drop Chance: +0% -> +2%
```

First pass can skip arrows and just update live.

### Button behavior

- `+` is disabled if no unspent points or stat already max.
- `-` is disabled if preview stat equals committed stat or stat already min.
- `Apply Points` commits preview state.
- `Reset Preview` restores preview state to committed state.
- For first pass, if there are no unspent points, the UI can still render but buttons should be disabled.

---

## Integration Plan

### Step 1: Add stats domain

Create:

```txt
src/stats/specialTypes.ts
src/stats/specialStats.ts
src/stats/statModifiers.ts
src/stats/chanceBreakdowns.ts
src/stats/specialStatsService.ts
```

Include tests for:

- Default all stats are 5.
- Missing save data normalizes to all 5s.
- Stat delta at 5 is 0.
- Additive chance at baseline returns base chance.
- Percent modifiers at baseline return 0.
- Clamps work.

### Step 2: Add save payload

Update `GameSaveData`:

```ts
special?: SpecialStatsState;
```

Update save export/load/import path wherever `SnakeGame` assembles save data.

Migration:

```ts
if (!data.special) data.special = createDefaultSpecialState();
```

Existing saves should remain valid.

### Step 3: Add service ownership

Best owner: `SnakeGame` or a small `PlayerProgression` object owned by `SnakeGame`.

Recommended:

```ts
private readonly specialStats = new SpecialStatsService();
```

Expose scene methods:

```ts
getSpecialStatsView(): SpecialStatsView {
  return this.snakeGame.getSpecialStatsView();
}
```

This avoids making `SkillTreeOverlay` know about `SnakeGame` internals beyond a single callback.

### Step 4: Wire overlay handlers

Update `SkillTreeManager` to pass:

```ts
getSpecialView: () => this.scene.getSpecialStatsView(),
onPreviewSpecialChange: (statId, delta) => this.scene.previewSpecialStatChange(statId, delta),
onApplySpecialChanges: () => this.scene.applySpecialStatChanges(),
onResetSpecialPreview: () => this.scene.resetSpecialStatPreview(),
```

Update overlay handler types.

### Step 5: Add SPECIAL tab UI

In `SkillTreeOverlay`:

- Add `special` to `TabId`.
- Add `tabSpecial` i18n key.
- Add `specialStatsText`.
- Add `specialChanceText`.
- Add row maps for stat plus/minus and buttons.
- Add rendering method:

```ts
private refreshSpecialText(view: SpecialStatsView): void
```

- Add pointer handling for the stats pane.

Avoid adding stat math in `SkillTreeOverlay`.

### Step 6: Use derived values in runtime

Start with low-risk systems:

1. Animal drop modifiers.
2. Fishing reductions/bonuses.
3. Archaeology tuning.
4. Social delta modifiers.
5. Exploration discovery chances.
6. Apple/fish weighted odds.

Do this carefully and one subsystem at a time.

---

## Detailed Runtime Wiring Recommendations

### Exploration

Add a domain helper, not inline scene math:

```txt
src/stats/explorationSpecial.ts
```

```ts
export function getTreasureDiscoveryChance(stats: SpecialStats): number {
  return additiveChance(0.10, stats, {
    perception: 0.015,
    luck: 0.005,
  });
}

export function getPowerupDiscoveryChance(stats: SpecialStats): number {
  return additiveChance(0.10, stats, {
    perception: 0.0125,
    intelligence: 0.0025,
  });
}
```

Then route room creation through a runtime chance provider.

Important: if room generation is meant to become seeded/fixed, do not use SPECIAL to mutate the generated room identity. Instead:
- either treat these as post-generation discovery rolls,
- or leave them display-only until the seeded generation decision is settled.

### Apples

Add:

```txt
src/stats/appleSpecial.ts
```

Functions:

```ts
getAppleWeightScalars(stats)
getSpecialAppleChance(config, stats, context)
getRareAppleChance(config, stats, context)
```

Need a clear list of “special” and “rare” apple types.

First pass:

```ts
const SPECIAL_APPLES = [
  'shielded',
  'gold',
  'skittish',
  'mochi',
  'wasabi',
  'yuzu',
  'caffeinated',
];

const RARE_APPLES = [
  'gold',
  'mochi',
  'wasabi',
  'yuzu',
  'caffeinated',
];
```

Do not include zero-weight biome/event-only apples unless currently eligible.

### Animal drops

Add:

```txt
src/stats/animalSpecial.ts
```

Functions:

```ts
getAnimalBonusDropChance(stats)
getAnimalDoubleDropChance(stats)
getMeatRecoveryChance(stats)
buildAnimalDropModifiers(stats, rng)
```

Then at the animal drop call site, pass the modifiers.

### Fishing

Add:

```txt
src/stats/fishingSpecial.ts
```

Functions:

```ts
getFishingControl(stats)
getFishingStability(stats)
getFishRetention(stats)
getCatchProgressBonus(stats)
getRareFishChance(stats)
```

Then extend `FishingRegistryOptions` or minigame options with modifiers.

Important: keep the baseline behavior unchanged by defaulting modifiers to zero.

### Archaeology

Add:

```txt
src/stats/archaeologySpecial.ts
```

Functions:

```ts
getExcavationRewardChanceBonus(stats)
getEquipmentRecoveryChanceBonus(stats)
getArtifactRecoveryChanceBonus(stats)
getRareArtifactChanceBonus(stats)
getExcavationAppleBonus(stats)
buildArchaeologyTuning(stats)
```

Then pass into `MolemanArchaeologySession` through existing tuning plumbing or a new options object.

### Social and town

Add:

```txt
src/stats/socialSpecial.ts
```

Functions:

```ts
getAffectionGainBonus(stats)
getTrustGainBonus(stats)
getResentmentReduction(stats)
getJealousyReduction(stats)
getSuspicionReduction(stats)
getFineReduction(stats)
getApologyEffectiveness(stats)
getIntimidationControl(stats)
```

Then wire:
- relationship delta application,
- town suspicion application,
- fines,
- apology/reassure choices,
- intimidation style interactions.

Keep relationship thresholds stable at first. It is cleaner to modify deltas than to move thresholds around.

---

## Balancing Defaults

Initial per-point effects should be small.

Recommended range:

- Common discovery chances: `+0.5%` to `+1.5%` per relevant point.
- Bonus drop chances: `+0.5%` to `+2%` per relevant point.
- Reductions: `+1%` to `+2.5%` per relevant point.
- Rare outcomes: `+0.5%` to `+2%` per Luck point.
- Avoid any single stat causing more than about `+10%` absolute chance by itself at 10 unless intended.

Recommended clamp:

```ts
chance: 0..1
modifier: -0.75..0.75
reduction: 0..0.75 for displayed reductions
```

Remember that stats below 5 should be allowed to reduce values unless the design later decides stats are never below 5.

---

## What Not To Do

Do not:

- Modify base config values.
- Put stat math in `SkillTreeOverlay`.
- Add SPECIAL fields directly to `SkillTreeStats`.
- Display seeded world-gen odds as player stats.
- Treat more animal spawns as a default benefit.
- Show wanted level as a SPECIAL effect.
- Show phase vs. smite powerup odds.
- Fake percentages for threshold systems like romance. Show gain/reduction modifiers instead.
- Rebalance the game accidentally at all 5s.

---

## Recommended First Pull Request

Title:

```txt
Add SPECIAL stat design and chance breakdown architecture
```

Files:

```txt
docs/special-stats-design.md
src/stats/specialTypes.ts
src/stats/specialStats.ts
src/stats/statModifiers.ts
src/stats/chanceBreakdowns.ts
src/stats/specialStatsService.ts
src/stats/__tests__/specialStats.test.ts
```

Optional if implementing UI in same PR:

```txt
src/ui/skillTreeOverlay.ts
src/systems/skillTreeManager.ts
src/game/saveManager.ts
src/game/snakeGame.ts
```

But the cleaner first PR is:

1. Add docs.
2. Add domain model.
3. Add tests.
4. Add no gameplay changes yet.

Then second PR:

1. Add pause-menu SPECIAL tab.
2. Show derived baseline chances.
3. Still no gameplay behavior changes except display.

Then third PR:

1. Wire runtime systems one by one.

---

## Acceptance Criteria

### Baseline

- Given all SPECIAL stats are 5:
  - Treasure Discovery Chance displays current base chance.
  - Powerup Discovery Chance displays current base chance.
  - Animal Bonus Drop Chance is `+0%`.
  - Fishing Stability is `+0%`.
  - Fish Retention is `+0%`.
  - Excavation bonuses are `+0%`.
  - Social reductions/gain bonuses are `0%`.
  - Current saves load without behavior change.

### UI

- SPECIAL tab appears under Growth.
- Left pane shows all seven stats.
- Right pane shows grouped chance breakdowns.
- Chance values update when preview stats change.
- Apply commits preview.
- Reset discards preview.
- Disabled buttons are obvious.

### Architecture

- Stat math is in `src/stats`, not in `SkillTreeOverlay`.
- Runtime systems consume derived values through named helpers.
- Base config remains unchanged.
- Tests cover baseline neutrality.

### Design

- No seeded/world-gen-only stats are promoted as player build stats.
- Negative backend chances are represented as positive player-facing benefits.
- Weighted systems show converted percentages, not raw weights.
