import { Quest } from '../quest.js';

class SevenDragonTemples extends Quest {
  constructor() {
    super(
      'seven-dragon-temples',
      'Seven Dragon Temples',
      'Find 7 hidden shrine rooms scattered across the biome',
    );
  }

  override baselineKeys(): readonly string[] {
    return ['templesFound'];
  }

  override isCompleted(runtime): boolean {
    return this.progressSinceAccept(runtime, 'templesFound') >= 7;
  }

  override onReward(runtime): void {
    runtime.addScore(100);
    runtime.addCosmeticReward('hat', 'dragon-helm');
    runtime.setFlag('permanents.speedBonus', 1);
  }
}

export default new SevenDragonTemples();
