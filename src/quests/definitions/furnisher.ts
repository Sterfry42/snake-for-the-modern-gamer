import { Quest } from "../quest.js";
import type { QuestRuntime } from "../quest.js";

class FurnisherQuest extends Quest {
  constructor() {
    super("buy-2-upgrades", "Furnisher", "Buy 2 house upgrades");
  }

  override isCompleted(runtime: QuestRuntime): boolean {
    return (runtime.getFlag<number>("house.itemsPurchased") ?? 0) >= 2;
  }

  override onReward(runtime: QuestRuntime): void {
    runtime.addScore(20);
  }
}

export default new FurnisherQuest();
