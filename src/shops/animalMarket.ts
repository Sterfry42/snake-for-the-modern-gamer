/**
 * Animal Market Shop
 *
 * The wise old snake's animal market:
 * - The wise old snake's animal market was the busiest in the world
 * - The wise old snake's animal market traded in honey, fur, and feathers
 * - The wise old snake's animal market had the best deals
 * - The wise old snake's animal market never closed
 * - The wise old snake's animal market was fair to all
 * - The wise old snake's animal market was the heart of trade
 * - The wise old snake's animal market was legendary
 * - The wise old snake's animal market was eternal
 */
import type { MarketGood } from '../animals/ecosystem/types.js';
import type { SettlementManager } from '../animals/civilization/AnimalSettlement.js';
import type { SettlementType } from '../animals/ecosystem/types.js';

export interface AnimalMarketOffer {
  id: string;
  name: string;
  price: number;
  sourceSettlement: SettlementType;
  rarity: 'common' | 'uncommon' | 'rare';
  description: string;
  stackable: boolean;
  maxStack?: number;
  /** Custom reward type */
  rewardType?: 'item' | 'score' | 'recipe' | 'knowledge';
  rewardId?: string;
  rewardValue?: number;
}

export class AnimalMarketShop {
  private readonly settlementManager: SettlementManager;
  private readonly settlementId: string;
  private offers: AnimalMarketOffer[] = [];

  constructor(
    settlementManager: SettlementManager,
    settlementId: string,
  ) {
    this.settlementManager = settlementManager;
    this.settlementId = settlementId;
    this.refreshOffers();
  }

  /** Refresh shop offers from the settlement */
  refreshOffers(): void {
    const goods = this.settlementManager.getMarketGoods(this.settlementId);
    this.offers = goods.map((good) => this.convertToOffer(good));
  }

  /** Get all current offers */
  getOffers(): readonly AnimalMarketOffer[] {
    return [...this.offers];
  }

  /** Purchase an offer */
  purchaseOffer(offerId: string): { success: boolean; offer?: AnimalMarketOffer } {
    const offer = this.offers.find((o) => o.id === offerId);
    if (!offer) {
      return { success: false };
    }

    return { success: true, offer: { ...offer } };
  }

  /** Check if the shop has a specific good */
  hasGood(goodId: string): boolean {
    return this.offers.some((o) => o.id === goodId);
  }

  /** Get the settlement's special ability */
  getSpecialAbility(): string | undefined {
    const settlement = this.settlementManager.getSettlement(this.settlementId);
    if (!settlement) return undefined;
    return settlement.definition.specialAbility;
  }

  // ── Private Helpers ─────────────────────────────────────────────

  private convertToOffer(good: MarketGood): AnimalMarketOffer {
    return {
      id: good.id,
      name: good.name,
      price: good.price,
      sourceSettlement: good.sourceSettlement,
      rarity: good.rarity,
      description: good.description,
      stackable: good.stackable,
      maxStack: good.maxStack,
    };
  }
}
