/**
 * Alchemy Basics Quest
 */

import { Quest } from '../quest.js';
import type { QuestRuntime } from '../quest.js';

class AlchemyBasicsQuest extends Quest {
  constructor() {
    super(
      'alchemy-basics',
      'First Steps in Alchemy',
      'Craft your first potion at an alchemy station.',
    );
  }

  override isCompleted(runtime: QuestRuntime): boolean {
    return this.progressSinceAccept(runtime, 'potionsCrafted') >= 1;
  }

  protected override baselineKeys(): readonly string[] {
    return ['potionsCrafted'];
  }

  override onReward(runtime: QuestRuntime): void {
    runtime.addScore(25);
    runtime.addItem('ingredient-dew', 3);
    runtime.addItem('ingredient-mint', 2);
  }
}

export default new AlchemyBasicsQuest();
