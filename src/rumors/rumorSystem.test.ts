import { RumorSystem } from './rumorSystem.js';

describe('RumorSystem', () => {
  it('creates distorted rumors from severe world events', () => {
    const rumors = new RumorSystem();
    const rumor = rumors.createFromWorldEvent(
      {
        id: 'event:eaten:1',
        type: 'humanoid-eaten',
        roomId: '0,0,0',
        sourceActorId: 'snake',
        targetActorIds: ['bandit:1'],
        witnessActorIds: ['guard:1'],
        severity: 70,
        loudness: 45,
        tags: ['combat', 'eaten', 'humanoid', 'bandit'],
        summary: 'A bandit was eaten by the west road.',
        createdAtRoomNumber: 12,
        createdAtMs: 100,
      },
      'eastmere',
    );

    expect(rumor?.type).toBe('faction');
    expect(rumor?.summary).toContain('bandit');
    expect(rumor?.summary).not.toBe('A bandit was eaten by the west road.');
    expect(rumor?.knownByActorIds).toContain('guard:1');
    expect(rumors.getRecent()[0]?.id).toBe(rumor?.id);
  });

  it('tracks which actors know a rumor', () => {
    const rumors = new RumorSystem();
    const rumor = rumors.createFromWorldEvent(
      {
        id: 'event:crime:1',
        type: 'town-crime',
        roomId: '0,0,0',
        targetActorIds: [],
        witnessActorIds: [],
        severity: 40,
        loudness: 10,
        tags: ['crime', 'town'],
        summary: 'A shop window was broken.',
        createdAtRoomNumber: 4,
        createdAtMs: 100,
      },
      'eastmere',
    );

    rumors.rememberForActor(rumor!.id, 'actor:nina');

    expect(rumors.getKnownByActor('actor:nina')[0]?.id).toBe(rumor?.id);
  });

  it('does not turn ask-around conversations into meta-rumors', () => {
    const rumors = new RumorSystem();
    const rumor = rumors.createFromWorldEvent(
      {
        id: 'event:conversation:1',
        type: 'actor-asked-around',
        roomId: '0,0,0',
        sourceActorId: 'actor:ilyra',
        targetActorIds: [],
        witnessActorIds: ['actor:aurex'],
        severity: 50,
        loudness: 50,
        tags: ['conversation', 'ask-around', 'rumor', 'town'],
        summary: 'Ilyra spoke about around.rumor.',
        createdAtRoomNumber: 8,
        createdAtMs: 100,
      },
      'eastmere',
    );

    expect(rumor).toBeUndefined();
    expect(rumors.getRecent()).toHaveLength(0);
  });
});
