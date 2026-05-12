import { Quest } from '../quest.js';
import type { QuestRuntime } from '../quest.js';

class WolfTamerQuest extends Quest {
  constructor() {
    super('wolf-tamer', 'Trusty Companion', 'Tame a wolf using a lead');
  }

  override isCompleted(runtime: QuestRuntime): boolean {
    return this.progressSinceAccept(runtime, 'animalsTamed') >= 1;
  }

  protected override baselineKeys(): readonly string[] {
    return ['animalsTamed'];
  }

  override onReward(runtime: QuestRuntime): void {
    runtime.addScore(45);
    runtime.addItem('lead', 1);
  }
}

export default new WolfTamerQuest();
