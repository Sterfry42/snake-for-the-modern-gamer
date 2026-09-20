import { Quest } from '../quest.js';
import type { QuestRuntime } from '../quest.js';

class TradeMasterQuest extends Quest {
  constructor() {
    super('trade-master', 'Trade Master', 'Make 20 purchases at animal markets');
  }

  override isCompleted(runtime: QuestRuntime): boolean {
    return this.progressSinceAccept(runtime, 'marketPurchases') >= 20;
  }

  protected override baselineKeys(): readonly string[] {
    return ['marketPurchases'];
  }

  override onReward(runtime: QuestRuntime): void {
    runtime.addScore(125);
    runtime.addItem('trade-goods', 10);
  }
}

export default new TradeMasterQuest();
