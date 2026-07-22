import { Quest } from '../quest.js';
import type { QuestRuntime } from '../quest.js';

class FindMyBabyQuest extends Quest {
  constructor() {
    super(
      'find-my-baby',
      'Find My Baby',
      'Find the missing baby and bring it back to the grieving stranger.',
    );
  }

  override isCompleted(runtime: QuestRuntime): boolean {
    void runtime;
    return false;
  }

  override onReward(runtime: QuestRuntime): void {
    runtime.addItem('amulet-baby-bottle', 1);
  }
}

export default new FindMyBabyQuest();
