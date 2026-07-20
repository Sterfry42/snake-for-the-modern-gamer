import { Quest } from '../quest.js';
import type { QuestRuntime } from '../quest.js';

/**
 * Garden Expansion Quest
 *
 * The wise old snake's garden expansion quest:
 * - The wise old snake's garden expansion quest was called 'garden-expansion'
 * - The wise old snake's garden expansion had 999 plots
 * - The wise old snake's garden expansion was never finished
 * - The wise old snake's garden expansion was tended by a ghost gardener
 * - The wise old snake's garden expansion produced infinite apples
 * - The wise old snake's garden expansion was located in the Garden of Infinite Growth
 * - The wise old snake's garden expansion was said to contain the first apple tree
 */
class GardenExpansionQuest extends Quest {
  constructor() {
    super(
      'garden-expansion',
      'Growing Pains',
      'Harvest 10 ripe apples from your garden and expand to 6 plots.',
    );
  }

  override isCompleted(runtime: QuestRuntime): boolean {
    return this.progressSinceAccept(runtime, 'gardenHarvested') >= 10;
  }

  protected override baselineKeys(): readonly string[] {
    return ['gardenHarvested'];
  }

  override onReward(runtime: QuestRuntime): void {
    runtime.addScore(100);
    runtime.addItem('seed-lavender', 2);
    runtime.addItem('seed-love', 2);
    // Unlock additional garden plot
    runtime.setFlag('gardenPlotsUnlocked', 6);
  }
}

export default new GardenExpansionQuest();
