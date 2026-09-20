import type {
  ArcadeAppleType,
  ArcadeQuest,
  ArcadeQuestId,
  ArcadeRandom,
  ArcadeSnakeRunState,
  ArcadeTickEvent,
} from './arcadeSnakeTypes.js';

type QuestTemplate = Pick<ArcadeQuest, 'id' | 'label' | 'target' | 'rewardXp'>;

const QUESTS: readonly QuestTemplate[] = [
  { id: 'regular-apples', label: 'Eat 3 regular apples', target: 3, rewardXp: 10 },
  { id: 'golden-apples', label: 'Eat 2 golden apples', target: 2, rewardXp: 10 },
  { id: 'scurry-apple', label: 'Eat 1 scurry apple', target: 1, rewardXp: 10 },
  { id: 'grow-length', label: 'Add 10 length', target: 10, rewardXp: 10 },
  { id: 'screen-loops', label: 'Loop around the screen 5 times', target: 5, rewardXp: 10 },
  { id: 'survive', label: 'Survive 30 seconds', target: 30, rewardXp: 10 },
  { id: 'reach-score', label: 'Reach score 20', target: 20, rewardXp: 10 },
  { id: 'no-left-apples', label: 'Eat 3 apples without turning left', target: 3, rewardXp: 10 },
  {
    id: 'long-snake-apples',
    label: 'Eat 2 apples while length is at least 10',
    target: 2,
    rewardXp: 10,
  },
];

export function maybeAddArcadeQuest(
  state: ArcadeSnakeRunState,
  rng: ArcadeRandom,
): ArcadeTickEvent[] {
  if (state.score < 5 || state.quests.filter((quest) => !quest.completed).length >= 2) return [];
  const milestone = state.score === 5 ? 5 : Math.floor(state.score / 10) * 10;
  if (milestone < 5 || milestone <= state.lastQuestRollScore) return [];
  state.lastQuestRollScore = milestone;
  if (rng() >= 0.35) return [];
  const activeIds = new Set(state.quests.map((quest) => quest.id));
  const available = QUESTS.filter((quest) => !activeIds.has(quest.id));
  const template = available[Math.floor(rng() * available.length)];
  if (!template) return [];
  const quest: ArcadeQuest = {
    ...template,
    progress: template.id === 'reach-score' ? state.score : 0,
    completed: false,
    startedAtScore: state.score,
    startedAtTick: state.tick,
  };
  state.quests.push(quest);
  return [{ type: 'quest-added', quest: { ...quest } }];
}

export function updateArcadeQuests(
  state: ArcadeSnakeRunState,
  trigger: { type: 'apple'; appleType: ArcadeAppleType } | { type: 'loop' } | { type: 'tick' },
): ArcadeTickEvent[] {
  const events: ArcadeTickEvent[] = [];
  for (const quest of state.quests) {
    if (quest.completed) continue;
    const before = quest.progress;
    switch (quest.id) {
      case 'regular-apples':
        if (trigger.type === 'apple' && trigger.appleType === 'regular') quest.progress += 1;
        break;
      case 'golden-apples':
        if (trigger.type === 'apple' && trigger.appleType === 'golden') quest.progress += 1;
        break;
      case 'scurry-apple':
        if (trigger.type === 'apple' && trigger.appleType === 'scurry') quest.progress += 1;
        break;
      case 'grow-length':
        quest.progress = Math.max(0, state.snake.length - 3);
        break;
      case 'screen-loops':
        if (trigger.type === 'loop') quest.progress += 1;
        break;
      case 'survive':
        quest.progress = Math.floor(state.elapsedMs / 1000);
        break;
      case 'reach-score':
        quest.progress = state.score;
        break;
      case 'no-left-apples':
        quest.progress = state.applesEatenWithoutLeft;
        break;
      case 'long-snake-apples':
        if (trigger.type === 'apple' && state.snake.length >= 10) quest.progress += 1;
        break;
    }
    quest.progress = Math.min(quest.target, quest.progress);
    if (before < quest.target && quest.progress >= quest.target) {
      quest.completed = true;
      state.xp += quest.rewardXp;
      state.questsCompletedThisRun += 1;
      events.push({ type: 'quest-complete', questId: quest.id, label: quest.label });
    }
  }
  return events;
}

export function formatArcadeQuest(quest: ArcadeQuest): string {
  return `${quest.completed ? '[x]' : '[ ]'} ${quest.label} (${quest.progress}/${quest.target})`;
}

export function getArcadeQuestTemplates(): readonly { id: ArcadeQuestId; label: string }[] {
  return QUESTS;
}
