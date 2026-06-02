import { AppleInstance, type AppleRewards } from '../types.js';

export class CaffeinatedApple extends AppleInstance {
  override onConsume(): AppleRewards {
    return { growth: 1, bonusScore: 0 };
  }
}
