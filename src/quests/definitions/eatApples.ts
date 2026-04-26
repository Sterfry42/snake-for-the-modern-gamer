import { Quest } from "../quest.js";
import type { QuestRuntime } from "../quest.js";

class EatApplesQuest extends Quest {
  constructor() {
    super("eat-5-apples", "Novice Eater", "Eat 5 apples");
  }

  override isCompleted(runtime: QuestRuntime): boolean {
    return this.progressSinceAccept(runtime, "applesEaten") >= 5;
  }

  protected override baselineKeys(): readonly string[] {
    return ["applesEaten"];
  }

  override onReward(runtime: QuestRuntime): void {
    runtime.addScore(10);
  }
}

export default new EatApplesQuest();
