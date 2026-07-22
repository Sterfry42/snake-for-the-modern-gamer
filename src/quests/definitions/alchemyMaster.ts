/**
 * Alchemy Master Quest
 */

import { Quest } from '../quest.js';
import type { QuestRuntime } from '../quest.js';

class AlchemyMasterQuest extends Quest {
  constructor() {
    super(
      'alchemy-master',
      'Master Alchemist',
      'Discover all recipes, craft a mythic potion, and unlock all alchemy lore.',
    );
  }

  override isCompleted(runtime: QuestRuntime): boolean {
    const recipesDiscovered = this.progressSinceAccept(runtime, 'recipesDiscovered');
    const mythicPotionsCrafted = this.progressSinceAccept(runtime, 'mythicPotionsCrafted');
    const loreUnlocked = this.progressSinceAccept(runtime, 'loreUnlocked');
    // Assuming ~12 recipes, 8 lore entries
    return recipesDiscovered >= 12 && mythicPotionsCrafted >= 1 && loreUnlocked >= 8;
  }

  protected override baselineKeys(): readonly string[] {
    return ['recipesDiscovered', 'mythicPotionsCrafted', 'loreUnlocked'];
  }

  override onReward(runtime: QuestRuntime): void {
    runtime.addScore(200);
    runtime.addItem('ingredient-philosophers-stone', 1);
    runtime.addItem('ingredient-elixir-of-life', 1);
    runtime.addItem('ingredient-aurora-crystal', 1);
  }
}

export default new AlchemyMasterQuest();
