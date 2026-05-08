import { Quest } from "../quest.js";
import type { QuestRuntime } from "../quest.js";

class GreenPurchaseQuest extends Quest {
  constructor() {
    super(
      "green-purchase",
      "The Green Purchase",
      "Find the forest teleporter, buy the radioactive substance 100 depths below, and return before the timer kills you."
    );
  }

  override isCompleted(_runtime: QuestRuntime): boolean {
    return false;
  }

  override onReward(runtime: QuestRuntime): void {
    runtime.addItem("helm-hazard-halo", 1);
  }
}

export default new GreenPurchaseQuest();
