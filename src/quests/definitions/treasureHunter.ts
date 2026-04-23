import { Quest } from "../quest.js";
import type { QuestRuntime } from "../quest.js";

class TreasureHunterQuest extends Quest {
  constructor() {
    super("treasure-hunter", "Treasure Hunter", "Pick up 2 treasure chests");
  }

  override isCompleted(runtime: QuestRuntime): boolean {
    return (runtime.getFlag<number>("treasurePicked") ?? 0) >= 2;
  }

  override onReward(runtime: QuestRuntime): void {
    runtime.addScore(25);
  }
}

export default new TreasureHunterQuest();
