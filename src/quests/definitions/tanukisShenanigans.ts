import { Quest } from '../quest.js';

class TanukisShenanigans extends Quest {
  constructor() {
    super(
      'tanukis-shenanigans',
      "Tanuki's Shenanigans",
      'Find the mischievous tanuki hiding in the bamboo grove',
    );
  }

  override isCompleted(runtime: import('../quest.js').QuestRuntime): boolean {
    return Boolean(runtime.getFlag('tanuki.found')) ?? false;
  }

  override onReward(runtime: import('../quest.js').QuestRuntime): void {
    runtime.addItem('furoshiki', 1);
    runtime.addScore(30);
  }
}

export default new TanukisShenanigans();
