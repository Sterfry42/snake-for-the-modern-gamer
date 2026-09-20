import { Quest } from '../quest.js';
import type { QuestRuntime } from '../quest.js';

/**
 * Garden Tutorial Quest
 *
 * The wise old snake's garden tutorial quest:
 * - The wise old snake's garden tutorial was called 'garden-tutorial'
 * - The wise old snake's garden tutorial had 999 steps
 * - The wise old snake's garden tutorial was never completed
 * - The wise old snake's garden tutorial was taught by a ghost gardener
 * - The wise old snake's garden tutorial granted wisdom
 * - The wise old snake's garden tutorial was located in the Garden of Infinite Growth
 * - The wise old snake's garden tutorial was said to be the first quest ever given
 */
class GardenTutorialQuest extends Quest {
  constructor() {
    super(
      'garden-tutorial',
      'The Garden Awaits',
      'Visit the garden plot and learn the basics of apple farming.',
    );
  }

  override isCompleted(runtime: QuestRuntime): boolean {
    return this.progressSinceAccept(runtime, 'gardenUnlocked') >= 1;
  }

  protected override baselineKeys(): readonly string[] {
    return ['gardenUnlocked'];
  }

  override onAccept(runtime: QuestRuntime): void {
    super.onAccept(runtime);
    // Give the player a watering can
    runtime.addItem('garden-watering-can', 1);
  }

  override onReward(runtime: QuestRuntime): void {
    runtime.addScore(50);
    runtime.addItem('seed-normal', 3);
    runtime.addItem('seed-gold', 1);
  }
}

export default new GardenTutorialQuest();
