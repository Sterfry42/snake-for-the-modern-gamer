import { describe, expect, it } from 'vitest';
import { contextualQuestPages, questGiverStatusLine } from '../questGiverDialogue.js';
import { getQuestDialogue } from '../questDialogue.js';
import { i18n } from '../../i18n/i18nManager.js';

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
    expect(voiced.pages.join(' ')).toContain(erra
  it('gives generated house NPCs stable, distinct personalities and status lines', () => {
    const aur = { role: 'sage', giverName: 'Aurex' };
    const cyrene = { role: 'sage', giverName: 'Cyrene' };
    const first = contextualQuestPages(errand, aur, []);
    expect(contextualQuestPages(errand, aur, [])).toEqual(first);
    expect(contextualQuestPages(errand, cyrene, [])).not.toEqual(first);
    expect(questGiverStatusLine(aur, 'none')).not.toBe(questGiverStatusLine(cyrene, 'none'));
    expect(questGiverStatusLine(aur, 'active', errand.label)).toContain(errand.label);
    expect(questGiverStatusLine(aur, 'completed', errand.label)).toContain(errand.label);
  });
nd.description);
  });
  it('preserves localized authored pages when an untranslated role voice is requested', () => {
    const originalLanguage = i18n.getCurrentLanguage();
    try {
      i18n.setLanguage('es');
      expect(getQuestDialogue(errand, { role: 'wizard' })).toEqual(getQuestDialogue(errand));
      i18n.setLanguage('fr');
      expect(getQuestDialogue(errand, { role: 'guard' })).toEqual(getQuestDialogue(errand));
    } finally {
      i18n.setLanguage(originalLanguage);
    }
  });

});
