import { describe, expect, it } from 'vitest';
import {
  CHEAT_DEFINITIONS,
  findCheatByCode,
  getAllCheatAliases,
} from '../cheatRegistry.js';

describe('Cheat registry', () => {
  it('has at least 20 cheats defined', () => {
    expect(CHEAT_DEFINITIONS.length).toBeGreaterThanOrEqual(20);
  });

  it('has exactly 36 cheats defined', () => {
    expect(CHEAT_DEFINITIONS.length).toBe(36);
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
});
