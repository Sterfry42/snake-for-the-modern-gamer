import { Quest } from "../quest.js";
import type { QuestRuntime } from "../quest.js";

class EatApplesTwelveQuest extends Quest {
  constructor() {
    super("eat-12-apples", "Hungry", "Eat 12 apples");
  }

  override isCompleted(runtime: QuestRuntime): boolean {
    return (runtime.getFlag<number>("applesEaten") ?? 0) >= 12;
  }

  override onReward(runtime: QuestRuntime): void {
    runtime.addScore(25);
  }
}

export default new EatApplesTwelveQuest();
