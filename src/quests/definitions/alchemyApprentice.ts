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
      'Craft 5 different types of potions and discover 3 new recipes.',
    );
  }

  override isCompleted(runtime: QuestRuntime): boolean {
    const potionsCrafted = this.progressSinceAccept(runtime, 'potionsCrafted');
    const recipesDiscovered = this.progressSinceAccept(runtime, 'recipesDiscovered');
    return potionsCrafted >= 5 && recipesDiscovered >= 3;
  }

  protected override baselineKeys(): readonly string[] {
    return ['potionsCrafted', 'recipesDiscovered'];
  }

  override onReward(runtime: QuestRuntime): void {
    runtime.addScore(50);
    runtime.addItem('ingredient-gold-apple', 2);
    runtime.addItem('ingredient-quartz', 3);
  }
}

export default new AlchemyApprenticeQuest();
