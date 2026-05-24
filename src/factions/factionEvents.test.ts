import { FactionEventSystem } from './factionEvents.js';

describe('FactionEventSystem', () => {
  it('creates faction events from pickpocket world events', () => {
    const factions = new FactionEventSystem();
    const events = factions.createEventsFromWorldEvent({
      id: 'event:pick:1',
      type: 'pickpocket',
      roomId: '0,0,0',
      targetActorIds: ['actor:shop'],
      witnessActorIds: ['actor:guard'],
      severity: 36,
      loudness: 12,
      tags: ['pickpocket', 'guild', 'crime'],
      summary: 'A pocket was legally surprised.',
      createdAtRoomNumber: 8,
      createdAtMs: 100,
    });

    expect(events[0]?.type).toBe('guild-exposure');
    expect(events[0]?.factionIds).toContain('thieves-guild');
    expect(factions.getEventsForActor({
      id: 'actor:guard',
      kind: 'guard',
      role: 'guard',
      species: 'human',
      thickness: 'medium',
      displayName: 'Nina',
      personality: [],
      mood: { fear: 0, anger: 0, trust: 0, affection: 0, greed: 0, hunger: 0, curiosity: 0, grief: 0, stress: 0 },
      needs: { food: 0, safety: 0, money: 0, social: 0, rest: 0, duty: 0, curiosity: 0, revenge: 0, faith: 0, status: 0 },
      opinions: {},
      relationships: [],
      memory: [],
      flags: {},
      factionId: 'guards',
    }).length).toBeGreaterThan(0);
  });

  it('moves events through aftermath and resolved phases', () => {
    const factions = new FactionEventSystem();
    const event = factions.createEvent({
      type: 'raid-warning',
      factionIds: ['bandits', 'guards'],
      roomId: '0,0,0',
      createdAt: 5,
      expiresAt: 6,
      severity: 30,
    });

    factions.tick(6);
    expect(factions.getEvents()[0]?.id).toBe(event.id);
    expect(factions.getEvents()[0]?.phase).toBe('aftermath');

    factions.tick(26);
    expect(factions.getEvents()[0]?.phase).toBe('resolved');
  });
});
