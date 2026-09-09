import { describe, expect, it } from 'vitest';
import { createBaseActor } from '../actorFactory.js';
import { selectActorVoiceLine } from '../actorVoice.js';

describe('actor civic barks', () => {
  it('lets residents produce campaign-aware barks', () => {
    const actor = createBaseActor({
      id: 'actor:test:resident',
      kind: 'civilian',
      role: 'resident',
      species: 'human',
      thickness: 'medium',
      displayName: 'Nina',
      townId: 'eastmere',
    });

    const line = selectActorVoiceLine({
      actor,
      biomeId: 'verdigris-basin',
      dangerLevel: 2,
      playerHealth: 3,
      playerMaxHealth: 3,
      snakeLength: 12,
      flags: {},
      recentEvents: [],
      civic: {
        townId: 'eastmere',
        townName: 'Eastmere',
        currentMayorName: 'Mayor Jenkins',
        platformLabel: 'People First',
        tags: ['active-election'],
      },
      random: () => 0,
    });

    expect(line.id).toBe('actor-civic-resident-campaign');
  });

  it('lets residents produce Mayor-aware barks', () => {
    const actor = createBaseActor({
      id: 'actor:test:resident',
      kind: 'civilian',
      role: 'resident',
      species: 'human',
      thickness: 'medium',
      displayName: 'Nina',
      personality: ['petty'],
      townId: 'eastmere',
    });

    const line = selectActorVoiceLine({
      actor,
      biomeId: 'verdigris-basin',
      dangerLevel: 2,
      playerHealth: 3,
      playerMaxHealth: 3,
      snakeLength: 12,
      flags: {},
      recentEvents: [],
      civic: {
        townId: 'eastmere',
        townName: 'Eastmere',
        currentMayorName: 'Snake',
        platformLabel: 'Law & Order',
        tags: ['player-mayor'],
      },
      random: () => 0,
    });

    expect(line.id).toBe('actor-civic-resident-player-mayor-petty');
    expect(line.text).toContain('Did not vote');
  });
});
