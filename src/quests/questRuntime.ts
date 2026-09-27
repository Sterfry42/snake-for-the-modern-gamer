import type { Quest } from './quest.js';
import { QuestRegistry } from './questRegistry.js';

const globalRegistry = new QuestRegistry();

export function registerQuest(quest: Quest): void {
  globalRegistry.register(quest);
}

export function getQuestRegistry(): QuestRegistry {
  return globalRegistry;
}

export function getAvailableQuests(completedQuestIds: string[]): Quest[] {
  return globalRegistry.getAvailable(completedQuestIds);
}

export function _clearQuests(): void {
  globalRegistry.clear();
}

export async function createQuestRegistry(): Promise<QuestRegistry> {
  await globalRegistry.loadBuiltIns();
  return globalRegistry;
}
