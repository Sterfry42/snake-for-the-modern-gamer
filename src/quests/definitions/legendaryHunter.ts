import { Quest } from '../quest.js';
import type { QuestRuntime } from '../quest.js';

/**
 * Quest: catch 2 legendary fish.
 * Counts entries where rarity === 'legendary'.
 */
class LegendaryHunterQuest extends Quest {
  constructor() {
    super('legendary-hunter', 'Legend Chaser', 'Catch 2 legendary fish');
  }

  override isCompleted(runtime: QuestRuntime): boolean {
    const journal = runtime.getCatchJournal?.();
    if (!journal) return false;
    const entries = journal.getEntries();
    const legendaryCount = entries.filter((e) => e.rarity === 'legendary').length;
    return legendaryCount >= 2;
  }

  override onReward(runtime: QuestRuntime): void {
    runtime.addScore(50);
  }
}

export default new LegendaryHunterQuest();
