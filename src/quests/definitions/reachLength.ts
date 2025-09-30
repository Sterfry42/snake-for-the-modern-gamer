import { Quest } from "../quest.js";
import type { QuestRuntime } from "../quest.js";

class ReachLengthQuest extends Quest {
  constructor() {
    super("reach-length-10", "Stretch Goal", "Grow your snake to length 10");
  }

  override isCompleted(runtime: QuestRuntime): boolean {
    return runtime.getSnakeLength() >= 10;
  }

  override onReward(runtime: QuestRuntime): void {
    runtime.addScore(15);
  }
}

export default new ReachLengthQuest();
