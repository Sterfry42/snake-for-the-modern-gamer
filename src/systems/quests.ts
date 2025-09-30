import { getQuestRegistry } from "../../quests.js";

export async function createQuestRegistry() {
  const registry = getQuestRegistry();
  await registry.loadBuiltIns();
  return registry;
}
