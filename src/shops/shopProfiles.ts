import { getCardDefinition, CARD_SHOP_OFFERS, type CardId } from '../cards/cardGame.js';
import { stableStringHashUnsigned } from '../core/math.js';
import { getItem } from '../inventory/itemRegistry.js';
import { CROPS, FARM_TOOLS } from '../farming/cropCatalog.js';
import type { ActorRole } from '../actors/actorTypes.js';
import type { BiomeId } from '../world/biomes.js';
import { buildMapperStock } from './mapperShop.js';
import {
  BLACK_MARKET_EQUIPMENT,
  BLACK_MARKET_SUPPLIES,
  VILLAGE_SHOP_EQUIPMENT,
  VILLAGE_SHOP_SUPPLIES,
  type VillageShopEquipmentOffer,
  type VillageShopSupplyOffer,
} from './villageShop.js';

export type ShopTabId =
  | 'equipment'
  | 'consumables'
  | 'items'
  | 'styles'
  | 'hats'
  | 'cowbells'
  | 'emoticons'
  | 'cards'
  | 'services'
  | 'locators'
  | 'food';

export type ShopProfileId =
  | 'general-merchant'
  | 'potion-maker'
  | 'wizard'
  | 'butcher'
  | 'bartender'
  | 'card-dealer'
  | 'mapper'
  | 'black-market';

export interface ShopOfferView {
  id: string;
  category: ShopTabId;
  label: string;
  price: number;
  note: string;
  itemId?: string;
  cardId?: CardId;
  quantity?: number;
}

export interface ShopResolvedTab {
  id: ShopTabId;
  offers: ShopOfferView[];
}

export interface ShopStockRule {
  poolId: string;
  randomCount?: number | 'all';
  anchored?: readonly string[];
  anchoredConsumeSlots?: boolean;
}

export interface ShopProfile {
  id: string;
  tabs: Partial<Record<ShopTabId, ShopStockRule>>;
}

export interface ResolveShopProfileContext {
  biomeId: BiomeId;
  townId?: string;
  worldSeed: string;
  stockPeriod: number;
  season?: import('../world/atmosphereTypes.js').Season;
  priceScalar: number;
  stockCountBonus: number;
  hasAlchemyStation: boolean;
  profiles?: ReadonlyMap<string, ShopProfile>;
  pools?: ReadonlyMap<string, ShopOfferPool>;
}

export interface ShopOfferPool {
  id: string;
  tab: ShopTabId;
  resolve(context: ResolveShopProfileContext): ShopOfferView[];
  weights?: Readonly<Record<string, number>>;
}

const POTION_MAKER_SUPPLIES: readonly VillageShopSupplyOffer[] = [
  {
    id: 'healing-potion',
    itemId: 'healing-potion',
    price: 24,
    note: 'Reliable field medicine with exactly enough fizz to feel official.',
  },
  {
    id: 'alchemy-station',
    itemId: 'alchemy-station',
    price: 120,
    note: 'Portable brewing furniture. The scorch marks are decorative if anyone asks.',
  },
  {
    id: 'recipe-scroll-phase',
    itemId: 'recipe-scroll-phase',
    price: 22,
    note: 'Starter alchemy scroll. Phase: walls become suggestions.',
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
    id: 'ingredient-pearl-apple',
    itemId: 'ingredient-pearl-apple',
    price: 11,
    note: 'Starter Phase and Shield reagent.',
  },
  {
    id: 'ingredient-quartz',
    itemId: 'ingredient-quartz',
    price: 8,
    note: 'Crushed quartz for the starter Phase recipe.',
  },
  {
    id: 'ingredient-yuzu-apple',
    itemId: 'ingredient-yuzu-apple',
    price: 9,
    note: 'Common-ish alchemy component for beginner brews.',
  },
];

const WIZARD_SUPPLIES: readonly VillageShopSupplyOffer[] = [
  {
    id: 'alchemy-station',
    itemId: 'alchemy-station',
    price: 120,
    note: 'Portable brewing furniture, tuned by someone who owns too many candles.',
  },
  {
    id: 'spell-tome-arcane-pulse',
    itemId: 'spell-tome-arcane-pulse',
    price: 48,
    note: 'A novice spell tome. Short burst, big attitude.',
  },
  {
    id: 'spell-tome-summon-rat-familiar',
    itemId: 'spell-tome-summon-rat-familiar',
    price: 76,
    note: 'A conjuration tome with suspicious little footprints in the margins.',
  },
  {
    id: 'spell-tome-firebolt',
    itemId: 'spell-tome-firebolt',
    price: 36,
    note: 'A destruction tome. The wizard apologizes in advance for the soot.',
  },
  {
    id: 'spell-tome-magic-missile',
    itemId: 'spell-tome-magic-missile',
    price: 40,
    note: 'A destruction tome that insists you owe the missile an apology.',
  },
  {
    id: 'spell-tome-lightning-strike',
    itemId: 'spell-tome-lightning-strike',
    price: 44,
    note: 'A destruction tome. The sky owes the wizard a favor; this is the invoice.',
  },
  {
    id: 'spell-tome-frost-nova',
    itemId: 'spell-tome-frost-nova',
    price: 46,
    note: 'An alteration tome that runs cold in your pack on warm days.',
  },
  {
    id: 'spell-tome-swiftstep',
    itemId: 'spell-tome-swiftstep',
    price: 44,
    note: 'An alteration tome. The wizard insists blink is a verb with manners.',
  },
  {
    id: 'spell-tome-haste',
    itemId: 'spell-tome-haste',
    price: 42,
    note: 'An alteration tome with the pacing of a very anxious letter.',
  },
  {
    id: 'spell-tome-mirror-image',
    itemId: 'spell-tome-mirror-image',
    price: 48,
    note: 'An illusion tome. The margins argue with themselves; that is the point.',
  },
  {
    id: 'spell-tome-shimmer-cloak',
    itemId: 'spell-tome-shimmer-cloak',
    price: 52,
    note: 'An illusion tome that is slightly harder to look at than to read.',
  },
  {
    id: 'spell-tome-healing-glow',
    itemId: 'spell-tome-healing-glow',
    price: 64,
    note: 'A restoration tome that smells faintly of bandages and breakfast.',
  },
  {
    id: 'spell-tome-mana-sip',
    itemId: 'spell-tome-mana-sip',
    price: 58,
    note: 'A restoration tome. The river resents frequent visitors; sip accordingly.',
  },
  {
    id: 'spell-tome-summon-light-wisp',
    itemId: 'spell-tome-summon-light-wisp',
    price: 72,
    note: 'A conjuration tome. One very small claw mark appears in the margins.',
  },
  {
    id: 'mana-potion',
    itemId: 'mana-potion',
    price: 18,
    note: 'Starlight in a bottle. The fizz is intentional and not a defect.',
  },
  {
    id: 'mana-crystal',
    itemId: 'mana-crystal',
    price: 85,
    note: 'Compressed night sky. Permanent, so the wizard makes you repeat the price.',
  },
  {
    id: 'recipe-scroll-shield',
    itemId: 'recipe-scroll-shield',
    price: 24,
    note: 'Starter alchemy scroll. Shield: confidence, bottled badly.',
  },
  {
    id: 'recipe-scroll-phase',
    itemId: 'recipe-scroll-phase',
    price: 22,
    note: 'Starter alchemy scroll. Phase: walls become suggestions.',
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
    id: 'ingredient-nightshade',
    itemId: 'ingredient-nightshade',
    price: 15,
    note: 'A shadowy pinch for brews best labeled after purchase.',
  },
];

const WIZARD_SERVICES: readonly {
  id: string;
  itemId: string;
  label: string;
  price: number;
  note: string;
}[] = [
  {
    id: 'wizard-lesson',
    itemId: 'wizard-lesson',
    label: "Wizard's Lesson",
    price: 25,
    note: 'One spell, properly taught. The wizard keeps a list of your excuses.',
  },
];

const FOOD_SUPPLIES = VILLAGE_SHOP_SUPPLIES.filter((offer) =>
  ['senbei', 'ramen', 'animal-bait'].includes(offer.id),
);
const TAVERN_SUPPLIES = VILLAGE_SHOP_SUPPLIES.filter((offer) =>
  ['beer', 'wine', 'ramen'].includes(offer.id),
);

export const DEFAULT_SHOP_PROFILES: ReadonlyMap<string, ShopProfile> = new Map(
  [
    profile('general-merchant', {
      equipment: { poolId: 'generic-equipment', randomCount: 2 },
      consumables: { poolId: 'generic-consumables', randomCount: 4 },
      items: { poolId: 'generic-items', randomCount: 2 },
    }),
    profile('potion-maker', {
      consumables: { poolId: 'potion-maker-consumables', randomCount: 4 },
      items: {
        poolId: 'potion-maker-items',
        anchored: ['alchemy-station', 'ingredient-pearl-apple', 'ingredient-quartz', 'ingredient-dew'],
        randomCount: 3,
      },
    }),
    profile('wizard', {
      consumables: { poolId: 'wizard-consumables', randomCount: 4 },
      items: {
        poolId: 'wizard-items',
        anchored: ['alchemy-station', 'spell-tome-arcane-pulse'],
        randomCount: 5,
      },
      services: { poolId: 'wizard-services', randomCount: 'all' },
    }),
    profile('butcher', {
      consumables: { poolId: 'butcher-consumables', randomCount: 'all' },
    }),
    profile('bartender', {
      consumables: { poolId: 'tavern-consumables', randomCount: 'all' },
    }),
    profile('card-dealer', {
      services: { poolId: 'card-services', randomCount: 'all' },
    }),
    profile('mapper', {
      locators: { poolId: 'mapper-locators', randomCount: 'all' },
    }),
    profile('black-market', {
      equipment: { poolId: 'black-market-equipment', randomCount: 'all' },
      consumables: { poolId: 'black-market-consumables', randomCount: 'all' },
    }),
  ].map((entry) => [entry.id, entry]),
);

const DEFAULT_SHOP_OFFER_POOL_LIST: ShopOfferPool[] = [
  supplyPool(
    'generic-consumables',
    'consumables',
    VILLAGE_SHOP_SUPPLIES.filter((offer) =>
      [
        'healing-potion',
        'life-tonic',
        'senbei',
        'ramen',
        'animal-bait',
        'beer',
        'wine',
        'orange-juice',
        'bomb',
      ].includes(offer.id),
    ),
  ),
  supplyPool(
    'generic-items',
    'items',
    [
      {
        id: 'alchemy-station',
        itemId: 'alchemy-station',
        price: 120,
        note: 'Portable brewing furniture for travelers with suspiciously specific plans.',
      },
    ],
    { 'alchemy-station': 1 },
  ),
  equipmentPool('generic-equipment', VILLAGE_SHOP_EQUIPMENT),
  supplyPool(
    'potion-maker-consumables',
    'consumables',
    POTION_MAKER_SUPPLIES.filter((offer) =>
      ['healing-potion', 'recipe-scroll-phase'].includes(offer.id),
    ),
    {
      'healing-potion': 20,
      'recipe-scroll-phase': 10,
    },
  ),
  supplyPool(
    'potion-maker-items',
    'items',
    POTION_MAKER_SUPPLIES.filter((offer) =>
      [
        'alchemy-station', 'ingredient-honey', 'ingredient-dew',
        'ingredient-pearl-apple', 'ingredient-quartz', 'ingredient-yuzu-apple',
      ].includes(offer.id),
    ),
    {
      'alchemy-station': 2,
      'ingredient-honey': 18,
      'ingredient-dew': 20,
      'ingredient-pearl-apple': 15,
      'ingredient-quartz': 18,
      'ingredient-yuzu-apple': 12,
    },
  ),
  supplyPool(
    'wizard-consumables',
    'consumables',
    WIZARD_SUPPLIES.filter((offer) =>
      ['recipe-scroll-shield', 'recipe-scroll-phase', 'mana-potion'].includes(offer.id),
    ),
    {
      'recipe-scroll-shield': 10,
      'recipe-scroll-phase': 8,
      'mana-potion': 14,
    },
  ),
  supplyPool(
    'wizard-items',
    'items',
    WIZARD_SUPPLIES.filter((offer) =>
      [
        'alchemy-station',
        'spell-tome-arcane-pulse',
        'spell-tome-summon-rat-familiar',
        'spell-tome-firebolt',
        'spell-tome-magic-missile',
        'spell-tome-lightning-strike',
        'spell-tome-frost-nova',
        'spell-tome-swiftstep',
        'spell-tome-haste',
        'spell-tome-mirror-image',
        'spell-tome-shimmer-cloak',
        'spell-tome-healing-glow',
        'spell-tome-mana-sip',
        'spell-tome-summon-light-wisp',
        'mana-crystal',
        'ingredient-pearl-apple',
        'ingredient-quartz',
        'ingredient-meteor-iron',
        'ingredient-nightshade',
      ].includes(offer.id),
    ),
    {
      'alchemy-station': 1,
      'spell-tome-arcane-pulse': 12,
      'spell-tome-summon-rat-familiar': 4,
      'spell-tome-firebolt': 10,
      'spell-tome-magic-missile': 9,
      'spell-tome-lightning-strike': 7,
      'spell-tome-frost-nova': 6,
      'spell-tome-swiftstep': 6,
      'spell-tome-haste': 6,
      'spell-tome-mirror-image': 5,
      'spell-tome-shimmer-cloak': 5,
      'spell-tome-healing-glow': 3,
      'spell-tome-mana-sip': 3,
      'spell-tome-summon-light-wisp': 2,
      'mana-crystal': 4,
      'ingredient-pearl-apple': 12,
      'ingredient-quartz': 20,
      'ingredient-meteor-iron': 3,
      'ingredient-nightshade': 4,
    },
  ),
  {
    id: 'wizard-services',
    tab: 'services',
    resolve: (context) =>
      WIZARD_SERVICES.map((service) =>
        withPriceScalar(
          {
            id: service.id,
            category: 'services',
            label: service.label,
            price: service.price,
            note: service.note,
            itemId: service.itemId,
            // Services are gated by the lesson limit, not by shop stock.
          },
          context.priceScalar,
        ),
      ),
  },
  supplyPool('butcher-consumables', 'consumables', FOOD_SUPPLIES),
  supplyPool('tavern-consumables', 'consumables', TAVERN_SUPPLIES),
  equipmentPool('black-market-equipment', BLACK_MARKET_EQUIPMENT),
  supplyPool('black-market-consumables', 'consumables', BLACK_MARKET_SUPPLIES),
  {
    id: 'card-services',
    tab: 'services',
    resolve: (context) =>
      CARD_SHOP_OFFERS.map((cardId) => {
        const card = getCardDefinition(cardId);
        return withPriceScalar(
          {
            id: card.id,
            cardId,
            category: 'services',
            label: card.name,
            price: card.price,
            note: card.description,
          },
          context.priceScalar,
        );
      }),
  },
  {
    id: 'mapper-locators',
    tab: 'locators',
    resolve: (context) =>
      buildMapperStock({
        townId: context.townId ?? 'unknown-town',
        worldSeed: context.worldSeed,
        currentBiomeId: context.biomeId,
        stockPeriod: context.stockPeriod,
      }).map((offer) =>
        withPriceScalar(
          {
            id: offer.id,
            category: 'locators',
            label: getItem(offer.itemId)?.name ?? offer.id,
            price: offer.price,
            note: offer.note,
            itemId: offer.itemId,
            quantity: 1,
          },
          context.priceScalar,
        ),
      ),
  },
];

export const DEFAULT_SHOP_OFFER_POOLS: ReadonlyMap<string, ShopOfferPool> = new Map(
  DEFAULT_SHOP_OFFER_POOL_LIST.map((entry) => [entry.id, entry]),
);

export function defaultShopProfileIdForRole(role: ActorRole): ShopProfileId | undefined {
  switch (role) {
    case 'shopkeeper':
    case 'equipmentMerchant':
    case 'goblinMerchant':
      return 'general-merchant';
    case 'potionMaker':
      return 'potion-maker';
    case 'wizard':
      return 'wizard';
    case 'butcher':
    case 'cook':
      return 'butcher';
    case 'bartender':
      return 'bartender';
    case 'cardDealer':
      return 'card-dealer';
    case 'mapper':
      return 'mapper';
    case 'blackMarketMerchant':
      return 'black-market';
    default:
      return undefined;
  }
}

export function resolveShopProfileTabs(
  profileId: string,
  context: ResolveShopProfileContext,
): ShopResolvedTab[] {
  const profile = (context.profiles ?? DEFAULT_SHOP_PROFILES).get(profileId);
  if (!profile) {
    return [];
  }
  const pools = context.pools ?? DEFAULT_SHOP_OFFER_POOLS;
  const tabs: ShopResolvedTab[] = [];
  for (const [tabId, rule] of Object.entries(profile.tabs) as Array<[ShopTabId, ShopStockRule]>) {
    const pool = pools.get(rule.poolId);
    if (!pool) {
      continue;
    }
    const eligible = pool
      .resolve(context)
      .filter((offer) => offer.itemId !== 'alchemy-station' || !context.hasAlchemyStation);
    const anchored = (rule.anchored ?? [])
      .map((offerId) => eligible.find((offer) => offer.id === offerId))
      .filter((offer): offer is ShopOfferView => Boolean(offer));
    const anchoredIds = new Set(anchored.map((offer) => offer.id));
    const randomEligible = rule.anchoredConsumeSlots
      ? eligible
      : eligible.filter((offer) => !anchoredIds.has(offer.id));
    const randomCount = rule.randomCount ?? 0;
    const adjustedRandomCount =
      randomCount === 'all'
        ? randomEligible.length
        : Math.max(0, Math.min(randomEligible.length, randomCount + context.stockCountBonus));
    const randomOffers =
      randomCount === 'all'
        ? randomEligible
        : selectWeightedOffers(randomEligible, adjustedRandomCount, {
            poolId: rule.poolId,
            profileId,
            stockPeriod: context.stockPeriod,
            worldSeed: context.worldSeed,
            weights: pool.weights,
          });
    const offers = uniqueById([...anchored, ...randomOffers]);
    if (offers.length > 0) {
      tabs.push({ id: tabId, offers });
    }
  }
  if (!context.profiles && (profileId === 'general-merchant' || profileId === 'black-market')) {
    const eligible = CROPS.filter((crop) =>
      profileId === 'black-market'
        ? crop.contraband
        : !crop.contraband && crop.seasons.includes(context.season ?? 'spring'),
    );
    const crops = [...eligible].sort((a, b) =>
      stableStringHashUnsigned(`${context.worldSeed}:${context.townId ?? profileId}:${context.stockPeriod}:${a.id}`) -
      stableStringHashUnsigned(`${context.worldSeed}:${context.townId ?? profileId}:${context.stockPeriod}:${b.id}`),
    ).slice(0, profileId === 'black-market' ? 1 : 4);
    const offers: ShopOfferView[] = crops.map((crop) => ({
      id: crop.seedItemId,
      itemId: crop.seedItemId,
      category: 'items',
      label: `${crop.label} Seeds`,
      price: crop.seedCost,
      quantity: profileId === 'black-market'
        ? 4
        : 8 + stableStringHashUnsigned(`${context.worldSeed}:${context.stockPeriod}:${crop.id}:quantity`) % 8,
      note: `${crop.growDays} world days; ${crop.seasons.join('/')}. Yield ${crop.yield}; produce sells for ${crop.value} each.`,
    }));
    if (profileId === 'general-merchant')
      offers.push(...FARM_TOOLS.map((tool) => ({
        id: tool.id,
        itemId: tool.id,
        category: 'items' as const,
        label: tool.name,
        price: tool.price,
        quantity: 1,
        note: 'Use from inventory to work the land one step at a time.',
      })));
    const items = tabs.find((tab) => tab.id === 'items');
    if (items) items.offers.push(...offers);
    else tabs.push({ id: 'items', offers });
  }
  return tabs;
}

function profile(id: ShopProfileId, tabs: ShopProfile['tabs']): ShopProfile {
  return { id, tabs };
}

function supplyPool(
  id: string,
  tab: ShopTabId,
  offers: readonly VillageShopSupplyOffer[],
  weights?: Readonly<Record<string, number>>,
): ShopOfferPool {
  return {
    id,
    tab,
    weights,
    resolve: (context) => offers.map((offer) => supplyOffer(offer, tab, context.priceScalar)),
  };
}

function equipmentPool(id: string, offers: readonly VillageShopEquipmentOffer[]): ShopOfferPool {
  return {
    id,
    tab: 'equipment',
    resolve: (context) =>
      offers.map((offer) =>
        withPriceScalar(
          {
            id: offer.id,
            category: 'equipment',
            label: getItem(offer.itemId)?.name ?? offer.id,
            price: offer.price,
            note: offer.note,
            itemId: offer.itemId,
            quantity: 1,
          },
          context.priceScalar,
        ),
      ),
  };
}

function selectWeightedOffers(
  offers: readonly ShopOfferView[],
  count: number,
  seedParts: {
    profileId: string;
    poolId: string;
    worldSeed: string;
    stockPeriod: number;
    weights?: Readonly<Record<string, number>>;
  },
): ShopOfferView[] {
  const remaining = [...offers];
  const selected: ShopOfferView[] = [];
  for (let slot = 0; slot < count && remaining.length > 0; slot += 1) {
    const seed = `${seedParts.worldSeed}:${seedParts.profileId}:${seedParts.poolId}:${seedParts.stockPeriod}:${slot}`;
    const totalWeight = remaining.reduce(
      (sum, offer) => sum + Math.max(0, seedParts.weights?.[offer.id] ?? 1),
      0,
    );
    if (totalWeight <= 0) {
      selected.push(remaining.shift()!);
      continue;
    }
    let roll = stableFraction(`${seed}:roll`) * totalWeight;
    const index = remaining.findIndex((offer) => {
      roll -= Math.max(0, seedParts.weights?.[offer.id] ?? 1);
      return roll < 0;
    });
    const [offer] = remaining.splice(index >= 0 ? index : remaining.length - 1, 1);
    if (offer) {
      selected.push(offer);
    }
  }
  return selected;
}

function stableFraction(seed: string): number {
  return stableStringHashUnsigned(seed) / 0x100000000;
}

function uniqueById(offers: readonly ShopOfferView[]): ShopOfferView[] {
  const seen = new Set<string>();
  const unique: ShopOfferView[] = [];
  for (const offer of offers) {
    if (seen.has(offer.id)) {
      continue;
    }
    seen.add(offer.id);
    unique.push(offer);
  }
  return unique;
}

function supplyOffer(
  offer: VillageShopSupplyOffer,
  category: ShopTabId,
  priceScalar: number,
): ShopOfferView {
  return withPriceScalar(
    {
      id: offer.id,
      category,
      label: getItem(offer.itemId)?.name ?? offer.id,
      price: offer.price,
      note: offer.note,
      itemId: offer.itemId,
      quantity: defaultSupplyQuantity(offer, category),
    },
    priceScalar,
  );
}

function withPriceScalar(offer: ShopOfferView, priceScalar: number): ShopOfferView {
  return {
    ...offer,
    price: Math.max(1, Math.ceil(offer.price * priceScalar)),
  };
}

function defaultSupplyQuantity(offer: VillageShopSupplyOffer, category: ShopTabId): number {
  if (
    category === 'items' ||
    category === 'locators' ||
    offer.id.startsWith('spell-tome-') ||
    offer.id.startsWith('recipe-scroll-') ||
    offer.id === 'alchemy-station'
  ) {
    return 1;
  }
  return 5;
}

/** Retail reference for resale quotes, independent of today's random shop shelf. */
export function referenceRetailPrice(itemId: string): number | undefined {
  const seed = CROPS.find((crop) => crop.seedItemId === itemId);
  if (seed) return seed.seedCost;
  const farmTool = FARM_TOOLS.find((tool) => tool.id === itemId);
  if (farmTool) return farmTool.price;
  const offers = [
    ...VILLAGE_SHOP_SUPPLIES, ...VILLAGE_SHOP_EQUIPMENT,
    ...BLACK_MARKET_SUPPLIES, ...BLACK_MARKET_EQUIPMENT,
    ...POTION_MAKER_SUPPLIES, ...WIZARD_SUPPLIES,
  ];
  return offers.find((offer) => offer.itemId === itemId)?.price;
}
