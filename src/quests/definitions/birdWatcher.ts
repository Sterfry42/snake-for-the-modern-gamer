import { Quest } from '../quest.js';
import type { QuestRuntime } from '../quest.js';

class BirdWatcherQuest extends Quest {
  constructor() {
    super('bird-watcher', 'Feathered Friends', 'Spot 3 different animal types');
  }

  override isCompleted(runtime: QuestRuntime): boolean {
    return this.progressSinceAccept(runtime, 'animalsDiscovered') >= 3;
  }

  protected override baselineKeys(): readonly string[] {
    return ['animalsDiscovered'];
  }

  override onReward(runtime: QuestRuntime): void {
    runtime.addScore(15);
    runtime.addItem('feather', 3);
  }
}

export default new BirdWatcherQuest();
