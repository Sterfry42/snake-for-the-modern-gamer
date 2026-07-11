import { describe, expect, it } from 'vitest';
import {
  CHEAT_DEFINITIONS,
  findCheatByCode,
  getAllCheatAliases,
  getCategoryLabel,
  getCategoryOrder,
  getCheatsByCategory,
  CATEGORY_ORDER,
  type CheatCategory,
} from '../cheatRegistry.js';

describe('Cheat registry', () => {
  it('has a substantial number of cheats defined', () => {
    // If this drops below 30, someone removed cheats without updating the UI or tests.
    expect(CHEAT_DEFINITIONS.length).toBeGreaterThanOrEqual(30);
  });

  it('has more cheats than the minimum threshold', () => {
    // Sanity check: the registry should have grown, not shrunk.
    // If this fails, someone deleted cheats. Check:
    //   - src/cheats/cheatRegistry.ts for removed entries
    //   - src/ui/skillTreeOverlay.ts for UI rendering
    //   - src/scenes/snakeScene.ts for applyCheatCode implementations
    //   - src/world/generation/__tests__/structureCheatCoverage.test.ts for structure cheats
    expect(CHEAT_DEFINITIONS.length).toBeGreaterThan(35);
  });

  it('every cheat has all required fields', () => {
    for (const cheat of CHEAT_DEFINITIONS) {
      expect(cheat.name).toBeDefined();
      expect(typeof cheat.name).toBe('string');
      expect(cheat.name.length).toBeGreaterThan(0);

      expect(cheat.code).toBeDefined();
      expect(typeof cheat.code).toBe('string');
      expect(cheat.code.length).toBeGreaterThan(0);

      expect(cheat.primaryCode).toBeDefined();
      expect(typeof cheat.primaryCode).toBe('string');
      expect(cheat.primaryCode.length).toBeGreaterThan(0);

      expect(cheat.description).toBeDefined();
      expect(typeof cheat.description).toBe('string');
      expect(cheat.description.length).toBeGreaterThan(0);

      expect(cheat.aliases).toBeDefined();
      expect(Array.isArray(cheat.aliases)).toBe(true);
      expect(cheat.aliases.length).toBeGreaterThan(0);

      // primaryCode must be the first alias
      expect(cheat.aliases[0]).toBe(cheat.primaryCode);
    }
  });

  it('no duplicate primary codes', () => {
    const primaryCodes = CHEAT_DEFINITIONS.map((c) => c.primaryCode);
    const uniqueCodes = new Set(primaryCodes);
    expect(uniqueCodes.size).toBe(primaryCodes.length);
  });

  it('no duplicate aliases across all cheats', () => {
    const allAliases: string[] = [];
    for (const cheat of CHEAT_DEFINITIONS) {
      allAliases.push(...cheat.aliases);
    }
    const uniqueAliases = new Set(allAliases);
    expect(uniqueAliases.size).toBe(allAliases.length);
  });

  it('all aliases are unique within each cheat', () => {
    for (const cheat of CHEAT_DEFINITIONS) {
      const unique = new Set(cheat.aliases);
      expect(unique.size).toBe(cheat.aliases.length);
    }
  });

  it('findCheatByCode finds cheats by all their aliases', () => {
    for (const cheat of CHEAT_DEFINITIONS) {
      for (const alias of cheat.aliases) {
        const found = findCheatByCode(alias);
        expect(found).toBeDefined();
        expect(found?.primaryCode).toBe(cheat.primaryCode);
        expect(found?.name).toBe(cheat.name);
      }
    }
  });

  it('findCheatByCode returns undefined for unknown codes', () => {
    expect(findCheatByCode('nonexistentcheat')).toBeUndefined();
    expect(findCheatByCode('')).toBeUndefined();
    expect(findCheatByCode('   ')).toBeUndefined();
    expect(findCheatByCode('ryans closet')).toBeDefined(); // with space normalization
  });

  it('findCheatByCode handles case-insensitive lookups', () => {
    expect(findCheatByCode('IMMORTAL')).toBeDefined();
    expect(findCheatByCode('Immortal')).toBeDefined();
    expect(findCheatByCode('immortal')).toBeDefined();
    expect(findCheatByCode('90FPS240HZ')).toBeDefined();
  });

  it('findCheatByCode handles whitespace normalization', () => {
    expect(findCheatByCode('  immortal  ')).toBeDefined();
    expect(findCheatByCode('special10')).toBeDefined();
    expect(findCheatByCode('  special10  ')).toBeDefined();
  });

  it('getAllCheatAliases returns all aliases as a set', () => {
    const aliases = getAllCheatAliases();
    expect(aliases.size).toBeGreaterThan(0);

    // Verify all aliases from the registry are in the set
    for (const cheat of CHEAT_DEFINITIONS) {
      for (const alias of cheat.aliases) {
        expect(aliases.has(alias.toLowerCase().trim())).toBe(true);
      }
    }
  });

  it('all cheats have at least one alias', () => {
    for (const cheat of CHEAT_DEFINITIONS) {
      expect(cheat.aliases.length).toBeGreaterThanOrEqual(1);
    }
  });

  it('cheat names are unique', () => {
    const names = CHEAT_DEFINITIONS.map((c) => c.name);
    const uniqueNames = new Set(names);
    expect(uniqueNames.size).toBe(names.length);
  });

  it('cheat descriptions are non-empty and meaningful', () => {
    for (const cheat of CHEAT_DEFINITIONS) {
      expect(cheat.description.length).toBeGreaterThan(5);
      // Descriptions should not be just whitespace
      expect(cheat.description.trim().length).toBeGreaterThan(0);
    }
  });

  it('cheat codes contain primary code', () => {
    for (const cheat of CHEAT_DEFINITIONS) {
      expect(cheat.code).toContain(cheat.primaryCode);
    }
  });

  it('all cheats have UI-ready content (name, description, and primary code)', () => {
    // Every cheat must have displayable content for the cheats UI tab.
    // If this fails, the cheat will appear blank or broken in the UI.
    for (const cheat of CHEAT_DEFINITIONS) {
      expect(cheat.name.trim().length, `Cheat "${cheat.primaryCode}" has an empty or whitespace-only name. The UI won't display it properly.`).toBeGreaterThan(0);
      expect(cheat.description.trim().length, `Cheat "${cheat.primaryCode}" has an empty or whitespace-only description. The UI won't display it properly.`).toBeGreaterThan(0);
      expect(cheat.primaryCode.trim().length, `Cheat "${cheat.name}" has an empty or whitespace-only primaryCode. The UI won't display it properly.`).toBeGreaterThan(0);
      // Verify the name is not just the primary code repeated
      expect(
        cheat.name.trim() !== cheat.primaryCode.trim(),
        `Cheat name "${cheat.name}" is identical to its primaryCode "${cheat.primaryCode}". Consider a more descriptive name for the UI.`,
      ).toBe(true);
    }
  });

  it('every cheat has a valid category', () => {
    const validCategories = new Set(CATEGORY_ORDER);
    for (const cheat of CHEAT_DEFINITIONS) {
      expect(
        validCategories.has(cheat.category),
        `Cheat "${cheat.primaryCode}" has invalid category "${cheat.category}".`,
      ).toBe(true);
    }
  });

  it('category labels are non-empty for all categories', () => {
    for (const cat of CATEGORY_ORDER) {
      const label = getCategoryLabel(cat);
      expect(label.length).toBeGreaterThan(0);
      expect(label.trim().length).toBeGreaterThan(0);
    }
  });

  it('category ordering is a valid permutation of all categories', () => {
    const ordered = [...CATEGORY_ORDER];
    const unique = [...new Set(ordered)];
    expect(ordered.length).toBe(unique.length);
    expect(ordered.sort().join(',')).toBe(unique.sort().join(','));
  });

  it('getCheatsByCategory groups all cheats and preserves count', () => {
    const grouped = getCheatsByCategory();
    let total = 0;
    for (const [_cat, cheats] of grouped) {
      total += cheats.length;
    }
    expect(total).toBe(CHEAT_DEFINITIONS.length);
  });

  it('getCheatsByCategory returns categories in defined order', () => {
    const grouped = getCheatsByCategory();
    const keys = [...grouped.keys()];
    expect(keys).toEqual(CATEGORY_ORDER);
  });

  it('all categories have at least one cheat', () => {
    const grouped = getCheatsByCategory();
    for (const [cat, cheats] of grouped) {
      expect(
        cheats.length,
        `Category "${cat}" ("${getCategoryLabel(cat)}") has no cheats.`,
      ).toBeGreaterThan(0);
    }
  });

  it('cheats within each category are sorted by primary code', () => {
    const grouped = getCheatsByCategory();
    for (const [_cat, cheats] of grouped) {
      for (let i = 1; i < cheats.length; i++) {
        expect(
          cheats[i].primaryCode.localeCompare(cheats[i - 1].primaryCode) >= 0,
          `Cheats in category "${_cat}" are not sorted by primary code.`,
        ).toBe(true);
      }
    }
  });

  it('every cheat has a category matching its type', () => {
    // Sanity: structure cheats should be in 'structures', bosses in 'bosses', etc.
    const structureCodes = new Set([
      'village', 'goblin', 'quest', 'mcdonalds', 'canies', 'shrine', 'ramen',
      'koi', 'tengu', 'monument', 'diner', 'fireworks', 'jackalope', 'moleman',
      'motelpool', 'gridiron', 'billboard', 'roadcrew', 'allstructures', 'clearroom',
    ]);
    const bossCodes = new Set(['freakdennis', 'freakerdennis', 'jasonstatham']);

    for (const cheat of CHEAT_DEFINITIONS) {
      const code = cheat.primaryCode.toLowerCase().trim();
      if (structureCodes.has(code)) {
        expect(cheat.category).toBe('structures');
      }
      if (bossCodes.has(code)) {
        expect(cheat.category).toBe('bosses');
      }
    }
  });

  it('all cheats have at least one usable alias for the input field', () => {
    // The UI lets players type cheat codes. Each cheat must have at least one
    // alias that works as an input. If aliases are empty, the cheat is unusable.
    for (const cheat of CHEAT_DEFINITIONS) {
      expect(cheat.aliases.length, `Cheat "${cheat.primaryCode}" has no aliases. Players can't activate this cheat.`).toBeGreaterThan(0);
      // The primary code must be a valid input (non-empty, trimmed)
      expect(cheat.aliases[0].trim().length, `Cheat "${cheat.name}" has an empty primary alias. Players can't activate this cheat.`).toBeGreaterThan(0);
    }
  });
});
