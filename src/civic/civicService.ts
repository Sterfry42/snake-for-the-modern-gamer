import type { Actor } from '../actors/actorTypes.js';
import type { TownStructure } from '../world/town.js';
import type {
  CampaignButtonOutcome,
  CivicTownContext,
  CivicVoterContext,
  MayoralPlatformId,
  TownCivicState,
  TownElectionResult,
  TownElectionState,
  TownPolicyModifiers,
  VoterCampaignState,
} from './civicTypes.js';
import { createDefaultVoterCampaignState } from './civicTypes.js';
import { resolveTownElection } from './electionResolver.js';
import { DEFAULT_TOWN_POLICY_MODIFIERS, getMayoralPlatform } from './mayoralPlatforms.js';

const PLAYER_ID = 'player';

export class CivicService {
  createInitialState(town: TownStructure): TownCivicState {
    return {
      mayor: this.findInitialMayor(town),
      electionHistory: [],
    };
  }

  canDeclareCandidacy(args: {
    town: TownStructure;
    civic: TownCivicState;
    activeCampaignTownIds: readonly string[];
  }): { ok: boolean; reason?: string } {
    if (!args.town.townTags.includes('human')) {
      return { ok: false, reason: 'Only human towns hold mayoral elections.' };
    }
    if (!args.town.buildings.some((building) => building.kind === 'townHall')) {
      return { ok: false, reason: 'This town has no Town Hall.' };
    }
    if (args.civic.mayor.kind === 'player') {
      return { ok: false, reason: 'You are already Mayor here.' };
    }
    if (args.civic.activeElection) {
      return { ok: false, reason: 'This town already has an active election.' };
    }
    if (args.civic.electionHistory.some((result) => result.candidatePlayerId === PLAYER_ID)) {
      return { ok: false, reason: 'You already had your run in this town.' };
    }
    if (args.activeCampaignTownIds.length > 0) {
      return { ok: false, reason: 'Finish your active campaign before starting another.' };
    }
    return { ok: true };
  }

  declareCandidacy(args: {
    town: TownStructure;
    civic: TownCivicState;
    platformId: MayoralPlatformId;
    worldDay: number;
  }): TownCivicState {
    const election: TownElectionState = {
      id: `election:${args.town.id}:${PLAYER_ID}:${args.worldDay}`,
      townId: args.town.id,
      incumbentActorId: args.civic.mayor.kind === 'actor' ? args.civic.mayor.actorId : undefined,
      candidatePlayerId: PLAYER_ID,
      platformId: args.platformId,
      declaredAtWorldDay: args.worldDay,
      resolveAtWorldDay: args.worldDay + 2,
      boughtRound: false,
      voterActions: {},
    };
    return { ...args.civic, activeElection: election };
  }

  recordHandshake(civic: TownCivicState, actorId: string): TownCivicState {
    return this.updateVoter(civic, actorId, (state) => ({ ...state, shookHands: true }));
  }

  recordButtonOutcome(
    civic: TownCivicState,
    actor: Actor,
    outcome?: CampaignButtonOutcome,
  ): { civic: TownCivicState; outcome: CampaignButtonOutcome } {
    const resolved = outcome ?? this.resolveButtonOutcome(civic, actor);
    return {
      civic: this.updateVoter(civic, actor.id, (state) => ({
        ...state,
        buttonAttempted: true,
        buttonOutcome: resolved,
      })),
      outcome: resolved,
    };
  }

  recordSmear(
    civic: TownCivicState,
    actor: Actor,
  ): {
    civic: TownCivicState;
    outcome: 'landed' | 'neutral' | 'backfired';
  } {
    const opinion = actor.opinions.player;
    const support = (opinion?.trust ?? 0) + (opinion?.respect ?? 0) - (opinion?.resentment ?? 0);
    const outcome = support >= 20 ? 'landed' : support <= -10 ? 'backfired' : 'neutral';
    return {
      civic: this.updateVoter(civic, actor.id, (state) => ({
        ...state,
        smearAttempted: true,
        smearOutcome: outcome,
      })),
      outcome,
    };
  }

  recordBoughtRound(civic: TownCivicState): TownCivicState {
    return {
      ...civic,
      activeElection: civic.activeElection
        ? { ...civic.activeElection, boughtRound: true }
        : civic.activeElection,
    };
  }

  canRedeemCommunityBeer(civic: TownCivicState | undefined, worldDay: number): boolean {
    return Boolean(
      civic?.mayor.kind === 'player' &&
      civic.enactedPlatformId === 'community-celebration' &&
      civic.dailyPolicyState?.communityBeerRedeemedDay !== worldDay,
    );
  }

  recordCommunityBeerRedeemed(civic: TownCivicState, worldDay: number): TownCivicState {
    return {
      ...civic,
      dailyPolicyState: {
        ...civic.dailyPolicyState,
        communityBeerRedeemedDay: worldDay,
      },
    };
  }

  getActorBadges(civic: TownCivicState | undefined, actor: Actor): string[] {
    if (!civic?.activeElection) return [];
    const state = civic.activeElection.voterActions[actor.id];
    if (
      state?.buttonOutcome === 'wearing' &&
      this.isEligibleVoter(civic, actor) &&
      actor.playerHostility?.state !== 'hostile'
    ) {
      return ['campaign-button'];
    }
    return [];
  }

  isEligibleVoter(civic: TownCivicState | undefined, actor: Actor): boolean {
    const election = civic?.activeElection;
    return Boolean(
      election &&
      actor.townId === election.townId &&
      actor.id !== election.incumbentActorId &&
      actor.species === 'human' &&
      actor.health?.state !== 'dead' &&
      actor.hostility !== 'dead' &&
      actor.flags.dead !== true &&
      actor.flags.eaten !== true &&
      actor.playerHostility?.state !== 'hostile',
    );
  }

  shouldResolve(civic: TownCivicState, worldDay: number, dayPhase: string): boolean {
    if (civic.activeElection && worldDay > civic.activeElection.resolveAtWorldDay) {
      return true;
    }
    return Boolean(
      civic.activeElection &&
      worldDay >= civic.activeElection.resolveAtWorldDay &&
      dayPhase === 'dawn',
    );
  }

  resolveElection(args: {
    town: TownStructure;
    civic: TownCivicState;
    voters: readonly CivicVoterContext[];
    worldDay: number;
  }): { civic: TownCivicState; result?: TownElectionResult } {
    const election = args.civic.activeElection;
    if (!election) return { civic: args.civic };
    const incumbent = election.incumbentActorId
      ? args.voters.find((voter) => voter.actor.id === election.incumbentActorId)?.actor
      : undefined;
    const incumbentCanWin = Boolean(
      incumbent &&
      incumbent.health?.state !== 'dead' &&
      incumbent.hostility !== 'dead' &&
      incumbent.flags.dead !== true &&
      incumbent.flags.eaten !== true,
    );
    const result = resolveTownElection({
      election,
      town: townContext(args.town),
      voters: args.voters,
      worldDay: args.worldDay,
    });
    const effectiveResult =
      result.winner.kind === 'actor' && !incumbentCanWin
        ? {
            ...result,
            winner: { kind: 'player' as const, playerId: election.candidatePlayerId },
          }
        : result;
    const playerWon = effectiveResult.winner.kind === 'player';
    return {
      result: effectiveResult,
      civic: {
        ...args.civic,
        mayor: effectiveResult.winner,
        activeElection: undefined,
        electionHistory: [...args.civic.electionHistory, effectiveResult],
        enactedPlatformId: playerWon ? effectiveResult.platformId : args.civic.enactedPlatformId,
      },
    };
  }

  getPolicyModifiers(civic: TownCivicState | undefined): TownPolicyModifiers {
    if (!civic?.enactedPlatformId || civic.mayor.kind !== 'player') {
      return DEFAULT_TOWN_POLICY_MODIFIERS;
    }
    return getMayoralPlatform(civic.enactedPlatformId).modifiers;
  }

  private findInitialMayor(town: TownStructure): TownCivicState['mayor'] {
    const civicOfficial = town.residents.find((resident) => resident.role === 'civicOfficial');
    return civicOfficial?.actorId
      ? { kind: 'actor', actorId: civicOfficial.actorId }
      : { kind: 'vacant' };
  }

  private updateVoter(
    civic: TownCivicState,
    actorId: string,
    update: (state: VoterCampaignState) => VoterCampaignState,
  ): TownCivicState {
    if (!civic.activeElection) return civic;
    const current = civic.activeElection.voterActions[actorId] ?? createDefaultVoterCampaignState();
    return {
      ...civic,
      activeElection: {
        ...civic.activeElection,
        voterActions: {
          ...civic.activeElection.voterActions,
          [actorId]: update(current),
        },
      },
    };
  }

  private resolveButtonOutcome(civic: TownCivicState, actor: Actor): CampaignButtonOutcome {
    const election = civic.activeElection;
    const opinion = actor.opinions.player;
    const support =
      (opinion?.trust ?? 0) +
      (opinion?.respect ?? 0) +
      (opinion?.affection ?? 0) -
      (opinion?.resentment ?? 0) -
      (opinion?.fear ?? 0);
    const seed = `${election?.id ?? 'no-election'}:${actor.id}:button`;
    const roll = hashRoll(seed);
    if (support + roll >= 20) return 'wearing';
    if (support + roll <= -18 || actor.hostility === 'hostile') return 'hard-refusal';
    return 'polite-refusal';
  }
}

export function townContext(town: TownStructure): CivicTownContext {
  return {
    townId: town.id,
    reputation: town.reputation,
    wantedLevel: town.wantedLevel,
    danger: town.danger,
    prosperity: town.prosperity,
    discoveredGuild: town.discoveredGuild,
    tags: town.townTags,
  };
}

function hashRoll(seed: string): number {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (Math.abs(hash) % 41) - 20;
}
