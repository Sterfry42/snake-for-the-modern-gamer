import { describe, expect, it } from 'vitest';
import { storyQuestConsequence } from '../storyQuestConsequences.js';

describe('story quest consequence catalog', () => {
  it('pays the wizard route but damages morality and goblin relations', () => {
    const delivered = storyQuestConsequence('crystal-clause', 'deliver');
    expect(delivered?.score).toBe(350);
    expect(delivered?.karma).toBeLessThan(0);
    expect(delivered?.factionChanges).toContainEqual({
      id: 'goblin-camps',
      amount: -25,
    });
  });

  it('restores prisoners and rewards reporting', () => {
    const report = storyQuestConsequence('crystal-clause', 'report');
    expect(report?.releaseCaptives).toBe(true);
    expect(report?.wizardReported).toBe(true);
    expect(report?.karma).toBeGreaterThan(0);
    expect(report?.score).toBeLessThan(storyQuestConsequence('crystal-clause', 'deliver')!.score!);
  });

  it('grants a real ward contract through the goblin follow-up', () => {
    expect(storyQuestConsequence('crystal-aftermath', 'reparation')?.wallWards).toBe(1);
    expect(storyQuestConsequence('crystal-clause', 'nonsense')).toBeUndefined();
  });
});
