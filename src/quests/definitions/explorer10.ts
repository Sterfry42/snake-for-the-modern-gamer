import { Quest } from "../quest.js";
import type { QuestRuntime } from "../quest.js";

class ExplorerTenQuest extends Quest {
  constructor() {
    super("explore-10-rooms", "Trailblazer", "Visit 10 unique rooms");
  }

  override isCompleted(runtime: QuestRuntime): boolean {
    return (runtime.getFlag<number>("roomsVisited") ?? 0) >= 10;
  }

  override onReward(runtime: QuestRuntime): void {
    runtime.addScore(35);
  }
}

export default new ExplorerTenQuest();
