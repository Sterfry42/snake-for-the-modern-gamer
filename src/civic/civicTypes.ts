import type { Actor } from '../actors/actorTypes.js';

export type MayoralPlatformId =
  | 'law-and-order'
  | 'business-first'
  | 'people-first'
  | 'community-celebration';

export type CivicOfficeHolder =
  | { kind: 'actor'; actorId: string }
  | { kind: 'player'; playerId: string }
  | { kind: 'vacant' };

export type CampaignButtonOutcome = 'hard-refusal' | 'polite-refusal' | 'wearing';
export type CampaignSmearOutcome = 'landed' | 'neutral' | 'backfired';

export interface VoterCampaignState {
  shookHands: boolean;
  buttonAttempted: boolean;
  buttonOutcome?: CampaignButtonOutcome;
  smearAttempted: boolean;
  smearOutcome?: CampaignSmearOutcome;
}

export interface TownElectionState {
  id: string;
  townId: string;
  incumbentActorId?: string;
  candidatePlayerId: string;
  platformId: MayoralPlatformId;
  declaredAtWorldDay: number;
  resolveAtWorldDay: number;
  boughtRound: boolean;
  voterActions: Record<string, VoterCampaignState>;
}

export interface TownElectionBallot {
  actorId: string;
  vote: 'player' | 'incumbent';
  playerScore: number;
  incumbentScore: number;
}

export interface TownElectionResult {
  id: string;
  townId: string;
  platformId: MayoralPlatformId;
  candidatePlayerId: string;
  incumbentActorId?: string;
  resolvedAtWorldDay: number;
  winner: CivicOfficeHolder;
  playerVotes: number;
  incumbentVotes: number;
  ballots: TownElectionBallot[];
}

export interface TownElectionPoll {
  townId: string;
  electionId: string;
  worldDay: number;
  playerPercent: number;
  incumbentPercent: number;
  tooCloseToCall: boolean;
  sampleSize: number;
}

export interface TownCivicState {
  mayor: CivicOfficeHolder;
  activeElection?: TownElectionState;
  electionHistory: TownElectionResult[];
  enactedPlatformId?: MayoralPlatformId;
  dailyPolicyState?: {
    communityBeerRedeemedDay?: number;
  };
}

export interface TownPolicyModifiers {
  shopPriceScalar: number;
  positiveOpinionScalar: number;
  guardPresenceBonus: number;
}

export interface CivicTownContext {
  townId: string;
  reputation: number;
  wantedLevel: number;
  danger: number;
  prosperity: number;
  discoveredGuild: boolean;
  tags: readonly string[];
}

export type PlayerGuildAffiliationKnowledge = 'member' | 'not-member' | 'unknown';

export interface CivicVoterKnowledge {
  playerGuildAffiliation: PlayerGuildAffiliationKnowledge;
}

export interface CivicVoterContext {
  actor: Actor;
  knowledge: CivicVoterKnowledge;
}

export interface CivicInteractionContext {
  townId?: string;
  isCivicOfficial?: boolean;
  canDeclare?: boolean;
  declarationReason?: string;
  activeElection?: TownElectionState;
  isEligibleVoter?: boolean;
  voterState?: VoterCampaignState;
  boughtRoundAvailable?: boolean;
  freeCommunityBeerAvailable?: boolean;
}

export function createDefaultVoterCampaignState(): VoterCampaignState {
  return {
    shookHands: false,
    buttonAttempted: false,
    smearAttempted: false,
  };
}
