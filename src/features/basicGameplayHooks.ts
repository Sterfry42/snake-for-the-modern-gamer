/** Shared gameplay hooks used by the legacy feature UI and headless sessions. */
interface BasicFeatureRuntime {
  getFlag<T = unknown>(key: string): T | undefined;
  setFlag(key: string, value: unknown): void;
  isRaccoonMode(): boolean;
  addScore(amount: number): void;
}

export function awardAppleScore(
  runtime: BasicFeatureRuntime,
  addScore = (amount: number) => runtime.addScore(amount),
): void {
  if (!runtime.isRaccoonMode()) {
    const cheat = Math.max(1, Number(runtime.getFlag<number>('cheat.appleScoreMultiplier') ?? 1));
    const juice = Math.max(1, Number(runtime.getFlag<number>('status.orangeJuiceScoreMult') ?? 1));
    addScore(cheat * juice);
  }
  runtime.setFlag('applesEaten', (runtime.getFlag<number>('applesEaten') ?? 0) + 1);
}

export function stepBonusApple(runtime: BasicFeatureRuntime, random: () => number): void {
  if (!runtime.getFlag<boolean>('bonusActive') && random() < 0.005)
    runtime.setFlag('bonusActive', true);
}

export function awardBonusApple(
  runtime: BasicFeatureRuntime,
  addScore = (amount: number) => runtime.addScore(amount),
): void {
  if (runtime.getFlag<boolean>('bonusActive') && !runtime.isRaccoonMode()) addScore(4);
  runtime.setFlag('bonusActive', false);
}

export function stepHungerTimer(runtime: Pick<BasicFeatureRuntime, 'getFlag' | 'setFlag'>): void {
  runtime.setFlag('timeSinceEat', (runtime.getFlag<number>('timeSinceEat') ?? 0) + 1);
}
