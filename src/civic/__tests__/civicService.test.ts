import { describe, expect, it } from 'vitest';
import { createBaseActor } from '../../actors/actorFactory.js';
import type { Actor } from '../../actors/actorTypes.js';
import { createPhysicalHumanTown, type TownStructure } from '../../world/town.js';
import { CivicService } from '../civicService.js';
import { resolveTownElection } from '../electionResolver.js';
import type { CivicTownContext, TownCivicState, TownElectionState } from '../civicTypes.js';

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
        voter(guard, { knowsPlayerGuildAffiliation: false }),
        voter(thief, { knowsPlayerGuildAffiliation: true }),
      ],
      worldDay: 4,
    });
    const publicResult = resolveTownElection({
      election,
      town,
      voters: [voter(guard, { knowsPlayerGuildAffiliation: true })],
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

function voter(entry: Actor, knowledge = { knowsPlayerGuildAffiliation: false }) {
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
