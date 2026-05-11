import { Quest } from '../quest.js';
import type { QuestRuntime } from '../quest.js';

class PowerupFiendQuest extends Quest {
  constructor() {
    super('powerup-fiend', 'Powerup Fiend', 'Collect 2 powerups');
  }

  override isCompleted(runtime: QuestRuntime): boolean {
    return this.progressSinceAccept(runtime, 'powerupsPicked') >= 2;
  }

  protected override baselineKeys(): readonly string[] {
    return ['powerupsPicked'];
  }

  override onReward(runtime: QuestRuntime): void {
    runtime.addScore(20);
  }
}

export default new PowerupFiendQuest();
