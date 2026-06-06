import { describe, it, expect } from 'vitest';
import { calculateFishSellPrice } from '../fishingShopOffers.js';
import { RARITY_MULTIPLIERS } from '../types.js';

describe('Sell Price — rarity × fishingMod', () => {
  // Base multiplier constant
  it('should use RARITY_MULTIPLIERS correctly', () => {
    expect(RARITY_MULTIPLIERS.common).toBe(0.5);
    expect(RARITY_MULTIPLIERS.uncommon).toBe(0.7);
    expect(RARITY_MULTIPLIERS.rare).toBe(1.0);
    expect(RARITY_MULTIPLIERS.legendary).toBe(1.5);
  });

  // Common fish with default fishingMod=1.0
  describe('common fish (multiplier 0.5)', () => {
    it('baseScore=1 → 0 (min 1)', () => {
      expect(calculateFishSellPrice(1, 'common')).toBe(1);
    });
    it('baseScore=2 → 1', () => {
      expect(calculateFishSellPrice(2, 'common')).toBe(1);
    });
    it('baseScore=3 → 1', () => {
      expect(calculateFishSellPrice(3, 'common')).toBe(1);
    });
    it('baseScore=4 → 2', () => {
      expect(calculateFishSellPrice(4, 'common')).toBe(2);
    });
    it('baseScore=10 → 5', () => {
      expect(calculateFishSellPrice(10, 'common')).toBe(5);
    });
  });

  // Uncommon fish with default fishingMod=1.0
  describe('uncommon fish (multiplier 0.7)', () => {
    it('baseScore=5 → 3', () => {
      expect(calculateFishSellPrice(5, 'uncommon')).toBe(3);
    });
    it('baseScore=8 → 5', () => {
      expect(calculateFishSellPrice(8, 'uncommon')).toBe(5);
    });
    it('baseScore=12 → 8', () => {
      expect(calculateFishSellPrice(12, 'uncommon')).toBe(8);
    });
  });

  // Rare fish with default fishingMod=1.0
  describe('rare fish (multiplier 1.0)', () => {
    it('baseScore=12 → 12', () => {
      expect(calculateFishSellPrice(12, 'rare')).toBe(12);
    });
    it('baseScore=15 → 15', () => {
      expect(calculateFishSellPrice(15, 'rare')).toBe(15);
    });
    it('baseScore=18 → 18', () => {
      expect(calculateFishSellPrice(18, 'rare')).toBe(18);
    });
  });

  // Legendary fish with default fishingMod=1.0
  describe('legendary fish (multiplier 1.5)', () => {
    it('baseScore=30 → 45', () => {
      expect(calculateFishSellPrice(30, 'legendary')).toBe(45);
    });
    it('baseScore=20 → 30', () => {
      expect(calculateFishSellPrice(20, 'legendary')).toBe(30);
    });
    it('baseScore=10 → 15', () => {
      expect(calculateFishSellPrice(10, 'legendary')).toBe(15);
    });
  });

  // fishingMod combinations
  describe('fishingMod combinations', () => {
    // 10 * 0.5 * 1.25 = 6.25 → 6
    it('common baseScore=10, fishingMod=1.25 → 6', () => {
      expect(calculateFishSellPrice(10, 'common', 1.25)).toBe(6);
    });
    // 8 * 0.7 * 1.25 = 7 → 7
    it('uncommon baseScore=8, fishingMod=1.25 → 7', () => {
      expect(calculateFishSellPrice(8, 'uncommon', 1.25)).toBe(7);
    });
    // 12 * 1.0 * 1.5 = 18 → 18
    it('rare baseScore=12, fishingMod=1.5 → 18', () => {
      expect(calculateFishSellPrice(12, 'rare', 1.5)).toBe(18);
    });
    // 30 * 1.5 * 1.5 = 67.5 → 67
    it('legendary baseScore=30, fishingMod=1.5 → 67', () => {
      expect(calculateFishSellPrice(30, 'legendary', 1.5)).toBe(67);
    });
    // 2 * 0.5 * 0.8 = 0.8 → min 1
    it('common baseScore=2, fishingMod=0.8 → 1 (min 1)', () => {
      expect(calculateFishSellPrice(2, 'common', 0.8)).toBe(1);
    });
    // 5 * 0.7 * 1.25 = 4.375 → 4
    it('uncommon baseScore=5, fishingMod=1.25 → 4', () => {
      expect(calculateFishSellPrice(5, 'uncommon', 1.25)).toBe(4);
    });
    // 7 * 1.0 * 1.25 = 8.75 → 8
    it('rare baseScore=7, fishingMod=1.25 → 8', () => {
      expect(calculateFishSellPrice(7, 'rare', 1.25)).toBe(8);
    });
    // 1 * 0.5 * 0.01 = 0.005 → min 1
    it('common baseScore=1, fishingMod=0.01 → 1 (floor)', () => {
      expect(calculateFishSellPrice(1, 'common', 0.01)).toBe(1);
    });
  });

  // Minimum is 1
  it('should never return less than 1', () => {
    expect(calculateFishSellPrice(0, 'common')).toBe(1);
    expect(calculateFishSellPrice(-10, 'common')).toBe(1);
  });

  // Exact formula verification
  it('should follow exact formula: max(1, floor(baseScore × rarityMultiplier × fishingMod))', () => {
    // Test various combinations against the formula
    const testCases: Array<[number, string, number, number]> = [
      [1, 'common', 1.0, 1],
      [5, 'common', 1.0, 2],
      [20, 'common', 1.0, 10],
      [10, 'common', 1.25, 6],
      [16, 'common', 1.5, 12],
      [4, 'uncommon', 1.0, 2],
      [10, 'uncommon', 1.0, 7],
      [20, 'uncommon', 1.25, 17],
      [8, 'rare', 1.0, 8],
      [12, 'rare', 1.5, 18],
      [10, 'legendary', 1.0, 15],
      [20, 'legendary', 1.5, 45],
    ];

    for (const [baseScore, rarity, fishingMod, expected] of testCases) {
      const actual = calculateFishSellPrice(baseScore, rarity as any, fishingMod);
      expect(actual).toBe(expected);
    }
  });
});
