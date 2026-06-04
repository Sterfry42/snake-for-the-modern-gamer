import { describe, expect, it } from 'vitest';
import {
  isStationaryTownRole,
  isTownCriminalRole,
  isTownGuardRole,
  isTownMerchantRole,
  isTownShopRole,
  shopKindForTownRole,
} from '../townRoles.js';

describe('town role helpers', () => {
  it('classifies new merchant roles consistently', () => {
    for (const role of ['equipmentMerchant', 'potionMaker', 'butcher', 'cardDealer', 'bartender']) {
      expect(isTownMerchantRole(role)).toBe(true);
      expect(isTownShopRole(role)).toBe(true);
      expect(isStationaryTownRole(role)).toBe(true);
    }
  });

  it('keeps guard and criminal role groups distinct', () => {
    expect(isTownGuardRole('guard')).toBe(true);
    expect(isTownGuardRole('gateGuard')).toBe(true);
    expect(isTownGuardRole('thief')).toBe(false);

    expect(isTownCriminalRole('thief')).toBe(true);
    expect(isTownCriminalRole('thiefContact')).toBe(true);
    expect(isTownCriminalRole('guildContact')).toBe(true);
    expect(isTownCriminalRole('blackMarketMerchant')).toBe(true);
    expect(isTownCriminalRole('guard')).toBe(false);
  });

  it('maps concrete merchant roles to shop kinds', () => {
    expect(shopKindForTownRole('equipmentMerchant')).toBe('equipment');
    expect(shopKindForTownRole('potionMaker')).toBe('potion');
    expect(shopKindForTownRole('butcher')).toBe('butcher');
    expect(shopKindForTownRole('cardDealer')).toBe('cards');
    expect(shopKindForTownRole('shopkeeper')).toBe('general');
  });
});
