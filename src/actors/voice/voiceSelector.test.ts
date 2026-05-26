import { createBaseActor } from '../actorFactory.js';
import { selectActorConversation } from './voiceSelector.js';
import type { ActorConversationContext, ActorConversationResult } from './voiceTypes.js';

function baseContext(overrides: Partial<ActorConversationContext> = {}): ActorConversationContext {
  const actor =
    overrides.actor ??
    createBaseActor({
      id: 'actor:test:nina',
      kind: 'guard',
      role: 'guard',
      species: 'human',
      thickness: 'medium',
      displayName: 'Nina the Guard',
      personality: ['lawful', 'deadpan'],
      factionId: 'hearthbound-remnant',
      townId: 'eastmere',
      currentRoomId: '0,0,0',
    });
  return {
    actor,
    bucket: overrides.bucket ?? 'talk',
    biomeId: overrides.biomeId ?? 'verdigris-basin',
    dangerLevel: overrides.dangerLevel ?? 3,
    playerHealth: overrides.playerHealth ?? 3,
    playerMaxHealth: overrides.playerMaxHealth ?? 3,
    snakeLength: overrides.snakeLength ?? 12,
    roomsVisited: overrides.roomsVisited ?? 4,
    flags: overrides.flags ?? {},
    recentEvents: overrides.recentEvents ?? [],
    rumors: overrides.rumors ?? [],
    factionEvents: overrides.factionEvents ?? [],
    town: overrides.town,
    relationship: overrides.relationship,
    socialTargetName: overrides.socialTargetName,
    socialLink: overrides.socialLink,
    random: overrides.random ?? (() => 0),
  };
}

function collectConversationSamples(
  context: ActorConversationContext,
  count: number,
): ActorConversationResult[] {
  const flags: Record<string, unknown> = { ...context.flags };
  const results: ActorConversationResult[] = [];
  for (let index = 0; index < count; index += 1) {
    const result = selectActorConversation({ ...context, flags });
    const recentKey = `actor.conversation.recent.${context.actor.id}.${context.bucket}`;
    const previous = Array.isArray(flags[recentKey])
      ? (flags[recentKey] as string[]).filter((item): item is string => typeof item === 'string')
      : [];
    flags[`actor.conversation.last.${context.actor.id}.${context.bucket}`] = result.id;
    flags[recentKey] = [result.id, ...previous.filter((id) => id !== result.id)].slice(0, 4);
    const lineCountKey = `actor.conversation.count.${context.actor.id}.${context.bucket}.${result.id}`;
    const totalCountKey = `actor.conversation.total.${context.actor.id}.${context.bucket}`;
    flags[lineCountKey] = Number(flags[lineCountKey] ?? 0) + 1;
    flags[totalCountKey] = Number(flags[totalCountKey] ?? 0) + 1;
    if (result.rumorId) {
      const recentRumorKey = `actor.conversation.recentRumors.${context.actor.id}.${context.bucket}`;
      const previousRumors = Array.isArray(flags[recentRumorKey])
        ? (flags[recentRumorKey] as string[]).filter((item): item is string => typeof item === 'string')
        : [];
      flags[recentRumorKey] = [result.rumorId, ...previousRumors.filter((id) => id !== result.rumorId)].slice(0, 4);
    }
    results.push(result);
  }
  return results;
}

describe('selectActorConversation', () => {
  it('selects direct talk from player state without narrator framing', () => {
    const result = selectActorConversation(
      baseContext({
        playerHealth: 1,
        playerMaxHealth: 4,
        actor: createBaseActor({
          id: 'actor:test:maribel',
          kind: 'civilian',
          role: 'resident',
          species: 'human',
          thickness: 'medium',
          displayName: 'Maribel',
          personality: ['kind'],
        }),
      }),
    );

    expect(result.bucket).toBe('talk');
    expect(result.topic).toBe('talk.player.health');
    expect(result.line).not.toContain('says');
  });

  it('routes ask around through faction and rumor context', () => {
    const result = selectActorConversation(
      baseContext({
        bucket: 'ask-around',
        factionEvents: [
          {
            relation: 'tense',
            factionIds: ['hearthbound-remnant', 'goblin-camps'],
            severity: 16,
            tags: ['goblin', 'human', 'truce'],
            summary: 'Human guards and goblin traders are maintaining a tense truce.',
          },
        ],
        rumors: [
          {
            id: 'rumor:one',
            summary: 'A bandit was eaten outside the gate.',
            tags: ['combat', 'humanoid', 'eaten'],
            severity: 12,
          },
        ],
      }),
    );

    expect(result.bucket).toBe('ask-around');
    expect(['faction', 'rumor']).toContain(result.source);
    expect(result.line.length).toBeGreaterThan(20);
  });

  it('reveals personal social facts before repeating them', () => {
    const target = createBaseActor({
      id: 'actor:test:marta',
      kind: 'shopkeeper',
      role: 'shopkeeper',
      species: 'human',
      thickness: 'medium',
      displayName: 'Marta',
    });
    const actor = createBaseActor({
      id: 'actor:test:nina',
      kind: 'guard',
      role: 'guard',
      species: 'human',
      thickness: 'medium',
      displayName: 'Nina',
      personality: ['lawful', 'deadpan'],
    });
    actor.relationships = [{ actorId: target.id, relationship: 'family', strength: 75 }];
    actor.lore = undefined;

    const result = selectActorConversation(
      baseContext({
        actor,
        bucket: 'ask-personal',
        socialLink: actor.relationships[0],
        socialTargetName: target.displayName,
      }),
    );

    expect(result.bucket).toBe('ask-personal');
    expect(result.source).toBe('social');
    expect(result.socialLinkActorId).toBe(target.id);
    expect(result.knownFact).toContain('family');
  });

  it('introduces an actor before ordinary biome and danger talk', () => {
    const result = selectActorConversation(
      baseContext({
        biomeId: 'ember-waste',
        dangerLevel: 7,
        actor: createBaseActor({
          id: 'actor:test:rook',
          kind: 'shopkeeper',
          role: 'shopkeeper',
          species: 'human',
          thickness: 'medium',
          displayName: 'Rook',
          personality: ['greedy'],
        }),
      }),
    );

    expect(result.bucket).toBe('talk');
    expect(result.topic).toBe('talk.introduction');
    expect(result.line).toContain('Rook');
  });

  it('uses the deep voice pack for less common personality talk after the introduction', () => {
    const actor = createBaseActor({
      id: 'actor:test:vel',
      kind: 'wanderer',
      role: 'wanderingCounterpart',
      species: 'human',
      thickness: 'medium',
      displayName: 'Vel',
      personality: ['statusHungry'],
    });
    const result = selectActorConversation(
      baseContext({
        actor,
        flags: {
          [`actor.conversation.total.${actor.id}.talk`]: 1,
          [`actor.conversation.count.${actor.id}.talk.talk-intro-fallback`]: 1,
        },
      }),
    );

    expect(result.id).toMatch(/^deep-talk-statusHungry-/);
    expect(result.tags).toContain('statusHungry');
  });

  it('uses the deep voice pack for generated faction-ally personal gossip', () => {
    const actor = createBaseActor({
      id: 'actor:test:sol',
      kind: 'civilian',
      role: 'resident',
      species: 'human',
      thickness: 'medium',
      displayName: 'Sol',
      personality: ['statusHungry'],
    });
    actor.relationships = [{ actorId: 'actor:test:ally', relationship: 'factionAlly', strength: 60 }];
    actor.lore = undefined;
    actor.soul = undefined;

    const result = selectActorConversation(
      baseContext({
        actor,
        bucket: 'ask-personal',
        socialLink: actor.relationships[0],
        socialTargetName: 'Ally',
      }),
    );

    expect(result.id).toBe('deep-personal-social-factionAlly-statusHungry');
    expect(result.knownFact).toContain('factionAlly');
  });

  it('rotates ask-around away from the last near-best rumor line', () => {
    const actor = createBaseActor({
      id: 'actor:test:aurex',
      kind: 'civilian',
      role: 'resident',
      species: 'human',
      thickness: 'medium',
      displayName: 'Aurex',
      personality: ['kind'],
    });
    const first = selectActorConversation(
      baseContext({
        actor,
        bucket: 'ask-around',
        rumors: [
          {
            id: 'rumor:one',
            summary: 'Someone stole a bell and blamed civic acoustics.',
            tags: ['rumor', 'town'],
            severity: 14,
          },
        ],
      }),
    );
    const second = selectActorConversation(
      baseContext({
        actor,
        bucket: 'ask-around',
        flags: {
          [`actor.conversation.last.${actor.id}.ask-around`]: first.id,
          [`actor.conversation.recent.${actor.id}.ask-around`]: [first.id],
        },
        rumors: [
          {
            id: 'rumor:one',
            summary: 'Someone stole a bell and blamed civic acoustics.',
            tags: ['rumor', 'town'],
            severity: 14,
          },
        ],
      }),
    );

    expect(second.id).not.toBe(first.id);
    expect(second.source).toBe('rumor');
  });

  it('does not let ambient faction context monopolize ask-around forever', () => {
    const actor = createBaseActor({
      id: 'actor:test:grib',
      kind: 'civilian',
      role: 'resident',
      species: 'goblin',
      thickness: 'medium',
      displayName: 'Grib',
      personality: ['practical'],
      factionId: 'goblin-camps',
    });
    const factionEvents = [
      {
        relation: 'tense' as const,
        factionIds: ['hearthbound-remnant', 'goblin-camps'],
        severity: 4,
        tags: ['goblin', 'human', 'truce', 'ambient'],
        summary: 'Human guards and goblin traders are maintaining a tense truce.',
      },
    ];
    const first = selectActorConversation(
      baseContext({
        actor,
        bucket: 'ask-around',
        factionEvents,
      }),
    );
    const second = selectActorConversation(
      baseContext({
        actor,
        bucket: 'ask-around',
        factionEvents,
        flags: {
          [`actor.conversation.last.${actor.id}.ask-around`]: first.id,
          [`actor.conversation.recent.${actor.id}.ask-around`]: [first.id],
        },
      }),
    );

    expect(first.source).not.toBe('faction');
    expect(second.source).not.toBe('faction');
    expect(second.id).not.toBe(first.id);
  });

  it('keeps repeated talk from collapsing to one remembered bandit line', () => {
    const actor = createBaseActor({
      id: 'actor:test:nessa',
      kind: 'guard',
      role: 'guard',
      species: 'human',
      thickness: 'medium',
      displayName: 'Nessa',
      personality: ['lawful', 'deadpan'],
      factionId: 'hearthbound-remnant',
    });
    actor.memory = [
      {
        id: 'memory:bandit:eaten',
        type: 'humanoid-eaten',
        summary: 'A bandit was eaten outside the gate.',
        source: 'witnessed',
        intensity: 60,
        tags: ['combat', 'eaten', 'humanoid', 'bandit'],
      },
    ];

    const samples = collectConversationSamples(
      baseContext({
        actor,
        bucket: 'talk',
        random: () => 0,
      }),
      6,
    );

    expect(new Set(samples.map((sample) => sample.id)).size).toBeGreaterThanOrEqual(3);
    expect(new Set(samples.map((sample) => sample.line)).size).toBeGreaterThanOrEqual(3);
    const counts = samples.reduce<Record<string, number>>((acc, sample) => {
      acc[sample.id] = (acc[sample.id] ?? 0) + 1;
      return acc;
    }, {});
    expect(Math.max(...Object.values(counts))).toBeLessThanOrEqual(3);
  });

  it('keeps repeated ask-around from collapsing to deterministic bandit talk', () => {
    const actor = createBaseActor({
      id: 'actor:test:grib',
      kind: 'civilian',
      role: 'resident',
      species: 'goblin',
      thickness: 'medium',
      displayName: 'Grib',
      personality: ['goblin', 'practical', 'nosy'],
      factionId: 'goblin-camps',
    });
    const samples = collectConversationSamples(
      baseContext({
        actor,
        bucket: 'ask-around',
        rumors: [
          {
            id: 'rumor:bandit:gate',
            summary: 'Bandits were seen testing the gate hinges.',
            tags: ['rumor', 'bandit', 'raid'],
            severity: 30,
          },
        ],
        factionEvents: [
          {
            relation: 'war',
            factionIds: ['bandits', 'hearthbound-remnant'],
            severity: 28,
            tags: ['bandit', 'raid', 'faction'],
            summary: 'Bandits are pressing the town gate.',
          },
        ],
        random: () => 0,
      }),
      8,
    );

    expect(new Set(samples.map((sample) => sample.id)).size).toBeGreaterThanOrEqual(4);
    expect(new Set(samples.map((sample) => sample.line)).size).toBeGreaterThanOrEqual(4);
    expect(samples.some((sample) => sample.source === 'rumor')).toBe(true);
    expect(samples.some((sample) => sample.source === 'faction')).toBe(true);
  });

  it('does not let one rumor fill half of repeated ask-around lines', () => {
    const actor = createBaseActor({
      id: 'actor:test:ilyra',
      kind: 'guard',
      role: 'guard',
      species: 'human',
      thickness: 'medium',
      displayName: 'Ilyra',
      personality: ['lawful', 'deadpan'],
      factionId: 'hearthbound-remnant',
    });
    const samples = collectConversationSamples(
      baseContext({
        actor,
        bucket: 'ask-around',
        rumors: [
          {
            id: 'rumor:hostile-person-eaten',
            summary: 'A hostile person was eaten. By noon, someone will swear the snake called it medicine.',
            tags: ['rumor', 'eaten', 'humanoid'],
            severity: 38,
          },
        ],
        random: () => 0,
      }),
      8,
    );

    const rumorUses = samples.filter((sample) => sample.rumorId === 'rumor:hostile-person-eaten');
    expect(rumorUses.length).toBeLessThanOrEqual(3);
    expect(samples.filter((sample) => sample.line.includes('A hostile person was eaten')).length).toBeLessThanOrEqual(3);
  });

  it('keeps repeated ask-personal from collapsing once a personal fact is known', () => {
    const actor = createBaseActor({
      id: 'actor:test:maribel',
      kind: 'civilian',
      role: 'resident',
      species: 'human',
      thickness: 'medium',
      displayName: 'Maribel',
      personality: ['kind', 'sentimental'],
    });
    actor.soul = {
      wound: 'She lost a brother to a smiling official version.',
      insecurity: 'She thinks everyone hears the tremor in her voice.',
      longing: 'She wants one ordinary dinner nobody weaponizes.',
      contradiction: 'She loves ceremony and distrusts every institution.',
      secret: 'She has been hiding letters from the capital.',
      revealed: {},
    };
    actor.lore = undefined;

    const samples = collectConversationSamples(
      baseContext({
        actor,
        bucket: 'ask-personal',
        random: () => 0,
      }),
      6,
    );

    expect(new Set(samples.map((sample) => sample.id)).size).toBeGreaterThanOrEqual(3);
    expect(new Set(samples.map((sample) => sample.line)).size).toBeGreaterThanOrEqual(3);
    expect(samples.some((sample) => sample.source === 'soul')).toBe(true);
  });
});
