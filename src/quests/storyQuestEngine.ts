import type { ActorPersonalityTag } from '../actors/actorTypes.js';

/**
 * Data-driven staged stories. The game owns actor state, karma, currencies and events;
 * this module only decides which contextual verbs exist and advances quest state.
 * States are JSON-serializable and safe to persist through SnakeGame flags.
 */
export interface StoryQuestState {
  questId: string;
  stage: string;
  counters: Record<string, number>;
  usedActorIds: string[];
  /** Real world counters at the moment the player accepted this chapter. */
  worldBaselines?: Record<string, number>;
  /** The actual chosen verb at each stage; used to distinguish facts from forgeries. */
  choiceHistory?: Record<string, string>;
  giverRoomId?: string;
  giverActorId?: string;
  outcome?: string;
  originOutcome?: string;
}

export interface StoryQuestTarget {
  actorId: string;
  role: string;
  species: string;
  personality?: readonly ActorPersonalityTag[];
  trust?: number;
  score?: number;
  /** Authoritative gameplay counters, never client-submitted. */
  worldCounters?: Readonly<Record<string, number>>;
}

export interface StoryQuestPrerequisite {
  questId: string;
  outcomes: readonly string[];
}

export interface StoryQuestAction {
  key: string;
  label: string;
  description: string;
  stages: readonly string[];
  roles?: readonly string[];
  species?: readonly string[];
  originOutcomes?: readonly string[];
  requiresOutcomes?: readonly StoryQuestPrerequisite[];
  personalityAny?: readonly ActorPersonalityTag[];
  minTrust?: number;
  minScore?: number;
  requiresWorldProgress?: { key: string; increase: number };
  requiresChoice?: { stage: string; actions: readonly string[] };
  characterLines?: Partial<Record<ActorPersonalityTag, string>>;
  acceptQuest?: boolean;
  requiresCounter?: { key: string; atLeast: number };
  counterBelow?: { key: string; limit: number };
  incrementCounter?: string;
  uniqueActor?: boolean;
  bindGiver?: boolean;
  requiresGiver?: boolean;
  nextStage?: string;
  advanceWhen?: { counter: string; atLeast: number; stage: string };
  advanceWhenAll?: { counters: readonly string[]; atLeast: number; stage: string };
  outcome?: string;
}

export interface StoryQuestDefinition {
  id: string;
  label: string;
  description?: string;
  initialStage: string;
  actions: readonly StoryQuestAction[];
  nextQuest?: { id: string; outcomes: readonly string[] };
  prerequisites?: readonly StoryQuestPrerequisite[];
  inheritGiver?: boolean;
  objectives?: Readonly<Record<string, readonly string[]>>;
  worldObjectives?: Readonly<
    Record<string, readonly { key: string; increase: number; label: string }[]>
  >;
  /** A discovered feature that can be visited to satisfy real gameplay objectives. */
  worldDestination?: {
    stage: string;
    feature: 'molemanDigSite' | 'goblinCamp';
    label: string;
    counter: { key: string; increase: number };
  };
  returnStages?: readonly string[];
}

export interface StoryQuestTransition {
  state: StoryQuestState;
  action: StoryQuestAction;
}

export function createStoryQuestState(
  definition: StoryQuestDefinition,
  originOutcome?: string,
): StoryQuestState {
  return {
    questId: definition.id,
    stage: definition.initialStage,
    counters: {},
    usedActorIds: [],
    ...(originOutcome ? { originOutcome } : {}),
  };
}

export function storyActionId(questId: string, actionKey: string): string {
  return `quest:${questId}:${actionKey}`;
}

export type StoryQuestStateLookup = (questId: string) => StoryQuestState | null;

export function storyQuestIsUnlocked(
  definition: StoryQuestDefinition,
  lookup: StoryQuestStateLookup,
): boolean {
  return (definition.prerequisites ?? []).every((requirement) => {
    const previous = lookup(requirement.questId);
    return (
      previous?.stage === 'completed' &&
      Boolean(previous.outcome && requirement.outcomes.includes(previous.outcome))
    );
  });
}

export function initializeUnlockedStory(
  definition: StoryQuestDefinition,
  lookup: StoryQuestStateLookup,
): StoryQuestState | null {
  if (!storyQuestIsUnlocked(definition, lookup)) return null;
  const first = definition.prerequisites?.[0];
  const previous = first ? lookup(first.questId) : null;
  return {
    ...createStoryQuestState(definition, previous?.outcome),
    ...(definition.inheritGiver && previous?.giverActorId
      ? { giverActorId: previous.giverActorId, giverRoomId: previous.giverRoomId }
      : {}),
  };
}

export function storyQuestCharacterLine(
  action: StoryQuestAction,
  target: StoryQuestTarget,
): string | undefined {
  for (const tag of target.personality ?? []) {
    const line = action.characterLines?.[tag];
    if (line) return line;
  }
  return undefined;
}

export function storyQuestObjectives(
  definition: StoryQuestDefinition,
  state: StoryQuestState,
  worldCounters: Readonly<Record<string, number>> = {},
): string[] {
  if (state.stage === 'completed') {
    return [`[x] ${state.outcome ?? 'Resolved'} — the world remembers`];
  }
  if (state.stage === 'declined') return ['[x] Refused'];
  const stages = (definition.objectives?.[state.stage] ?? ['[ ] Speak with someone involved']).map(
    (line) =>
      line.replace(/\{([a-zA-Z]+)\}/g, (_match, key: string) => String(state.counters[key] ?? 0)),
  );
  const progress = (definition.worldObjectives?.[state.stage] ?? []).map((goal) => {
    const baseline = state.worldBaselines?.[goal.key];
    const current = worldCounters[goal.key];
    const earned =
      baseline === undefined || !Number.isFinite(current) ? 0 : Math.max(0, current - baseline);
    return `[${earned >= goal.increase ? 'x' : ' '}] ${goal.label} (${Math.min(earned, goal.increase)}/${goal.increase})`;
  });
  return [...stages, ...progress];
}

export function availableStoryActions(
  definition: StoryQuestDefinition,
  state: StoryQuestState,
  target: StoryQuestTarget,
  lookup: StoryQuestStateLookup = () => null,
): StoryQuestAction[] {
  if (
    state.questId !== definition.id ||
    state.stage === 'completed' ||
    state.stage === 'declined'
  ) {
    return [];
  }
  return definition.actions.filter((action) => {
    if (!action.stages.includes(state.stage)) return false;
    if (action.roles && !action.roles.includes(target.role)) return false;
    if (action.species && !action.species.includes(target.species)) return false;
    if (action.originOutcomes && !action.originOutcomes.includes(state.originOutcome ?? '')) {
      return false;
    }
    if (
      action.requiresOutcomes?.some((requirement) => {
        const previous = lookup(requirement.questId);
        return (
          previous?.stage !== 'completed' ||
          !previous.outcome ||
          !requirement.outcomes.includes(previous.outcome)
        );
      })
    )
      return false;
    if (
      action.personalityAny &&
      !action.personalityAny.some((tag) => target.personality?.includes(tag))
    )
      return false;
    if (action.minTrust !== undefined && (target.trust ?? 0) < action.minTrust) return false;
    if (action.minScore !== undefined && (target.score ?? 0) < action.minScore) return false;
    if (
      action.requiresChoice &&
      !action.requiresChoice.actions.includes(
        state.choiceHistory?.[action.requiresChoice.stage] ?? '',
      )
    )
      return false;
    if (action.requiresWorldProgress) {
      const baseline = state.worldBaselines?.[action.requiresWorldProgress.key];
      const current = target.worldCounters?.[action.requiresWorldProgress.key];
      if (
        baseline === undefined ||
        current === undefined ||
        !Number.isFinite(current) ||
        current - baseline < action.requiresWorldProgress.increase
      ) {
        return false;
      }
    }
    if (
      action.counterBelow &&
      (state.counters[action.counterBelow.key] ?? 0) >= action.counterBelow.limit
    )
      return false;
    if (action.requiresCounter) {
      if ((state.counters[action.requiresCounter.key] ?? 0) < action.requiresCounter.atLeast) {
        return false;
      }
    }
    if (action.requiresGiver && state.giverActorId !== target.actorId) return false;
    if (action.uniqueActor && state.usedActorIds.includes(target.actorId)) return false;
    return true;
  });
}

/** Revalidate against authoritative state at execution time; never trust menu input. */
export function applyStoryAction(
  definition: StoryQuestDefinition,
  state: StoryQuestState,
  target: StoryQuestTarget,
  actionKey: string,
  lookup: StoryQuestStateLookup = () => null,
): StoryQuestTransition | null {
  const action = availableStoryActions(definition, state, target, lookup).find(
    (candidate) => candidate.key === actionKey,
  );
  if (!action) return null;
  const counters = { ...state.counters };
  let worldBaselines = state.worldBaselines;
  if (action.acceptQuest && !worldBaselines) {
    worldBaselines = {};
    for (const requirement of definition.actions) {
      const key = requirement.requiresWorldProgress?.key;
      if (key) {
        worldBaselines[key] = Math.max(0, target.worldCounters?.[key] ?? 0);
      }
    }
  }
  if (action.incrementCounter) {
    counters[action.incrementCounter] = (counters[action.incrementCounter] ?? 0) + 1;
  }
  const stage =
    action.advanceWhenAll &&
    action.advanceWhenAll.counters.every(
      (counter) => (counters[counter] ?? 0) >= action.advanceWhenAll!.atLeast,
    )
      ? action.advanceWhenAll.stage
      : action.advanceWhen &&
          (counters[action.advanceWhen.counter] ?? 0) >= action.advanceWhen.atLeast
        ? action.advanceWhen.stage
        : (action.nextStage ?? state.stage);
  return {
    action,
    state: {
      ...state,
      counters,
      stage,
      choiceHistory: { ...state.choiceHistory, [state.stage]: action.key },
      ...(worldBaselines ? { worldBaselines } : {}),
      usedActorIds: action.uniqueActor
        ? [...state.usedActorIds, target.actorId]
        : [...state.usedActorIds],
      ...(action.outcome ? { outcome: action.outcome } : {}),
      ...(action.bindGiver ? { giverActorId: target.actorId } : {}),
    },
  };
}

export function nextStoryQuestId(
  definition: StoryQuestDefinition,
  state: StoryQuestState,
): string | null {
  return state.stage === 'completed' &&
    state.outcome &&
    definition.nextQuest?.outcomes.includes(state.outcome)
    ? definition.nextQuest.id
    : null;
}

/** A single data-driven story with multiple endings and a follow-up chapter. */
export const CRYSTAL_CLAUSE: StoryQuestDefinition = {
  id: 'crystal-clause',
  label: 'The Crystal Clause',
  initialStage: 'offered',
  objectives: {
    offered: ['[ ] Speak with a wizard about the crystal commission'],
    hunting: ['[ ] Bind two goblins ({captured}/2) or report the wizard'],
    ready: [
      '[x] Bound goblins ({captured}/2)',
      '[ ] Deliver crystals, report the wizard, or free the prisoners',
    ],
  },
  returnStages: ['ready'],
  nextQuest: {
    id: 'crystal-aftermath',
    outcomes: ['delivered', 'reported', 'freed'],
  },
  actions: [
    {
      key: 'accept',
      label: 'Accept the crystal commission',
      description:
        'The wizard gives you two binding crystals. His payment is suspiciously generous.',
      stages: ['offered'],
      roles: ['wizard'],
      bindGiver: true,
      acceptQuest: true,
      nextStage: 'hunting',
    },
    {
      key: 'decline',
      label: 'Refuse the wizard',
      description: 'No payment, no victims, no obligation.',
      stages: ['offered'],
      roles: ['wizard'],
      nextStage: 'declined',
      outcome: 'declined',
    },
    {
      key: 'imprison',
      label: 'Imprison goblin in crystal',
      description: 'Use an enchanted binding crystal. The goblin will be held until freed.',
      stages: ['hunting'],
      species: ['goblin'],
      incrementCounter: 'captured',
      uniqueActor: true,
      advanceWhen: { counter: 'captured', atLeast: 2, stage: 'ready' },
    },
    {
      key: 'report',
      label: 'Report the wizard to the guard',
      description: 'Expose the illegal experiment. Modest reward; the goblins are released.',
      stages: ['hunting', 'ready'],
      roles: ['guard', 'gateGuard'],
      species: ['human'],
      nextStage: 'completed',
      outcome: 'reported',
    },
    {
      key: 'free',
      label: 'Free the captured goblins',
      description: 'Break the binding crystals and set every captive free.',
      stages: ['hunting', 'ready'],
      species: ['goblin'],
      requiresCounter: { key: 'captured', atLeast: 1 },
      nextStage: 'completed',
      outcome: 'freed',
    },
    {
      key: 'deliver',
      label: 'Deliver both imprisoned goblins',
      description: 'Collect a large payment, at the cost of two prisoners and your conscience.',
      stages: ['ready'],
      roles: ['wizard'],
      requiresGiver: true,
      requiresCounter: { key: 'captured', atLeast: 2 },
      nextStage: 'completed',
      outcome: 'delivered',
    },
  ],
};

/** A real second chapter whose choices depend on the first chapter's outcome. */
export const CRYSTAL_AFTERMATH: StoryQuestDefinition = {
  id: 'crystal-aftermath',
  label: 'After the Crystals',
  initialStage: 'followup',
  inheritGiver: true,
  prerequisites: [{ questId: 'crystal-clause', outcomes: ['delivered', 'reported', 'freed'] }],
  objectives: {
    followup: ['[ ] Settle the consequences of the bound goblins'],
  },
  actions: [
    {
      key: 'confess',
      label: "Confess the wizard's scheme",
      description: 'Admit your part in the imprisonment to a town guard.',
      stages: ['followup'],
      roles: ['guard', 'gateGuard'],
      species: ['human'],
      originOutcomes: ['delivered'],
      nextStage: 'completed',
      outcome: 'atoned',
    },
    {
      key: 'silence',
      label: "Accept the wizard's hush money",
      description: 'Agree that the victims were simply a clerical misunderstanding.',
      stages: ['followup'],
      roles: ['wizard'],
      requiresGiver: true,
      originOutcomes: ['delivered'],
      nextStage: 'completed',
      outcome: 'complicit',
    },
    {
      key: 'reparation',
      label: "Collect the goblins' gratitude",
      description: 'The goblin merchants offer a ward for defending their people.',
      stages: ['followup'],
      species: ['goblin'],
      originOutcomes: ['reported', 'freed'],
      nextStage: 'completed',
      outcome: 'reconciled',
    },
  ],
};

export const STORY_QUESTS: readonly StoryQuestDefinition[] = [CRYSTAL_CLAUSE, CRYSTAL_AFTERMATH];
