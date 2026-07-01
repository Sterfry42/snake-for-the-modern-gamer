import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { CHEAT_DEFINITIONS } from '../../cheats/cheatRegistry.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = __filename.slice(0, __filename.lastIndexOf('/'));

/**
 * Every cheat registered in CHEAT_DEFINITIONS must appear in the cheats UI tab.
 * This test guards against regressions where a cheat is added to the registry
 * but the UI code is modified to filter it out or skip rendering it.
 */
describe('Cheat UI coverage', () => {
  it('getCheatDefinitions maps all CHEAT_DEFINITIONS without filtering', () => {
    const skillTreePath = `${__dirname}/../skillTreeOverlay.ts`;
    const skillTreeContent = readFileSync(skillTreePath, 'utf-8');

    // Find the getCheatDefinitions method body
    const methodStart = skillTreeContent.indexOf('getCheatDefinitions()');
    expect(methodStart, 'getCheatDefinitions method not found in skillTreeOverlay.ts').toBeGreaterThan(-1);

    // Extract the method body (find the return statement)
    const returnStart = skillTreeContent.indexOf('return', methodStart);
    expect(returnStart, 'return statement not found in getCheatDefinitions').toBeGreaterThan(-1);

    // Find the end of the return statement (closing parenthesis + semicolon)
    const methodBody = skillTreeContent.slice(returnStart, skillTreeContent.indexOf('};', returnStart) + 2);

    // Verify it maps over CHEAT_DEFINITIONS
    expect(methodBody).toContain('CHEAT_DEFINITIONS');

    // Verify it does NOT filter (a filter could exclude cheats)
    expect(methodBody).not.toContain('.filter(');

    // Verify it maps all required fields
    expect(methodBody).toContain('name');
    expect(methodBody).toContain('code');
    expect(methodBody).toContain('primaryCode');
    expect(methodBody).toContain('description');
  });

  it('all cheat primary codes are rendered in the UI loop', () => {
    const skillTreePath = `${__dirname}/../skillTreeOverlay.ts`;
    const skillTreeContent = readFileSync(skillTreePath, 'utf-8');

    // Find the section where cheats are rendered (look for the cheats rendering block)
    const cheatsRenderStart = skillTreeContent.indexOf('const cheats = this.getCheatDefinitions()');
    expect(
      cheatsRenderStart,
      'Cheat rendering block not found in skillTreeOverlay.ts',
    ).toBeGreaterThan(-1);

    // Verify the rendering loop iterates over all cheats
    const cheatsRenderBlock = skillTreeContent.slice(
      cheatsRenderStart,
      skillTreeContent.indexOf('this.setStructuredContentHeight(content, y + 10)', cheatsRenderStart),
    );

    // Verify it iterates over all cheat definitions
    expect(cheatsRenderBlock).toContain('for (const cheat of cheats)');

    // Verify each cheat is rendered with its name
    expect(cheatsRenderBlock).toContain('cheat.name');

    // Verify each cheat is rendered with its description
    expect(cheatsRenderBlock).toContain('cheat.description');

    // Verify each cheat has an enable button with its primaryCode
    expect(cheatsRenderBlock).toContain('cheat.primaryCode');
  });

  it('all cheats from the registry are accounted for in the UI', () => {
    // This is a sanity check: the UI should render exactly CHEAT_DEFINITIONS.length cheats
    // Since getCheatDefinitions() is a simple .map() without filtering, the count should match
    const expectedCount = CHEAT_DEFINITIONS.length;
    expect(expectedCount).toBeGreaterThan(0);

    // Verify all cheats have displayable content
    for (const cheat of CHEAT_DEFINITIONS) {
      expect(cheat.name.length, `Cheat "${cheat.primaryCode}" has an empty name`).toBeGreaterThan(0);
      expect(cheat.description.length, `Cheat "${cheat.primaryCode}" has an empty description`).toBeGreaterThan(0);
    }
  });

  it('cheat UI labels and buttons reference all cheat primary codes', () => {
    const skillTreePath = `${__dirname}/../skillTreeOverlay.ts`;
    const skillTreeContent = readFileSync(skillTreePath, 'utf-8');

    // Find the enable button creation for cheats
    const buttonSectionStart = skillTreeContent.indexOf('id: `cheat-${cheat.primaryCode}`');
    expect(
      buttonSectionStart,
      'Cheat enable button not found in skillTreeOverlay.ts',
    ).toBeGreaterThan(-1);

    // Verify the button onClick uses the cheat's primaryCode
    const buttonSectionEnd = skillTreeContent.indexOf(
      'y += 36;',
      buttonSectionStart,
    );
    const buttonSection = skillTreeContent.slice(buttonSectionStart, buttonSectionEnd);

    expect(buttonSection).toContain('cheat.primaryCode');
    expect(buttonSection).toContain('applyCheatCode');
  });
});
