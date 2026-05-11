import { Quest } from "../quests/quest.js";
import type { QuestRuntime } from "../quests/quest.js";

class EatApplesQuest extends Quest {
  constructor() {
    super("eat-5-apples", "Novice Eater", "Eat 5 apples");
  }

  override isCompleted(runtime: QuestRuntime): boolean {
    return this.progressSinceAccept(runtime, "applesEaten") >= 5;
  }

  override onReward(runtime: QuestRuntime): void {
    runtime.addScore(10);
  }
}

export default new EatApplesQuest();