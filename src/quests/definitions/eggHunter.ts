import { Quest } from '../quest.js';
import type { QuestRuntime } from '../quest.js';

class EggHunterQuest extends Quest {
  constructor() {
    super('egg-hunter', 'Egg Hunter', 'Collect 3 bird eggs');
  }

  override isCompleted(runtime: QuestRuntime): boolean {
    return this.progressSinceAccept(runtime, 'eggsCollected') >= 3;
  }

  protected override baselineKeys(): readonly string[] {
    return ['eggsCollected'];
  }

  override onReward(runtime: QuestRuntime): void {
    runtime.addScore(20);
    runtime.addItem('egg', 1);
  }
}

export default new EggHunterQuest();
