import { describe, expect, it } from 'vitest';
import { decideActorBrain } from '../actorBrains.js';
import type { Actor, ActorRole } from '../actorTypes.js';

function actorWithRole(role: ActorRole): Actor {
  return {
    id: `actor:${role}`,
    displayName: role,
    role,
    kind: 'shopkeeper',
    species: 'human',
    personality: [],
    currentRoomId: '0,0,0',
    mood: {
      anger: 0,
      fear: 0,
      affection: 0,
      trust: 0,
      curiosity: 0,
      hunger: 0,
      greed: 0,
      grief: 0,
      stress: 0,
    },
    needs: {
      food: 0,
      safety: 0,
      money: 0,
      social: 0,
      rest: 0,
      duty: 0,
      curiosity: 0,
      revenge: 0,
      faith: 0,
      status: 0,
    },
    opinions: {},
    relationships: [],
    memory: [],
    flags: {},
    hostility: 'friendly',
    thickness: 'medium',
  };
}

describe('actor brains', () => {
  it('anchors new physical merchant roles by default', () => {
    for (const role of ['equipmentMerchant', 'potionMaker', 'butcher', 'cardDealer'] as const) {
      const decision = decideActorBrain({
        actor: actorWithRole(role),
        body: {
          relationshipId: `resident:${role}`,
          actorId: `actor:${role}`,
          position: { x: 5, y: 5 },
          anchor: { x: 5, y: 5 },
          stationary: false,
          wanderRadius: 4,
        },
        threats: [],
        socialTargets: [],
        random: () => 0.5,
      });

      expect(decision.kind).toBe('hold');
    }
  });
});
