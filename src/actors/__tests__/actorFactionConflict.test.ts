import { describe, expect, it } from 'vitest';
import wolf from '../../animals/definitions/wolf.js';
import possum from '../../animals/definitions/possum.js';
import { actorPrimaryFaction, relationBetweenFactions } from '../../factions/factionRelations.js';
import { createActorFromAnimal } from '../actorFactory.js';
import { createActorPresence, findFactionConflictGoals } from '../actorPresence.js';
import type { Actor } from '../actorTypes.js';

function animalActor(kind: 'wolf' | 'possum', id: string, x: number, y: number): Actor {
  const definition = kind === 'wolf' ? wolf : possum;
  const actor = createActorFromAnimal(
    {
      animalId: id,
      animalType: kind,
      animalName: definition.name,
      roomId: '0,0,0',
      currentHearts: definition.maxHearts,
      maxHearts: definition.maxHearts,
    },
    definition,
  );
  actor.presence = createActorPresence({
    roomId: '0,0,0',
    position: { x, y },
  });
  return actor;
}

describe('predator and prey faction conflict', () => {
  it('maps animal actors onto the canonical faction table', () => {
    const relation = relationBetweenFactions(
      actorPrimaryFaction(animalActor('wolf', 'wolf:1', 2, 2)),
      actorPrimaryFaction(animalActor('possum', 'possum:1', 5, 5)),
    );
    expect(relation).toBe('hostile');
  });

  it('gives predators a faction-conflict attack goal when prey share the room', () => {
    const wolf = animalActor('wolf', 'wolf:1', 2, 2);
    const possum = animalActor('possum', 'possum:1', 5, 5);
    const updates = findFactionConflictGoals([wolf, possum]);
    const wolfUpdate = updates.find((entry) => entry.actorId === wolf.id);
    expect(wolfUpdate).toBeDefined();
    expect(wolfUpdate?.goal.kind).toBe('attackActor');
    expect(wolfUpdate?.goal.targetActorId).toBe(possum.id);
    expect(wolfUpdate?.goal.reason).toBe('faction-conflict');
  });

  it('normalizes legacy dotted faction ids from old saves', () => {
    const wolf = animalActor('wolf', 'wolf:legacy', 2, 2);
    const possum = animalActor('possum', 'possum:legacy', 5, 5);
    wolf.factionId = 'wildlife.predator';
    possum.factionId = 'wildlife.prey';
    const relation = relationBetweenFactions(
      actorPrimaryFaction(wolf),
      actorPrimaryFaction(possum),
    );
    expect(relation).toBe('hostile');
  });

  it('ignores prey in other rooms', () => {
    const wolf = animalActor('wolf', 'wolf:1', 2, 2);
    const possum = animalActor('possum', 'possum:1', 5, 5);
    possum.currentRoomId = '1,0,0';
    if (possum.presence) possum.presence.roomId = '1,0,0';
    const updates = findFactionConflictGoals([wolf, possum]);
    expect(updates.find((entry) => entry.actorId === wolf.id)).toBeUndefined();
  });
});
