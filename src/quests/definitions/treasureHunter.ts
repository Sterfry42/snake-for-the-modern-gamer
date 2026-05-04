import { Quest } from "../quest.js";
import type { QuestRuntime } from "../quest.js";

class TreasureHunterQuest extends Quest {
  constructor() {
    super("treasure-hunter", "Treasure Hunter", "Pick up 2 treasure chests");
  }

  override isCompleted(runtime: QuestRuntime): boolean {
    return this.progressSinceAccept(runtime, "treasurePicked") >= 2;
  }

  protected override baselineKeys(): readonly string[] {
    return ["treasurePicked"];
  }

  override onReward(runtime: QuestRuntime): void {
    runtime.addScore(25);
    runtime.addItem("cloak-firebreak", 1);
  }
}

export default new TreasureHunterQuest();
