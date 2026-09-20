import { Quest } from '../quest.js';
import type { QuestRuntime } from '../quest.js';

class KingdomDiplomatQuest extends Quest {
  constructor() {
    super('kingdom-diplomat', 'Kingdom Diplomat', 'Attend a royal event');
  }

  override isCompleted(runtime: QuestRuntime): boolean {
    return this.progressSinceAccept(runtime, 'royalEventsAttended') >= 1;
  }

  protected override baselineKeys(): readonly string[] {
    return ['royalEventsAttended'];
  }

  override onReward(runtime: QuestRuntime): void {
    runtime.addScore(200);
    runtime.addItem('royal-invitation', 1);
  }
}

export default new KingdomDiplomatQuest();
