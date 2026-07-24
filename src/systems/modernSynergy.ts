import type { ExpeditionBoardState } from './expeditionBoard.js';
import type { HighlightReelState } from './highlightReel.js';
import type { ModernRunState } from './modernRun.js';

export type ModernSynergyId =
  | 'passport-press'
  | 'gallery-circuit'
  | 'field-producer'
  | 'danger-column'
  | 'whole-canvas';

export interface ModernSynergyDefinition {
  id: ModernSynergyId;
  title: string;
  description: string;
  rewardScore: number;
  rewardGrowth: number;
  wardTicks: number;
}

export interface ModernSynergyState {
  unlockedIds: ModernSynergyId[];
  activeTitle: string;
  totalScoreAwarded: number;
  totalGrowthAwarded: number;
  bestTier: number;
  lastUnlockedId?: ModernSynergyId;
}

export interface ModernSynergyContext {
  modernRun: ModernRunState;
  highlightReel: HighlightReelState;
  expeditionBoard: ExpeditionBoardState;
}

export interface ModernSynergyUpdate {
  state: ModernSynergyState;
  unlocked: ModernSynergyDefinition[];
  scoreBonus: number;
  growthBonus: number;
  wardTicks: number;
  messages: string[];
}

const SYNERGIES: readonly ModernSynergyDefinition[] = [
  {
    id: 'passport-press',
    title: 'Passport Press',
    description: 'Stamp 3 apple types while the Highlight channel has an audience.',
    rewardScore: 45,
    rewardGrowth: 0,
    wardTicks: 0,
  },
  {
    id: 'gallery-circuit',
    title: 'Gallery Circuit',
    description: 'Reach Flow tier 2 while Expedition chapter 2 is active.',
    rewardScore: 60,
    rewardGrowth: 1,
    wardTicks: 20,
  },
  {
    id: 'field-producer',
    title: 'Field Producer',
    description: 'Clear an Expedition board and publish at least 6 Highlight clips.',
    rewardScore: 85,
    rewardGrowth: 1,
    wardTicks: 35,
  },
  {
    id: 'danger-column',
    title: 'Danger Column',
    description: 'Eat enemies, build Flow, and make the reel dangerous.',
    rewardScore: 75,
    rewardGrowth: 1,
    wardTicks: 25,
  },
  {
    id: 'whole-canvas',
    title: 'Whole Canvas',
    description: 'Bring Passport, Flow, Expedition, and Highlight Reel into one run identity.',
    rewardScore: 140,
    rewardGrowth: 2,
    wardTicks: 60,
  },
] as const;

export function createModernSynergyState(): ModernSynergyState {
  return {
    unlockedIds: [],
    activeTitle: 'Unsigned Run',
    totalScoreAwarded: 0,
    totalGrowthAwarded: 0,
    bestTier: 0,
  };
}

export function normalizeModernSynergyState(value: unknown): ModernSynergyState {
  if (!isRecord(value)) return createModernSynergyState();
  const unlockedIds = stringList(value.unlockedIds).filter(isModernSynergyId);
  const lastUnlockedId =
    typeof value.lastUnlockedId === 'string' && isModernSynergyId(value.lastUnlockedId)
      ? value.lastUnlockedId
      : undefined;
  return {
    unlockedIds,
    activeTitle: typeof value.activeTitle === 'string' ? value.activeTitle : 'Unsigned Run',
    totalScoreAwarded: positiveInteger(value.totalScoreAwarded),
    totalGrowthAwarded: positiveInteger(value.totalGrowthAwarded),
    bestTier: positiveInteger(value.bestTier),
    lastUnlockedId,
  };
}

export function evaluateModernSynergies(
  currentState: ModernSynergyState,
  context: ModernSynergyContext,
): ModernSynergyUpdate {
  const state: ModernSynergyState = {
    ...currentState,
    unlockedIds: [...currentState.unlockedIds],
  };
  const unlocked: ModernSynergyDefinition[] = [];
  for (const synergy of SYNERGIES) {
    if (!state.unlockedIds.includes(synergy.id) && isSynergyUnlocked(synergy.id, context, state)) {
      state.unlockedIds.push(synergy.id);
      unlocked.push(synergy);
    }
  }

  const scoreBonus = unlocked.reduce((sum, synergy) => sum + synergy.rewardScore, 0);
  const growthBonus = unlocked.reduce((sum, synergy) => sum + synergy.rewardGrowth, 0);
  const wardTicks = unlocked.reduce((max, synergy) => Math.max(max, synergy.wardTicks), 0);
  state.totalScoreAwarded += scoreBonus;
  state.totalGrowthAwarded += growthBonus;
  state.bestTier = calculateIdentityTier(context, state);
  if (unlocked.length > 0) {
    state.lastUnlockedId = unlocked[unlocked.length - 1]?.id;
  }
  state.activeTitle = chooseRunTitle(context, state);

  return {
    state,
    unlocked,
    scoreBonus,
    growthBonus,
    wardTicks,
    messages: unlocked.map(
      (synergy) =>
        `SYNERGY: ${synergy.title}. +${synergy.rewardScore} score${
          synergy.rewardGrowth > 0 ? `, +${synergy.rewardGrowth} growth` : ''
        }${synergy.wardTicks > 0 ? `, ${synergy.wardTicks} ward ticks` : ''}.`,
    ),
  };
}

export function getModernSynergySummary(
  state: ModernSynergyState,
  context: ModernSynergyContext,
): string {
  return `${state.activeTitle}; Synergies ${state.unlockedIds.length}; Identity T${state.bestTier}; ${summarizeContext(
    context,
  )}`;
}

export function getModernSynergyDefinitions(): readonly ModernSynergyDefinition[] {
  return SYNERGIES;
}

function isSynergyUnlocked(
  id: ModernSynergyId,
  context: ModernSynergyContext,
  state: ModernSynergyState,
): boolean {
  const { modernRun, highlightReel, expeditionBoard } = context;
  switch (id) {
    case 'passport-press':
      return modernRun.passport.appleTypeIds.length >= 3 && highlightReel.channel.subscribers >= 10;
    case 'gallery-circuit':
      return modernRun.flow.bestTier >= 2 && expeditionBoard.chapter >= 2;
    case 'field-producer':
      return expeditionBoard.completedChapters >= 1 && highlightReel.clips.length >= 6;
    case 'danger-column':
      return (
        modernRun.counters.enemies >= 3 &&
        modernRun.flow.bestTier >= 2 &&
        highlightReel.channel.hype >= 35
      );
    case 'whole-canvas':
      return (
        state.unlockedIds.length >= 3 &&
        modernRun.passport.appleTypeIds.length >= 6 &&
        expeditionBoard.completedChapters >= 1 &&
        highlightReel.channel.rank >= 2
      );
  }
}

function chooseRunTitle(context: ModernSynergyContext, state: ModernSynergyState): string {
  if (state.unlockedIds.includes('whole-canvas')) return 'Whole Canvas Run';
  if (state.unlockedIds.includes('field-producer')) return 'Field Producer Run';
  if (state.unlockedIds.includes('danger-column')) return 'Danger Column Run';
  if (state.unlockedIds.includes('gallery-circuit')) return 'Gallery Circuit Run';
  if (state.unlockedIds.includes('passport-press')) return 'Passport Press Run';
  if (context.modernRun.flow.bestTier >= 3) return 'Gallery Flow Run';
  if (context.highlightReel.channel.rank >= 1) return 'Highlight Run';
  if (context.expeditionBoard.chapter > 1) return 'Expedition Run';
  return 'Unsigned Run';
}

function calculateIdentityTier(context: ModernSynergyContext, state: ModernSynergyState): number {
  const score =
    state.unlockedIds.length +
    Math.min(3, context.modernRun.flow.bestTier) +
    Math.min(3, Math.floor(context.modernRun.passport.appleTypeIds.length / 3)) +
    Math.min(3, context.highlightReel.channel.rank) +
    Math.min(3, context.expeditionBoard.completedChapters);
  return Math.min(10, score);
}

function summarizeContext(context: ModernSynergyContext): string {
  return `Flow T${context.modernRun.flow.bestTier}, Passport ${context.modernRun.passport.appleTypeIds.length}, Subscribers ${context.highlightReel.channel.subscribers}, Expedition C${context.expeditionBoard.chapter}`;
}

function isModernSynergyId(value: string): value is ModernSynergyId {
  return SYNERGIES.some((synergy) => synergy.id === value);
}

function positiveInteger(value: unknown): number {
  const numeric = Number(value ?? 0);
  return Number.isFinite(numeric) ? Math.max(0, Math.floor(numeric)) : 0;
}

function stringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((entry): entry is string => typeof entry === 'string'))].sort();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
