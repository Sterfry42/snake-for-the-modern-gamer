import { describe, it, expect } from 'vitest';
import { CaffeinatedApple } from '../behaviors/caffeinatedApple.js';

describe('CaffeinatedApple', () => {
  it('acts like a normal apple when consumed', () => {
    const apple = new CaffeinatedApple('room1', { x: 0, y: 0 }, 'caffeinated', 0xc47a3a);
    const rewards = apple.onConsume();

    expect(rewards).toEqual({ growth: 1, bonusScore: 0 });
  });
});
