import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { CHEAT_DEFINITIONS, getCheatsByCategory } from '../../cheats/cheatRegistry.js';

/**
 * Every cheat registered in CHEAT_DEFINITIONS must appear in the cheats UI tab.
 * This test guards against regressions where a cheat is added to the registry
 * but the UI code is modified to filter it out or skip rendering it.
 */
describe('Cheat UI coverage', () => {
  it('buildCheatsCards uses getCheatsByCategory to render all cheats', () => {
    const skillTreePath = fileURLToPath(new URL('../skillTreeOverlay.ts', import.meta.url));
    const skillTreeContent = readFileSync(skillTreePath, 'utf-8');

    // Verify the import for getCheatsByCategory exists
    expect(skillTreeContent).toContain('getCheatsByCategory');

    // Find the buildCheatsCards method
    const methodStart = skillTreeContent.indexOf('buildCheatsCards(');
    expect(methodStart, 'buildCheatsCards method not found in skillTreeOverlay.ts').toBeGreaterThan(
      -1,
    );

    // Extract the method body (ends at the next private method)
    const nextMethod = skillTreeContent.indexOf('private buildControlsCards', methodStart);
    expect(nextMethod, 'Next method marker not found').toBeGreaterThan(-1);
    const methodBody = skillTreeContent.slice(methodStart, nextMethod);

    // Verify it iterates over categories and cheats
    expect(methodBody).toContain('getCheatsByCategory()');
    expect(methodBody).toContain('for (const cheat of cheats)');

    // Verify each cheat is rendered with its name
    expect(methodBody).toContain('cheat.name');

    // Verify each cheat is rendered with its description
    expect(methodBody).toContain('cheat.description');

    // Verify each cheat has an enable button with its primaryCode
    expect(methodBody).toContain('cheat.primaryCode');
  });

  it('all cheats from the registry are accounted for in the UI', () => {
    const grouped = getCheatsByCategory();
    let total = 0;
    for (const [_cat, cheats] of grouped) {
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

  it('cheat UI labels and buttons reference all cheat primary codes', () => {
    const skillTreePath = fileURLToPath(new URL('../skillTreeOverlay.ts', import.meta.url));
    const skillTreeContent = readFileSync(skillTreePath, 'utf-8');

    // Find the enable button creation for cheats
    const buttonSectionStart = skillTreeContent.indexOf('id: `cheat-${cheat.primaryCode}`');
    expect(
      buttonSectionStart,
      'Cheat enable button not found in skillTreeOverlay.ts',
    ).toBeGreaterThan(-1);

    // Verify the button onClick uses the cheat's primaryCode
    const buttonSectionEnd = skillTreeContent.indexOf('y += 36;', buttonSectionStart);
    const buttonSection = skillTreeContent.slice(buttonSectionStart, buttonSectionEnd);

    expect(buttonSection).toContain('cheat.primaryCode');
    expect(buttonSection).toContain('applyCheatCode');
  });
});
