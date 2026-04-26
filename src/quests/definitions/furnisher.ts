import { Quest } from "../quest.js";
import type { QuestRuntime } from "../quest.js";

class FurnisherQuest extends Quest {
  constructor() {
    super("buy-2-upgrades", "Furnisher", "Buy 2 house upgrades");
  }

  override isCompleted(runtime: QuestRuntime): boolean {
    return this.progressSinceAccept(runtime, "house.itemsPurchased") >= 2;
  }

  protected override baselineKeys(): readonly string[] {
    return ["house.itemsPurchased"];
  }

  override onReward(runtime: QuestRuntime): void {
    runtime.addScore(20);
  }
}

export default new FurnisherQuest();
