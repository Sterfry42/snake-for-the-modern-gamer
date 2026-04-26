import { Quest } from "../quest.js";
import type { QuestRuntime } from "../quest.js";

class ExplorerTenQuest extends Quest {
  constructor() {
    super("explore-10-rooms", "Trailblazer", "Visit 10 unique rooms");
  }

  override isCompleted(runtime: QuestRuntime): boolean {
    return this.progressSinceAccept(runtime, "roomsVisited") >= 10;
  }

  protected override baselineKeys(): readonly string[] {
    return ["roomsVisited"];
  }

  override onReward(runtime: QuestRuntime): void {
    runtime.addScore(35);
  }
}

export default new ExplorerTenQuest();
