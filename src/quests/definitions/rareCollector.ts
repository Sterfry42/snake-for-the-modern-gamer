import { Quest } from '../quest.js';
import type { QuestRuntime } from '../quest.js';

/**
 * Quest: collect 3 different rare+ fish types.
 * Tracks progress by counting distinct typeIds where rarity is rare or legendary.
 */
class RareCollectorQuest extends Quest {
  constructor() {
    super('rare-collector', 'Rare Collection', 'Collect 3 different rare or legendary fish types');
  }

  override isCompleted(runtime: QuestRuntime): boolean {
    const journal = runtime.getCatchJournal?.();
    if (!journal) return false;
    const entries = journal.getEntries();
    const rarePlus = entries.filter((e) => e.rarity === 'rare' || e.rarity === 'legendary');
    const uniqueTypes = new Set(rarePlus.map((e) => e.typeId));
    return uniqueTypes.size >= 3;
  }

  override onReward(runtime: QuestRuntime): void {
    runtime.addScore(35);
  }
}

export default new RareCollectorQuest();
