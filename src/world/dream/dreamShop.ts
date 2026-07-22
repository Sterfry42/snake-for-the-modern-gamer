/**
 * Dream Shop
 */
import type { DreamShopOffer, DreamShopCategory, DreamShopState, DreamShopItem } from './types.js';

// ─── Dream Shop Item Definitions ───────────────────────────────────────────────

export const DREAM_SHOP_ITEMS: DreamShopItem[] = [
  // Buffs
  {
    kind: 'buff',
    targetId: 'dream-shield',
    description: 'A protective bubble that lasts for one dream session.',
  },
  {
    kind: 'buff',
    targetId: 'dream-speed',
    description: 'Increased movement speed for one dream session.',
  },
  {
    kind: 'buff',
    targetId: 'dream-double-shards',
    description: 'Double shard collection for one dream session.',
  },
  // Cosmetics
  {
    kind: 'hat',
    targetId: 'dream-crown',
    description: 'A crown made of dream shards. Glows softly in the dark.',
  },
  {
    kind: 'hat',
    targetId: 'nightmare-hood',
    description: 'A hood woven from nightmare shadows. Intimidating.',
  },
  {
    kind: 'theme',
    targetId: 'dream-pastel',
    description: 'A pastel color scheme inspired by the Dream World.',
  },
  {
    kind: 'theme',
    targetId: 'nightmare-dark',
    description: 'A dark color scheme inspired by the Nightmare Realm.',
  },
  // Abilities
  {
    kind: 'ability',
    targetId: 'extra-lucidity',
    description: 'Reduces lucid ability cooldowns by 25%.',
  },
  {
    kind: 'ability',
    targetId: 'dream-wisdom',
    description: 'Increases dream entry chance by 50%.',
  },
  // Knowledge
  {
    kind: 'lore',
    targetId: 'lore-secret-1',
    description: "A hidden lore fragment about the Dream World's origins.",
  },
  {
    kind: 'lore',
    targetId: 'lore-secret-2',
    description: "A hidden lore fragment about the Nightmare Realm's creation.",
  },
];

// ─── Dream Shop Offers ─────────────────────────────────────────────────────────

export const DREAM_SHOP_OFFERS: DreamShopOffer[] = [
  // Buffs
  {
    id: 'shop-dream-shield',
    label: 'Dream Shield',
    price: 15,
    item: DREAM_SHOP_ITEMS[0],
    category: 'buff',
  },
  {
    id: 'shop-dream-speed',
    label: 'Swift Dream',
    price: 10,
    item: DREAM_SHOP_ITEMS[1],
    category: 'buff',
  },
  {
    id: 'shop-dream-double-shards',
    label: 'Shard Magnet',
    price: 20,
    item: DREAM_SHOP_ITEMS[2],
    category: 'buff',
  },
  // Cosmetics
  {
    id: 'shop-dream-crown',
    label: 'Dream Crown',
    price: 30,
    item: DREAM_SHOP_ITEMS[3],
    category: 'cosmetic',
    requiresLucidity: 1,
  },
  {
    id: 'shop-nightmare-hood',
    label: 'Nightmare Hood',
    price: 35,
    item: DREAM_SHOP_ITEMS[4],
    category: 'cosmetic',
    requiresLucidity: 2,
  },
  {
    id: 'shop-dream-pastel',
    label: 'Pastel Dreams',
    price: 25,
    item: DREAM_SHOP_ITEMS[5],
    category: 'cosmetic',
  },
  {
    id: 'shop-nightmare-dark',
    label: 'Nightmare Dark',
    price: 25,
    item: DREAM_SHOP_ITEMS[6],
    category: 'cosmetic',
  },
  // Abilities
  {
    id: 'shop-extra-lucidity',
    label: 'Enhanced Lucidity',
    price: 40,
    item: DREAM_SHOP_ITEMS[7],
    category: 'ability',
    requiresLucidity: 2,
  },
  {
    id: 'shop-dream-wisdom',
    label: 'Dream Wisdom',
    price: 35,
    item: DREAM_SHOP_ITEMS[8],
    category: 'ability',
    requiresLucidity: 1,
  },
  // Knowledge
  {
    id: 'shop-lore-secret-1',
    label: 'Hidden Truth: Origins',
    price: 50,
    item: DREAM_SHOP_ITEMS[9],
    category: 'knowledge',
    requiresLucidity: 3,
  },
  {
    id: 'shop-lore-secret-2',
    label: 'Hidden Truth: Creation',
    price: 50,
    item: DREAM_SHOP_ITEMS[10],
    category: 'knowledge',
    requiresLucidity: 3,
  },
];

// ─── Dream Shop Manager ────────────────────────────────────────────────────────

export class DreamShopManager {
  private state: DreamShopState;

  constructor() {
    this.state = {
      offers: DREAM_SHOP_OFFERS,
      purchased: [],
      shards: 0,
    };
  }

  getOffers(): DreamShopOffer[] {
    return this.state.offers.filter((offer) => !this.state.purchased.includes(offer.id));
  }

  getAllOffers(): DreamShopOffer[] {
    return this.state.offers;
  }

  getOfferById(id: string): DreamShopOffer | undefined {
    return this.state.offers.find((o) => o.id === id);
  }

  hasPurchased(offerId: string): boolean {
    return this.state.purchased.includes(offerId);
  }

  canAfford(offerId: string, shards: number): boolean {
    const offer = this.getOfferById(offerId);
    return offer !== undefined && offer.price <= shards;
  }

  purchase(
    offerId: string,
    shards: number,
    lucidityLevel: number,
  ): { success: boolean; error?: string } {
    const offer = this.getOfferById(offerId);
    if (!offer) {
      return { success: false, error: 'Offer not found.' };
    }

    if (this.state.purchased.includes(offerId)) {
      return { success: false, error: 'Already purchased.' };
    }

    if (offer.price > shards) {
      return { success: false, error: 'Not enough dream shards.' };
    }

    if (offer.requiresLucidity && lucidityLevel < offer.requiresLucidity) {
      return {
        success: false,
        error: `Requires lucidity level ${offer.requiresLucidity}.`,
      };
    }

    // Process purchase
    this.state.purchased.push(offerId);
    this.state.shards += offer.price; // shards go to the shop "bank"

    return { success: true };
  }

  getShardBalance(): number {
    return this.state.shards;
  }

  getCategoryOffers(category: DreamShopCategory): DreamShopOffer[] {
    return this.state.offers.filter(
      (offer) => offer.category === category && !this.state.purchased.includes(offer.id),
    );
  }

  reset(): void {
    this.state = {
      offers: DREAM_SHOP_OFFERS,
      purchased: [],
      shards: 0,
    };
  }

  getState(): DreamShopState {
    return { ...this.state };
  }

  loadState(state: DreamShopState): void {
    this.state = { ...state };
  }
}
