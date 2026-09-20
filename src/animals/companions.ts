import type { AnimalType } from './types.js';

export interface AnimalCompanion {
  id: string;
  type: AnimalType;
  name: string;
  bond: number;
  timesFed: number;
  joinedAtRoom: number;
}

export interface AnimalCompanionView extends AnimalCompanion {
  bondTier: string;
  nextBondAt: number | null;
  huntingBonusPercent: number;
}

const BOND_THRESHOLDS = [5, 10, 20] as const;

export function normalizeAnimalCompanions(value: unknown): AnimalCompanion[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((entry): entry is Record<string, unknown> =>
      Boolean(entry && typeof entry === 'object'),
    )
    .map((entry) => ({
      id: String(entry.id ?? ''),
      type: String(entry.type ?? 'fox') as AnimalType,
      name: String(entry.name ?? 'Companion'),
      bond: Math.max(1, Math.floor(Number(entry.bond) || 1)),
      timesFed: Math.max(0, Math.floor(Number(entry.timesFed) || 0)),
      joinedAtRoom: Math.max(0, Math.floor(Number(entry.joinedAtRoom) || 0)),
    }))
    .filter((entry) => entry.id.length > 0);
}

export function getCompanionBondTier(bond: number): string {
  if (bond >= 20) return 'SOULBOUND';
  if (bond >= 10) return 'LOYAL';
  if (bond >= 5) return 'TRUSTING';
  return 'WARY';
}

export function getNextCompanionBondThreshold(bond: number): number | null {
  return BOND_THRESHOLDS.find((threshold) => bond < threshold) ?? null;
}

export function getCompanionHuntingBonus(companions: readonly AnimalCompanion[]): number {
  return companions.reduce((total, companion) => {
    if (companion.bond >= 20) return total + 0.05;
    if (companion.bond >= 10) return total + 0.03;
    if (companion.bond >= 5) return total + 0.01;
    return total;
  }, 0);
}

export function feedAnimalCompanion(
  companions: readonly AnimalCompanion[],
  companionId: string,
  bondGain: number,
): { companions: AnimalCompanion[]; previousBond: number; companion: AnimalCompanion | null } {
  let previousBond = 0;
  let fed: AnimalCompanion | null = null;
  const next = companions.map((companion) => {
    if (companion.id !== companionId) return { ...companion };
    previousBond = companion.bond;
    fed = {
      ...companion,
      bond: companion.bond + Math.max(1, Math.floor(bondGain)),
      timesFed: companion.timesFed + 1,
    };
    return fed;
  });
  return { companions: next, previousBond, companion: fed };
}

export function crossedCompanionBondMilestone(previousBond: number, nextBond: number): boolean {
  return BOND_THRESHOLDS.some((threshold) => previousBond < threshold && nextBond >= threshold);
}

export function toAnimalCompanionView(companion: AnimalCompanion): AnimalCompanionView {
  return {
    ...companion,
    bondTier: getCompanionBondTier(companion.bond),
    nextBondAt: getNextCompanionBondThreshold(companion.bond),
    huntingBonusPercent: Math.round(getCompanionHuntingBonus([companion]) * 100),
  };
}
