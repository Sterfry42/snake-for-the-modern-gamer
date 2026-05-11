import { Quest } from '../quest.js';
import type { QuestRuntime } from '../quest.js';

class FreakYouQuest extends Quest {
  constructor() {
    super(
      'freak-you',
      'Freak You',
      'Protect a terrified time traveler from the future version of you that learned how to hunt backward.',
    );
  }

  override isCompleted(_runtime: QuestRuntime): boolean {
    return false;
  }

  override onReward(runtime: QuestRuntime): void {
    runtime.addItem('amulet-time-splinter', 1);
  }
}

export default new FreakYouQuest();
