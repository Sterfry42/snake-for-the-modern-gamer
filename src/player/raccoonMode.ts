/**
 * Raccoon Mode
 */
import type { Vector2Like } from '../core/math.js';

export type CharacterMode = 'snake' | 'raccoon';

export interface RaccoonModeConfig {
  baseSpeedMultiplier: number;
  hungerDecaySeconds: number;
  hungerRestoreOnPickup: number;
  weightTiers: Array<{
    minWeight: number;
    speedMultiplier: number;
    label: string;
  }>;
  stashMultipliers: Array<{
    minWeight: number;
    multiplier: number;
  }>;
  bandit: {
    max: number;
    gainPerForage: number;
    decayPerSecond: number;
    stashBonusPerMeter: number;
  };
}

export interface RaccoonHungerTickInput {
  elapsedMs: number;
  currentHunger: number;
  maxHunger: number;
  timerMs: number;
  config: RaccoonModeConfig;
}

export interface RaccoonHungerTickResult {
  currentHunger: number;
  timerMs: number;
  hungerLost: number;
}

export interface RaccoonStashResult {
  depositedWeight: number;
  score: number;
  multiplier: number;
  banditBonus: number;
}

export const DEFAULT_RACCOON_MODE_CONFIG: RaccoonModeConfig = {
  baseSpeedMultiplier: 1.25,
  hungerDecaySeconds: 10 / 1.5,
  hungerRestoreOnPickup: 1,
  weightTiers: [
    { minWeight: 0, speedMultiplier: 1, label: 'Light' },
    { minWeight: 10, speedMultiplier: 0.9, label: 'Pocketed' },
    { minWeight: 20, speedMultiplier: 0.75, label: 'Loaded' },
    { minWeight: 30, speedMultiplier: 0.65, label: 'Packed' },
    { minWeight: 40, speedMultiplier: 0.575, label: 'Burdened' },
    { minWeight: 50, speedMultiplier: 0.5, label: 'Heavy' },
    { minWeight: 60, speedMultiplier: 0.47, label: 'Hefty' },
    { minWeight: 70, speedMultiplier: 0.44, label: 'Dragging' },
    { minWeight: 80, speedMultiplier: 0.41, label: 'Sagging' },
    { minWeight: 90, speedMultiplier: 0.38, label: 'Straining' },
    { minWeight: 100, speedMultiplier: 0.35, label: 'Overloaded' },
    { minWeight: 110, speedMultiplier: 0.335, label: 'Buried' },
    { minWeight: 120, speedMultiplier: 0.32, label: 'Buried' },
    { minWeight: 130, speedMultiplier: 0.305, label: 'Buried' },
    { minWeight: 140, speedMultiplier: 0.29, label: 'Buried' },
    { minWeight: 150, speedMultiplier: 0.275, label: 'Buried' },
    { minWeight: 160, speedMultiplier: 0.26, label: 'Buried' },
    { minWeight: 170, speedMultiplier: 0.248, label: 'Buried' },
    { minWeight: 180, speedMultiplier: 0.238, label: 'Buried' },
    { minWeight: 190, speedMultiplier: 0.231, label: 'Buried' },
    { minWeight: 200, speedMultiplier: 0.225, label: 'Buried' },
  ],
  stashMultipliers: [
    { minWeight: 0, multiplier: 1 },
    { minWeight: 10, multiplier: 1.15 },
    { minWeight: 25, multiplier: 1.35 },
    { minWeight: 50, multiplier: 1.75 },
    { minWeight: 100, multiplier: 2.25 },
  ],
  bandit: {
    max: 100,
    gainPerForage: 8,
    decayPerSecond: 1.5,
    stashBonusPerMeter: 0.0025,
  },
};

export function normalizeCharacterMode(value: unknown): CharacterMode {
  return value === 'raccoon' ? 'raccoon' : 'snake';
}

export function getRaccoonWeightTier(weight: number, config = DEFAULT_RACCOON_MODE_CONFIG) {
  const normalizedWeight = Math.max(0, Math.floor(weight));
  return config.weightTiers.reduce((selected, tier) =>
    tier.minWeight <= normalizedWeight && tier.minWeight >= selected.minWeight ? tier : selected,
  );
}

export function getRaccoonSpeedMultiplier(
  weight: number,
  config = DEFAULT_RACCOON_MODE_CONFIG,
): number {
  return config.baseSpeedMultiplier * getRaccoonWeightTier(weight, config).speedMultiplier;
}

export function getNextRaccoonWeightThreshold(
  weight: number,
  config = DEFAULT_RACCOON_MODE_CONFIG,
): number | undefined {
  const normalizedWeight = Math.max(0, Math.floor(weight));
  return config.weightTiers
    .map((tier) => tier.minWeight)
    .filter((threshold) => threshold > normalizedWeight)
    .sort((a, b) => a - b)[0];
}

export function getRaccoonStashMultiplier(
  weight: number,
  config = DEFAULT_RACCOON_MODE_CONFIG,
): number {
  const normalizedWeight = Math.max(0, Math.floor(weight));
  return config.stashMultipliers.reduce((selected, tier) =>
    tier.minWeight <= normalizedWeight && tier.minWeight >= selected.minWeight ? tier : selected,
  ).multiplier;
}

export function calculateRaccoonStashReward(
  weight: number,
  banditMeter: number,
  config = DEFAULT_RACCOON_MODE_CONFIG,
): RaccoonStashResult {
  const depositedWeight = Math.max(0, Math.floor(weight));
  const multiplier = getRaccoonStashMultiplier(depositedWeight, config);
  const normalizedBandit = Math.max(0, Math.min(config.bandit.max, banditMeter));
  const banditBonus = 1 + normalizedBandit * config.bandit.stashBonusPerMeter;
  return {
    depositedWeight,
    score: Math.max(0, Math.floor(depositedWeight * multiplier * banditBonus)),
    multiplier,
    banditBonus,
  };
}

export function tickRaccoonHunger(input: RaccoonHungerTickInput): RaccoonHungerTickResult {
  const decayMs = Math.max(1, input.config.hungerDecaySeconds * 1000);
  let timerMs = Math.max(0, input.timerMs + Math.max(0, input.elapsedMs));
  let currentHunger = Math.max(0, Math.min(input.maxHunger, input.currentHunger));
  let hungerLost = 0;

  while (timerMs >= decayMs && currentHunger > 0) {
    timerMs -= decayMs;
    currentHunger -= 1;
    hungerLost += 1;
  }

  return { currentHunger, timerMs, hungerLost };
}

export function restoreRaccoonHunger(
  currentHunger: number,
  maxHunger: number,
  amount: number,
): number {
  return Math.max(0, Math.min(maxHunger, currentHunger + Math.max(0, amount)));
}

export function getRaccoonRenderableBody(body: readonly Vector2Like[]): readonly Vector2Like[] {
  return body[0] ? [body[0]] : [];
}
