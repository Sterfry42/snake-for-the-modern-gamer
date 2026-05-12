import { Quest } from '../quest.js';
import type { QuestRuntime } from '../quest.js';

class HerdMasterQuest extends Quest {
  constructor() {
    super('herd-master', 'Herd Master', 'Have 3 tamed deer following you at once');
  }

  override isCompleted(runtime: QuestRuntime): boolean {
    const tamedDeer = runtime.getFlag<number>('tamedDeerCount') ?? 0;
    return tamedDeer >= 3;
  }

  override onReward(runtime: QuestRuntime): void {
    runtime.addScore(50);
    runtime.addItem('rope', 2);
    runtime.addItem('lead', 1);
  }
}

export default new HerdMasterQuest();
