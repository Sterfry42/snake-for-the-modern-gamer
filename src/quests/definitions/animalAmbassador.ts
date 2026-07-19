import { Quest } from '../quest.js';
import type { QuestRuntime } from '../quest.js';

class AnimalAmbassadorQuest extends Quest {
  constructor() {
    super('animal-ambassador', 'Animal Ambassador', 'Tame 5 different animal types');
  }

  override isCompleted(runtime: QuestRuntime): boolean {
    return this.progressSinceAccept(runtime, 'animalsTamed') >= 5;
  }

  protected override baselineKeys(): readonly string[] {
    return ['animalsTamed'];
  }

  override onReward(runtime: QuestRuntime): void {
    runtime.addScore(100);
    runtime.addItem('animal-whistle', 1);
  }
}

export default new AnimalAmbassadorQuest();
