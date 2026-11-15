import { Quest } from '../quest.js';
import type { QuestRuntime } from '../quest.js';
import { normalizeTamedTypes } from '../../animals/companions.js';

class TameTheFoxQuest extends Quest {
  constructor() {
    super('tame-the-fox', 'Wild and Free', 'Tame a fox using a rope');
  }

  override isCompleted(runtime: QuestRuntime): boolean {
    return normalizeTamedTypes(runtime.getFlag('animals.tamedTypes')).includes('fox');
  }

  override onReward(runtime: QuestRuntime): void {
    runtime.addScore(30);
    runtime.addCosmeticReward('style', 'goblin-hide');
  }
}

export default new TameTheFoxQuest();
