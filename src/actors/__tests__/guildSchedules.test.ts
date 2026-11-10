import { describe, expect, it } from 'vitest';
import { ActorRegistry } from '../actorRegistry.js';
import { ActorSystem } from '../actorSystem.js';
import { selectScheduleGoal } from '../actorPresence.js';
import type { TownStructure } from '../../world/town.js';

const guild = 'layer:townInterior:seaside:thievesGuild';
const alley = '1,0,0';

describe('thieves guild schedules', () => {
  it('keeps the guild contact on duty in the guild during every day phase', () => {
    const registry = new ActorRegistry();
    const contact = registry.ensureTownResidentActor({
      residentId: 'contact',
      name: 'Guild Contact',
      townId: 'seaside',
      role: 'thiefContact',
      factionId: 'thieves-guild',
      currentRoomId: guild,
      homeRoomId: alley,
      workRoomId: guild,
    });

    for (const dayPhase of ['dawn', 'day', 'dusk', 'night'] as const) {
      expect(selectScheduleGoal(contact, { roomNumber: 20, dayPhase })).toMatchObject({
        kind: 'work',
        roomId: guild,
      });
    }
    expect(contact.schedule?.permanentDuty).toBe(true);
  });

  it('sends rank-and-file thieves outside by day and into the guild by night', () => {
    const registry = new ActorRegistry();
    const thief = registry.ensureTownResidentActor({
      residentId: 'thief',
      name: 'Thief',
      townId: 'seaside',
      role: 'thief',
      factionId: 'thieves-guild',
      currentRoomId: alley,
      homeRoomId: alley,
      workRoomId: guild,
    });

    expect(selectScheduleGoal(thief, { roomNumber: 20, dayPhase: 'day' })).toMatchObject({
      kind: 'wander',
      roomId: alley,
    });
    expect(selectScheduleGoal(thief, { roomNumber: 21, dayPhase: 'night' })).toMatchObject({
      kind: 'socialize',
      roomId: guild,
    });
  });

  it('replaces legacy resident routines when an existing contact is synced again', () => {
    const registry = new ActorRegistry();
    const args = {
      residentId: 'contact',
      name: 'Guild Contact',
      townId: 'seaside',
      role: 'thiefContact' as const,
      factionId: 'thieves-guild',
      currentRoomId: guild,
      homeRoomId: alley,
      workRoomId: guild,
    };
    const old = registry.ensureTownResidentActor(args);
    registry.update(old.id, (current) => ({
      ...current,
      schedule: {
        policyId: 'town-resident',
        homeRoomId: alley,
        workRoomId: guild,
      },
      scheduleGoal: { kind: 'sleep', roomId: alley, priority: 20 },
    }));
    const updated = registry.ensureTownResidentActor(args);

    expect(updated.schedule?.policyId).toBe('thieves-guild-contact');
    expect(updated.scheduleGoal).toBeUndefined();
    expect(selectScheduleGoal(updated, { roomNumber: 20, dayPhase: 'night' })).toMatchObject({
      kind: 'work',
      roomId: guild,
    });
  });

  it('binds the regular thieves night shift to the actual guild interior', () => {
    const actors = new ActorSystem();
    actors.syncTown(
      {
        id: 'seaside',
        buildings: [
          {
            kind: 'guildAccess',
            templateId: 'thievesGuild',
            ownerResidentId: 'contact',
          },
        ],
        residents: [
          {
            id: 'contact',
            name: 'Guild Contact',
            role: 'thiefContact',
            factionId: 'thieves-guild',
            townId: 'seaside',
            homeRoomId: alley,
            workRoomId: alley,
            x: 4,
            y: 4,
          },
          {
            id: 'thief',
            name: 'Thief',
            role: 'thief',
            factionId: 'thieves-guild',
            townId: 'seaside',
            homeRoomId: alley,
            workRoomId: alley,
            x: 5,
            y: 4,
          },
        ],
      } as TownStructure,
      alley,
    );
    const contact = actors.getActor('town:seaside:thiefContact:contact');
    const thief = actors.getActor('town:seaside:thief:thief');
    expect(contact?.schedule?.workRoomId).toBe(guild);
    expect(thief?.schedule?.workRoomId).toBe(guild);
    expect(selectScheduleGoal(thief!, { roomNumber: 20, dayPhase: 'night' }).roomId).toBe(guild);
  });
});
