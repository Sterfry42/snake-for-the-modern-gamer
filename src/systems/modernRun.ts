export type ModernRunEvent =
  | { kind: 'apple'; appleTypeId?: string; streak: number; roomId: string; nowMs: number }
  | { kind: 'room'; roomId: string }
  | { kind: 'enemy'; roomId: string; humanoid: boolean }
  | { kind: 'treasure'; roomId: string };

export type ModernContractKind = 'apples' | 'rooms' | 'uniqueApples' | 'flowTier' | 'enemies';

export interface ModernRunContract {
  id: string;
  kind: ModernContractKind;
  label: string;
  description: string;
  target: number;
  progress: number;
  rewardScore: number;
  completed: boolean;
}

export interface ModernRunFlowState {
  tier: number;
  bestTier: number;
  chain: number;
  bestChain: number;
  lastAppleAtMs?: number;
}

export interface ModernRunPassportState {
  appleTypeIds: string[];
  claimedMilestones: number[];
}

export interface ModernRunCounters {
  apples: number;
  rooms: number;
  enemies: number;
  treasures: number;
}

export interface ModernRunState {
  flow: ModernRunFlowState;
  passport: ModernRunPassportState;
  contracts: ModernRunContract[];
  counters: ModernRunCounters;
}

export interface ModernRunUpdate {
  state: ModernRunState;
  scoreBonus: number;
  growthBonus: number;
  messages: string[];
}

const FLOW_TIERS = [
  { minimumStreak: 3, tier: 1, label: 'Fresh', scoreBonus: 1 },
  { minimumStreak: 5, tier: 2, label: 'Hot', scoreBonus: 3 },
  { minimumStreak: 8, tier: 3, label: 'Gallery', scoreBonus: 6 },
] as const;

const PASSPORT_MILESTONES = [
  { uniqueTypes: 3, score: 15, growth: 0 },
  { uniqueTypes: 6, score: 40, growth: 1 },
  { uniqueTypes: 10, score: 90, growth: 2 },
] as const;

const DEFAULT_CONTRACTS: readonly ModernRunContract[] = [
  {
    id: 'modern.contract.apple-run',
    kind: 'apples',
    label: 'Snack Sprint',
    description: 'Eat 5 apples this run.',
    target: 5,
    progress: 0,
    rewardScore: 25,
    completed: false,
  },
  {
    id: 'modern.contract.block-party',
    kind: 'rooms',
    label: 'Block Party',
    description: 'Visit 4 rooms.',
    target: 4,
    progress: 0,
    rewardScore: 30,
    completed: false,
  },
  {
    id: 'modern.contract.curator',
    kind: 'uniqueApples',
    label: 'Apple Curator',
    description: 'Catalog 3 different apple types.',
    target: 3,
    progress: 0,
    rewardScore: 35,
    completed: false,
  },
  {
    id: 'modern.contract.flow-state',
    kind: 'flowTier',
    label: 'Flow State',
    description: 'Reach Flow tier 2.',
    target: 2,
    progress: 0,
    rewardScore: 40,
    completed: false,
  },
  {
    id: 'modern.contract.big-bite',
    kind: 'enemies',
    label: 'Big Bite Energy',
    description: 'Eat 3 enemies.',
    target: 3,
    progress: 0,
    rewardScore: 30,
    completed: false,
  },
];

export function createModernRunState(): ModernRunState {
  return {
    flow: { tier: 0, bestTier: 0, chain: 0, bestChain: 0 },
    passport: { appleTypeIds: [], claimedMilestones: [] },
    contracts: DEFAULT_CONTRACTS.map((contract) => ({ ...contract })),
    counters: { apples: 0, rooms: 1, enemies: 0, treasures: 0 },
  };
}

export function normalizeModernRunState(value: unknown): ModernRunState {
  if (!isRecord(value)) {
    return createModernRunState();
  }
  const base = createModernRunState();
  const flow = isRecord(value.flow) ? value.flow : {};
  const passport = isRecord(value.passport) ? value.passport : {};
  const counters = isRecord(value.counters) ? value.counters : {};
  const savedContracts = Array.isArray(value.contracts) ? value.contracts : [];
  return {
    flow: {
      tier: positiveInteger(flow.tier),
      bestTier: positiveInteger(flow.bestTier),
      chain: positiveInteger(flow.chain),
      bestChain: positiveInteger(flow.bestChain),
      lastAppleAtMs:
        typeof flow.lastAppleAtMs === 'number' && Number.isFinite(flow.lastAppleAtMs)
          ? flow.lastAppleAtMs
          : undefined,
    },
    passport: {
      appleTypeIds: stringList(passport.appleTypeIds),
      claimedMilestones: numberList(passport.claimedMilestones),
    },
    contracts: mergeContracts(savedContracts, base.contracts),
    counters: {
      apples: positiveInteger(counters.apples),
      rooms: Math.max(1, positiveInteger(counters.rooms)),
      enemies: positiveInteger(counters.enemies),
      treasures: positiveInteger(counters.treasures),
    },
  };
}

export function processModernRunEvent(
  currentState: ModernRunState,
  event: ModernRunEvent,
): ModernRunUpdate {
  const state = cloneModernRunState(currentState);
  const messages: string[] = [];
  let scoreBonus = 0;
  let growthBonus = 0;

  if (event.kind === 'apple') {
    state.counters.apples += 1;
    const flow = updateFlow(state.flow, event.streak, event.nowMs);
    state.flow = flow.state;
    if (flow.scoreBonus > 0) {
      scoreBonus += flow.scoreBonus;
      messages.push(
        `FLOW ${flow.label.toUpperCase()}: +${flow.scoreBonus} score for apple chain ${state.flow.chain}.`,
      );
    }
    if (event.appleTypeId) {
      const passport = updatePassport(state.passport, event.appleTypeId);
      state.passport = passport.state;
      scoreBonus += passport.scoreBonus;
      growthBonus += passport.growthBonus;
      messages.push(...passport.messages);
    }
  } else if (event.kind === 'room') {
    state.counters.rooms += 1;
  } else if (event.kind === 'enemy') {
    state.counters.enemies += 1;
    if (event.humanoid) {
      scoreBonus += 2;
      messages.push('STYLE BITE: +2 score for eating trouble with paperwork.');
    }
  } else {
    state.counters.treasures += 1;
    scoreBonus += 3;
    messages.push('TREASURE SPOTLIGHT: +3 score. The room noticed.');
  }

  const contract = updateContracts(state);
  state.contracts = contract.contracts;
  scoreBonus += contract.scoreBonus;
  messages.push(...contract.messages);

  return {
    state,
    scoreBonus,
    growthBonus,
    messages,
  };
}

export function getModernRunSummary(state: ModernRunState): string {
  const activeContracts = state.contracts
    .map((contract) => {
      const marker = contract.completed ? 'done' : `${contract.progress}/${contract.target}`;
      return `${contract.label}: ${marker}`;
    })
    .join(' | ');
  return `Flow T${state.flow.tier} best T${state.flow.bestTier}; Passport ${state.passport.appleTypeIds.length}; ${activeContracts}`;
}

function updateFlow(
  flow: ModernRunFlowState,
  streak: number,
  nowMs: number,
): { state: ModernRunFlowState; scoreBonus: number; label: string } {
  const tier = FLOW_TIERS.reduce(
    (best, candidate) => (streak >= candidate.minimumStreak ? candidate : best),
    { minimumStreak: 0, tier: 0, label: 'Warmup', scoreBonus: 0 },
  );
  const chain =
    flow.lastAppleAtMs !== undefined && nowMs - flow.lastAppleAtMs <= 1500 ? flow.chain + 1 : 1;
  return {
    state: {
      tier: tier.tier,
      bestTier: Math.max(flow.bestTier, tier.tier),
      chain,
      bestChain: Math.max(flow.bestChain, chain),
      lastAppleAtMs: nowMs,
    },
    scoreBonus: tier.scoreBonus,
    label: tier.label,
  };
}

function updatePassport(
  passport: ModernRunPassportState,
  appleTypeId: string,
): {
  state: ModernRunPassportState;
  scoreBonus: number;
  growthBonus: number;
  messages: string[];
} {
  if (passport.appleTypeIds.includes(appleTypeId)) {
    return { state: passport, scoreBonus: 0, growthBonus: 0, messages: [] };
  }
  const next: ModernRunPassportState = {
    appleTypeIds: [...passport.appleTypeIds, appleTypeId].sort(),
    claimedMilestones: [...passport.claimedMilestones],
  };
  let scoreBonus = 0;
  let growthBonus = 0;
  const messages = [`APPLE PASSPORT: ${formatAppleType(appleTypeId)} stamped.`];
  for (const milestone of PASSPORT_MILESTONES) {
    if (
      next.appleTypeIds.length >= milestone.uniqueTypes &&
      !next.claimedMilestones.includes(milestone.uniqueTypes)
    ) {
      next.claimedMilestones.push(milestone.uniqueTypes);
      scoreBonus += milestone.score;
      growthBonus += milestone.growth;
      messages.push(
        `PASSPORT ${milestone.uniqueTypes}: +${milestone.score} score${
          milestone.growth > 0 ? `, +${milestone.growth} growth` : ''
        }.`,
      );
    }
  }
  next.claimedMilestones.sort((a, b) => a - b);
  return { state: next, scoreBonus, growthBonus, messages };
}

function updateContracts(state: ModernRunState): {
  contracts: ModernRunContract[];
  scoreBonus: number;
  messages: string[];
} {
  let scoreBonus = 0;
  const messages: string[] = [];
  const contracts = state.contracts.map((contract) => {
    if (contract.completed) return contract;
    const progress = contractProgress(state, contract.kind);
    if (progress < contract.target) {
      return { ...contract, progress };
    }
    scoreBonus += contract.rewardScore;
    messages.push(`CONTRACT COMPLETE: ${contract.label}. +${contract.rewardScore} score.`);
    return { ...contract, progress: contract.target, completed: true };
  });
  return { contracts, scoreBonus, messages };
}

function contractProgress(state: ModernRunState, kind: ModernContractKind): number {
  switch (kind) {
    case 'apples':
      return state.counters.apples;
    case 'rooms':
      return state.counters.rooms;
    case 'uniqueApples':
      return state.passport.appleTypeIds.length;
    case 'flowTier':
      return state.flow.bestTier;
    case 'enemies':
      return state.counters.enemies;
  }
}

function mergeContracts(
  savedContracts: unknown[],
  defaultContracts: ModernRunContract[],
): ModernRunContract[] {
  const savedById = new Map(
    savedContracts.filter(isRecord).map((contract) => [String(contract.id ?? ''), contract]),
  );
  return defaultContracts.map((contract) => {
    const saved = savedById.get(contract.id);
    if (!saved) return contract;
    return {
      ...contract,
      progress: Math.min(contract.target, positiveInteger(saved.progress)),
      completed: Boolean(saved.completed),
    };
  });
}

function cloneModernRunState(state: ModernRunState): ModernRunState {
  return {
    flow: { ...state.flow },
    passport: {
      appleTypeIds: [...state.passport.appleTypeIds],
      claimedMilestones: [...state.passport.claimedMilestones],
    },
    contracts: state.contracts.map((contract) => ({ ...contract })),
    counters: { ...state.counters },
  };
}

function formatAppleType(typeId: string): string {
  return typeId
    .split(/[-_.]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function positiveInteger(value: unknown): number {
  const numeric = Number(value ?? 0);
  return Number.isFinite(numeric) ? Math.max(0, Math.floor(numeric)) : 0;
}

function stringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((entry): entry is string => typeof entry === 'string'))].sort();
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
