import { Quest } from '../quest.js';
import type { QuestRuntime } from '../quest.js';

class ExplorerQuest extends Quest {
  constructor() {
    super('explore-6-rooms', 'Explorer', 'Visit 6 unique rooms');
  }

  override isCompleted(runtime: QuestRuntime): boolean {
    return this.progressSinceAccept(runtime, 'roomsVisited') >= 6;
  }

  protected override baselineKeys(): readonly string[] {
    return ['roomsVisited'];
  }

  override onReward(runtime: QuestRuntime): void {
    runtime.addScore(20);
  }
}

export default new ExplorerQuest();
