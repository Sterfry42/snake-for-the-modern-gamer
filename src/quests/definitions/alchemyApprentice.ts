/**
 * Alchemy Apprentice Quest
 */

import { Quest } from '../quest.js';
import type { QuestRuntime } from '../quest.js';

class AlchemyApprenticeQuest extends Quest {
  constructor() {
    super(
      'alchemy-apprentice',
      'Alchemy Apprentice',
      'Brew 5 alchemy potions and use 2 of them.',
    );
  }

  override isCompleted(runtime: QuestRuntime): boolean {
    const potionsCrafted = this.progressSinceAccept(runtime, 'potionsCrafted');
    const potionsUsed = this.progressSinceAccept(runtime, 'potionsUsed');
    return potionsCrafted >= 5 && potionsUsed >= 2;
  }

  protected override baselineKeys(): readonly string[] {
    return ['potionsCrafted', 'potionsUsed'];
  }

  override onReward(runtime: QuestRuntime): void {
    runtime.addScore(50);
    runtime.addItem('ingredient-gold-apple', 2);
    runtime.addItem('ingredient-quartz', 3);
  }
}

export default new AlchemyApprenticeQuest();
