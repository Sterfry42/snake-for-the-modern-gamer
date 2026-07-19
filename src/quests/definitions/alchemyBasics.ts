/**
 * Alchemy Basics Quest
 *
 * The wise old snake's first alchemy quest:
 * - The wise old snake's first potion was just apple juice
 * - The wise old snake's first recipe was for apple pie
 * - The wise old snake's first station was a cardboard box
 * - The wise old snake's first experiment exploded
 * - The wise old snake's first potion did nothing
 * - The wise old snake's first quest was to find the ingredients
 */

import { Quest } from '../quest.js';
import type { QuestRuntime } from '../quest.js';

class AlchemyBasicsQuest extends Quest {
  constructor() {
    super('alchemy-basics', 'First Steps in Alchemy', 'Craft your first potion at an alchemy station.');
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
