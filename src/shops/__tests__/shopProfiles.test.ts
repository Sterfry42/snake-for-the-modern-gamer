import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SHOP_OFFER_POOLS,
  DEFAULT_SHOP_PROFILES,
  resolveShopProfileTabs,
  type ResolveShopProfileContext,
  type ShopOfferPool,
  type ShopProfile,
} from '../shopProfiles.js';

const baseContext: ResolveShopProfileContext = {
  biomeId: 'elderwood-maze',
  townId: 'test-town',
  worldSeed: 'shop-profile-test',
  stockPeriod: 3,
  priceScalar: 1,
  stockCountBonus: 0,
  hasAlchemyStation: false,
};

describe('shop profile resolver', () => {
  it('Potion Maker exposes only Consumables and Items tabs with no undefined tabs', () => {
    const tabs = resolveShopProfileTabs('potion-maker', baseContext);

    expect(tabs.map((tab) => tab.id)).toEqual(['consumables', 'items']);
    expect(tabs.find((tab) => tab.id === 'consumables')?.offers).toHaveLength(2);
    expect(tabs.find((tab) => tab.id === 'items')?.offers).toHaveLength(4);
    expect(tabs.find((tab) => tab.id === 'items')?.offers[0]?.id).toBe('alchemy-station');
    expect(tabs.flatMap((tab) => tab.offers).map((offer) => offer.id)).not.toContain(
      'half-price-revolver',
    );
  });

  it('Wizard exposes only explicitly configured tabs from distinct anchored and weighted pools', () => {
    const wizardTabs = resolveShopProfileTabs('wizard', baseContext);
    const potionTabs = resolveShopProfileTabs('potion-maker', baseContext);

    expect(wizardTabs.map((tab) => tab.id)).toEqual(['consumables', 'items']);
    expect(wizardTabs.find((tab) => tab.id === 'consumables')?.offers).toHaveLength(2);
    expect(wizardTabs.find((tab) => tab.id === 'items')?.offers).toHaveLength(5);
    expect(wizardTabs.find((tab) => tab.id === 'items')?.offers[0]?.id).toBe('alchemy-station');
    expect(wizardTabs.flatMap((tab) => tab.offers).map((offer) => offer.id)).not.toEqual(
      potionTabs.flatMap((tab) => tab.offers).map((offer) => offer.id),
    );
    expect(wizardTabs.flatMap((tab) => tab.offers).map((offer) => offer.id)).not.toContain(
      'half-price-revolver',
    );
  });

  it('Generic merchant exposes configured Equipment Consumables and Items tabs with configured counts', () => {
    const tabs = resolveShopProfileTabs('general-merchant', baseContext);

    expect(tabs.map((tab) => tab.id)).toEqual(['equipment', 'consumables', 'items']);
    expect(tabs.find((tab) => tab.id === 'equipment')?.offers).toHaveLength(2);
    expect(tabs.find((tab) => tab.id === 'consumables')?.offers).toHaveLength(4);
    expect(tabs.find((tab) => tab.id === 'items')?.offers).toHaveLength(1);
  });

  it('stock count and price modifiers are applied by the resolver', () => {
    const tabs = resolveShopProfileTabs('general-merchant', {
      ...baseContext,
      priceScalar: 0.5,
      stockCountBonus: 1,
    });

    const equipment = tabs.find((tab) => tab.id === 'equipment');
    expect(equipment?.offers).toHaveLength(3);
    expect(equipment?.offers.every((offer) => offer.price > 0)).toBe(true);
    expect(equipment?.offers.some((offer) => offer.price < 38)).toBe(true);
  });

  it('hides an ineligible anchored offer without consuming weighted random slots', () => {
    const tabs = resolveShopProfileTabs('wizard', { ...baseContext, hasAlchemyStation: true });

    expect(tabs.flatMap((tab) => tab.offers).map((offer) => offer.id)).not.toContain(
      'alchemy-station',
    );
    expect(tabs.find((tab) => tab.id === 'items')?.offers).toHaveLength(4);
  });

  it('can resolve a new test profile and pool without role-specific runtime code', () => {
    const profile: ShopProfile = {
      id: 'test-lab',
      tabs: { items: { poolId: 'test-lab-items', randomCount: 1 } },
    };
    const pool: ShopOfferPool = {
      id: 'test-lab-items',
      tab: 'items',
      resolve: () => [
        {
          id: 'test-vial',
          category: 'items',
          label: 'Test Vial',
          price: 7,
          note: 'Proof the resolver does not need a role switch.',
          itemId: 'ingredient-dew',
        },
      ],
    };

    const tabs = resolveShopProfileTabs('test-lab', {
      ...baseContext,
      profiles: new Map([...DEFAULT_SHOP_PROFILES, [profile.id, profile]]),
      pools: new Map([...DEFAULT_SHOP_OFFER_POOLS, [pool.id, pool]]),
    });

    expect(tabs).toEqual([{ id: 'items', offers: [expect.objectContaining({ id: 'test-vial' })] }]);
  });
});
