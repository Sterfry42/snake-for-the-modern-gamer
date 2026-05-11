import { Quest } from '../../quests.js';
import type { QuestRuntime } from '../../quests.js';

class ReachLengthTenQuest extends Quest {
  constructor() {
    super('reach-length-10', 'Getting Longer', 'Grow to a length of 10');
  }

  override isCompleted(runtime: QuestRuntime): boolean {
    return runtime.getSnakeLength() >= 10;
  }

  override onReward(runtime: QuestRuntime): void {
    runtime.addScore(15);
  }
}

export default new ReachLengthTenQuest();
