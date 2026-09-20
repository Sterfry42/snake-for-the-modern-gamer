import { stableStringHashUnsigned } from '../core/math.js';
import { getLocatorItemId } from '../world/biomeLocators.js';
import type { BiomeDefinition, BiomeId } from '../world/biomes.js';
import { getAllBiomeDefinitions } from '../world/biomes.js';
import { STRUCTURE_LOCATORS, type StructureLocatorKind } from '../world/structureLocators.js';

export interface MapperStockContext {
  townId: string;
  worldSeed: string;
  currentBiomeId: BiomeId;
  stockPeriod: number;
}

export type MapperOfferKind = 'biome-locator' | 'structure-locator';

export interface MapperStockOffer {
  id: string;
  kind: MapperOfferKind;
  itemId: string;
  price: number;
  note: string;
  targetBiomeId?: BiomeId;
  targetStructureKind?: StructureLocatorKind;
}

type BiomeRarity = NonNullable<NonNullable<BiomeDefinition['generation']>['rarity']>;

const RARITY_SCORE: Record<BiomeRarity, number> = {
  common: 0,
  uncommon: 1,
  rare: 2,
  legendary: 3,
};

export function buildMapperStock(context: MapperStockContext): MapperStockOffer[] {
  const stockSeed = `${context.worldSeed}:${context.townId}:mapper:${context.stockPeriod}`;
  const biomeOffers = getAllBiomeDefinitions()
    .filter((biome) => biome.id !== context.currentBiomeId)
    .map((biome) => ({
      biome,
      score: biomeStockScore(biome, stockSeed),
    }))
    .sort((left, right) => right.score - left.score || left.biome.id.localeCompare(right.biome.id))
    .slice(0, 4)
    .map(({ biome }, index) => biomeLocatorOffer(biome, stockSeed, index));
  const structureOffers = STRUCTURE_LOCATORS.map((locator, index) => ({
    id: `structure-${locator.kind}`,
    kind: 'structure-locator' as const,
    itemId: locator.itemId,
    price: 34 + index * 4 + (stableStringHashUnsigned(`${stockSeed}:${locator.kind}`) % 7),
    note: `Marks the nearest ${locator.structureLabel} on a working route ledger.`,
    targetStructureKind: locator.kind,
  }));
  return [...biomeOffers, ...structureOffers];
}

function biomeLocatorOffer(
  biome: BiomeDefinition,
  stockSeed: string,
  index: number,
): MapperStockOffer {
  const rarity = biome.generation?.rarity ?? 'common';
  const rarityPremium = RARITY_SCORE[rarity] * 8;
  return {
    id: `biome-${biome.id}`,
    kind: 'biome-locator',
    itemId: getLocatorItemId(biome.id),
    price:
      18 + rarityPremium + index * 3 + (stableStringHashUnsigned(`${stockSeed}:${biome.id}`) % 5),
    note: `Charts a route toward ${biome.title}.`,
    targetBiomeId: biome.id,
  };
}

function biomeStockScore(biome: BiomeDefinition, stockSeed: string): number {
  const rarity = biome.generation?.rarity ?? 'common';
  const usefulness =
    (biome.tags.includes('civilized') ? 3 : 0) +
    (biome.tags.includes('special') ? 3 : 0) +
    (biome.tags.includes('dangerous') ? 2 : 0) +
    (biome.generation?.allowedZ === 'below' ? 2 : 0);
  return (
    RARITY_SCORE[rarity] * 100 +
    usefulness * 10 +
    (stableStringHashUnsigned(`${stockSeed}:${biome.id}`) % 10)
  );
}
