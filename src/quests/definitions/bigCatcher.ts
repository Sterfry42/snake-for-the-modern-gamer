import { Quest } from '../quest.js';
import type { QuestRuntime, CatchJournalAccess } from '../quest.js';

/**
 * Quest: catch a fish weighing 5.0 kg or more.
 * This is a has-achieved quest — checks if any journal entry has weight >= 5.0.
 */
class BigCatcherQuest extends Quest {
  constructor() {
    super('big-catcher', 'The Big One', 'Catch a fish weighing at least 5.0 kg');
  }

  override isCompleted(runtime: QuestRuntime): boolean {
    const journal = runtime.getCatchJournal?.();
    if (!journal) return false;
    const entries = journal.getEntries();
    return entries.some((e) => e.weight >= 5.0);
  }

  override onReward(runtime: QuestRuntime): void {
    runtime.addScore(30);
  }
}

export default new BigCatcherQuest();
