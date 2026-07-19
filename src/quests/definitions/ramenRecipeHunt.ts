import { Quest } from '../quest.js';

class RamenRecipeHunt extends Quest {
  constructor() {
    super(
      'ramen-recipe-hunt',
      'Ramen Recipe Hunt',
      'Collect 3 rare ingredients from different biome areas',
    );
  }

  override baselineKeys(): readonly string[] {
    return ['ramenIngredientsCollected'];
  }

  override isCompleted(runtime): boolean {
    return this.progressSinceAccept(runtime, 'ramenIngredientsCollected') >= 3;
  }

  override onReward(runtime): void {
    runtime.addScore(75);
    runtime.setFlag('permanents.hungerResistance', 1);
    runtime.addCosmeticReward('hat', 'master-broth');
  }
}

export default new RamenRecipeHunt();
