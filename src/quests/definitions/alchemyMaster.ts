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
      'Brew 12 alchemy potions and use 6 of them.',
    );
  }

  override isCompleted(runtime: QuestRuntime): boolean {
    const potionsCrafted = this.progressSinceAccept(runtime, 'potionsCrafted');
    const potionsUsed = this.progressSinceAccept(runtime, 'potionsUsed');
    return potionsCrafted >= 12 && potionsUsed >= 6;
  }

  protected override baselineKeys(): readonly string[] {
    return ['potionsCrafted', 'potionsUsed'];
  }

  override onReward(runtime: QuestRuntime): void {
    runtime.addScore(200);
    runtime.addItem('ingredient-philosophers-stone', 1);
    runtime.addItem('ingredient-elixir-of-life', 1);
    runtime.addItem('ingredient-aurora-crystal', 1);
  }
}

export default new AlchemyMasterQuest();
