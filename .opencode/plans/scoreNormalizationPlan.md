# Score Normalization Plan

## Current State Analysis

### Score Flow (top-down)
```
Player Action (e.g., eat apple)
  → snakeScene.addScore(amount)        [applies skillTree.modifyScoreGain]
    → skillTree.modifyScoreGain(amount) [applies scoreMultiplier from perks]
      → snakeScene.addScoreDirect(amount)
        → snakeGame.addScore(amount)    [applies artifact scoreMultiplier]
          → snake.scoreValue += adjusted
```

### Stacked Multipliers (4 layers)
1. **Skill Tree** (`skillTree.ts:1740`): `scoreMultiplier` from multiple perks (1.04x–1.06x each, compound)
2. **Artifacts** (`snakeGame.ts:6999–7003`): product of `scoreMultiplier` modifiers (1.05x, 1.08x)
3. **Apple-specific** (`coreScore.ts:32–41`, `snakeGame.ts:1799–1817`): `cheatMultiplier * orangeJuiceMultiplier`
4. **Length** (`snakeGame.ts:7162–7168`): `2^((length-50)/100)` when length >= 50

**Problem:** All 4 layers multiply independently. A player with maxed perks + artifacts + orange juice + length 100 gets ~1.27 * 1.134 * 2.0 * 2.0 = **5.75x** total multiplier on apple score.

### Score Sources (unnormalized — 20+ independent sources)

| Category | Mechanism | Typical Range | Problem |
|----------|-----------|---------------|---------|
| Apple base | Apple type bonusScore | 0–4 | No normalization |
| Predation | `scorePerStack * stacks` per apple | 0–0.75/apple | Stacks on top of apple score, no decay between apples |
| Momentum | `scorePerStack * stacks` per apple | variable | Same stacking issue |
| Momentum surge | `surgeScore` on trigger | config-dependent | Can be triggered repeatedly |
| Starforged | `effects.scoreBonus` per apple | config-dependent | Adds to every apple independently |
| Starforged lightbind | +4 per lightbind apple | 4/apple | Flat bonus per apple, no cap |
| Predation rend | `scorePerCharge` on consumption | config-dependent | Scales with stacks |
| Predation apex | `config.apex.score` on activation | config-dependent | Scales with stacks |
| Quest rewards | Flat per quest | 10–100 | One-time, generally fine |
| Encounter rewards | `rewardScore` on completion | config-dependent | Varies wildly |
| Pickpocketing | 3–7 caught, 8–22 not caught | 3–22 | No fail cost when not caught |
| Card tables | Entry/exit fee spread | -3 to +58 | Negative EV tables exist |
| Archaeology | Match + artifact scoring | variable | Chains compound without limit |
| House ambient | +1 per 30 ticks | 0.033/tick | Passive, infinite |
| Animal defeat | +2/+1 | 1–2 | Very low, fine |
| Treasure pickup | +5 | 5 | Fine |
| Football catch | 15 (30 w/ caffeine) | 15–30 | Fine |
| Room reveals | +3 village, +5 town | 3–5 | Fine |
| **Jason Statham** | Boss defeat | **1,000** | Potentially repeatable spawn — massive outlier |
| **Quantum Trail** | 4-tick trail, +1/tick per turn | 4/turn | Spam turns for infinite score |
| **Echo Step** | 4-tick echo, +1/tick per room | 4/room | Enter rooms to drip score |
| **Frenzy** | 6 ticks at +4/tick | 24/frenzy | Spam frenzy activation (reducing to 10) |
| **World Eater** | +3 score per wall eaten | 3/wall | Eat walls for score + length |
| **Raccoon stash** | Weight × multiplier × banditBonus | 1–N | Farm weight, stash repeatedly |
| **Regenerator** | +1 length / 48 ticks | passive | Free length growth (indirect score via length multiplier) |

### Key Abuse Vectors

1. **Combo stacking**: Eat apples rapidly → predation stacks build → more score per apple → faster progression → more perks → even more score. This is a **positive feedback loop** with no normalization.

2. **Multi-source per tick**: One apple can trigger: base apple score + predation score + momentum score + starforged bonus + lightbind bonus. All 5 stack.

3. **Passive infinite income**: House ambient (+1/30 ticks), Starforged glimmer generation, public event progress — these generate score/resources without skill investment.

4. **Length exponential**: At length 100, the `2^((100-50)/100)` = 2x multiplier doubles apple score. This is a **hard floor** on apple score, not a ceiling — you can't get longer than 100 easily, but at that point score is doubled forever.

5. **Skill tree compounding**: 6 perks each giving 1.04x–1.06x bonus = ~1.27x total. Applied before artifact multiplier, which is also compound.

6. **Predation window abuse**: If the predation window is 28 ticks with decayHold of 6, a player can maintain stacks nearly indefinitely with minimal effort, getting 0.15 * 5 * 1.27 = ~0.95 bonus score per apple consistently.

7. **Starforged + predation**: Both systems trigger on apple eat. Starforged adds `effects.scoreBonus`, predation adds `scorePerStack * stacks`, momentum adds `scorePerStack * stacks` — all three independent.

### Additional Abuse Vectors (Spam + Big Rewards)

8. **Per-tick spam (Quantum Trail)**: `momentum.ts:13212` — each turn spawns a 4-tick trail worth +1/tick. A player who turns frequently can generate ~4 score per turn with minimal effort. In a 10,000-tick run, that's ~40,000 score from turning alone.

9. **Per-tick spam (Echo Step)**: `snakeGame.ts:13495` — each room entry spawns 4-tick echoes worth +1/tick. Enter rooms rapidly → drip score. Combined with Quantum Trail, turning + moving = ~8 score per tick.

10. **Frenzy spam**: `snakeGame.ts:14101` — at 5 stacks, frenzy triggers for 6 ticks at +4/tick = 24 score per frenzy. With predation quick-eat windows, frenzy can be re-triggered every ~8 ticks.

11. **World Eater wall farming**: `snakeGame.ts:14313–14318` — +3 score + 1 growth per wall eaten. Walls are essentially free at high lengths (the snake hits them by accident). This converts wall collisions (normally a death) into score.

12. **Jason Statham (1,000 score)**: `boss.ts:171` — boss defeat awards `maxHealth * 10 = 1,000` score. This is **100x a normal apple**. Found at least 3 separate spawn triggers in the codebase (`snakeGame.ts:893, 1507, 9467` + `snakeScene.ts:4472`). If respawnable, this is a massive farm.

13. **Raccoon weight farming**: `raccoonMode.ts:139` — score = `weight * multiplier * banditBonus`. If a player can accumulate and repeatedly stash weight at a butcher/shop, this is a repeatable score farm.

14. **Passive length generation (Regenerator/Religion)**: `skillTree.ts:331, 427` and `religionChoice.ts:59, 87` — free length generation that indirectly boosts score via the length multiplier. Mesopotamian (+1/24 ticks) + Hermit (+1/30 ticks) + Regenerator perk (+1/48 ticks) can stack to ~0.08 length/tick passively.

---

## Proposed Normalization Architecture

### Principle: Score should scale with effort, not with system overlap

We need a **single normalization layer** that caps the total score from any single game tick/action, regardless of how many systems trigger.

### Layer 1: Unified Score Cap Per Tick

Add a `normalizeScore(amount, sourceCategory, context)` function that applies a diminishing returns curve:

```typescript
function normalizeScore(baseAmount: number, category: ScoreCategory, context: ScoreContext): number {
  // 1. Apply per-category tick cap
  const tickTotal = getScoreTotalForTick(context.tick, category);
  const categoryCap = CATEGORY_CAPS[category]; // e.g., { apple: 10, combo: 5, passive: 1 }
  
  // 2. Apply diminishing returns if cap exceeded
  const remaining = Math.max(0, categoryCap - tickTotal);
  if (remaining < baseAmount) {
    // Diminishing returns: scale down proportionally
    const scaled = baseAmount * (remaining / baseAmount + 0.1);
    return Math.max(1, Math.ceil(scaled)); // minimum 1 to avoid zero-score
  }
  
  return baseAmount;
}
```

**Category caps (suggested):**
| Category | Cap/tick | Rationale |
|----------|----------|-----------|
| `apple` | 10 | Base apple score + apple-type bonuses + apple-specific multipliers |
| `combo` | 8 | Combined predation + momentum score (prevents stacking both) |
| `starforged` | 5 | All Starforged bonus score combined |
| `passive` | 1 | House ambient, tick-based passive income |
| `encounter` | 25 | Per-encounter cap (duels, pickpocket, etc.) |
| `quest` | 100 | One-time quest rewards (no cap needed per-tick, just one per quest) |
| `gameplay` | 15 | Card games, football, treasure, archaeology matches |
| `trail` | 2 | Quantum Trail + Echo Step combined (prevents turn-spam + room-enter spam) |
| `frenzy` | 4 | Frenzy passive score per tick |
| `worldEater` | 3 | Score per wall consumed (already close to cap, but explicit) |
| `raccoon` | 50 | Per-stash cap (prevents weight farming) |

### Layer 2: Cross-Category Combo Penalty

When multiple categories trigger on the same tick, apply a **combo penalty** that slightly reduces each category:

```
combinedMultiplier = 1.0 - 0.05 * (activeCategories - 1)
// e.g., 3 categories active → 0.90 multiplier on each
```

This rewards focused play (one system at a time) over trying to maximize everything simultaneously.

### Layer 3: Length Multiplier Rework

Replace the exponential `2^((length-50)/100)` with a **logarithmic curve**:

```typescript
function calculateAppleLengthScoreMultiplier(length: number): number {
  if (length < 50) return 1;
  // Logarithmic instead of exponential
  return 1 + Math.log2(1 + (length - 50) / 25);
  // length 50:  1.00x
  // length 75:  1.41x
  // length 100: 2.00x
  // length 150: 2.58x
  // length 200: 3.00x
}
```

This removes the exponential runaway while still rewarding length.

### Layer 4: Diminishing Returns on Stack-Based Systems

Predation and momentum stacks should have **diminishing returns per stack**:

```typescript
function applyStackScore(basePerStack: number, stacks: number): number {
  // First 3 stacks: full value
  // 4th+ stack: 50% value
  // 7th+ stack: 25% value
  const fullStacks = Math.min(stacks, 3);
  const halfStacks = Math.max(0, Math.min(stacks - 3, 4));
  const quarterStacks = Math.max(0, stacks - 7);
  
  return basePerStack * fullStacks + 
         basePerStack * 0.5 * halfStacks + 
         basePerStack * 0.25 * quarterStacks;
}
```

This means a player with 5 stacks gets less than double the score of a player with 2 stacks, preventing late-game runaway.

### Layer 5: Passive Income Value Reduction

Passive score sources (house ambient, Starforged glimmer, etc.) stay viable but are **reduced to low baseline values** so they contribute a meaningful bonus without dominating:

| Mechanism | Current Value | Reduced Value | Rationale |
|-----------|---------------|---------------|-----------|
| House ambient rest | +1 / 30 ticks (0.033/tick) | +1 / 60 ticks (0.017/tick) | Keep as a cozy bonus, ~50 score per 30-min run |
| Regenerator perks | +1/48, +2/24 ticks | Same (length benefit, not direct score) | Length indirectly helps via length multiplier — fine as-is |
| World Eater walls | +3 score / wall | **+1 score / wall** | Walls are failure states; +1 is a consolation, not a farming tool |

### Layer 6: Multiplier Budget System

Instead of multiplying multipliers together (skillTree * artifact * orangeJuice), use an **additive budget**:

```typescript
function calculateTotalScoreMultiplier(perkMultiplier: number, artifactMultiplier: number, statusMultiplier: number): number {
  // Convert multiplicative bonuses to additive bonuses
  const perkBonus = perkMultiplier - 1;  // e.g., 1.27 → 0.27
  const artifactBonus = artifactMultiplier - 1; // e.g., 1.134 → 0.134
  const statusBonus = statusMultiplier - 1; // e.g., 2.0 → 1.0
  
  // Cap total bonus at 2.0 (i.e., max 3x total multiplier)
  const totalBonus = Math.min(perkBonus + artifactBonus + statusBonus, 2.0);
  
  return 1 + totalBonus;
}
```

This prevents the 5.75x total multiplier scenario. Max would be 3x.

### Layer 7: Per-Tick Spam Value Reduction

For systems that award score **per tick** (Quantum Trail, Echo Step, Frenzy passive ticks), the fix is to **reduce the per-tick values** so spamming is fun but not dominant. No hard caps needed — just lower the numbers.

| Mechanism | Current Value | Reduced Value | Max Spam Rate | Score/hour at max spam |
|-----------|---------------|---------------|---------------|------------------------|
| Quantum Trail | +1/tick × 4 ticks = 4/turn | **+0.25/tick × 4 ticks = 1/turn** | ~60 turns/min | ~600 |
| Echo Step | +1/tick × 4 ticks = 4/room | **+0.25/tick × 4 ticks = 1/room** | ~30 rooms/min | ~300 |
| Frenzy passive | +4/tick × 6 ticks = 24/frenzy | **+2/tick × 5 ticks = 10/frenzy** | Every 8 ticks | ~7,200 |
| House ambient | +1 / 30 ticks | **+1 / 60 ticks** | Standing still | ~100 per 30-min run |

**Combined max spam scenario (all active simultaneously):**
- Old: 4 + 4 + 24/8 + 1/30 = ~12.03/tick average → **43,000/hour**
- New: 1 + 1 + 10/8 + 1/60 = ~2.49/tick average → **9,000/hour**

Frenzy remains the most profitable passive strategy at ~7,200/hour, but it's no longer overwhelming. Active strategies (eating apples, completing quests, fighting bosses) should also produce ~5,000–10,000/hour, keeping spam competitive but not dominant.

**Score velocity target:** ~300 score per 30 minutes (~0.17 score/tick or ~10 score/minute). Spam strategies should stay within 2x of this target at full commitment (~600/30min), while well-played active runs hit close to target.

### Layer 8: Jason Statham — Value Reduction + Diminishing Returns

Jason Statham's 1,000 score is **100x a normal apple** and **~3–5x what a full run might earn before mid-game**. This is too high for a potentially repeatable boss.

**Approach:** Keep the boss as-is (players can fight it as many times as they find), but apply diminishing returns for repeated defeats:

```typescript
interface JasonDefeatState {
  defeatedCount: number; // how many times this Jason has been defeated (or total Jason defeats in run)
}

function getJasonDefeatScore(defeatCount: number): number {
  const BASE_SCORE = 100; // reduced from 1,000
  
  // Diminishing returns: 100%, 60%, 36%, 22%... (each defeat pays 60% of previous)
  const decay = Math.pow(0.6, defeatCount);
  return Math.max(10, Math.floor(BASE_SCORE * decay));
}
```

| Defeat # | Score | Cumulative |
|----------|-------|------------|
| 1 | 100 | 100 |
| 2 | 60 | 160 |
| 3 | 36 | 196 |
| 4 | 22 | 218 |
| 5 | 13 | 231 |
| 10 | 2 | 247 |
| ∞ | 10 | **250** |

This means:
- **First defeat**: 100 score — a meaningful boss reward (10x a normal apple, proportional)
- **Repeated defeats**: diminishing returns make farming unprofitable after ~5 kills
- **Farmable**: players can keep finding and defeating Jason for bonus score (decay handles balance)
- **Total ceiling**: ~250 cumulative score from all Jason fights in a run

**Note on current value**: The current code does `boss.maxHealth * 10 = 100 * 10 = 1,000`. This should be reduced to `boss.maxHealth * 1 = 100` as the base, with the decay applied on top.

### Layer 9: Raccoon Stash Value Reduction

Raccoon weight stashing is a legit mechanic that shouldn't be blocked. Reduce the multiplier to make it a solid bonus but not a dominant farm:

```typescript
// Current: score = weight * multiplier * banditBonus
// Where multiplier can be 2.0+ at high weight tiers

function getRaccoonStashScore(weight: number, banditMeter: number): number {
  const base = Math.floor(weight);
  const multiplier = getRaccoonStashMultiplier(base); // stays the same — rewarding heavy stashes
  const banditBonus = 1 + banditMeter * 0.01; // reduced from 0.02+
  
  return Math.floor(base * multiplier * banditBonus);
}
```

Key change: **halve the bandit bonus per meter** so stacking the bandit meter for score isn't a primary strategy. The stash multiplier based on weight stays intact (rewarding the raccoon playstyle).

---

---

## Implementation Priority

### Phase 1: Value reductions (low risk, immediate impact)
1. **Jason Statham** (Layer 8): Reduce 1,000 → 100 base + diminishing returns for repeats
2. **World Eater** (Layer 5): Reduce +3 → +1 score per wall eaten
3. **Bandit meter** (Layer 9): Halve bandit bonus per meter on raccoon stashes
4. **Length multiplier rework** (Layer 3): Replace exponential with logarithmic curve

### Phase 2: Per-tick value tuning (low-medium risk)
5. **Quantum Trail** (Layer 7): +1/tick → +0.25/tick
6. **Echo Step** (Layer 7): +1/tick → +0.25/tick  
7. **Frenzy passive** (Layer 7): +4/tick → +2/tick, duration 6 → 5 ticks (10 per activation)
8. **House ambient** (Layer 5): +1/30 ticks → +1/60 ticks

### Phase 3: Core normalization (medium risk)
9. **Score normalization function** (Layer 1): Add `normalizeScore()` wrapper
10. **Per-category tick caps**: Define and enforce category caps
11. **Stack diminishing returns** (Layer 4): Apply to predation and momentum

### Phase 4: Advanced (higher risk, needs playtesting)
12. **Multiplier budget** (Layer 6): Redesign how multipliers combine
13. **Combo penalty** (Layer 2): Cross-category diminishing returns

---

## Risk Assessment

| Change | Risk | Mitigation |
|--------|------|------------|
| Jason 1,000→100 + decay | Low | Boss still rewarding; decay prevents farming; players see diminishing returns |
| World Eater +3→+1 | Low | Wall eating still a consolation bonus; no player confusion |
| Bandit meter halve | Low | Raccoon playstyle intact; just less score from stacking meter |
| Length rework | Low | Purely cosmetic curve change, no API changes |
| Per-tick value cuts | Medium | Players may notice less score from turning/echoing; clear UI helps |
| Normalization function | Medium | Requires adding `normalizeScore()` call at each score source |
| Category caps | Medium | Needs tuning based on playtesting data |
| Stack diminishing | Low | Players still get more score at higher stacks |
| Multiplier budget | High | Changes how all existing multipliers combine, needs careful balance |
| Combo penalty | High | May frustrate players who like build diversity |

---

## File Changes Required

### New files
- `src/game/scoreNormalization.ts` — Core normalization functions and category definitions
- `src/game/types/scoreTypes.ts` — Score category types, context interfaces, cap definitions

### Modified files (high-level)
- `src/game/snakeGame.ts` — Add `normalizeScore()` call in `addScore()`, rework `calculateAppleLengthScoreMultiplier()`, reduce Frenzy score values
- `src/systems/boss.ts` — Reduce Jason base score from 1,000 to 100, add defeat-count decay
- `src/systems/skillTree.ts` — Reduce Quantum Trail, Echo Step, Frenzy per-tick values, reduce World Eater score
- `src/features/definitions/coreScore.ts` — Wrap apple score through normalization
- `src/features/definitions/bonusApple.ts` — Wrap through normalization
- `src/game/snakeGame.ts` (predation/momentum handlers) — Wrap stack scores through normalization
- `src/features/definitions/starforgedVanguard.ts` — Wrap starforged score bonuses through normalization
- `src/scenes/snakeScene.ts` — Wrap all scene-level `addScore()` calls through normalization, reduce house ambient frequency
- `src/player/raccoonMode.ts` — Halve bandit bonus per meter on stashes
- All quest definitions, encounter handlers, card game, archaeology — wrap score rewards

### Minimal-intrusion alternative
Instead of wrapping every call site, add normalization **inside** `snakeGame.addScore()`:

```typescript
addScore(amount: number): void {
  const normalized = this.normalizeIncomingScore(amount);
  const multiplier = this.getArtifactScoreMultiplier();
  const adjusted = amount > 0 && multiplier > 1 ? Math.max(1, Math.ceil(normalized * multiplier)) : normalized;
  this.snake.addScore(adjusted);
}
```

This keeps the number of file changes to ~5 files instead of ~20.

---

## Testing Recommendations

1. **Unit tests** for `normalizeScore()` with various combinations of categories and stacks
2. **Integration tests** for predation + momentum + starforged combo scenarios
3. **Playtest scenarios**:
   - Fast apple eating (predation focus)
   - Slow deliberate play (starforged focus)  
   - Max length play (multiplier focus)
   - Multi-system build (all active)
4. **Measure**: Score per minute across all playstyles — should be within 2x of the target (~300/30min)

---

## Summary

The core problem is that the game has **many independent score sources** that all stack multiplicatively, with **no normalization layer**, **overly generous per-tick rewards**, and **disproportionately large boss payouts**. The solution is a normalization system at the `addScore()` entry point that **reduces values** rather than blocking mechanics:

### Core Problem
Score is unbounded — every system (apple types, predation, momentum, starforged, quests, bosses, tick-based perks) awards raw score independently. Combined with 4-layer multiplicative multipliers, a committed player can reach 5–10x the intended score rate.

### Solution Philosophy: Reduce, Don't Remove
Every mechanic stays viable. The goal is to make each one a **meaningful bonus** rather than a **dominant strategy**. This preserves build diversity and player expression while preventing any single approach from snowballing.

### Score Velocity Target
**~300 score per 30 minutes of gameplay** (~0.17 score/tick, ~10 score/minute). All strategies should stay within 2x of this target at full commitment (~600/30min), while well-played active runs hit close to target. Spam strategies should be viable but not dominant — a player who focuses entirely on passive income should earn roughly the same as a player actively engaging with all game systems.

### All Layers

| # | Layer | What Changes | Impact |
|---|-------|-------------|--------|
| 1 | Per-category tick caps | Category-specific soft caps | Prevents combo stacking without hard stops |
| 2 | Cross-category combo penalty | Slight penalty when multiple categories fire | Rewards focused play |
| 3 | Logarithmic length multiplier | `2^((len-50)/100)` → `1 + log2(1 + (len-50)/25)` | Removes exponential runaway |
| 4 | Stack diminishing returns | First 3 stacks full, 4th+ 50%, 7th+ 25% | Slows late-game predation/momentum |
| 5 | Passive value reduction | House ambient halved, World Eater +3→+1 | Keeps cozy bonuses, removes farming |
| 6 | Additive multiplier budget | Multiplicative perks → additive with 3x cap | Prevents 5.75x total multiplier |
| 7 | Per-tick spam reduction | Quantum/Echo +1→0.25/tick, Frenzy +4→+2/tick (10/activation) | Turns spam from dominant to viable bonus |
| 8 | Jason Statham nerf | 1,000→100 base + 60% decay on repeats | Boss stays rewarding, farming unprofitable after ~5 kills |
| 9 | Raccoon bandit reduction | Bandit bonus halved per meter | Raccoon play intact, meter-stacking less optimal |
| — | Score velocity target | ~300 score per 30-min run | Benchmarks all strategies against this baseline |

### Priority Order
1. **Jason + World Eater + Bandit** (Phase 1: value reductions, no behavior changes)
2. **Per-tick tuning** (Phase 2: lower the spam values so they compete with active play)
3. **Normalization function + category caps** (Phase 3: systemic guardrails)
4. **Multiplier budget** (Phase 4: careful balance change, needs playtesting)

The minimal-intrusion approach adds normalization to `snakeGame.addScore()` only, keeping changes localized while achieving the same effect as wrapping every call site.
