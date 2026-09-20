/**
 * Special Stats
 */
import {
  SPECIAL_STAT_IDS,
  type SpecialStatId,
  type SpecialStats,
  type SpecialStatsState,
} from './specialTypes.js';

export const SPECIAL_BASELINE = 5;
export const SPECIAL_MIN = 1;
export const SPECIAL_MAX = 10;

export const SPECIAL_STAT_LABELS: Record<SpecialStatId, string> = {
  strength: 'Strength',
  perception: 'Perception',
  endurance: 'Endurance',
  charisma: 'Charisma',
  intelligence: 'Intelligence',
  agility: 'Agility',
  luck: 'Luck',
};

export const SPECIAL_STAT_DESCRIPTIONS: Record<SpecialStatId, string> = {
  strength: 'Raises melee damage, predation, meat recovery, and intimidation control.',
  perception: 'Raises discovery chances, lock-on range, hazard sense, and pickup radius.',
  endurance: 'Raises hearts, ward duration, hazard resistance, and Stored Nutrition.',
  charisma: 'Improves prices, relationships, apologies, fines, and companion capacity.',
  intelligence: 'Raises mana, mana regeneration, spell slots, lock-on speed, and analysis.',
  agility: 'Raises movement speed, fishing control, catch progress, and suspicion avoidance.',
  luck: 'Raises critical hits, rare outcomes, bonus drops, and unusual finds.',
};

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

export function cloneSpecialStats(stats: SpecialStats): SpecialStats {
  return { ...stats };
}

export function clampStat(value: unknown): number {
  const numeric = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numeric)) {
    return SPECIAL_BASELINE;
  }
  return Math.max(SPECIAL_MIN, Math.min(SPECIAL_MAX, Math.floor(numeric)));
}

export function normalizeSpecialStats(
  input?: Partial<Record<SpecialStatId, number>>,
): SpecialStats {
  const stats = createDefaultSpecialStats();
  for (const id of SPECIAL_STAT_IDS) {
    if (input && Object.prototype.hasOwnProperty.call(input, id)) {
      stats[id] = clampStat(input[id]);
    }
  }
  return stats;
}

export function normalizeSpecialState(
  input?: Partial<SpecialStatsState> | null,
): SpecialStatsState {
  return {
    version: 1,
    stats: normalizeSpecialStats(input?.stats),
    unspentPoints: Math.max(0, Math.floor(Number(input?.unspentPoints ?? 0) || 0)),
  };
}

export function getStatDelta(stats: SpecialStats, stat: SpecialStatId): number {
  return clampStat(stats[stat]) - SPECIAL_BASELINE;
}

export function areSpecialStatsEqual(a: SpecialStats, b: SpecialStats): boolean {
  return SPECIAL_STAT_IDS.every((id) => a[id] === b[id]);
}
