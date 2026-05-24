import { createBaseActor } from '../actorFactory.js';
import { selectActorConversation } from './voiceSelector.js';
import type { ActorConversationContext } from './voiceTypes.js';

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

  it('can use biome and danger context for talk lines', () => {
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
    expect(result.tags.some((tag) => tag === 'biome' || tag === 'danger')).toBe(true);
  });

  it('uses the deep voice pack for less common personality talk coverage', () => {
    const result = selectActorConversation(
      baseContext({
        actor: createBaseActor({
          id: 'actor:test:vel',
          kind: 'wanderer',
          role: 'wanderingCounterpart',
          species: 'human',
          thickness: 'medium',
          displayName: 'Vel',
          personality: ['statusHungry'],
        }),
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
});
