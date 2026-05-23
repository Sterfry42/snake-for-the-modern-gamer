export type WorldEventType =
  | 'actor-spawned'
  | 'actor-talked'
  | 'animal-hunted'
  | 'animal-startled'
  | 'animal-tamed'
  | 'enemy-defeated'
  | 'humanoid-eaten'
  | 'shop-purchase'
  | 'pickpocket'
  | 'town-crime'
  | 'relationship-choice'
  | 'player-death'
  | 'player-revival'
  | 'room-entered';

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
