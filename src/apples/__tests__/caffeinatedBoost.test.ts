import { calculateCaffeinatedAppleIntervalScalar } from '../caffeinatedBoost.js';

describe('caffeinated apple boost stacking', () => {
  it('adds one base-speed bonus per active stack', () => {
    const oneStack = calculateCaffeinatedAppleIntervalScalar({
      currentIntervalMs: 100,
      baseIntervalMs: 100,
      stackCount: 1,
      baseSpeedBonus: 0.25,
    });
    const fourStacks = calculateCaffeinatedAppleIntervalScalar({
      currentIntervalMs: 100,
      baseIntervalMs: 100,
      stackCount: 4,
      baseSpeedBonus: 0.25,
    });

    expect(oneStack).toBeCloseTo(0.8);
    expect(fourStacks).toBeCloseTo(0.5);
  });
});
