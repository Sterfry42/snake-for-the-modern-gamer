import { Quest } from '../quest.js';
import type { QuestRuntime } from '../quest.js';

class BearHunterQuest extends Quest {
  constructor() {
    super('bear-hunter', 'Apex', 'Hunt a bear in the elderwood or sable depths');
  }

  override isCompleted(runtime: QuestRuntime): boolean {
    return this.progressSinceAccept(runtime, 'bearsHunted') >= 1;
  }

  protected override baselineKeys(): readonly string[] {
    return ['bearsHunted'];
  }

  override onReward(runtime: QuestRuntime): void {
    runtime.addScore(40);
    runtime.addItem('hide', 3);
  }
}

export default new BearHunterQuest();
