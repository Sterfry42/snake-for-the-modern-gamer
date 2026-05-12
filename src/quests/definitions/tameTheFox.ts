import { Quest } from '../quest.js';
import type { QuestRuntime } from '../quest.js';

class TameTheFoxQuest extends Quest {
  constructor() {
    super('tame-the-fox', 'Wild and Free', 'Tame a fox using a rope');
  }

  override isCompleted(runtime: QuestRuntime): boolean {
    return this.progressSinceAccept(runtime, 'animalsTamed') >= 1;
  }

  protected override baselineKeys(): readonly string[] {
    return ['animalsTamed'];
  }

  override onReward(runtime: QuestRuntime): void {
    runtime.addScore(30);
    runtime.addCosmeticReward('style', 'goblin-hide');
  }
}

export default new TameTheFoxQuest();
