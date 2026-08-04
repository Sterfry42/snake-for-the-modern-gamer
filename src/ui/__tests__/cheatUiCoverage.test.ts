import { describe, expect, it } from 'vitest';
import { CHEAT_DEFINITIONS, getCheatsByCategory } from '../../cheats/cheatRegistry.js';

/**
 * Every cheat registered in CHEAT_DEFINITIONS must have valid displayable content.
 * This test guards against regressions where a cheat is added to the registry
 * but has an empty name or description.
 */
describe('Cheat UI coverage', () => {
  it('all cheats from the registry are accounted for', () => {
    const grouped = getCheatsByCategory();
    let total = 0;
    for (const [, cheats] of grouped) {
      total += cheats.length;
    }
    expect(total).toBe(CHEAT_DEFINITIONS.length);

    // Verify all cheats have displayable content
    for (const cheat of CHEAT_DEFINITIONS) {
      expect(cheat.name.length, `Cheat "${cheat.primaryCode}" has an empty name`).toBeGreaterThan(
        0,
      );
      expect(
        cheat.description.length,
        `Cheat "${cheat.primaryCode}" has an empty description`,
      ).toBeGreaterThan(0);
    }
  });
});
