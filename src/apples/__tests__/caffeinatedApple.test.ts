import { describe, it, expect } from 'vitest';
import { createSimpleApple, SIMPLE_APPLE_CONFIGS } from '../behaviors/simpleAppleFactory.js';

describe('CaffeinatedApple', () => {
  it('acts like a normal apple when consumed', () => {
    const config = SIMPLE_APPLE_CONFIGS.find((c) => c.id === 'caffeinated');
    expect(config).toBeDefined();
    const apple = createSimpleApple(config!, 'room1', { x: 0, y: 0 }, 0xc47a3a);
    const rewards = apple.onConsume();

    expect(rewards).toEqual({ growth: 1, bonusScore: 0 });
  });
});
