import { describe, expect, it } from 'vitest';
import { getItem } from './itemRegistry.js';
import {
  applyRuntimeModifierSource,
  createRuntimeModifierTotals,
} from '../stats/gameplayModifierAccumulator.js';
import { BLACK_MARKET_EQUIPMENT } from '../shops/villageShop.js';

describe('Daggerfell Helm equipment', () => {
  it('grants first-person presentation through equipment modifiers', () => {
    const item = getItem('helm-daggerfell');
    expect(item).toMatchObject({ kind: 'equipment', slot: 'helm' });
    const totals = createRuntimeModifierTotals();
    applyRuntimeModifierSource(totals, item?.kind === 'equipment' ? item.modifiers : undefined);
    expect(totals.firstPersonView).toBe(true);
  });

  it('is reliably offered by the Black Market', () => {
    expect(BLACK_MARKET_EQUIPMENT).toContainEqual(
      expect.objectContaining({
        id: 'black-daggerfell-helm',
        itemId: 'helm-daggerfell',
        slot: 'helm',
      }),
    );
  });
});
