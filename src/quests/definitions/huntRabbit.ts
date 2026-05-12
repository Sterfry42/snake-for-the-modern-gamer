import { Quest } from '../quest.js';
import type { QuestRuntime } from '../quest.js';

class HuntRabbitQuest extends Quest {
  constructor() {
    super('hunt-rabbit', 'Rabbit Run', 'Hunt 3 rabbits and collect raw meat');
  }

  override isCompleted(runtime: QuestRuntime): boolean {
    return this.progressSinceAccept(runtime, 'rawMeatCollected') >= 3;
  }

  protected override baselineKeys(): readonly string[] {
    return ['rawMeatCollected'];
  }

  override onReward(runtime: QuestRuntime): void {
    runtime.addScore(15);
    runtime.addItem('rope', 1);
  }
}

export default new HuntRabbitQuest();
