import { Quest } from '../quest.js';
import type { QuestRuntime } from '../quest.js';

/**
 * Quest: catch fish in 5 different biomes.
 * Tracks progress by counting unique biomeIds in the catch journal.
 */
class BiomeExplorerQuest extends Quest {
  constructor() {
    super('biome-explorer', "Angler's Atlas", 'Catch fish in 5 different biomes');
  }

  override isCompleted(runtime: QuestRuntime): boolean {
    const journal = runtime.getCatchJournal?.();
    if (!journal) return false;
    const biomes = new Set(journal.getEntries().map((e) => e.biomeId));
    return biomes.size >= 5;
  }

  override onReward(runtime: QuestRuntime): void {
    runtime.addScore(25);
  }
}

export default new BiomeExplorerQuest();
