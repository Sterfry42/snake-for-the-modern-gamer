import { Quest } from '../quest.js';
import type { QuestRuntime } from '../quest.js';

class ShrineMaidensRequest extends Quest {
  constructor() {
    super('shrine-maidens-request', "The Shrine Maiden's Request", 'Deliver 10 apples to the shrine maiden');
  }

  override baselineKeys(): readonly string[] {
    return ['shrineOfferings'];
  }

  override isCompleted(runtime): boolean {
    return this.progressSinceAccept(runtime, 'shrineOfferings') >= 10;
  }

  override onReward(runtime): void {
    runtime.addScore(50);
    runtime.addItem('ofuda', 2);
    runtime.setFlag('blessing.wallSense', (Number(runtime.getFlag('blessing.wallSense')) ?? 0) + 2);
  }
}

export default new ShrineMaidensRequest();
