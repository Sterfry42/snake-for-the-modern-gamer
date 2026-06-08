export type RumorType =
  | 'player-action'
  | 'crime'
  | 'romance'
  | 'faction'
  | 'danger'
  | 'shop'
  | 'gossip'
  | 'lore'
  | 'false'
  | 'exaggerated';

export type RumorSourceKind =
  | 'official'
  | 'guard'
  | 'goblin'
  | 'bandit'
  | 'romance'
  | 'rumor'
  | 'religious'
  | 'personal'
  | 'witness';

export interface Rumor {
  id: string;
  sourceEventId?: string;
  sourceActorId?: string;
  subjectActorId?: string;
  townId?: string;
  roomId?: string;
  factionIds: string[];
  type: RumorType;
  sourceKind: RumorSourceKind;
  truthLevel: number;
  exaggeration: number;
  severity: number;
  textSeed: string;
  summary: string;
  tags: string[];
  createdAt: number;
  expiresAt?: number;
  knownByActorIds: string[];
  public: boolean;
}

export interface RumorSaveData {
  version: number;
  rumors: Rumor[];
}
