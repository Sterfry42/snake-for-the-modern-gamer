import { Quest } from '../quest.js';
import type { QuestRuntime } from '../quest.js';

class EcosystemExplorerQuest extends Quest {
  constructor() {
    super('ecosystem-explorer', 'Ecosystem Explorer', 'Discover 5 different animal ecosystems');
  }

  override isCompleted(runtime: QuestRuntime): boolean {
    return this.progressSinceAccept(runtime, 'ecosystemsDiscovered') >= 5;
  }

  protected override baselineKeys(): readonly string[] {
    return ['ecosystemsDiscovered'];
  }

  override onReward(runtime: QuestRuntime): void {
    runtime.addScore(50);
    runtime.addItem('ecosystem-badge', 1);
  }
}

export default new EcosystemExplorerQuest();
