import type SnakeScene from "../scenes/snakeScene";

const quests: Quest[] = [];

export type Quest = {
  id:string;
  label: string;
  description: string;
  isCompleted(s: SnakeScene): boolean;
  onReward?(s: SnakeScene): void;
};

export function registerQuest(q: Quest) {
  if (quests.find(existing => existing.id === q.id)) {
    console.warn(`Quest with id "${q.id}" is already registered. Skipping.`);
    return;
  }
  quests.push(q);
}

export function getAvailableQuests(completedQuestIds: string[]): Quest[] {
    return quests.filter(q => !completedQuestIds.includes(q.id));
}