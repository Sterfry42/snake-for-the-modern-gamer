import { Quest } from '../quest.js';
import type { QuestRuntime } from '../quest.js';
import { normalizeTamedTypes } from '../../animals/companions.js';

class WolfTamerQuest extends Quest {
  constructor() {
    super('wolf-tamer', 'Trusty Companion', 'Tame a wolf using a lead');
  }

  override isCompleted(runtime: QuestRuntime): boolean {
    return normalizeTamedTypes(runtime.getFlag('animals.tamedTypes')).includes('wolf');
  }

  override onReward(runtime: QuestRuntime): void {
    runtime.addScore(45);
    runtime.addItem('lead', 1);
  }
}

export default new WolfTamerQuest();
