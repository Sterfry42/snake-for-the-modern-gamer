import { stableStringHashPositive } from '../core/math.js';
import { isTownGuardRole } from '../world/townRoles.js';
import type {
  CivicOfficeHolder,
  CivicTownContext,
  CivicVoterContext,
  TownElectionBallot,
  TownElectionPoll,
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

export function projectTownElectionPoll(args: {
  election: TownElectionState;
  town: CivicTownContext;
  voters: readonly CivicVoterContext[];
  worldDay: number;
}): TownElectionPoll {
  const supporters = args.voters
    .filter((voter) => isEligibleVoter(voter, args.election))
    .map((voter) => scoreVoterSupport(args.election, args.town, voter, 'poll'));
  const sampleSize = supporters.length;
  const rawPlayerShare =
    sampleSize === 0
      ? 0.5
      : supporters.reduce((total, score) => total + score.playerShare, 0) / sampleSize;
  const pollingError =
    deterministicPollingError(`${args.election.id}:${args.worldDay}:poll`) +
    (Math.abs(rawPlayerShare - 0.5) < 0.08
      ? deterministicPollingError(`${args.election.id}:${args.worldDay}:close-poll`) * 0.7
      : 0);
  const playerShare = clamp(rawPlayerShare + pollingError, 0.03, 0.97);
  const playerPercent = Math.round(playerShare * 100);
  const incumbentPercent = 100 - playerPercent;
  return {
    townId: args.election.townId,
    electionId: args.election.id,
    worldDay: args.worldDay,
    playerPercent,
    incumbentPercent,
    tooCloseToCall: Math.abs(playerPercent - incumbentPercent) <= 8,
    sampleSize,
  };
}

function castBallot(
  election: TownElectionState,
  town: CivicTownContext,
  voter: CivicVoterContext,
): TownElectionBallot {
  const scores = scoreVoterSupport(election, town, voter, 'election');
  return {
    actorId: voter.actor.id,
    vote: scores.playerScore >= scores.incumbentScore ? 'player' : 'incumbent',
    playerScore: Math.round(scores.playerScore),
    incumbentScore: Math.round(scores.incumbentScore),
  };
}

function scoreVoterSupport(
  election: TownElectionState,
  town: CivicTownContext,
  voter: CivicVoterContext,
  mode: 'election' | 'poll',
): { playerScore: number; incumbentScore: number; playerShare: number } {
  const action = election.voterActions[voter.actor.id];
  if (
    action?.buttonOutcome === 'wearing' &&
    voter.actor.health?.state !== 'dead' &&
    voter.actor.hostility !== 'dead' &&
    voter.actor.playerHostility?.state !== 'hostile'
  ) {
    return {
      playerScore: 999,
      incumbentScore: 0,
      playerShare: 0.98,
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
  if (mode === 'election') {
    playerScore += deterministicUncertainty(`${election.id}:${voter.actor.id}:player`);
    incumbentScore += deterministicUncertainty(`${election.id}:${voter.actor.id}:incumbent`);
  }

  const baseline = Math.max(1, Math.abs(playerScore) + Math.abs(incumbentScore));
  return {
    playerScore,
    incumbentScore,
    playerShare: clamp(0.5 + (playerScore - incumbentScore) / (baseline * 2), 0.02, 0.98),
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

function deterministicPollingError(seed: string): number {
  return ((stableStringHashPositive(seed) % 17) - 8) / 100;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
