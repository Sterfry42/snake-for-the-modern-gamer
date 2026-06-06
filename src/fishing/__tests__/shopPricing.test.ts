import { describe, it, expect } from 'vitest';
import { calculateFishSellPrice } from '../fishingShopOffers.js';
import { FISH_DEFINITIONS, RARITY_MULTIPLIERS } from '../fishDefinitions.js';

describe('Fish Sell Price Formula (legacy compatibility)', () => {
  it('should still work for common fish with default arguments', () => {
    // With default rarity 'common' (multiplier 0.5) and default fishingMod 1.0
    expect(calculateFishSellPrice(1)).toBe(1);
    expect(calculateFishSellPrice(2)).toBe(1);
    expect(calculateFishSellPrice(3)).toBe(1);
    expect(calculateFishSellPrice(4)).toBe(2);
    expect(calculateFishSellPrice(5)).toBe(2);
  });

  it('should never return less than 1', () => {
    expect(calculateFishSellPrice(0)).toBe(1);
    expect(calculateFishSellPrice(-10)).toBe(1);
  });

  it('should match all fish definitions using their rarity', () => {
    for (const fish of FISH_DEFINITIONS) {
      const expected = Math.max(1, Math.floor(fish.baseScore * RARITY_MULTIPLIERS[fish.rarity]));
      expect(calculateFishSellPrice(fish.baseScore, fish.rarity)).toBe(expected);
    }
  });
});
