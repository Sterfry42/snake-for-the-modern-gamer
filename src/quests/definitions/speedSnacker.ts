import { Quest } from "../quest.js";
import type { QuestRuntime } from "../quest.js";

class SpeedSnackerQuest extends Quest {
  constructor() {
    super("speed-snacker", "Speed Snacker", "Eat 3 apples in quick succession");
  }

  override isCompleted(runtime: QuestRuntime): boolean {
    return this.progressSinceAccept(runtime, "applesEaten") >= 3 && (runtime.getFlag<number>("appleStreak") ?? 0) >= 3;
  }

  protected override baselineKeys(): readonly string[] {
    return ["applesEaten"];
  }

  override onReward(runtime: QuestRuntime): void {
    runtime.addScore(25);
  }
}

export default new SpeedSnackerQuest();
