import type { SpecialStatId } from './specialTypes.js';

export type ChanceBreakdownSection =
  | 'Exploration'
  | 'Apples'
  | 'Hunting'
  | 'Fishing'
  | 'Archaeology'
  | 'Social';

export interface ChanceBreakdownLine {
  id: string;
  label: string;
  value: string;
  detail?: string;
  affectedBy?: readonly SpecialStatId[];
}

export interface ChanceBreakdownSectionView {
  section: ChanceBreakdownSection;
  lines: ChanceBreakdownLine[];
}

export interface SpecialStatView {
  id: SpecialStatId;
  label: string;
  value: number;
  committedValue: number;
  delta: number;
  canIncrease: boolean;
  canDecrease: boolean;
  description: string;
}

export interface SpecialStatsView {
  stats: SpecialStatView[];
  unspentPoints: number;
  hasPreviewChanges: boolean;
  sections: ChanceBreakdownSectionView[];
}
