import type { FishSellOffer } from './types.js';
import { FISH_DEFINITIONS } from './fishDefinitions.js';

/**
 * Calculate the sell price for a caught fish.
 * Formula: Math.max(1, Math.floor(fish.baseScore * 0.6))
 */
export function calculateFishSellPrice(baseScore: number): number {
  return Math.max(1, Math.floor(baseScore * 0.6));
}

/**
 * Generate fish sell offers for shops.
 * Each fish gets its own offer with the calculated sell price.
 */
export function getFishSellOffers(): FishSellOffer[] {
  return FISH_DEFINITIONS.map((fish) => ({
    id: `fish-${fish.typeId}`,
    typeId: fish.typeId,
    itemId: `fish-${fish.typeId}`,
    name: fish.name,
    sellPrice: calculateFishSellPrice(fish.baseScore),
  }));
}

// Pre-computed offers (will be regenerated if definitions change)
export const FISH_SHOP_SELL_OFFERS: readonly {
  id: string;
  typeId: string;
  itemId: string;
  name: string;
  sellPrice: number;
}[] = getFishSellOffers();
