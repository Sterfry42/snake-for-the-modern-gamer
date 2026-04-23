import { Quest } from "../quest.js";
import type { QuestRuntime } from "../quest.js";

class ExplorerQuest extends Quest {
  constructor() {
    super("explore-6-rooms", "Explorer", "Visit 6 unique rooms");
  }

  override isCompleted(runtime: QuestRuntime): boolean {
    return (runtime.getFlag<number>("roomsVisited") ?? 0) >= 6;
  }

  override onReward(runtime: QuestRuntime): void {
    runtime.addScore(20);
  }
}

export default new ExplorerQuest();
