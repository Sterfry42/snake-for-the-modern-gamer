import { Quest } from '../quest.js';
import type { QuestRuntime } from '../quest.js';

class HoneyCollectorQuest extends Quest {
  constructor() {
    super('honey-collector', 'Sweet Tooth', 'Collect 3 honey from bears');
  }

  override isCompleted(runtime: QuestRuntime): boolean {
    return this.progressSinceAccept(runtime, 'honeyCollected') >= 3;
  }

  protected override baselineKeys(): readonly string[] {
    return ['honeyCollected'];
  }

  override onReward(runtime: QuestRuntime): void {
    runtime.addScore(35);
    runtime.addItem('honey', 2);
  }
}

export default new HoneyCollectorQuest();
