import type { EquipmentSlot } from '../inventory/item.js';
import type { SnakeSpritePalette } from '../ui/spriteRecipes/snakeRecipe.js';
import type { BiomeId } from '../world/biomes.js';
import { getAllBiomeDefinitions } from '../world/biomes.js';
import { getLocatorItemId } from '../world/biomeLocators.js';
import { FISH_SHOP_SELL_OFFERS } from '../fishing/fishingShopOffers.js';
import { HELL_ESCAPE_ITEM_ID } from '../world/hellDepth.js';

export const ALL_VILLAGE_SHOP_STYLE_IDS = [
  'classic',
  'sunset',
  'midnight',
  'bone',
  'market-moss',
  'charcoal-silk',
  'pearlwake',
  'goblin-hide',
  'retro-grid',
  'unicorn',
  'infernal',
] as const;

export type VillageShopStyleId = (typeof ALL_VILLAGE_SHOP_STYLE_IDS)[number];

export const ALL_VILLAGE_SHOP_HAT_IDS = [
  'cowboy',
  'market-cap',
  'ember-cowl',
  'pearl-crown',
  'unicorn-horn',
  'demon-horns',
] as const;

export type VillageShopHatId = (typeof ALL_VILLAGE_SHOP_HAT_IDS)[number];

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

export type VillageShopCowbellId = 'cowbell';

export interface VillageShopCowbellOffer {
  id: VillageShopCowbellId;
  label: string;
  price: number;
  description: string;
}

export interface VillageShopSupplyOffer {
  id: string;
  itemId: string;
  price: number;
  note: string;
}

export interface VillageShopEmoticonOffer {
  id: string;
  label: string;
  symbol: string;
  price: number;
  description: string;
}

export interface VillageShopDefinition {
  equipment: VillageShopEquipmentOffer[];
  styles: VillageShopStyleOffer[];
  hats: VillageShopHatOffer[];
  cowbells: VillageShopCowbellOffer[];
  supplies: VillageShopSupplyOffer[];
  emoticons: VillageShopEmoticonOffer[];
  fishSales: VillageShopFishSaleOffer[];
}

export interface VillageShopFishSaleOffer {
  id: string;
  typeId: string;
  itemId: string;
  name: string;
  sellPrice: number;
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
    id: 'bomb-slingshot',
    itemId: 'weapon-bomb-slingshot',
    price: 44,
    slot: 'weapon',
    note: 'Throws bombs in any direction. Accuracy by confidence, liability by distance.',
  },
  {
    id: 'binoculars',
    itemId: 'weapon-binoculars',
    price: 32,
    slot: 'weapon',
    note: 'Surveys the neighboring rooms before trouble walks over and introduces itself.',
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
  {
    id: 'traveler-lantern',
    itemId: 'amulet-lantern',
    price: 42,
    slot: 'amulet',
    note: 'A steady lantern for nights, caves, and bad ideas after sundown.',
  },
  {
    id: 'fishing-rod',
    itemId: 'fishing-rod',
    price: 36,
    slot: 'gloves',
    note: 'A collapsible fishing pole. Cast it near water and wait.',
  },
  {
    id: 'fishing-rod-carpenter',
    itemId: 'fishing-rod-carpenter',
    price: 60,
    slot: 'gloves',
    note: 'A reinforced rod with a stiffer line. Better catches, better prices.',
  },
  {
    id: 'fishing-rod-master',
    itemId: 'fishing-rod-master',
    price: 90,
    slot: 'gloves',
    note: 'The finest fishing rod in the realm. Legendary fish know its approach.',
  },
];

export const BLACK_MARKET_EQUIPMENT: readonly VillageShopEquipmentOffer[] = [
  {
    id: 'black-dividend-ring',
    itemId: 'ring-back-alley-dividend',
    price: 58,
    slot: 'ring',
    note: 'A crooked payout ring for snakes who can afford the heavier rhythm.',
  },
  {
    id: 'black-cave-echo-helm',
    itemId: 'helm-cave-echo',
    price: 50,
    slot: 'helm',
    note: 'A tunnel-listening helm for snakes who want the wall to confess first.',
  },
  {
    id: 'black-scavenger-amulet',
    itemId: 'amulet-scavenger',
    price: 64,
    slot: 'amulet',
    note: 'Finds trouble, treasure, and sometimes the difference between them.',
  },
  {
    id: 'black-market-revolver',
    itemId: 'weapon-market-revolver',
    price: 32,
    slot: 'weapon',
    note: 'The serial number has left town ahead of you.',
  },
];

export const VILLAGE_SHOP_SUPPLIES: readonly VillageShopSupplyOffer[] = [
  {
    id: 'healing-potion',
    itemId: 'healing-potion',
    price: 24,
    note: 'Restores two hearts. Tastes like someone apologized to a berry.',
  },
  {
    id: 'life-tonic',
    itemId: 'life-tonic',
    price: 117,
    note: 'Adds one extra-life charge. The bottle hums when you lie to death.',
  },
  {
    id: 'senbei',
    itemId: 'senbei',
    price: 8,
    note: 'Crunchy travel food for a road with opinions.',
  },
  {
    id: 'ramen',
    itemId: 'ramen',
    price: 13,
    note: 'A warm bowl for snakes willing to believe in noodles.',
  },
  {
    id: 'animal-bait',
    itemId: 'animal-bait',
    price: 18,
    note: 'Useful when dinner has legs and better instincts.',
  },
  {
    id: 'beer',
    itemId: 'beer',
    price: 7,
    note: 'Cheap tavern courage. Briefly makes your path drift side to side.',
  },
  {
    id: 'wine',
    itemId: 'wine',
    price: 13,
    note: 'A stronger pour. Brief but wobblier drifting, with smoother bad decisions.',
  },
  {
    id: 'orange-juice',
    itemId: 'orange-juice',
    price: 35,
    note: 'A tangy elixir that quickens the body and sweetens fortune.',
  },
  {
    id: 'bomb',
    itemId: 'bomb',
    price: 14,
    note: 'A three-second argument with walls, enemies, and anyone standing too close.',
  },
];

export const ALCHEMY_SHOP_SUPPLIES: readonly VillageShopSupplyOffer[] = [
  {
    id: 'alchemy-station',
    itemId: 'alchemy-station',
    price: 120,
    note: 'Portable brewing furniture. The scorch marks are decorative if anyone asks.',
  },
  {
    id: 'recipe-scroll-growth',
    itemId: 'recipe-scroll-growth',
    price: 18,
    note: 'Starter alchemy scroll. Growth: taller problems, taller solutions.',
  },
  {
    id: 'recipe-scroll-phase',
    itemId: 'recipe-scroll-phase',
    price: 22,
    note: 'Starter alchemy scroll. Phase: walls become suggestions.',
  },
  {
    id: 'recipe-scroll-shield',
    itemId: 'recipe-scroll-shield',
    price: 24,
    note: 'Starter alchemy scroll. Shield: confidence, bottled badly.',
  },
  {
    id: 'recipe-scroll-speed',
    itemId: 'recipe-scroll-speed',
    price: 34,
    note: 'Advanced alchemy scroll. Speed: less walking, more arriving.',
  },
  {
    id: 'recipe-scroll-magnet',
    itemId: 'recipe-scroll-magnet',
    price: 36,
    note: 'Advanced alchemy scroll. Apples start acting sentimental.',
  },
  {
    id: 'ingredient-honey',
    itemId: 'ingredient-honey',
    price: 6,
    note: 'Common alchemy component. Sticky enough to hold a spell together.',
  },
  {
    id: 'ingredient-dew',
    itemId: 'ingredient-dew',
    price: 5,
    note: 'Common alchemy component. Dawn in a jar, somehow legal.',
  },
  {
    id: 'ingredient-yuzu-apple',
    itemId: 'ingredient-yuzu-apple',
    price: 9,
    note: 'Common-ish alchemy component for beginner brews.',
  },
  {
    id: 'ingredient-pearl-apple',
    itemId: 'ingredient-pearl-apple',
    price: 11,
    note: 'A polished apple concentrate for phasing and protection work.',
  },
  {
    id: 'ingredient-quartz',
    itemId: 'ingredient-quartz',
    price: 8,
    note: 'Common crystal dust for respectable potion nonsense.',
  },
  {
    id: 'ingredient-meteor-iron',
    itemId: 'ingredient-meteor-iron',
    price: 18,
    note: 'A defensive metal shaving with a heroic misunderstanding of gravity.',
  },
  {
    id: 'ingredient-skittish-apple',
    itemId: 'ingredient-skittish-apple',
    price: 14,
    note: 'A jittery apple extract that keeps trying to leave the bottle.',
  },
  {
    id: 'ingredient-eagle-feather',
    itemId: 'ingredient-eagle-feather',
    price: 16,
    note: 'Lift for swift brews, attitude included.',
  },
  {
    id: 'ingredient-gold-apple',
    itemId: 'ingredient-gold-apple',
    price: 22,
    note: 'Polished attraction in apple form. Subtlety costs extra.',
  },
  {
    id: 'ingredient-mochi-apple',
    itemId: 'ingredient-mochi-apple',
    price: 13,
    note: 'Chewy enough to squeeze a body plan sideways.',
  },
  {
    id: 'ingredient-nightshade',
    itemId: 'ingredient-nightshade',
    price: 15,
    note: 'A shadowy pinch for brews best labeled after purchase.',
  },
];

export const POTION_MAKER_ALCHEMY_OFFER_IDS = new Set(
  ALCHEMY_SHOP_SUPPLIES.map((offer) => offer.id),
);

export const BLACK_MARKET_SUPPLIES: readonly VillageShopSupplyOffer[] = [
  {
    id: 'get-out-of-hell-free-card',
    itemId: 'get-out-of-hell-free-card',
    price: 666,
    note: 'Automatically consumed when a Hell ending would end your run.',
  },
  {
    id: 'backalley-healing-potion',
    itemId: 'healing-potion',
    price: 26,
    note: 'Same potion, fewer questions, slightly more cork sediment.',
  },
  {
    id: 'forged-life-tonic',
    itemId: 'life-tonic',
    price: 117,
    note: 'A second chance with forged paperwork.',
  },
  {
    id: 'ofuda-cache',
    itemId: 'ofuda',
    price: 117,
    note: 'A paper ward sold from under the counter.',
  },
];

export function ensurePermanentBlackMarketSupplies(
  supplyCounts: Readonly<Record<string, number>>,
): Record<string, number> {
  return {
    ...supplyCounts,
    [HELL_ESCAPE_ITEM_ID]: Math.max(1, supplyCounts[HELL_ESCAPE_ITEM_ID] ?? 0),
  };
}

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

export const BLACK_MARKET_STYLES: readonly VillageShopStyleOffer[] = [
  {
    id: 'retro-grid',
    label: 'Retro Grid',
    price: 27,
    palette: {
      baseColor: '#5dd6a2',
      bellyColor: '#5dd6a2',
      patternColor: '#5dd6a2',
      outlineColor: '#5dd6a2',
      eyeColor: '#5dd6a2',
    },
  },
];

export const VILLAGE_SHOP_HATS: readonly VillageShopHatOffer[] = [
  { id: 'cowboy', label: 'Cowboy Hat', price: 36 },
  { id: 'market-cap', label: 'Market Cap', price: 18 },
  { id: 'ember-cowl', label: 'Ember Cowl', price: 30 },
  { id: 'pearl-crown', label: 'Pearl Crown', price: 42 },
  { id: 'unicorn-horn', label: 'Unicorn Horn', price: 55 },
  { id: 'demon-horns', label: 'Demon Horns', price: 0 },
];

export const VILLAGE_SHOP_SOLD_HATS = VILLAGE_SHOP_HATS.filter((hat) => hat.id !== 'demon-horns');

export const VILLAGE_SHOP_COWBELLS: readonly VillageShopCowbellOffer[] = [
  {
    id: 'cowbell',
    label: 'Cowbell',
    price: 45,
    description: 'Swing it on a chain and let every step announce your presence.',
  },
];

const REGIONAL_EQUIPMENT: Partial<Record<BiomeId, readonly VillageShopEquipmentOffer[]>> = {
  'elderwood-maze': [
    {
      id: 'forest-frost-cape',
      itemId: 'cloak-frostguard',
      price: 30,
      slot: 'cloak',
      note: 'Forest-edge weather turns mean after dark.',
    },
  ],
  'sunken-ocean': [
    {
      id: 'ocean-swim-fins',
      itemId: 'boots-swim-fins',
      price: 32,
      slot: 'boots',
      note: 'Fins are cheaper than funerals. Usually.',
    },
  ],
  'sable-depths': [
    {
      id: 'cold-frost-cape',
      itemId: 'cloak-frostguard',
      price: 26,
      slot: 'cloak',
      note: 'Warmth for rooms where stopping is a negotiation with snow.',
    },
  ],
  'ember-waste': [
    {
      id: 'hot-sunshade',
      itemId: 'helm-sunshade',
      price: 28,
      slot: 'helm',
      note: 'Shade for heat that has learned your name.',
    },
    {
      id: 'hot-firebreak',
      itemId: 'cloak-firebreak',
      price: 30,
      slot: 'cloak',
      note: 'A cape for crossing ember country with fewer regrets.',
    },
  ],
};

function uniqueOffers(offers: readonly VillageShopEquipmentOffer[]): VillageShopEquipmentOffer[] {
  const seen = new Set<string>();
  const result: VillageShopEquipmentOffer[] = [];
  for (const offer of offers) {
    if (seen.has(offer.id)) {
      continue;
    }
    seen.add(offer.id);
    result.push(offer);
  }
  return result;
}

/**
 * Pick a biome locator to stock. Always picks a biome different from the
 * shop's current biome, so the shop always has something useful to point
 * the snake toward.
 */
function getVendorLocatorOffer(currentBiomeId: BiomeId): VillageShopSupplyOffer | null {
  const allBiomes = getAllBiomeDefinitions();
  // Pick the first biome that isn't the current one.
  const otherBiome = allBiomes.find((b) => b.id !== currentBiomeId);
  if (!otherBiome) return null;
  const locatorId = getLocatorItemId(otherBiome.id);
  return {
    id: `locator-${otherBiome.id}`,
    itemId: locatorId,
    price: 20,
    note: `Tracks the nearest ${otherBiome.title}. Use it from your pack to read the compass.`,
  };
}

export const VILLAGE_SHOP_EMOTICONS: readonly VillageShopEmoticonOffer[] = [
  { id: 'happy', label: 'Happy', symbol: ':)', price: 10, description: 'A simple smile.' },
  {
    id: 'sad',
    label: 'Sad',
    symbol: ':(',
    price: 10,
    description: 'Tears of a clown.',
  },
  {
    id: 'angry',
    label: 'Angry',
    symbol: '>:|',
    price: 15,
    description: 'Fury incarnate.',
  },
  {
    id: 'confused',
    label: 'Confused',
    symbol: ':~/ ',
    price: 15,
    description: 'Where was I?',
  },
  {
    id: 'love',
    label: 'Love',
    symbol: '<3',
    price: 20,
    description: 'A heart-shaped apple.',
  },
  {
    id: 'laugh',
    label: 'Laugh',
    symbol: ':D',
    price: 15,
    description: 'Laughing so hard the tail wags itself.',
  },
  {
    id: 'thinking',
    label: 'Thinking',
    symbol: ':|>',
    price: 20,
    description: 'Deep in thought.',
  },
  {
    id: 'wink',
    label: 'Wink',
    symbol: ';)',
    price: 10,
    description: 'A sly little wink.',
  },
  {
    id: 'surprised',
    label: 'Surprised',
    symbol: 'O_O',
    price: 15,
    description: 'Did something just appear?',
  },
  {
    id: 'cool',
    label: 'Cool',
    symbol: ':3',
    price: 25,
    description: 'Too cool for school.',
  },
  {
    id: 'honk',
    label: 'Honk',
    symbol: 'HONK!',
    price: 15,
    description: 'HONK. That is the entire joke.',
  },
  {
    id: 'faceplant',
    label: 'Faceplant',
    symbol: '(>﹏<)',
    price: 20,
    description: 'Contact with the floor. No refunds.',
  },
];

export function getVillageShopDefinition(biomeId: BiomeId): VillageShopDefinition {
  const regional = REGIONAL_EQUIPMENT[biomeId] ?? [];
  const locatorOffer = getVendorLocatorOffer(biomeId);
  return {
    equipment: uniqueOffers([...regional, ...VILLAGE_SHOP_EQUIPMENT]),
    styles: [...VILLAGE_SHOP_STYLES],
    hats: [...VILLAGE_SHOP_SOLD_HATS],
    cowbells: [...VILLAGE_SHOP_COWBELLS],
    supplies: locatorOffer ? [...VILLAGE_SHOP_SUPPLIES, locatorOffer] : [...VILLAGE_SHOP_SUPPLIES],
    emoticons: [...VILLAGE_SHOP_EMOTICONS],
    fishSales: [...FISH_SHOP_SELL_OFFERS],
  };
}

export function getBlackMarketDefinition(): VillageShopDefinition {
  return {
    equipment: [...BLACK_MARKET_EQUIPMENT],
    styles: [...BLACK_MARKET_STYLES],
    hats: [],
    cowbells: [],
    supplies: [...BLACK_MARKET_SUPPLIES],
    emoticons: [],
    fishSales: [...FISH_SHOP_SELL_OFFERS],
  };
}
