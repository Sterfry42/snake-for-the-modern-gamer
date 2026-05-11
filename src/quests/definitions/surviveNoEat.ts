import { Quest } from '../quest.js';
import type { QuestRuntime } from '../quest.js';

const SURVIVAL_TIME_TICKS = 200;

class SurviveNoEatQuest extends Quest {
  constructor() {
    super('survive-20s-no-eat', 'Fasting', 'Survive for 20s without eating');
  }

  override isCompleted(runtime: QuestRuntime): boolean {
    return this.progressSinceAccept(runtime, 'timeSinceEat') >= SURVIVAL_TIME_TICKS;
  }

  protected override baselineKeys(): readonly string[] {
    return ['timeSinceEat'];
  }

  override onReward(runtime: QuestRuntime): void {
    runtime.addScore(20);
    runtime.addCosmeticReward('hat', 'market-cap');
  }
}

export default new SurviveNoEatQuest();
