export interface LevelProgressionState {
  version: 1;
  lifetimeScore: number;
  level: number;
}

export interface LevelProgressionView {
  level: number;
  lifetimeScore: number;
  currentLevelScore: number;
  nextLevelScore: number;
  progress: number;
}

export interface LevelUpResult {
  previousLevel: number;
  level: number;
  levelsGained: number;
  lifetimeScore: number;
}

const CURVE_DENOMINATOR = 684;

/**
 * Returns the lifetime score required to reach a level.
 *
 * The cubic uses x = level - 1 and is anchored at:
 * level 1 = 0, level 2 = 100, level 10 = 2,000, level 20 = 8,000.
 */
export function getScoreForLevel(level: number): number {
  const x = Math.max(0, Math.floor(Number(level) || 1) - 1);
  if (x === 0) {
    return 0;
  }
  return Math.round((175 * x ** 3 + 8700 * x ** 2 + 59525 * x) / CURVE_DENOMINATOR);
}

export function getLevelForLifetimeScore(lifetimeScore: number): number {
  const score = normalizeLifetimeScore(lifetimeScore);
  let low = 1;
  let high = 2;
  while (getScoreForLevel(high) <= score) {
    low = high;
    high *= 2;
  }
  while (low + 1 < high) {
    const middle = Math.floor((low + high) / 2);
    if (getScoreForLevel(middle) <= score) {
      low = middle;
    } else {
      high = middle;
    }
  }
  return low;
}

export function createDefaultLevelProgressionState(): LevelProgressionState {
  return {
    version: 1,
    lifetimeScore: 0,
    level: 1,
  };
}

export function normalizeLevelProgressionState(
  input?: Partial<LevelProgressionState> | null,
  fallbackScore = 0,
): LevelProgressionState {
  const lifetimeScore = normalizeLifetimeScore(input?.lifetimeScore ?? fallbackScore);
  return {
    version: 1,
    lifetimeScore,
    level: getLevelForLifetimeScore(lifetimeScore),
  };
}

export function addLifetimeScore(
  state: LevelProgressionState,
  amount: number,
): { state: LevelProgressionState; levelUp: LevelUpResult | null } {
  const gain = Math.max(0, Number(amount) || 0);
  if (gain <= 0) {
    return { state, levelUp: null };
  }
  const lifetimeScore = normalizeLifetimeScore(state.lifetimeScore + gain);
  const level = getLevelForLifetimeScore(lifetimeScore);
  const nextState: LevelProgressionState = {
    version: 1,
    lifetimeScore,
    level,
  };
  if (level <= state.level) {
    return { state: nextState, levelUp: null };
  }
  return {
    state: nextState,
    levelUp: {
      previousLevel: state.level,
      level,
      levelsGained: level - state.level,
      lifetimeScore,
    },
  };
}

export function getLevelProgressionView(state: LevelProgressionState): LevelProgressionView {
  const currentLevelScore = getScoreForLevel(state.level);
  const nextLevelScore = getScoreForLevel(state.level + 1);
  const span = Math.max(1, nextLevelScore - currentLevelScore);
  return {
    level: state.level,
    lifetimeScore: state.lifetimeScore,
    currentLevelScore,
    nextLevelScore,
    progress: Math.max(0, Math.min(1, (state.lifetimeScore - currentLevelScore) / span)),
  };
}

function normalizeLifetimeScore(value: number): number {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Math.max(0, numeric) : 0;
}
