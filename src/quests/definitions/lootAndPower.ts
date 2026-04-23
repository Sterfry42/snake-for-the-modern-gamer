import { Quest } from "../quest.js";
import type { QuestRuntime } from "../quest.js";

class LootAndPowerQuest extends Quest {
  constructor() {
    super("loot-and-power", "Loot & Power", "Grab a treasure and a powerup");
  }

  override isCompleted(runtime: QuestRuntime): boolean {
    const treasure = Number(runtime.getFlag<number>("treasurePicked") ?? 0);
    const powerups = Number(runtime.getFlag<number>("powerupsPicked") ?? 0);
    return treasure >= 1 && powerups >= 1;
  }

  override onReward(runtime: QuestRuntime): void {
    runtime.addScore(25);
  }
}

export default new LootAndPowerQuest();
