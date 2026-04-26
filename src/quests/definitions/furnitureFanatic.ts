import { Quest } from "../quest.js";
import type { QuestRuntime } from "../quest.js";

class FurnitureFanaticQuest extends Quest {
  constructor() {
    super("buy-4-upgrades", "Furniture Fanatic", "Buy 4 house upgrades");
  }

  override isCompleted(runtime: QuestRuntime): boolean {
    return this.progressSinceAccept(runtime, "house.itemsPurchased") >= 4;
  }

  protected override baselineKeys(): readonly string[] {
    return ["house.itemsPurchased"];
  }

  override onReward(runtime: QuestRuntime): void {
    runtime.addScore(35);
  }
}

export default new FurnitureFanaticQuest();
