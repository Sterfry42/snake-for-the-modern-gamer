import type { EquipmentSlot } from '../inventory/item.js';
import type { SnakeSpritePalette } from '../ui/spriteRecipes/snakeRecipe.js';
import type { BiomeId } from '../world/biomes.js';

export type VillageShopStyleId =
  | 'classic'
  | 'sunset'
  | 'midnight'
  | 'bone'
  | 'market-moss'
  | 'charcoal-silk'
  | 'pearlwake';
export type VillageShopHatId = 'cowboy' | 'market-cap' | 'ember-cowl' | 'pearl-crown';

export interface VillageShopEquipmentOffer {
  id: string;
  itemId: string;
  price: number;
  note: string;
  slot: EquipmentSlot;
}

export interface VillageShopStyleOffer {
  id: VillageShopStyleId;
  label: string;
  price: number;
  palette: SnakeSpritePalette;
}

export interface VillageShopHatOffer {
  id: VillageShopHatId;
  label: string;
  price: number;
}

export interface VillageShopDefinition {
  equipment: VillageShopEquipmentOffer[];
  styles: VillageShopStyleOffer[];
  hats: VillageShopHatOffer[];
}

export const VILLAGE_SHOP_EQUIPMENT: readonly VillageShopEquipmentOffer[] = [
  {
    id: 'half-price-revolver',
    itemId: 'weapon-market-revolver',
    price: 38,
    slot: 'weapon',
    note: 'Half-price gun. Heavy trigger, real bullets.',
  },
  {
    id: 'lead-flippers',
    itemId: 'boots-lead-flippers',
    price: 28,
    slot: 'boots',
    note: 'Cheap water crossing with cheap-water-crossing dignity.',
  },
  {
    id: 'fire-cape',
    itemId: 'cloak-firebreak',
    price: 34,
    slot: 'cloak',
    note: 'Heat resistance with a little extra drag.',
  },
  {
    id: 'frost-cape',
    itemId: 'cloak-frostguard',
    price: 34,
    slot: 'cloak',
    note: 'Cold resistance for snakes who read weather as criticism.',
  },
];

export const VILLAGE_SHOP_STYLES: readonly VillageShopStyleOffer[] = [
  {
    id: 'market-moss',
    label: 'Market Moss',
    price: 22,
    palette: {
      baseColor: '#6fbf73',
      bellyColor: '#e5ffd7',
      patternColor: '#356a3a',
      outlineColor: '#203d24',
      eyeColor: '#fffde8',
    },
  },
  {
    id: 'charcoal-silk',
    label: 'Charcoal Silk',
    price: 32,
    palette: {
      baseColor: '#353942',
      bellyColor: '#d6d7d9',
      patternColor: '#7c445a',
      outlineColor: '#17191f',
      eyeColor: '#fff2c6',
    },
  },
  {
    id: 'pearlwake',
    label: 'Pearlwake',
    price: 40,
    palette: {
      baseColor: '#a8f0f2',
      bellyColor: '#f5ffff',
      patternColor: '#417b88',
      outlineColor: '#1e4550',
      eyeColor: '#151d24',
    },
  },
];

export const VILLAGE_SHOP_HATS: readonly VillageShopHatOffer[] = [
  { id: 'cowboy', label: 'Cowboy Hat', price: 36 },
  { id: 'market-cap', label: 'Market Cap', price: 18 },
  { id: 'ember-cowl', label: 'Ember Cowl', price: 30 },
  { id: 'pearl-crown', label: 'Pearl Crown', price: 42 },
];

export function getVillageShopDefinition(_biomeId: BiomeId): VillageShopDefinition {
  return {
    equipment: [...VILLAGE_SHOP_EQUIPMENT],
    styles: [...VILLAGE_SHOP_STYLES],
    hats: [...VILLAGE_SHOP_HATS],
  };
}
