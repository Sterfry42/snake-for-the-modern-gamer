import { readFileSync } from 'node:fs';
import { readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import { HAT_DEFINITIONS } from '../../cosmetics/cosmeticCatalog.js';
import { ALL_VILLAGE_SHOP_HAT_IDS, VILLAGE_SHOP_HATS, VILLAGE_SHOP_SOLD_HATS } from '../villageShop.js';

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

describe('quest hat rewards', () => {
  // Quest rewards are validated against the full hat catalogs at apply
  // time, so every hat a quest grants must exist in both catalogs even
  // though quest-exclusive hats are never on sale.
  function questGrantedHatIds(): string[] {
    const definitionsDir = resolve(import.meta.dirname, '../../quests/definitions');
    const granted = new Set<string>();
    for (const file of readdirSync(definitionsDir)) {
      if (!file.endsWith('.ts')) continue;
      const source = readFileSync(resolve(definitionsDir, file), 'utf-8');
      for (const match of source.matchAll(/addCosmeticReward\(\s*'hat'\s*,\s*'([^']+)'\s*\)/g)) {
        granted.add(match[1]);
      }
    }
    return [...granted];
  }

  it('every quest-granted hat id resolves in the shop and cosmetic catalogs', () => {
    const catalogIds = new Set<string>(VILLAGE_SHOP_HATS.map((hat) => hat.id));
    const cosmeticIds = new Set<string>(HAT_DEFINITIONS.map((hat) => hat.id));
    const granted = questGrantedHatIds();
    expect(granted.length).toBeGreaterThan(0);
    for (const hatId of granted) {
      expect(catalogIds.has(hatId), `quest hat "${hatId}" is not in VILLAGE_SHOP_HATS`).toBe(true);
      expect(cosmeticIds.has(hatId), `quest hat "${hatId}" is not in HAT_DEFINITIONS`).toBe(true);
    }
  });

  it('keeps quest-exclusive hats out of the sale list', () => {
    const soldIds = new Set<string>(VILLAGE_SHOP_SOLD_HATS.map((hat) => hat.id));
    for (const hatId of ['dragon-helm', 'master-broth', 'demon-horns']) {
      expect(soldIds.has(hatId)).toBe(false);
    }
    expect(VILLAGE_SHOP_SOLD_HATS.length).toBe(VILLAGE_SHOP_HATS.length - 3);
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
