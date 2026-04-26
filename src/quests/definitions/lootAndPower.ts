import { Quest } from "../quest.js";
import type { QuestRuntime } from "../quest.js";

class LootAndPowerQuest extends Quest {
  constructor() {
    super("loot-and-power", "Loot & Power", "Grab a treasure and a powerup");
  }

  override isCompleted(runtime: QuestRuntime): boolean {
    const treasure = this.progressSinceAccept(runtime, "treasurePicked");
    const powerups = this.progressSinceAccept(runtime, "powerupsPicked");
    return treasure >= 1 && powerups >= 1;
  }

  protected override baselineKeys(): readonly string[] {
    return ["treasurePicked", "powerupsPicked"];
  }

  override onReward(runtime: QuestRuntime): void {
    runtime.addScore(25);
  }
}

export default new LootAndPowerQuest();
