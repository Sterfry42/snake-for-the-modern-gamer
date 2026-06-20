export type WorldEventType =
  | 'actor-spawned'
  | 'actor-talked'
  | 'actor-asked-around'
  | 'actor-asked-personally'
  | 'actor-personal-reveal'
  | 'actor-rumor-shared'
  | 'animal-hunted'
  | 'animal-startled'
  | 'animal-tamed'
  | 'enemy-defeated'
  | 'humanoid-eaten'
  | 'item-used'
  | 'food-cooked'
  | 'shop-purchase'
  | 'gate-opened'
  | 'quest-completed'
  | 'pickpocket'
  | 'town-crime'
  | 'relationship-choice'
  | 'player-low-health'
  | 'player-death'
  | 'player-revival'
  | 'bandit-raid-started'
  | 'bandit-raid-ended'
  | 'faction-skirmish-started'
  | 'faction-skirmish-ended'
  | 'room-entered'
  | 'bullet-train-departed'
  | 'bullet-train-arrived';

export interface WorldEvent {
  id: string;
  type: WorldEventType;
  roomId?: string;
  sourceActorId?: string;
  targetActorIds: string[];
  witnessActorIds: string[];
  severity: number;
  loudness: number;
  tags: string[];
  summary: string;
  createdAtRoomNumber?: number;
  createdAtMs: number;
  data?: Record<string, unknown>;
}

export interface CreateWorldEventInput {
  type: WorldEventType;
  roomId?: string;
  sourceActorId?: string;
  targetActorIds?: string[];
  witnessActorIds?: string[];
  severity?: number;
  loudness?: number;
  tags?: string[];
  summary?: string;
  createdAtRoomNumber?: number;
  data?: Record<string, unknown>;
}

export interface WorldEventSaveData {
  version: number;
  events: WorldEvent[];
}
