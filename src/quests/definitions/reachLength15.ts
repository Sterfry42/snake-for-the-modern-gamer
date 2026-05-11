import { Quest } from '../quest.js';
import type { QuestRuntime } from '../quest.js';

class ReachLengthFifteenQuest extends Quest {
  constructor() {
    super('reach-length-15', 'Longer Line', 'Grow your snake to length 15');
  }

  override isCompleted(runtime: QuestRuntime): boolean {
    return runtime.getSnakeLength() >= 15;
  }

  override onReward(runtime: QuestRuntime): void {
    runtime.addScore(25);
  }
}

export default new ReachLengthFifteenQuest();
