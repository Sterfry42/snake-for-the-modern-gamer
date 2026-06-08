export type ActorFactionId =
  | 'hearthbound-remnant'
  | 'goblin-camps'
  | 'guards'
  | 'shopkeepers'
  | 'thieves-guild'
  | 'bandits'
  | 'wildlife'
  | 'predators'
  | 'angels'
  | 'goblin-angels'
  | 'royal-road-office';

export type FactionRelationState =
  | 'allied'
  | 'friendly'
  | 'neutral'
  | 'tense'
  | 'truce'
  | 'skirmishing'
  | 'hostile'
  | 'war';

export type FactionCurrentEventType =
  | 'argument'
  | 'inspection'
  | 'debt-collection'
  | 'trade-dispute'
  | 'raid-warning'
  | 'raid-active'
  | 'raid-aftermath'
  | 'skirmish'
  | 'market-shutdown'
  | 'guard-crackdown'
  | 'guild-exposure'
  | 'wildlife-surge';

export type FactionCurrentEventPhase = 'brewing' | 'active' | 'aftermath' | 'resolved';

export interface LocalFactionState {
  id: string;
  factionId: ActorFactionId | string;
  townId?: string;
  roomId?: string;
  relationToPlayer: number;
  fearOfPlayer: number;
  respectForPlayer: number;
  relations: Record<string, FactionRelationState>;
  tension: number;
  danger: number;
  resources: number;
  activeEvents: string[];
  recentEvents: string[];
  flags: Record<string, unknown>;
}

export interface FactionCurrentEvent {
  id: string;
  type: FactionCurrentEventType;
  factionIds: string[];
  actorIds: string[];
  townId?: string;
  roomId?: string;
  severity: number;
  phase: FactionCurrentEventPhase;
  createdAt: number;
  expiresAt?: number;
  summary: string;
  tags: string[];
  flags: Record<string, unknown>;
}

export interface FactionSaveData {
  version: number;
  localStates: LocalFactionState[];
  currentEvents: FactionCurrentEvent[];
}
