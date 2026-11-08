import { Quest, type QuestRuntime } from '../quest.js';

/** Branch-specific rewards and consequences are resolved by the story quest runtime. */
class CrystalClauseQuest extends Quest {
  constructor() {
    super('crystal-clause', 'The Crystal Clause', 'Accept a wizard\'s commission, then choose what becomes of the goblins.');
  }
  override isCompleted(_runtime: QuestRuntime): boolean {
    return false;
  }
}

export default new CrystalClauseQuest();
