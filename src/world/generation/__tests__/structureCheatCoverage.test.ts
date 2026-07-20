import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  getAllCheatAliases,
  getCheatsByCategory,
  type CheatDefinition,
} from '../../../cheats/cheatRegistry.js';

/**
 * Every structure that can be generated in the world must have a dedicated
 * cheat that lets the player spawn it. This test guards against regressions
 * where a new structure is added but the corresponding cheat is forgotten,
 * or where a cheat is registered but never implemented.
 *
 * To add a new structure cheat:
 *   1. Add an entry to CHEAT_DEFINITIONS in src/cheats/cheatRegistry.ts
 *      (name must start with "SPAWN ")
 *   2. Implement the spawn logic in snakeScene.applyCheatCode()
 */

/**
 * Filter CHEAT_DEFINITIONS to find all structure-spawning cheats.
 * Structure cheats have category 'structures' and primary codes listed in
 * KNOWN_STRUCTURE_CODES. This distinguishes them from boss cheats (freakdennis,
 * freakerdennis, jasonstatham) which also start with "SPAWN" but are not
 * world structures.
 */
function getStructureCheats(): ReadonlyArray<CheatDefinition> {
  const structures = getCheatsByCategory().get('structures')!;
  return structures.filter((c) => KNOWN_STRUCTURE_CODES.has(c.primaryCode.toLowerCase().trim()));
}

/**
 * Map of structure cheat primary code -> human-readable name for test output.
 * This is the source of truth for what structures the world can generate.
 * If a new structure is added to the world, add it here.
 */
const KNOWN_STRUCTURE_CODES: ReadonlySet<string> = new Set([
  'village',
  'goblin',
  'quest',
  'mcdonalds',
  'canies',
  'shrine',
  'ramen',
  'koi',
  'tengu',
  'monument',
  'diner',
  'fireworks',
  'jackalope',
  'moleman',
  'motelpool',
  'gridiron',
  'billboard',
  'roadcrew',
]);

describe('Structure cheat coverage', () => {
  it('every known structure has a registered cheat', () => {
    const allAliases = getAllCheatAliases();

    for (const primaryCode of KNOWN_STRUCTURE_CODES) {
      const normalized = primaryCode.toLowerCase().trim();
      expect(
        allAliases.has(normalized),
        `Structure "${primaryCode}" has no corresponding cheat in the registry. Add it to CHEAT_DEFINITIONS in src/cheats/cheatRegistry.ts.`,
      ).toBe(true);
    }
  });

  it('every registered structure cheat is known', () => {
    const structureCheats = getStructureCheats();

    for (const cheat of structureCheats) {
      const normalized = cheat.primaryCode.toLowerCase().trim();
      expect(
        KNOWN_STRUCTURE_CODES.has(normalized),
        `Structure cheat "${cheat.primaryCode}" ("${cheat.name}") is registered but not in KNOWN_STRUCTURE_CODES. If this is a new structure, add it to the set in the test file.`,
      ).toBe(true);
    }
  });

  it('all structure cheats are implemented in snakeScene', () => {
    const structureCheats = getStructureCheats();
    const snakeScenePath = fileURLToPath(new URL('../../../scenes/snakeScene.ts', import.meta.url));
    const snakeSceneContent = readFileSync(snakeScenePath, 'utf-8');

    for (const cheat of structureCheats) {
      const normalized = cheat.primaryCode.toLowerCase().trim();
      // Check for the code comparison used in snakeScene.applyCheatCode
      const hasImplementation =
        snakeSceneContent.includes(`code === '${normalized}'`) ||
        snakeSceneContent.includes(`code === "${normalized}"`);
      expect(
        hasImplementation,
        `Structure cheat "${cheat.primaryCode}" ("${cheat.name}") is registered but not implemented in snakeScene.applyCheatCode(). Add the spawn logic there.`,
      ).toBe(true);
    }
  });

  it('all structure cheats have matching aliases (primaryCode is first alias)', () => {
    const structureCheats = getStructureCheats();

    for (const cheat of structureCheats) {
      expect(cheat.aliases[0]).toBe(cheat.primaryCode);
    }
  });
});
