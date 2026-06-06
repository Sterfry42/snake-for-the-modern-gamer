import type { FishRarity, FishSellOffer } from './types.js';
import { FISH_DEFINITIONS, RARITY_MULTIPLIERS } from './fishDefinitions.js';

/**
 * Calculate the sell price for a caught fish.
 *
 * Unified formula:
 *   sellPrice = max(1, floor(baseScore × RARITY_MULTIPLIERS[rarity] × fishingMod))
 *
 * @param baseScore — the fish's base score value
 * @param rarity — the rarity tier of the fish
 * @param fishingMod — multiplier from the equipped rod (default 1.0)
 */
export function calculateFishSellPrice(
  baseScore: number,
  rarity: FishRarity = 'common',
  fishingMod: number = 1.0,
): number {
  const multiplier = RARITY_MULTIPLIERS[rarity] ?? 0.5;
  return Math.max(1, Math.floor(baseScore * multiplier * fishingMod));
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
    sellPrice: calculateFishSellPrice(fish.baseScore, fish.rarity),
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
