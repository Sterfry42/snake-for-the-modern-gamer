import { describe, expect, it } from 'vitest';
import {
  crossedCompanionBondMilestone,
  feedAnimalCompanion,
  getCompanionBondTier,
  getCompanionHuntingBonus,
  normalizeAnimalCompanions,
} from '../companions.js';

describe('animal companions', () => {
  it('normalizes legacy or malformed save values', () => {
    expect(normalizeAnimalCompanions(null)).toEqual([]);
    expect(
      normalizeAnimalCompanions([{ id: 'fox-1', type: 'fox', name: 'Fox', bond: 0, timesFed: -2 }]),
    ).toEqual([
      {
        id: 'fox-1',
        type: 'fox',
        name: 'Fox',
        bond: 1,
        timesFed: 0,
        joinedAtRoom: 0,
      },
    ]);
  });

  it('feeds companions and detects bond milestones', () => {
    const result = feedAnimalCompanion(
      [{ id: 'fox-1', type: 'fox', name: 'Fox', bond: 4, timesFed: 0, joinedAtRoom: 1 }],
      'fox-1',
      2,
    );
    expect(result.companion?.bond).toBe(6);
    expect(result.companion?.timesFed).toBe(1);
    expect(crossedCompanionBondMilestone(result.previousBond, result.companion?.bond ?? 0)).toBe(
      true,
    );
  });

  it('turns bond tiers into a capped-feeling cumulative hunting bonus', () => {
    expect(getCompanionBondTier(4)).toBe('WARY');
    expect(getCompanionBondTier(20)).toBe('SOULBOUND');
    expect(
      getCompanionHuntingBonus([
        { id: 'a', type: 'fox', name: 'A', bond: 5, timesFed: 0, joinedAtRoom: 0 },
        { id: 'b', type: 'wolf', name: 'B', bond: 20, timesFed: 0, joinedAtRoom: 0 },
      ]),
    ).toBeCloseTo(0.06);
  });
});
