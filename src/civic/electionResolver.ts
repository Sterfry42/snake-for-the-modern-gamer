import { stableStringHashPositive } from '../core/math.js';
import { isTownGuardRole } from '../world/townRoles.js';
import type {
  CivicOfficeHolder,
  CivicTownContext,
  CivicVoterContext,
  TownElectionBallot,
  TownElectionResult,
  TownElectionState,
} from './civicTypes.js';
import { platformAffinityScore } from './mayoralPlatforms.js';

export function isEligibleVoter(voter: CivicVoterContext, election: TownElectionState): boolean {
  const actor = voter.actor;
  return (
    actor.townId === election.townId &&
    actor.id !== election.incumbentActorId &&
    actor.species === 'human' &&
    actor.health?.state !== 'dead' &&
    actor.hostility !== 'dead' &&
    actor.flags.dead !== true &&
    actor.flags.eaten !== true &&
    actor.playerHostility?.state !== 'hostile'
  );
}

export function resolveTownElection(args: {
  election: TownElectionState;
  town: CivicTownContext;
  voters: readonly CivicVoterContext[];
  worldDay: number;
}): TownElectionResult {
  const ballots = args.voters
    .filter((voter) => isEligibleVoter(voter, args.election))
    .map((voter) => castBallot(args.election, args.town, voter));
  const playerVotes = ballots.filter((ballot) => ballot.vote === 'player').length;
  const incumbentVotes = ballots.length - playerVotes;
  const playerWins = playerVotes >= incumbentVotes;
  const winner: CivicOfficeHolder = playerWins
    ? { kind: 'player', playerId: args.election.candidatePlayerId }
    : args.election.incumbentActorId
      ? { kind: 'actor', actorId: args.election.incumbentActorId }
      : { kind: 'vacant' };
  return {
    id: `result:${args.election.id}`,
    townId: args.election.townId,
    platformId: args.election.platformId,
    candidatePlayerId: args.election.candidatePlayerId,
    incumbentActorId: args.election.incumbentActorId,
    resolvedAtWorldDay: args.worldDay,
    winner,
    playerVotes,
    incumbentVotes,
    ballots,
  };
}

function castBallot(
  election: TownElectionState,
  town: CivicTownContext,
  voter: CivicVoterContext,
): TownElectionBallot {
  const action = election.voterActions[voter.actor.id];
  if (
    action?.buttonOutcome === 'wearing' &&
    voter.actor.health?.state !== 'dead' &&
    voter.actor.hostility !== 'dead' &&
    voter.actor.playerHostility?.state !== 'hostile'
  ) {
    return {
      actorId: voter.actor.id,
      vote: 'player',
      playerScore: 999,
      incumbentScore: 0,
    };
  }
  let playerScore =
    town.reputation * 0.35 +
    (voter.actor.opinions.player?.trust ?? 0) * 0.45 +
    (voter.actor.opinions.player?.respect ?? 0) * 0.35 +
    (voter.actor.opinions.player?.affection ?? 0) * 0.25 -
    (voter.actor.opinions.player?.resentment ?? 0) * 0.45 -
    town.wantedLevel * 8;
  let incumbentScore = 12 + Math.max(0, town.prosperity - town.danger) * 0.12;

  if (action?.shookHands) playerScore += 10;
  if (action?.buttonOutcome === 'hard-refusal') playerScore -= 18;
  if (action?.smearOutcome === 'landed') incumbentScore -= 16;
  if (action?.smearOutcome === 'backfired') incumbentScore += 18;
  if (isTownGuardRole(voter.actor.role)) incumbentScore += 4;

  playerScore += campaignMemoryScore(voter);
  playerScore += platformAffinityScore(election.platformId, voter.actor, town, voter.knowledge);
  playerScore += deterministicUncertainty(`${election.id}:${voter.actor.id}:player`);
  incumbentScore += deterministicUncertainty(`${election.id}:${voter.actor.id}:incumbent`);

  return {
    actorId: voter.actor.id,
    vote: playerScore >= incumbentScore ? 'player' : 'incumbent',
    playerScore: Math.round(playerScore),
    incumbentScore: Math.round(incumbentScore),
  };
}

function campaignMemoryScore(voter: CivicVoterContext): number {
  return voter.actor.memory.reduce((total, memory) => {
    if (!memory.tags.includes('campaign')) {
      return total;
    }
    if (memory.tags.includes('button') && memory.tags.includes('wearing')) {
      return total + 10;
    }
    if (memory.tags.includes('round') || memory.tags.includes('handshake')) {
      return total + 4;
    }
    if (memory.tags.includes('smear') && memory.tags.includes('backfired')) {
      return total - 8;
    }
    if (memory.tags.includes('smear') && memory.tags.includes('landed')) {
      return total + 3;
    }
    return total;
  }, 0);
}

function deterministicUncertainty(seed: string): number {
  return (stableStringHashPositive(seed) % 15) - 7;
}
