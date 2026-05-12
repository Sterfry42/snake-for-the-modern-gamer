import { Quest } from '../quest.js';
import type { QuestRuntime } from '../quest.js';

class FishermanQuest extends Quest {
  constructor() {
    super('fisherman', 'Deep Waters', 'Hunt 5 fish in the sunken ocean');
  }

  override isCompleted(runtime: QuestRuntime): boolean {
    return this.progressSinceAccept(runtime, 'fishHunted') >= 5;
  }

  protected override baselineKeys(): readonly string[] {
    return ['fishHunted'];
  }

  override onReward(runtime: QuestRuntime): void {
    runtime.addScore(20);
    runtime.addItem('cooked-fish', 3);
  }
}

export default new FishermanQuest();
