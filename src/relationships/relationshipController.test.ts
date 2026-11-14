import { describe, expect, it } from 'vitest';
import { createRng } from '../core/rng.js';
import { RelationshipController } from './relationshipController.js';
import type { RelationshipState } from './relationshipTypes.js';

function createRuntime(rng: () => number = createRng('relationship-test')) {
  const flags: Record<string, unknown> = {};
  return {
    flags,
    controller: new RelationshipController({
      getFlag: <T = unknown>(key: string) => flags[key] as T | undefined,
      setFlag: (key, value) => {
        if (value === undefined) {
          delete flags[key];
        } else {
          flags[key] = value;
        }
      },
      rng,
    }),
  };
}

function makeState(
  overrides: Partial<RelationshipState> & Pick<RelationshipState, 'id' | 'displayName'>,
): RelationshipState {
  return {
    id: overrides.id,
    displayName: overrides.displayName,
    species: overrides.species ?? 'human',
    portraitId: overrides.portraitId ?? 'sage-1',
    stage: overrides.stage ?? 'stranger',
    affection: overrides.affection ?? 0,
    trust: overrides.trust ?? 0,
    jealousy: overrides.jealousy ?? 0,
    resentment: overrides.resentment ?? 0,
    fear: overrides.fear ?? 0,
    fascination: overrides.fascination ?? 0,
    lastSeenRoomsVisited: overrides.lastSeenRoomsVisited ?? 0,
    acceptedDates: overrides.acceptedDates ?? 0,
    rejectedDates: overrides.rejectedDates ?? 0,
    ignoredEncounters: overrides.ignoredEncounters ?? 0,
    romanceOptIn: overrides.romanceOptIn ?? false,
    personality: overrides.personality ?? 'deadpan',
    conflictStyle: overrides.conflictStyle ?? 'withdrawn',
    exclusivityPreference: overrides.exclusivityPreference ?? 'jealous',
    memories: overrides.memories ?? [],
    children: overrides.children ?? [],
    flags: overrides.flags ?? {},
    actorId: overrides.actorId,
    homeRoomId: overrides.homeRoomId,
    factionId: overrides.factionId,
    lastGiftRoomsVisited: overrides.lastGiftRoomsVisited,
  };
}

describe('RelationshipController', () => {
  it('limits major cutscene pops to one per room', () => {
    const { controller } = createRuntime();
    controller.enqueueCutscene({
      id: 'one',
      relationshipId: 'a',
      trigger: 'afterProposal',
      priority: 10,
      once: true,
      pages: ['First.'],
    });
    controller.enqueueCutscene({
      id: 'two',
      relationshipId: 'b',
      trigger: 'afterDivorce',
      priority: 9,
      once: true,
      pages: ['Second.'],
    });

    expect(controller.popNextCutscene(undefined, 12)?.id).toBe('one');
    expect(controller.popNextCutscene(undefined, 12)).toBeUndefined();
    expect(controller.popNextCutscene(undefined, 13)?.id).toBe('two');
  });

  it('returns species/personality-specific marriage rewards', () => {
    const { flags, controller } = createRuntime();
    flags['relationships.states'] = {
      angel: makeState({
        id: 'angel',
        displayName: 'Aster',
        species: 'angel',
        stage: 'lover',
        affection: 100,
        trust: 80,
        romanceOptIn: true,
        conflictStyle: 'formalDuel',
      }),
    };

    const result = controller.completeMarriage('angel', 20);
    expect(result.ok).toBe(true);
    expect(result.reward).toEqual({ kind: 'item', itemId: 'amulet-phoenix', count: 1 });
  });

  it('can turn marriage fallout into a dead spouse and traumatic rival memory', () => {
    const { flags, controller } = createRuntime();
    flags['relationships.states'] = {
      spouse: makeState({
        id: 'spouse',
        displayName: 'Maribel',
        stage: 'lover',
        affection: 100,
        trust: 80,
        romanceOptIn: true,
      }),
      rival: makeState({
        id: 'rival',
        displayName: 'Nackle',
        species: 'goblin',
        stage: 'lover',
        affection: 90,
        trust: 40,
        jealousy: 70,
        resentment: 40,
        romanceOptIn: true,
        conflictStyle: 'murderous',
        exclusivityPreference: 'territorial',
      }),
    };

    controller.completeMarriage('spouse', 30);

    const spouse = controller.getState('spouse');
    const rival = controller.getState('rival');
    expect(spouse?.stage).toBe('dead');
    expect(spouse?.flags.causeOfDeath).toBe('Killed by Nackle');
    expect(rival?.stage).toBe('murderous');
    expect(rival?.memories.some((memory) => memory.kind === 'rivalMurder')).toBe(true);
    expect(controller.getSocialContext().deadRomances).toContain('spouse');
  });

  it('applies direct attacks to relationship resentment and queues a stage confession', () => {
    const { flags, controller } = createRuntime();
    flags['relationships.states'] = {
      nina: makeState({
        id: 'nina',
        displayName: 'Nina',
        stage: 'friendly',
        affection: 40,
        trust: 20,
        resentment: 30,
        actorId: 'town:eastmere:guard:nina',
      }),
    };

    const updated = controller.applyActorInteraction('nina', 'attack', 42);

    expect(updated?.stage).toBe('hostile');
    expect(updated?.resentment).toBe(58);
    expect(updated?.trust).toBe(2);
    expect(updated?.memories.some((memory) => memory.kind === 'hurt')).toBe(true);
    expect(controller.popNextCutscene('nina', 42)?.pages[0]).toContain('Nina');
  });

  it('applies actor-menu threats and apologies to the same relationship stats', () => {
    const { flags, controller } = createRuntime();
    flags['relationships.states'] = {
      marta: makeState({
        id: 'marta',
        displayName: 'Marta',
        stage: 'friendly',
        affection: 40,
        trust: 30,
        resentment: 10,
        actorId: 'town:eastmere:shopkeeper:marta',
      }),
    };

    controller.applyActorInteraction('marta', 'threaten', 12);
    expect(controller.getState('marta')?.resentment).toBe(28);
    expect(controller.getState('marta')?.trust).toBe(18);

    controller.applyActorInteraction('marta', 'apologize', 13);
    expect(controller.getState('marta')?.resentment).toBe(18);
    expect(controller.getState('marta')?.trust).toBe(24);
    expect(controller.getState('marta')?.memories.map((memory) => memory.kind)).toEqual([
      'hostility',
      'apology',
    ]);
  });

  it('returns structured outcome metadata for dating branches and gifts', () => {
    const { flags, controller } = createRuntime();
    flags['relationships.states'] = {
      marta: makeState({
        id: 'marta',
        displayName: 'Marta',
        stage: 'friendly',
        affection: 40,
        trust: 30,
      }),
    };

    const branchResult = controller.applyBranchChoice(
      'marta',
      {
        id: 'honest-answer',
        label: 'Honest Answer',
        line: 'Tell the truth.',
        tags: ['honesty'],
        targetTier: 'loved',
        outcomeLines: { loved: 'Marta says, "Finally, the truth arrives dressed correctly."' },
      },
      12,
      'talk',
    );
    expect(branchResult.outcome).toEqual({
      tier: 'loved',
      mood: 'happy',
      summary: 'Marta says, "Finally, the truth arrives dressed correctly."',
    });

    const giftResult = controller.applyGift('marta', 'stale-bread', 'Stale Bread', ['ledger'], 13);
    expect(giftResult.outcome).toEqual({ tier: 'neutral', mood: 'neutral' });
  });

  it('rolls child catch from the seeded rng so replays stay deterministic', () => {
    const install = (rng: () => number) => {
      const { flags, controller } = createRuntime(rng);
      flags['relationships.states'] = {
        parent: makeState({
          id: 'parent',
          displayName: 'Parent',
          stage: 'lover',
          affection: 80,
          trust: 60,
          romanceOptIn: true,
          children: [
            {
              id: 'kid',
              parentRelationshipId: 'parent',
              name: 'Kid',
              type: 'snakelet',
              createdRoom: 0,
              memories: [],
            },
          ],
        }),
      };
      return controller.applyChoice('parent', 'child-catch', 100);
    };

    // A fixed rng value pins the score: difficulty is floor(100/50)=2, so
    // maxScore is 16 and floor(0.5 * 17) is 8.
    const pinned = install(() => 0.5);
    expect(pinned.ok).toBe(true);
    expect(pinned.reward).toEqual({ kind: 'score', amount: 80 });

    // Two identically seeded controllers must replay the same catch.
    const first = install(createRng('child-catch-seed'));
    const second = install(createRng('child-catch-seed'));
    expect(first).toEqual(second);
  });

  it('persists authored relationship personality as the runtime source of truth', () => {
    const { flags, controller } = createRuntime();

    const created = controller.ensureCandidate(
      {
        id: 'poetic-candidate',
        displayName: 'Poet',
        species: 'human',
        personality: 'poetic',
      },
      4,
    );
    expect(created.personality).toBe('poetic');
    expect(created.conflictStyle).toBe('heartbroken');
    expect(created.exclusivityPreference).toBe('devotional');

    flags['relationships.states'] = {
      legacy: {
        ...makeState({
          id: 'legacy',
          displayName: 'Legacy',
          species: 'goblin',
        }),
        personality: undefined,
      },
    };
    expect(controller.getState('legacy')?.personality).toBe('sharp');
  });
});
