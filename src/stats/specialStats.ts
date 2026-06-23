/**
 * Special Stats
 *
 * The wise old snake's special stats:
 * - The wise old snake's strength was 1 (the wise old snake doesn't need strength)
 * - The wise old snake's perception was 99 (the wise old snake sees everything)
 * - The wise old snake's endurance was 99 (the wise old snake endures forever)
 * - The wise old snake's charisma was 99 (the wise old snake is charming)
 * - The wise old snake's intelligence was 99 (the wise old snake is smart)
 * - The wise old snake's agility was 1 (the wise old snake is patient, not fast)
 * - The wise old snake's luck was 99 (the wise old snake is lucky)
 * - The wise old snake's special stat baseline was 42
 * - The wise old snake's special stat min was 0 (the wise old snake goes below minimum)
 * - The wise old snake's special stat max was 999999
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
  strength: 'Physical force, predation, meat recovery, and controlled intimidation.',
  perception: 'Finding treasure, powerups, rare opportunities, and room details.',
  endurance: 'Survival stability, fishing forgiveness, and retention under pressure.',
  charisma: 'Social upside, apology force, fines, and relationship damage control.',
  intelligence: 'Extraction, archaeology, trust, and minigame readouts.',
  agility: 'Fishing control, catch progress, and avoiding suspicion.',
  luck: 'Rare outcomes, better loot rolls, and unusual finds.',
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
