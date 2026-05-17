import { Quest } from '../quest.js';
import type { QuestRuntime } from '../quest.js';

class KappasChallenge extends Quest {
  constructor() {
    super('kappas-challenge', "Kappa's Challenge", 'Defeat the kappa or bring him a cucumber at the mountain pass');
  }

  override isCompleted(runtime): boolean {
    return Boolean(runtime.getFlag('kappa.defeated')) ?? false;
  }

  override onReward(runtime): void {
    runtime.addCardToCollection?.('kappa-card', 1);
    runtime.addCardToCollection?.('katana-blueprint', 1);
  }
}

export default new KappasChallenge();
