import { Quest } from '../quest.js';
import type { QuestRuntime } from '../quest.js';
import { normalizeAnimalCompanions } from '../../animals/companions.js';

/**
 * Counts the deer currently in the player's companion herd. The herd state
 * lives in `animals.companions`; the old `tamedDeerCount` mirror flag was
 * never written, which made the quest impossible.
 */
function countTamedDeerCompanions(runtime: QuestRuntime): number {
  const companions = normalizeAnimalCompanions(runtime.getFlag('animals.companions'));
  return companions.filter((companion) => companion.type === 'deer').length;
}

class HerdMasterQuest extends Quest {
  constructor() {
    super('herd-master', 'Herd Master', 'Have 3 tamed deer following you at once');
  }

  override isCompleted(runtime: QuestRuntime): boolean {
    return countTamedDeerCompanions(runtime) >= 3;
  }

  override onReward(runtime: QuestRuntime): void {
    runtime.addScore(50);
    runtime.addItem('rope', 2);
    runtime.addItem('lead', 1);
  }
}

export default new HerdMasterQuest();
