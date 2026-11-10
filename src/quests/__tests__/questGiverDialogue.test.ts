import { describe, expect, it } from 'vitest';
import { contextualQuestPages } from '../questGiverDialogue.js';
import { getQuestDialogue } from '../questDialogue.js';

const errand = {
  id: 'hunt-rabbit',
  label: 'Rabbit Trouble',
  description: 'Hunt 3 rabbits in the nearby woods.',
};

describe('role-aware quest dialogue', () => {
  it('gives guards and thieves different reasons to ask about the same objective', () => {
    const guard = contextualQuestPages(errand, { role: 'guard' }, []);
    const thief = contextualQuestPages(errand, { role: 'thiefContact' }, []);
    const wizard = contextualQuestPages(errand, { role: 'wizard' }, []);
    expect(guard.join(' ')).toContain('watch');
    expect(thief.join(' ')).toContain('discretion');
    expect(wizard.join(' ')).toContain('experimental curse');
    expect(guard).not.toEqual(thief);
    for (const pages of [guard, thief, wizard]) {
      expect(pages.join(' ')).toContain(errand.description);
    }
  });

  it('avoids assigning somebody else\'s personal memories to a generic house NPC', () => {
    const personalLore = [
      'My clutch-brother vanished before dawn.',
      'I saw it happen.',
    ];
    const pages = contextualQuestPages(errand, {
      role: 'sage',
      locationName: 'Verdigris Basin',
    }, personalLore);
    expect(pages.join(' ')).not.toContain('clutch-brother');
    expect(pages[0]).toContain('Verdigris Basin');
    expect(pages.join(' ')).toContain('rabbits');
  });

  it('preserves authored narratives for explicitly anchored story contacts', () => {
    const authored = ['Here is the history only I know.', 'Bring me my ledger.'];
    const pages = contextualQuestPages(errand, { role: 'civicOfficial', preserveAuthored: true }, authored);
    expect(pages.slice(1, 3)).toEqual(authored);
    expect(pages[0]).toContain('town');
    expect(pages.at(-1)).toContain('paperwork');
  });

  it('uses the role voice in the actual quest-dialogue lookup while keeping old callers compatible', () => {
    const original = getQuestDialogue(errand);
    const voiced = getQuestDialogue(errand, { role: 'guard' });
    expect(original.pages.length).toBeGreaterThan(0);
    expect(voiced.pages.join(' ')).toContain('watch');
    expect(voiced.pages.join(' ')).toContain(errand.description);
  });
});
