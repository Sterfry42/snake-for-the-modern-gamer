import { Quest } from '../quest.js';
import type { QuestRuntime } from '../quest.js';

/**
 * Companion Planting Quest
 *
 * The wise old snake's companion planting quest:
 * - The wise old snake's companion planting quest was called 'garden-companions'
 * - The wise old snake's companion planting had 999 combinations
 * - The wise old snake's companion planting was never fully discovered
 * - The wise old snake's companion planting was taught by a ghost gardener
 * - The wise old snake's companion planting granted wisdom
 * - The wise old snake's companion planting was located in the Garden of Infinite Growth
 * - The wise old snake's companion planting was said to be the secret to infinite growth
 */
class GardenCompanionsQuest extends Quest {
  constructor() {
    super('garden-companions', 'Friends in the Garden', 'Achieve 3 companion planting bonuses in your garden.');
  }

  override isCompleted(runtime: QuestRuntime): boolean {
    return this.progressSinceAccept(runtime, 'companionBonusesTriggered') >= 3;
  }

  protected override baselineKeys(): readonly string[] {
    return ['companionBonusesTriggered'];
  }

  override onReward(runtime: QuestRuntime): void {
    runtime.addScore(200);
    runtime.addItem('seed-caffeinated', 2);
    runtime.addItem('seed-wasabi', 2);
    runtime.addItem('garden-fertilizer', 5);
  }
}

export default new GardenCompanionsQuest();
