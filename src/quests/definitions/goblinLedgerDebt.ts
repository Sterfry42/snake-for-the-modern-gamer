import { Quest } from '../quest.js';
import type { QuestRuntime } from '../quest.js';

class GoblinLedgerDebtQuest extends Quest {
  constructor() {
    super(
      'goblin-ledger-debt',
      'Goblin Ledger Debt',
      'Find the missing goblin ledger-stamp and return it before the clerk decides your spine is acceptable collateral.',
    );
  }

  override isCompleted(_runtime: QuestRuntime): boolean {
    return false;
  }

  override onReward(runtime: QuestRuntime): void {
    runtime.addScore(18);
    runtime.addCardToCollection?.('goblin-receipt', 1);
  }
}

export default new GoblinLedgerDebtQuest();
