import { Quest } from '../quest.js';
import type { QuestRuntime } from '../quest.js';
import { normalizeTamedTypes } from '../../animals/companions.js';

class AnimalAmbassadorQuest extends Quest {
  constructor() {
    super('animal-ambassador', 'Animal Ambassador', 'Tame 5 different animal types');
  }

  override isCompleted(runtime: QuestRuntime): boolean {
    return normalizeTamedTypes(runtime.getFlag('animals.tamedTypes')).length >= 5;
  }

  override onReward(runtime: QuestRuntime): void {
    runtime.addScore(100);
  }
}

export default new AnimalAmbassadorQuest();
