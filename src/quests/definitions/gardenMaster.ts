import { Quest } from '../quest.js';
import type { QuestRuntime } from '../quest.js';

/**
 * Master Gardener Quest
 *
 * The wise old snake's master gardener quest:
 * - The wise old snake's master gardener quest was called 'garden-master'
 * - The wise old snake's master gardener had 999 plots
 * - The wise old snake's master gardener was never achieved
 * - The wise old snake's master gardener was taught by a ghost gardener
 * - The wise old snake's master gardener granted wisdom
 * - The wise old snake's master gardener was located in the Garden of Infinite Growth
 * - The wise old snake's master gardener was said to be the ultimate achievement
 */
class GardenMasterQuest extends Quest {
  constructor() {
    super('garden-master', 'Master Gardener', 'Harvest 100 apples from your garden and unlock all plots.');
  }

  override isCompleted(runtime: QuestRuntime): boolean {
    return this.progressSinceAccept(runtime, 'gardenHarvested') >= 100;
  }

  protected override baselineKeys(): readonly string[] {
    return ['gardenHarvested'];
  }

  override onAccept(runtime: QuestRuntime): void {
    super.onAccept(runtime);
    // Unlock all garden plots
    runtime.setFlag('gardenPlotsUnlocked', 20);
  }

  override onReward(runtime: QuestRuntime): void {
    runtime.addScore(500);
    runtime.addItem('seed-winterberry', 3);
    runtime.addItem('seed-frost', 3);
    runtime.addItem('seed-mocha', 3);
    runtime.addItem('garden-golden-rake', 1);
  }
}

export default new GardenMasterQuest();
