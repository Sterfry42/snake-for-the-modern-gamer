export function calculateCaffeinatedAppleIntervalScalar(args: {
  currentIntervalMs: number;
  baseIntervalMs: number;
  stackCount: number;
  baseSpeedBonus: number;
}): number {
  const { currentIntervalMs, baseIntervalMs, stackCount, baseSpeedBonus } = args;
  if (
    !Number.isFinite(currentIntervalMs) ||
    !Number.isFinite(baseIntervalMs) ||
    currentIntervalMs <= 0 ||
    baseIntervalMs <= 0 ||
    stackCount <= 0 ||
    baseSpeedBonus <= 0
  ) {
    return 1;
  }

  const baseSpeed = 1000 / baseIntervalMs;
  const currentSpeed = 1000 / currentIntervalMs;
  const boostedSpeed = currentSpeed + baseSpeed * baseSpeedBonus * stackCount;
  const boostedIntervalMs = 1000 / boostedSpeed;
  return boostedIntervalMs / currentIntervalMs;
}
