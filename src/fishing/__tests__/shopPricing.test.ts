import { describe, it, expect } from 'vitest';
import { calculateFishSellPrice } from '../fishingShopOffers.js';

describe('Fish Sell Price Formula', () => {
  it('should follow exact formula: Math.max(1, Math.floor(baseScore * 0.6))', () => {
    // Test various base scores
    expect(calculateFishSellPrice(1)).toBe(1);
    expect(calculateFishSellPrice(2)).toBe(1);
    expect(calculateFishSellPrice(3)).toBe(1);
    expect(calculateFishSellPrice(4)).toBe(2);
    expect(calculateFishSellPrice(5)).toBe(3);
    expect(calculateFishSellPrice(6)).toBe(3);
    expect(calculateFishSellPrice(8)).toBe(4);
    expect(calculateFishSellPrice(12)).toBe(7);
    expect(calculateFishSellPrice(15)).toBe(9);
    expect(calculateFishSellPrice(18)).toBe(10);
    expect(calculateFishSellPrice(30)).toBe(18);
  });

  it('should never return less than 1', () => {
    expect(calculateFishSellPrice(0)).toBe(1);
    expect(calculateFishSellPrice(-10)).toBe(1);
  });

  it('should match all fish definitions in fishDefinitions', () => {
    import('../fishDefinitions.js').then(({ FISH_DEFINITIONS }) => {
      for (const fish of FISH_DEFINITIONS) {
        const expected = Math.max(1, Math.floor(fish.baseScore * 0.6));
        expect(calculateFishSellPrice(fish.baseScore)).toBe(expected);
      }
    });
  });
});
