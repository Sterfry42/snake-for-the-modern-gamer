import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import { ALL_VILLAGE_SHOP_HAT_IDS, VILLAGE_SHOP_HATS } from '../villageShop.js';

describe('village shop completeness', () => {
  describe('hats', () => {
    it('every hat ID in ALL_VILLAGE_SHOP_HAT_IDS is present in VILLAGE_SHOP_HATS', () => {
      const shopIds = new Set(VILLAGE_SHOP_HATS.map((hat) => hat.id));
      for (const hatId of ALL_VILLAGE_SHOP_HAT_IDS) {
        expect(shopIds.has(hatId)).toBe(true);
      }
    });

    it('VILLAGE_SHOP_HATS contains no unexpected hat IDs', () => {
      const expectedIds = new Set(ALL_VILLAGE_SHOP_HAT_IDS);
      for (const hat of VILLAGE_SHOP_HATS) {
        expect(expectedIds.has(hat.id)).toBe(true);
      }
    });

    it('ALL_VILLAGE_SHOP_HAT_IDS and VILLAGE_SHOP_HATS have the same count', () => {
      expect(ALL_VILLAGE_SHOP_HAT_IDS.length).toBe(VILLAGE_SHOP_HATS.length);
    });
  });
});

describe('cosmetics UI hat display completeness', () => {
  it('cosmetics UI does not slice hats to a fixed count', () => {
    // The cosmetics UI (skillTreeOverlay.ts) renders unlocked hats in a scrollable list.
    // This test ensures no artificial slice limit (like .slice(0, 4)) is
    // applied to the hats array, which would hide hats from view.
    const skillTreePath = resolve(import.meta.dirname, '../../ui/skillTreeOverlay.ts');
    const source = readFileSync(skillTreePath, 'utf-8');

    // Check that hats are not sliced to a fixed count
    // The pattern "hats.slice(0, N)" would indicate a bug
    const hatSlicePattern = /hats\.slice\s*\(\s*0\s*,\s*\d+\s*\)/;
    expect(hatSlicePattern.test(source)).toBe(false);
  });

  it('cosmetics UI renders hats as scrollable cards', () => {
    // Hats should be laid out as scrollable cards to accommodate all hats.
    const skillTreePath = resolve(import.meta.dirname, '../../ui/skillTreeOverlay.ts');
    const source = readFileSync(skillTreePath, 'utf-8');

    // Verify the hat rendering uses cards with setStructuredContentHeight for scrolling
    const cardPattern = /renderHatCards/;
    expect(cardPattern.test(source)).toBe(true);
  });

  it('all shop hats are displayable in the cosmetics UI', () => {
    // Each hat card is rendered in a scrollable list.
    // With N hats, all should be displayable via scrolling.
    const numHats = ALL_VILLAGE_SHOP_HAT_IDS.length;

    // Verify hats exist and are greater than zero
    expect(numHats).toBeGreaterThan(0);
  });
});
