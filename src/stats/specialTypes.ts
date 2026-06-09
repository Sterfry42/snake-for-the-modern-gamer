export const SPECIAL_STAT_IDS = [
  'strength',
  'perception',
  'endurance',
  'charisma',
  'intelligence',
  'agility',
  'luck',
] as const;

export type SpecialStatId = (typeof SPECIAL_STAT_IDS)[number];

export type SpecialStats = Record<SpecialStatId, number>;

export interface SpecialStatsState {
  version: 1;
  stats: SpecialStats;
  unspentPoints: number;
}

export interface SpecialStatsPreviewState {
  committed: SpecialStatsState;
  previewStats: SpecialStats;
  previewUnspentPoints: number;
}
