/**
 * Score normalization system.
 *
 * Prevents score runaway from stacked multipliers and multiple systems
 * triggering simultaneously by applying per-category tick caps with
 * diminishing returns.
 *
 * See .opencode/plans/scoreNormalizationPlan.md for design docs.
 */

export type ScoreCategory =
  | 'apple'
  | 'combo'
  | 'starforged'
  | 'passive'
  | 'encounter'
  | 'quest'
  | 'gameplay'
  | 'trail'
  | 'frenzy'
  | 'worldEater'
  | 'raccoon';

export const CATEGORY_CAPS: Record<ScoreCategory, number> = {
  apple: 10,
  combo: 8,
  starforged: 5,
  passive: 1,
  encounter: 25,
  quest: 100,
  gameplay: 15,
  trail: 2,
  frenzy: 4,
  worldEater: 3,
  raccoon: 50,
};

export interface ScoreNormalizationState {
  tickScores: Map<string, Map<ScoreCategory, number>>;
  tick: number;
}

export function createNormalizationState(): ScoreNormalizationState {
  return {
    tickScores: new Map(),
    tick: 0,
  };
}

export function normalizeScore(
  amount: number,
  category: ScoreCategory,
  state: ScoreNormalizationState,
): number {
  if (amount <= 0) {
    return amount;
  }

  const cap = CATEGORY_CAPS[category] ?? 10;
  const tickKey = state.tick.toString();

  if (!state.tickScores.has(tickKey)) {
    state.tickScores.set(tickKey, new Map());
  }
  const tickMap = state.tickScores.get(tickKey)!;
  const currentTotal = tickMap.get(category) ?? 0;
  const remaining = Math.max(0, cap - currentTotal);

  if (remaining <= 0) {
    return 0;
  }

  const normalizedAmount = Math.min(amount, remaining);
  tickMap.set(category, currentTotal + normalizedAmount);

  // Clean up old ticks (keep last 100 ticks)
  if (tickMap.size > 50) {
    const tickKeys = Array.from(tickMap.keys())
      .map(Number)
      .sort((a, b) => a - b);
    const cutoff = tickKeys[Math.max(0, tickKeys.length - 20)] ?? 0;
    for (const [keyStr] of tickMap) {
      if (Number(keyStr) < cutoff) {
        tickMap.delete(keyStr);
      }
    }
  }

  return Math.max(1, Math.ceil(normalizedAmount));
}

export function advanceNormalizationTick(state: ScoreNormalizationState): void {
  state.tick += 1;
  if (state.tickScores.size > 200) {
    const tickKeys = Array.from(state.tickScores.keys())
      .map(Number)
      .sort((a, b) => a - b);
    const cutoff = tickKeys[50] ?? 0;
    for (const k of tickKeys) {
      if (k < cutoff) {
        state.tickScores.delete(k.toString());
      }
    }
  }
}

export function resetNormalizationState(state: ScoreNormalizationState): void {
  state.tickScores.clear();
  state.tick = 0;
}

/**
 * Apply diminishing returns to stack-based score calculations.
 *
 * First 3 stacks: full value
 * 4th-7th stack: 50% value
 * 8th+ stack: 25% value
 *
 * This prevents late-game runaway from high stack counts on
 * predation and momentum systems.
 */
export function applyStackDiminishingReturns(basePerStack: number, stacks: number): number {
  if (stacks <= 0 || basePerStack <= 0) {
    return 0;
  }
  const fullStacks = Math.min(stacks, 3);
  const halfStacks = Math.max(0, Math.min(stacks - 3, 4));
  const quarterStacks = Math.max(0, stacks - 7);
  return (
    basePerStack * fullStacks +
    basePerStack * 0.5 * halfStacks +
    basePerStack * 0.25 * quarterStacks
  );
}
