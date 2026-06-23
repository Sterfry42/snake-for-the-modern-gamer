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

  it.each([
    ['quest-completed', ['quest', 'completed'], 'The old well was repaired.'],
    ['animal-tamed', ['animal', 'taming', 'fox'], 'A fox joined the herd.'],
    ['animal-hunted', ['animal', 'hunting', 'rabbit'], 'A rabbit was hunted.'],
    ['food-cooked', ['food', 'cooking', 'ramen'], 'A bowl of ramen was cooked.'],
    ['gate-opened', ['town', 'gate', 'tax'], 'The east gate opened.'],
    ['player-revival', ['player', 'revival', 'charm'], 'The snake returned to life.'],
  ] as const)('creates an NPC-ready rumor for %s events', (type, tags, summary) => {
    const rumors = new RumorSystem();
    const rumor = rumors.createFromWorldEvent({
      id: `event:${type}`,
      type,
      roomId: '0,0,0',
      targetActorIds: [],
      witnessActorIds: ['actor:witness'],
      severity: 12,
      loudness: 8,
      tags: [...tags],
      summary,
      createdAtRoomNumber: 4,
      createdAtMs: 100,
    });

    expect(rumor).toBeDefined();
    expect(rumor?.knownByActorIds).toContain('actor:witness');
    expect(rumor?.summary).toBeTruthy();
  });

  it('uses stable event identity to vary similarly exaggerated retellings', () => {
    const rumors = new RumorSystem();
    const summaries = Array.from({ length: 12 }, (_, index) =>
      rumors.createFromWorldEvent({
        id: `event:quest:${index}`,
        type: 'quest-completed',
        roomId: '0,0,0',
        targetActorIds: [],
        witnessActorIds: [],
        severity: 60,
        loudness: 10,
        tags: ['quest', 'completed'],
        summary: 'The bridge job was completed.',
        createdAtRoomNumber: index,
        createdAtMs: 100 + index,
      }),
    ).map((rumor) => rumor?.summary);

    expect(new Set(summaries).size).toBeGreaterThan(1);
  });
});
