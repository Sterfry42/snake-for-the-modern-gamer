import { describe, expect, it } from 'vitest';
import { ROLE_CONTEXT_TALK_VOICE } from './roleContextVoice.js';

describe('role context voice', () => {
  it('includes relationship-aware normal dialogue for non-generic town roles', () => {
    const bartender = ROLE_CONTEXT_TALK_VOICE.find(
      (entry) => entry.id === 'role-talk-bartender-estranged-memory',
    );
    const cardDealer = ROLE_CONTEXT_TALK_VOICE.find(
      (entry) => entry.id === 'role-talk-carddealer-lover-risk',
    );

    expect(bartender?.roles).toContain('bartender');
    expect(bartender?.relationshipStages).toEqual(
      expect.arrayContaining(['heartbroken', 'estranged', 'hostile']),
    );
    expect(bartender?.tags).toEqual(expect.arrayContaining(['romance', 'role-context']));

    expect(cardDealer?.roles).toContain('cardDealer');
    expect(cardDealer?.relationshipStages).toEqual(
      expect.arrayContaining(['dating', 'lover', 'married']),
    );
    expect(cardDealer?.tags).toEqual(expect.arrayContaining(['romance', 'cards', 'role-context']));
  });
});
