import type { ModernRunEvent } from './modernRun.js';

export type ExpeditionObjectiveKind =
  | 'apples'
  | 'rooms'
  | 'treasures'
  | 'enemies'
  | 'flowApple'
  | 'humanoidEnemies';

export interface ExpeditionObjective {
  id: string;
  kind: ExpeditionObjectiveKind;
  label: string;
  description: string;
  target: number;
  progress: number;
  rewardScore: number;
  rewardGrowth: number;
  completed: boolean;
}

export interface ExpeditionBoardState {
  chapter: number;
  completedChapters: number;
  boardCompletions: number;
  objectives: ExpeditionObjective[];
  claimedChapterRewards: number[];
}

export interface ExpeditionBoardUpdate {
  state: ExpeditionBoardState;
  scoreBonus: number;
  growthBonus: number;
  wardTicks: number;
  messages: string[];
}

const OBJECTIVE_LIBRARY: readonly Omit<ExpeditionObjective, 'progress' | 'completed'>[] = [
  {
    id: 'expedition.snack-column',
    kind: 'apples',
    label: 'Snack Column',
    description: 'Eat apples for the food desk.',
    target: 6,
    rewardScore: 24,
    rewardGrowth: 0,
  },
  {
    id: 'expedition.street-map',
    kind: 'rooms',
    label: 'Street Map',
    description: 'Visit rooms and prove the map has legs.',
    target: 5,
    rewardScore: 28,
    rewardGrowth: 0,
  },
  {
    id: 'expedition.lightbox-loot',
    kind: 'treasures',
    label: 'Lightbox Loot',
    description: 'Open treasure while the camera is rolling.',
    target: 2,
    rewardScore: 30,
    rewardGrowth: 0,
  },
  {
    id: 'expedition-mouth-feel',
    kind: 'enemies',
    label: 'Mouth Feel',
    description: 'Eat enemies. Very direct criticism.',
    target: 3,
    rewardScore: 27,
    rewardGrowth: 1,
  },
  {
    id: 'expedition-gallery-pace',
    kind: 'flowApple',
    label: 'Gallery Pace',
    description: 'Eat apples while Flow is tier 2 or higher.',
    target: 3,
    rewardScore: 35,
    rewardGrowth: 0,
  },
  {
    id: 'expedition-red-sauce',
    kind: 'humanoidEnemies',
    label: 'Red Sauce Review',
    description: 'Eat hostile humanoids.',
    target: 2,
    rewardScore: 32,
    rewardGrowth: 1,
  },
];

const CHAPTER_REWARDS = [
  { chapter: 1, score: 40, growth: 0, wardTicks: 0 },
  { chapter: 2, score: 70, growth: 1, wardTicks: 30 },
  { chapter: 3, score: 110, growth: 1, wardTicks: 60 },
] as const;

export function createExpeditionBoardState(chapter = 1): ExpeditionBoardState {
  return {
    chapter,
    completedChapters: 0,
    boardCompletions: 0,
    objectives: createChapterObjectives(chapter),
    claimedChapterRewards: [],
  };
}

export function normalizeExpeditionBoardState(value: unknown): ExpeditionBoardState {
  if (!isRecord(value)) return createExpeditionBoardState();
  const chapter = Math.max(1, positiveInteger(value.chapter) || 1);
  const defaults = createChapterObjectives(chapter);
  const savedObjectives = Array.isArray(value.objectives) ? value.objectives : [];
  return {
    chapter,
    completedChapters: positiveInteger(value.completedChapters),
    boardCompletions: positiveInteger(value.boardCompletions),
    objectives: mergeObjectives(savedObjectives, defaults),
    claimedChapterRewards: numberList(value.claimedChapterRewards),
  };
}

export function processExpeditionEvent(
  currentState: ExpeditionBoardState,
  event: ModernRunEvent,
): ExpeditionBoardUpdate {
  const state = cloneExpeditionBoardState(currentState);
  const messages: string[] = [];
  let scoreBonus = 0;
  let growthBonus = 0;
  let wardTicks = 0;

  state.objectives = state.objectives.map((objective) => {
    if (objective.completed || !eventAdvancesObjective(event, objective)) {
      return objective;
    }
    const nextProgress = Math.min(objective.target, objective.progress + 1);
    if (nextProgress < objective.target) {
      return { ...objective, progress: nextProgress };
    }
    scoreBonus += objective.rewardScore;
    growthBonus += objective.rewardGrowth;
    messages.push(
      `EXPEDITION COMPLETE: ${objective.label}. +${objective.rewardScore} score${
        objective.rewardGrowth > 0 ? `, +${objective.rewardGrowth} growth` : ''
      }.`,
    );
    return { ...objective, progress: objective.target, completed: true };
  });

  if (state.objectives.every((objective) => objective.completed)) {
    state.boardCompletions += 1;
    const reward = getChapterReward(state.chapter);
    if (!state.claimedChapterRewards.includes(state.chapter)) {
      scoreBonus += reward.score;
      growthBonus += reward.growth;
      wardTicks = Math.max(wardTicks, reward.wardTicks);
      state.claimedChapterRewards.push(state.chapter);
      messages.push(
        `EXPEDITION BOARD CLEARED: Chapter ${state.chapter}. +${reward.score} score${
          reward.growth > 0 ? `, +${reward.growth} growth` : ''
        }${reward.wardTicks > 0 ? `, ${reward.wardTicks} ward ticks` : ''}.`,
      );
    }
    state.completedChapters = Math.max(state.completedChapters, state.chapter);
    state.chapter += 1;
    state.objectives = createChapterObjectives(state.chapter);
  }

  state.claimedChapterRewards.sort((a, b) => a - b);
  return { state, scoreBonus, growthBonus, wardTicks, messages };
}

export function getExpeditionBoardSummary(state: ExpeditionBoardState): string {
  const objectives = state.objectives
    .map((objective) => {
      const progress = objective.completed ? 'done' : `${objective.progress}/${objective.target}`;
      return `${objective.label}: ${progress}`;
    })
    .join(' | ');
  return `Chapter ${state.chapter}; ${objectives}`;
}

function createChapterObjectives(chapter: number): ExpeditionObjective[] {
  const start = (chapter - 1) % OBJECTIVE_LIBRARY.length;
  const selected = [0, 1, 2].map(
    (offset) => OBJECTIVE_LIBRARY[(start + offset) % OBJECTIVE_LIBRARY.length]!,
  );
  return selected.map((definition, index) => ({
    ...definition,
    id: `${definition.id}.chapter-${chapter}`,
    target: scaledTarget(definition.target, chapter, index),
    rewardScore: definition.rewardScore + (chapter - 1) * 8,
    rewardGrowth: definition.rewardGrowth,
    progress: 0,
    completed: false,
  }));
}

function scaledTarget(base: number, chapter: number, index: number): number {
  return Math.max(1, base + Math.floor((chapter - 1) / 2) + (chapter > 3 && index === 2 ? 1 : 0));
}

function eventAdvancesObjective(event: ModernRunEvent, objective: ExpeditionObjective): boolean {
  switch (objective.kind) {
    case 'apples':
      return event.kind === 'apple';
    case 'rooms':
      return event.kind === 'room';
    case 'treasures':
      return event.kind === 'treasure';
    case 'enemies':
      return event.kind === 'enemy';
    case 'flowApple':
      return event.kind === 'apple' && event.streak >= 5;
    case 'humanoidEnemies':
      return event.kind === 'enemy' && event.humanoid;
  }
}

function getChapterReward(chapter: number): {
  score: number;
  growth: number;
  wardTicks: number;
} {
  const listed = CHAPTER_REWARDS.find((reward) => reward.chapter === chapter);
  if (listed) return listed;
  return {
    score: 110 + (chapter - 3) * 30,
    growth: 1 + Math.floor((chapter - 3) / 2),
    wardTicks: 60 + (chapter - 3) * 15,
  };
}

function mergeObjectives(
  savedObjectives: unknown[],
  defaultObjectives: ExpeditionObjective[],
): ExpeditionObjective[] {
  const savedById = new Map(
    savedObjectives.filter(isRecord).map((objective) => [String(objective.id ?? ''), objective]),
  );
  return defaultObjectives.map((objective) => {
    const saved = savedById.get(objective.id);
    if (!saved) return objective;
    return {
      ...objective,
      progress: Math.min(objective.target, positiveInteger(saved.progress)),
      completed: Boolean(saved.completed),
    };
  });
}

function cloneExpeditionBoardState(state: ExpeditionBoardState): ExpeditionBoardState {
  return {
    chapter: state.chapter,
    completedChapters: state.completedChapters,
    boardCompletions: state.boardCompletions,
    objectives: state.objectives.map((objective) => ({ ...objective })),
    claimedChapterRewards: [...state.claimedChapterRewards],
  };
}

function positiveInteger(value: unknown): number {
  const numeric = Number(value ?? 0);
  return Number.isFinite(numeric) ? Math.max(0, Math.floor(numeric)) : 0;
}

function numberList(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  return [
    ...new Set(value.map((entry) => positiveInteger(entry)).filter((entry) => entry > 0)),
  ].sort((a, b) => a - b);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
