import { Quest } from "../quest.js";
import type { QuestRuntime } from "../quest.js";

class ScoreFiftyQuest extends Quest {
  constructor() {
    super("score-50", "Rookie Points", "Reach a score of 50");
  }

  override isCompleted(runtime: QuestRuntime): boolean {
    return runtime.getScore() >= 50;
  }

  override onReward(runtime: QuestRuntime): void {
    runtime.addScore(15);
    runtime.addCosmeticReward("style", "charcoal-silk");
  }
}

export default new ScoreFiftyQuest();
