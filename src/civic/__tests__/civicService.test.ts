import { describe, expect, it } from 'vitest';
import { createBaseActor } from '../../actors/actorFactory.js';
import type { Actor } from '../../actors/actorTypes.js';
import { createPhysicalHumanTown, type TownStructure } from '../../world/town.js';
import { CivicService } from '../civicService.js';
import { resolveTownElection } from '../electionResolver.js';
import type {
  CivicTownContext,
  CivicVoterKnowledge,
  TownCivicState,
  TownElectionState,
} from '../civicTypes.js';

describe('mayoral elections', () => {
  it('declares a campaign that resolves two world days later', () => {
    const civic = new CivicService();
    const town = fixtureTown();
    const initial = civic.createInitialState(town);

    const next = civic.declareCandidacy({
      town,
      civic: initial,
      platformId: 'law-and-order',
      worldDay: 7,
    });

    expect(next.activeElection).toMatchObject({
      townId: town.id,
      platformId: 'law-and-order',
      declaredAtWorldDay: 7,
      resolveAtWorldDay: 9,
    });
    expect(civic.shouldResolve(next, 8, 'dawn')).toBe(false);
    expect(civic.shouldResolve(next, 9, 'day')).toBe(false);
    expect(civic.shouldResolve(next, 9, 'dawn')).toBe(true);
    expect(civic.shouldResolve(next, 10, 'day')).toBe(true);
  });

  it('counts one deterministic ballot per eligible living town actor', () => {
    const election = fixtureElection();
    const town = fixtureTownContext();
    const voters = [
      voter(actor('a', 'resident')),
      voter(actor('b', 'resident')),
      voter(actor('dead', 'resident', { dead: true })),
      voter(actor('visitor', 'resident', { townId: 'other-town' })),
      voter(actor('incumbent', 'civicOfficial')),
    ];

    const result = resolveTownElection({ election, town, voters, worldDay: 4 });

    expect(result.ballots.map((ballot) => ballot.actorId).sort()).toEqual(['a', 'b']);
    expect(result.playerVotes + result.incumbentVotes).toBe(2);
    expect(resolveTownElection({ election, town, voters, worldDay: 4 })).toEqual(result);
  });

  it('keeps secret guild knowledge out of guard Law & Order scoring', () => {
    const election = { ...fixtureElection(), platformId: 'law-and-order' as const };
    const town = { ...fixtureTownContext(), reputation: 45, wantedLevel: 0 };
    const guard = actor('guard', 'guard');
    const thief = actor('thief', 'thief', { factionId: 'thieves-guild' });

    const privateResult = resolveTownElection({
      election,
      town,
      voters: [
        voter(guard, { playerGuildAffiliation: 'unknown' }),
        voter(thief, { playerGuildAffiliation: 'member' }),
      ],
      worldDay: 4,
    });
    const publicResult = resolveTownElection({
      election,
      town,
      voters: [voter(guard, { playerGuildAffiliation: 'member' })],
      worldDay: 4,
    });

    const privateGuard = privateResult.ballots.find((ballot) => ballot.actorId === 'guard')!;
    const publicGuard = publicResult.ballots.find((ballot) => ballot.actorId === 'guard')!;
    expect(privateGuard.playerScore).toBeGreaterThan(publicGuard.playerScore);
    expect(
      privateResult.ballots.find((ballot) => ballot.actorId === 'thief')?.playerScore,
    ).toBeGreaterThan(privateGuard.playerScore);
  });

  it('makes accepted campaign buttons the only badge source', () => {
    const civic = new CivicService();
    const supporter = actor('supporter', 'resident');
    const hostileSupporter = actor('hostile-supporter', 'resident');
    hostileSupporter.playerHostility = {
      state: 'hostile',
      reason: 'test',
      startedAtRoomNumber: 1,
    };
    const deadSupporter = actor('dead-supporter', 'resident', { dead: true });
    const state: TownCivicState = {
      mayor: { kind: 'actor', actorId: 'incumbent' },
      activeElection: fixtureElection(),
      electionHistory: [],
    };
    const accepted = civic.recordButtonOutcome(state, supporter, 'wearing').civic;
    const refused = civic.recordButtonOutcome(
      state,
      actor('refused', 'resident'),
      'polite-refusal',
    ).civic;

    expect(civic.getActorBadges(accepted, supporter)).toEqual(['campaign-button']);
    expect(civic.getActorBadges(refused, actor('refused', 'resident'))).toEqual([]);
    expect(civic.getActorBadges(accepted, hostileSupporter)).toEqual([]);
    expect(
      civic.getActorBadges(
        civic.recordButtonOutcome(state, deadSupporter, 'wearing').civic,
        deadSupporter,
      ),
    ).toEqual([]);
  });

  it('records exactly three campaign button outcomes', () => {
    const civic = new CivicService();
    const state: TownCivicState = {
      mayor: { kind: 'actor', actorId: 'incumbent' },
      activeElection: fixtureElection(),
      electionHistory: [],
    };

    const outcomes = [
      civic.recordButtonOutcome(state, actor('hard', 'resident'), 'hard-refusal').outcome,
      civic.recordButtonOutcome(state, actor('polite', 'resident'), 'polite-refusal').outcome,
      civic.recordButtonOutcome(state, actor('wearing', 'resident'), 'wearing').outcome,
    ];

    expect(new Set(outcomes)).toEqual(new Set(['hard-refusal', 'polite-refusal', 'wearing']));
  });

  it('keeps bought rounds separate from handshakes', () => {
    const civic = new CivicService();
    const state: TownCivicState = {
      mayor: { kind: 'actor', actorId: 'incumbent' },
      activeElection: fixtureElection(),
      electionHistory: [],
    };

    const next = civic.recordBoughtRound(state);

    expect(next.activeElection?.boughtRound).toBe(true);
    expect(next.activeElection?.voterActions.bartender?.shookHands).not.toBe(true);
  });

  it('guarantees active campaign button endorsements in the ballot', () => {
    const election = fixtureElection();
    const hostileSupporter = actor('hostile-supporter', 'resident');
    hostileSupporter.playerHostility = {
      state: 'hostile',
      reason: 'test',
      startedAtRoomNumber: 1,
    };
    const result = resolveTownElection({
      election,
      town: { ...fixtureTownContext(), reputation: -80, wantedLevel: 5 },
      voters: [voter(actor('a', 'resident')), voter(hostileSupporter)],
      worldDay: 4,
    });

    expect(result.ballots.find((ballot) => ballot.actorId === 'a')).toMatchObject({
      vote: 'player',
      playerScore: 999,
    });
    expect(result.ballots.map((ballot) => ballot.actorId)).not.toContain('hostile-supporter');
  });

  it('allows Community & Celebration mayors one local beer per world day', () => {
    const civic = new CivicService();
    const state: TownCivicState = {
      mayor: { kind: 'player', playerId: 'player' },
      enactedPlatformId: 'community-celebration',
      electionHistory: [],
    };

    expect(civic.canRedeemCommunityBeer(state, 12)).toBe(true);

    const redeemed = civic.recordCommunityBeerRedeemed(state, 12);

    expect(civic.canRedeemCommunityBeer(redeemed, 12)).toBe(false);
    expect(civic.canRedeemCommunityBeer(redeemed, 13)).toBe(true);
    expect(
      civic.canRedeemCommunityBeer({ ...state, enactedPlatformId: 'business-first' }, 12),
    ).toBe(false);
  });

  it('prevents a dead incumbent from winning', () => {
    const civic = new CivicService();
    const town = fixtureTown();
    const incumbent = actor('incumbent', 'civicOfficial', { dead: true });
    const supporter = actor('supporter', 'resident');
    const state: TownCivicState = {
      mayor: { kind: 'actor', actorId: incumbent.id },
      activeElection: {
        ...fixtureElection(),
        incumbentActorId: incumbent.id,
        voterActions: {},
      },
      electionHistory: [],
    };

    const resolved = civic.resolveElection({
      town,
      civic: state,
      voters: [voter(incumbent), voter(supporter)],
      worldDay: 4,
    });

    expect(resolved.result?.winner).toEqual({ kind: 'player', playerId: 'player' });
    expect(resolved.civic.mayor).toEqual({ kind: 'player', playerId: 'player' });
  });

  it.each(['law-and-order', 'business-first', 'people-first', 'community-celebration'] as const)(
    'enacts the winning platform %s as the town-local policy',
    (platformId) => {
      const civic = new CivicService();
      const town = fixtureTown();
      const supporter = actor('supporter', 'resident');
      const state: TownCivicState = {
        mayor: { kind: 'actor', actorId: 'incumbent' },
        activeElection: {
          ...fixtureElection(),
          platformId,
          voterActions: {
            supporter: {
              shookHands: false,
              buttonAttempted: true,
              buttonOutcome: 'wearing',
              smearAttempted: false,
            },
          },
        },
        electionHistory: [],
      };

      const resolved = civic.resolveElection({
        town,
        civic: state,
        voters: [voter(supporter), voter(actor('incumbent', 'civicOfficial'))],
        worldDay: 4,
      });

      expect(resolved.result?.winner.kind).toBe('player');
      expect(resolved.civic.enactedPlatformId).toBe(platformId);
      expect(civic.getPolicyModifiers(resolved.civic)).toEqual(
        {
          'law-and-order': {
            shopPriceScalar: 1,
            positiveOpinionScalar: 1,
            guardPresenceBonus: 1,
          },
          'business-first': {
            shopPriceScalar: 0.88,
            positiveOpinionScalar: 1,
            guardPresenceBonus: 0,
          },
          'people-first': {
            shopPriceScalar: 1,
            positiveOpinionScalar: 1.2,
            guardPresenceBonus: 0,
          },
          'community-celebration': {
            shopPriceScalar: 1,
            positiveOpinionScalar: 1.05,
            guardPresenceBonus: 0,
          },
        }[platformId],
      );
    },
  );
});

function fixtureElection(): TownElectionState {
  return {
    id: 'election:test',
    townId: 'town-test',
    incumbentActorId: 'incumbent',
    candidatePlayerId: 'player',
    platformId: 'people-first',
    declaredAtWorldDay: 2,
    resolveAtWorldDay: 4,
    boughtRound: false,
    voterActions: {
      a: {
        shookHands: true,
        buttonAttempted: true,
        buttonOutcome: 'wearing',
        smearAttempted: false,
      },
    },
  };
}

function fixtureTownContext(): CivicTownContext {
  return {
    townId: 'town-test',
    reputation: 20,
    wantedLevel: 0,
    danger: 20,
    prosperity: 55,
    discoveredGuild: false,
    tags: ['human'],
  };
}

function fixtureTown(): TownStructure {
  return createPhysicalHumanTown({
    biomeId: 'verdigris-basin',
    seed: 42,
    townId: 'town-test',
    districtRoomIds: {
      '0,0,0': 'townCenter',
      '1,0,0': 'marketStreet',
      '0,1,0': 'residentialStreet',
      '1,1,0': 'backAlley',
    },
    entranceRoomId: '0,0,0',
    exitRoomIds: ['1,1,0'],
  });
}

function voter(
  entry: Actor,
  knowledge: CivicVoterKnowledge = { playerGuildAffiliation: 'unknown' },
) {
  return { actor: entry, knowledge };
}

function actor(
  id: string,
  role: Actor['role'],
  options: { dead?: boolean; townId?: string; factionId?: string } = {},
): Actor {
  return createBaseActor({
    id,
    kind: role === 'guard' ? 'guard' : role === 'thief' ? 'criminal' : 'civilian',
    role,
    species: 'human',
    thickness: 'medium',
    displayName: id,
    townId: options.townId ?? 'town-test',
    factionId: options.factionId ?? 'human-town',
    health: { current: options.dead ? 0 : 3, max: 3, state: options.dead ? 'dead' : 'healthy' },
    hostility: options.dead ? 'dead' : 'neutral',
    flags: {},
  });
}
