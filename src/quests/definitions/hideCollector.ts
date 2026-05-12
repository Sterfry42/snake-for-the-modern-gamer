import { Quest } from '../quest.js';
import type { QuestRuntime } from '../quest.js';

class HideCollectorQuest extends Quest {
  constructor() {
    super('hide-collector', 'Tough Hide', 'Collect 5 hides from hunted animals');
  }

  override isCompleted(runtime: QuestRuntime): boolean {
    return this.progressSinceAccept(runtime, 'hideCollected') >= 5;
  }

  protected override baselineKeys(): readonly string[] {
    return ['hideCollected'];
  }

  override onReward(runtime: QuestRuntime): void {
    runtime.addScore(25);
    runtime.addItem('cooked-meat', 3);
  }
}

export default new HideCollectorQuest();
