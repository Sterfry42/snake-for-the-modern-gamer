import { describe, expect, it } from 'vitest';
import { createPersonalityDatingScenario } from './datingScenarioLibrary.js';
import type { RelationshipCandidateProfile } from './relationshipTypes.js';
import type { FactionId } from '../factions/factions.js';

const profile: RelationshipCandidateProfile = {
  id: 'resident:test',
  displayName: 'Marta',
  species: 'human',
  portraitId: 'sage-1',
  factionId: 'human-town' as FactionId,
};

describe('dating scenario library', () => {
  it('keeps required role scenarios from leaking to unrelated roles', () => {
    const event = createPersonalityDatingScenario(profile, 'talk', 'deadpan', () => 0, {
      actorRole: 'resident',
      contextTags: ['crime', 'faction'],
    });

    expect(event.scenarioId).not.toBe('talk-guard-law-mercy');
  });

  it('does not emit known they-plus-singular-verb narration bugs', () => {
    const event = createPersonalityDatingScenario(profile, 'date', 'sharp', () => 0.99, {
      actorRole: 'resident',
    });
    const text = event.pages.map((page) => page.line).join('\n');

    expect(text).not.toMatch(/They (mutters|watches|exhales|smooths|narrows)\b/);
  });
});
