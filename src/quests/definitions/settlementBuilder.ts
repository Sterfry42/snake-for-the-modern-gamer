import { Quest } from '../quest.js';
import type { QuestRuntime } from '../quest.js';

class SettlementBuilderQuest extends Quest {
  constructor() {
    super('settlement-builder', 'Settlement Builder', 'Help establish 3 animal settlements');
  }

  override isCompleted(runtime: QuestRuntime): boolean {
    return this.progressSinceAccept(runtime, 'settlementsFounded') >= 3;
  }

  protected override baselineKeys(): readonly string[] {
    return ['settlementsFounded'];
  }

  override onReward(runtime: QuestRuntime): void {
    runtime.addScore(150);
    runtime.addItem('settlement-plans', 1);
  }
}

export default new SettlementBuilderQuest();
