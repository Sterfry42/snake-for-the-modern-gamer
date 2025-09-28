import { Quest } from "./src/quests/quest.js";
import { QuestRegistry } from "./src/quests/questRegistry.js";

const globalRegistry = new QuestRegistry();

export { Quest };
export type { QuestRuntime } from "./src/quests/quest.js";

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
