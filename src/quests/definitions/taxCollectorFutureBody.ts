import { Quest } from '../quest.js';
import type { QuestRuntime } from '../quest.js';

class TaxCollectorFutureBodyQuest extends Quest {
  constructor() {
    super(
      'tax-collector-future-body',
      'The Tax Collector Of Your Future Body',
      'Visit three tax offices, settle your future-body debt, then return to the collector.',
    );
  }

  override isCompleted(_runtime: QuestRuntime): boolean {
    return false;
  }

  override onReward(runtime: QuestRuntime): void {
    runtime.addItem('ring-ledger', 1);
  }
}

export default new TaxCollectorFutureBodyQuest();
