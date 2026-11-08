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
  giverRoomId?: string;
  giverActorId?: string;
  outcome?: string;
  originOutcome?: string;
}

export interface StoryQuestTarget {
  actorId: string;
  role: string;
  species: string;
}

export interface StoryQuestAction {
  key: string;
  label: string;
  description: string;
  stages: readonly string[];
  roles?: readonly string[];
  species?: readonly string[];
  originOutcomes?: readonly string[];
  requiresCounter?: { key: string; atLeast: number };
  incrementCounter?: string;
  uniqueActor?: boolean;
  bindGiver?: boolean;
  requiresGiver?: boolean;
  nextStage?: string;
  advanceWhen?: { counter: string; atLeast: number; stage: string };
  outcome?: string;
}

export interface StoryQuestDefinition {
  id: string;
  label: string;
  initialStage: string;
  actions: readonly StoryQuestAction[];
  nextQuest?: { id: string; outcomes: readonly string[] };
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

export function availableStoryActions(
  definition: StoryQuestDefinition,
  state: StoryQuestState,
  target: StoryQuestTarget,
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
): StoryQuestTransition | null {
  const action = availableStoryActions(definition, state, target).find(
    (candidate) => candidate.key === actionKey,
  );
  if (!action) return null;
  const counters = { ...state.counters };
  if (action.incrementCounter) {
    counters[action.incrementCounter] = (counters[action.incrementCounter] ?? 0) + 1;
  }
  const stage =
    action.advanceWhen &&
    (counters[action.advanceWhen.counter] ?? 0) >= action.advanceWhen.atLeast
      ? action.advanceWhen.stage
      : (action.nextStage ?? state.stage);
  return {
    action,
    state: {
      ...state,
      counters,
      stage,
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
  nextQuest: {
    id: 'crystal-aftermath',
    outcomes: ['delivered', 'reported', 'freed'],
  },
  actions: [
    {
      key: 'accept',
      label: 'Accept the crystal commission',
      description: 'The wizard gives you two binding crystals. His payment is suspiciously generous.',
      stages: ['offered'],
      roles: ['wizard'],
      bindGiver: true,
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
  actions: [
    {
      key: 'confess',
      label: 'Confess the wizard\'s scheme',
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
      label: 'Accept the wizard\'s hush money',
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
      label: 'Collect the goblins\' gratitude',
      description: 'The goblin merchants offer a ward for defending their people.',
      stages: ['followup'],
      species: ['goblin'],
      originOutcomes: ['reported', 'freed'],
      nextStage: 'completed',
      outcome: 'reconciled',
    },
  ],
};

export const STORY_QUESTS: readonly StoryQuestDefinition[] = [
  CRYSTAL_CLAUSE,
  CRYSTAL_AFTERMATH,
];
