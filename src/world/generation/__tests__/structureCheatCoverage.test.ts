import { describe, expect, it } from 'vitest';
import { CHEAT_DEFINITIONS, getAllCheatAliases } from '../../../cheats/cheatRegistry.js';

/**
 * Every structure that can be generated in the world must have a dedicated
 * cheat that lets the player spawn it. This test guards against regressions
 * where a new structure is added but the corresponding cheat is forgotten.
 *
 * To add a new structure cheat:
 *   1. Add an entry to CHEAT_DEFINITIONS in src/cheats/cheatRegistry.ts
 *   2. Implement the spawn logic in snakeScene.applyCheatCode()
 *   3. Register the primary code below in STRUCTURE_SPAWN_CODES
 */

/**
 * Every structure that can be spawned in a room must have a corresponding
 * cheat registered in the cheat registry. Each entry maps the cheat primary
 * code to a human-readable structure name for better test output.
 */
const STRUCTURE_SPAWN_CODES: ReadonlyArray<{ primaryCode: string; structureName: string }> = [
  { primaryCode: 'village', structureName: 'village' },
  { primaryCode: 'goblin', structureName: 'goblin camp' },
  { primaryCode: 'quest', structureName: 'quest house' },
  { primaryCode: 'mcdonalds', structureName: 'Snake McDonalds' },
  { primaryCode: 'shrine', structureName: 'shrine' },
  { primaryCode: 'ramen', structureName: 'ramen stand' },
  { primaryCode: 'koi', structureName: 'koi pond' },
  { primaryCode: 'tengu', structureName: 'tengu camp' },
  { primaryCode: 'monument', structureName: 'roadside monument' },
  { primaryCode: 'diner', structureName: 'all-nite diner' },
  { primaryCode: 'fireworks', structureName: 'firework stand' },
  { primaryCode: 'jackalope', structureName: 'jackalope lodge' },
  { primaryCode: 'moleman', structureName: 'moleman dig site' },
  { primaryCode: 'motelpool', structureName: 'motel pool' },
  { primaryCode: 'gridiron', structureName: 'gridiron yard' },
  { primaryCode: 'billboard', structureName: 'billboard oracle' },
  { primaryCode: 'roadcrew', structureName: 'road crew' },
];

describe('Structure cheat coverage', () => {
  it('every generated structure has a dedicated spawn cheat', () => {
    const allAliases = getAllCheatAliases();

    for (const { primaryCode, structureName } of STRUCTURE_SPAWN_CODES) {
      const normalized = primaryCode.toLowerCase().trim();
      expect(
        allAliases.has(normalized),
        `Structure "${structureName}" (cheat code "${primaryCode}") has no corresponding cheat in the registry. Add it to CHEAT_DEFINITIONS in src/cheats/cheatRegistry.ts.`,
      ).toBe(true);
    }
  });

  it('every structure cheat appears in CHEAT_DEFINITIONS', () => {
    const cheatCodes = new Set<string>();
    for (const cheat of CHEAT_DEFINITIONS) {
      cheatCodes.add(cheat.primaryCode.toLowerCase().trim());
    }

    for (const { primaryCode, structureName } of STRUCTURE_SPAWN_CODES) {
      const normalized = primaryCode.toLowerCase().trim();
      expect(
        cheatCodes.has(normalized),
        `Structure "${structureName}" (cheat code "${primaryCode}") is not registered in CHEAT_DEFINITIONS.`,
      ).toBe(true);
    }
  });

  it('all structure cheats have matching aliases', () => {
    // Verify that every primary code listed is also present as the first alias
    for (const { primaryCode, structureName } of STRUCTURE_SPAWN_CODES) {
      const cheat = CHEAT_DEFINITIONS.find(
        (c) => c.primaryCode.toLowerCase().trim() === primaryCode.toLowerCase().trim(),
      );
      expect(cheat, `No cheat definition found for structure "${structureName}" (${primaryCode})`).toBeDefined();
      expect(cheat?.aliases[0]).toBe(cheat?.primaryCode);
    }
  });
});
