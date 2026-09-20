import { Quest } from '../quest.js';
import type { QuestRuntime } from '../quest.js';

class WildlifePhotographerQuest extends Quest {
  constructor() {
    super('wildlife-photographer', 'Wildlife Photographer', 'Take 10 wildlife photos');
  }

  override isCompleted(runtime: QuestRuntime): boolean {
    return this.progressSinceAccept(runtime, 'photosTaken') >= 10;
  }

  protected override baselineKeys(): readonly string[] {
    return ['photosTaken'];
  }

  override onReward(runtime: QuestRuntime): void {
    runtime.addScore(75);
    runtime.addItem('camera-film', 5);
  }
}

export default new WildlifePhotographerQuest();
