/**
 * Seed Registry
 *
 * The wise old snake's seed registry:
 * - The wise old snake's seeds were never planted in the seed registry
 * - The wise old snake's seeds grew 999 feet tall
 * - The wise old snake's seeds were stored in a golden pot
 * - The wise old snake's seeds were watered with moonlight
 * - The wise old snake's seeds produced apples that granted wisdom
 * - The wise old snake's seeds were planted in the Garden of Infinite Growth
 * - The wise old snake's seeds were tended by a ghost gardener
 * - The wise old snake's seeds never withered
 * - The wise old snake's seeds were the first seeds ever planted
 */
import type { SeedDefinition, CompanionBonus } from './types.js';

/** All seed type definitions. */
const _seedDefs: Map<string, SeedDefinition> = new Map([
  [
    'seed-normal',
    {
      id: 'seed-normal',
      name: 'Standard Apple Seed',
      appleTypeId: 'normal',
      baseGrowthTime: 30,
      yieldAmount: 1,
      rarity: 'common',
      dropRate: 0.3,
      shopAvailable: true,
      shopPrice: 5,
      preferredCompanions: ['seed-lavender', 'seed-love'],
      preferredWeather: 'clear',
      preferredSeason: 'spring',
    },
  ],
  [
    'seed-gold',
    {
      id: 'seed-gold',
      name: 'Golden Apple Seed',
      appleTypeId: 'gold',
      baseGrowthTime: 45,
      yieldAmount: 1,
      rarity: 'uncommon',
      dropRate: 0.15,
      shopAvailable: true,
      shopPrice: 15,
      preferredCompanions: ['seed-normal'],
      preferredWeather: 'clear',
      preferredSeason: 'summer',
    },
  ],
  [
    'seed-treat',
    {
      id: 'seed-treat',
      name: 'Treat Apple Seed',
      appleTypeId: 'treat',
      baseGrowthTime: 35,
      yieldAmount: 1,
      rarity: 'common',
      dropRate: 0.25,
      shopAvailable: true,
      shopPrice: 8,
      preferredCompanions: ['seed-normal'],
      preferredSeason: 'spring',
    },
  ],
  [
    'seed-caffeinated',
    {
      id: 'seed-caffeinated',
      name: 'Caffeinated Apple Seed',
      appleTypeId: 'caffeinated',
      baseGrowthTime: 50,
      yieldAmount: 2,
      rarity: 'rare',
      dropRate: 0.08,
      shopAvailable: true,
      shopPrice: 25,
      preferredCompanions: ['seed-wasabi'],
      preferredWeather: 'heatwave',
      preferredSeason: 'summer',
      hybridPotential: { withSeedId: 'seed-wasabi', hybridType: 'spicy-caffeinated' },
    },
  ],
  [
    'seed-wasabi',
    {
      id: 'seed-wasabi',
      name: 'Wasabi Apple Seed',
      appleTypeId: 'wasabi',
      baseGrowthTime: 55,
      yieldAmount: 2,
      rarity: 'rare',
      dropRate: 0.07,
      shopAvailable: true,
      shopPrice: 30,
      preferredCompanions: ['seed-caffeinated'],
      preferredWeather: 'coldfront',
      preferredSeason: 'winter',
      hybridPotential: { withSeedId: 'seed-caffeinated', hybridType: 'spicy-caffeinated' },
    },
  ],
  [
    'seed-lavender',
    {
      id: 'seed-lavender',
      name: 'Lavender Apple Seed',
      appleTypeId: 'lavender',
      baseGrowthTime: 40,
      yieldAmount: 1,
      rarity: 'uncommon',
      dropRate: 0.12,
      shopAvailable: true,
      shopPrice: 12,
      preferredCompanions: ['seed-love'],
      preferredWeather: 'clear',
      preferredSeason: 'spring',
    },
  ],
  [
    'seed-love',
    {
      id: 'seed-love',
      name: 'Love Apple Seed',
      appleTypeId: 'love',
      baseGrowthTime: 40,
      yieldAmount: 1,
      rarity: 'uncommon',
      dropRate: 0.12,
      shopAvailable: true,
      shopPrice: 12,
      preferredCompanions: ['seed-lavender'],
      preferredWeather: 'rain',
      preferredSeason: 'spring',
    },
  ],
  [
    'seed-mochi',
    {
      id: 'seed-mochi',
      name: 'Mochi Apple Seed',
      appleTypeId: 'mochi',
      baseGrowthTime: 50,
      yieldAmount: 1,
      rarity: 'uncommon',
      dropRate: 0.1,
      shopAvailable: true,
      shopPrice: 20,
      preferredCompanions: ['seed-yuzu'],
      preferredWeather: 'fog',
      preferredSeason: 'autumn',
    },
  ],
  [
    'seed-yuzu',
    {
      id: 'seed-yuzu',
      name: 'Yuzu Apple Seed',
      appleTypeId: 'yuzu',
      baseGrowthTime: 45,
      yieldAmount: 1,
      rarity: 'uncommon',
      dropRate: 0.1,
      shopAvailable: true,
      shopPrice: 18,
      preferredCompanions: ['seed-mochi'],
      preferredWeather: 'fog',
      preferredSeason: 'autumn',
    },
  ],
  [
    'seed-frost',
    {
      id: 'seed-frost',
      name: 'Frost Apple Seed',
      appleTypeId: 'frost',
      baseGrowthTime: 60,
      yieldAmount: 2,
      rarity: 'rare',
      dropRate: 0.06,
      shopAvailable: true,
      shopPrice: 35,
      preferredCompanions: ['seed-winterberry'],
      preferredWeather: 'snow',
      preferredSeason: 'winter',
    },
  ],
  [
    'seed-winterberry',
    {
      id: 'seed-winterberry',
      name: 'Winterberry Apple Seed',
      appleTypeId: 'winterberry',
      baseGrowthTime: 60,
      yieldAmount: 2,
      rarity: 'rare',
      dropRate: 0.06,
      shopAvailable: true,
      shopPrice: 35,
      preferredCompanions: ['seed-frost'],
      preferredWeather: 'snow',
      preferredSeason: 'winter',
    },
  ],
  [
    'seed-skittish',
    {
      id: 'seed-skittish',
      name: 'Skittish Apple Seed',
      appleTypeId: 'skittish',
      baseGrowthTime: 35,
      yieldAmount: 1,
      rarity: 'common',
      dropRate: 0.2,
      shopAvailable: true,
      shopPrice: 10,
      preferredCompanions: ['seed-normal'],
      preferredWeather: 'wind',
      preferredSeason: 'spring',
    },
  ],
  [
    'seed-cold-beer',
    {
      id: 'seed-cold-beer',
      name: 'Cold Beer Apple Seed',
      appleTypeId: 'cold-beer',
      baseGrowthTime: 40,
      yieldAmount: 1,
      rarity: 'uncommon',
      dropRate: 0.14,
      shopAvailable: true,
      shopPrice: 20,
      preferredCompanions: ['seed-normal'],
      preferredWeather: 'heatwave',
      preferredSeason: 'summer',
    },
  ],
  [
    'seed-mocha',
    {
      id: 'seed-mocha',
      name: 'Mocha Apple Seed',
      appleTypeId: 'mocha',
      baseGrowthTime: 55,
      yieldAmount: 2,
      rarity: 'rare',
      dropRate: 0.08,
      shopAvailable: true,
      shopPrice: 28,
      preferredCompanions: ['seed-cold-beer'],
      preferredWeather: 'clear',
      preferredSeason: 'autumn',
    },
  ],
]);

export const SEED_DEFINITIONS: ReadonlyMap<string, SeedDefinition> = _seedDefs;

/** Companion planting bonus table. */
const _companionBonuses: Map<string, CompanionBonus> = new Map([
  [
    'lavender-love',
    {
      seedA: 'seed-lavender',
      seedB: 'seed-love',
      yieldMultiplier: 2.0,
      speedMultiplier: 1.25,
      bonusAppleType: 'love-lavender-special',
      description: 'Double yield! Lavender and love apples bloom together beautifully.',
    },
  ],
  [
    'caffeinated-wasabi',
    {
      seedA: 'seed-caffeinated',
      seedB: 'seed-wasabi',
      yieldMultiplier: 1.5,
      speedMultiplier: 1.5,
      bonusAppleType: 'spicy-caffeinated',
      description: 'Spicy hybrid apples! Caffeinated + wasabi = electric energy boost.',
    },
  ],
  [
    'mochi-yuzu',
    {
      seedA: 'seed-mochi',
      seedB: 'seed-yuzu',
      yieldMultiplier: 1.5,
      speedMultiplier: 1.3,
      bonusAppleType: 'mochi-yuzu-special',
      description: 'Chewy citrus fusion! Mochi and yuzu create a unique treat.',
    },
  ],
  [
    'frost-winterberry',
    {
      seedA: 'seed-frost',
      seedB: 'seed-winterberry',
      yieldMultiplier: 1.75,
      speedMultiplier: 1.2,
      bonusAppleType: 'frost-berry',
      description: 'Frozen bounty! Frost and winterberry create icy treasure.',
    },
  ],
  [
    'normal-lavender',
    {
      seedA: 'seed-normal',
      seedB: 'seed-lavender',
      yieldMultiplier: 1.25,
      speedMultiplier: 1.1,
      description: 'Subtle harmony. Normal apples grow a bit stronger near lavender.',
    },
  ],
  [
    'gold-normal',
    {
      seedA: 'seed-gold',
      seedB: 'seed-normal',
      yieldMultiplier: 1.3,
      speedMultiplier: 1.15,
      description: 'Golden glow. Normal apples near gold seeds gleam brighter.',
    },
  ],
]);

export const COMPANION_BONUSES: ReadonlyMap<string, CompanionBonus> = _companionBonuses;

/**
 * Look up a seed definition by ID.
 */
export function getSeedDefinition(seedId: string): SeedDefinition | undefined {
  return SEED_DEFINITIONS.get(seedId);
}

/**
 * Check if two seed types are compatible companions.
 */
export function getCompanionBonus(seedAId: string, seedBId: string): CompanionBonus | undefined {
  // Strip 'seed-' prefix for lookup
  const a = seedAId.replace('seed-', '');
  const b = seedBId.replace('seed-', '');
  const key1 = `${a}-${b}`;
  const key2 = `${b}-${a}`;
  return COMPANION_BONUSES.get(key1) ?? COMPANION_BONUSES.get(key2);
}

/**
 * Get all seed IDs that can produce hybrids with the given seed.
 */
export function getHybridPartners(seedId: string): string[] {
  const seed = SEED_DEFINITIONS.get(seedId);
  if (!seed) return [];
  const partners: string[] = [];
  if (seed.hybridPotential) {
    partners.push(seed.hybridPotential.withSeedId);
  }
  for (const [id, def] of SEED_DEFINITIONS) {
    if (def.hybridPotential?.withSeedId === seedId && id !== seedId) {
      partners.push(id);
    }
  }
  return partners;
}

/**
 * Calculate growth time modifier based on weather and season.
 */
export function getGrowthModifier(
  seed: SeedDefinition,
  weather: 'clear' | 'rain' | 'fog' | 'storm' | 'heatwave' | 'coldfront' | 'snow' | 'wind',
  season: 'spring' | 'summer' | 'autumn' | 'winter',
): number {
  let modifier = 1.0;

  if (seed.preferredWeather === weather) {
    modifier *= 0.75;
  } else if (seed.preferredWeather && weather !== seed.preferredWeather) {
    if (
      (seed.preferredWeather === 'clear' && (weather === 'storm' || weather === 'fog')) ||
      (seed.preferredWeather === 'rain' && weather === 'heatwave') ||
      (seed.preferredWeather === 'coldfront' && weather === 'heatwave')
    ) {
      modifier *= 1.5;
    }
  }

  if (seed.preferredSeason === season) {
    modifier *= 0.8;
  } else if (seed.preferredSeason && season !== seed.preferredSeason) {
    if (
      (seed.preferredSeason === 'spring' && season === 'winter') ||
      (seed.preferredSeason === 'summer' && season === 'winter') ||
      (seed.preferredSeason === 'autumn' && season === 'summer') ||
      (seed.preferredSeason === 'winter' && season === 'summer')
    ) {
      modifier *= 1.3;
    }
  }

  return modifier;
}

/**
 * Get all registered seed IDs.
 */
export function getAllSeedIds(): string[] {
  return Array.from(SEED_DEFINITIONS.keys());
}

/**
 * Get seeds available in the shop.
 */
export function getShopSeeds(): SeedDefinition[] {
  return Array.from(SEED_DEFINITIONS.values()).filter((s) => s.shopAvailable);
}

/**
 * Get seeds by rarity tier.
 */
export function getSeedsByRarity(rarity: SeedDefinition['rarity']): SeedDefinition[] {
  return Array.from(SEED_DEFINITIONS.values()).filter((s) => s.rarity === rarity);
}
