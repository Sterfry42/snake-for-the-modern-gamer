import { Quest } from "../quest.js";
import type { QuestRuntime } from "../quest.js";

class EatApplesTwelveQuest extends Quest {
  constructor() {
    super("eat-12-apples", "Hungry", "Eat 12 apples");
  }

  override isCompleted(runtime: QuestRuntime): boolean {
    return this.progressSinceAccept(runtime, "applesEaten") >= 12;
  }

  protected override baselineKeys(): readonly string[] {
    return ["applesEaten"];
  }

  override onReward(runtime: QuestRuntime): void {
    runtime.addScore(25);
  }
}

export default new EatApplesTwelveQuest();
