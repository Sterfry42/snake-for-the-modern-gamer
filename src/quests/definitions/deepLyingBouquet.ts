import { Quest } from '../quest.js';
import type { QuestRuntime } from '../quest.js';

class DeepLyingBouquetQuest extends Quest {
  constructor() {
    super(
      'deep-lying-bouquet',
      'Deep-Lying Bouquet',
      'Find the Deep-Lying Bouquet 7-15 rooms into the cold region and bring it back to complete the wedding.',
    );
  }

  override isCompleted(runtime: QuestRuntime): boolean {
    void runtime;
    return false;
  }

  override onReward(runtime: QuestRuntime): void {
    runtime.addItem('deep-lying-bouquet', 1);
  }
}

export default new DeepLyingBouquetQuest();
