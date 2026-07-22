/**
 * Simple Apple Factory
 *
 * Consolidated factory for simple apples that only differ in their rewards.
 * This eliminates the need for 30+ near-identical class files.
 */
import type { Vector2Like } from '../../core/math.js';
import { SimpleApple } from './simpleApple.js';
import type { AppleRewards } from '../types.js';

/**
 * Configuration for a simple apple type.
 */
export interface SimpleAppleConfig {
  /** Unique identifier for this apple type */
  id: string;
  /** Growth and score rewards when consumed */
  rewards: AppleRewards;
}

/**
 * Creates a SimpleApple instance from configuration.
 */
export function createSimpleApple(
  config: SimpleAppleConfig,
  roomId: string,
  position: Vector2Like,
  color: number,
): SimpleApple {
  return new SimpleApple(roomId, position, config.id, color, config.rewards);
}

/**
 * Registry of all simple apple configurations.
 * Each entry defines the rewards for a specific apple type.
 */
export const SIMPLE_APPLE_CONFIGS: readonly SimpleAppleConfig[] = [
  // Base apples
  { id: 'normal', rewards: { growth: 1, bonusScore: 0 } },
  { id: 'mochi', rewards: { growth: 1, bonusScore: 0 } },
  { id: 'koi', rewards: { growth: 1, bonusScore: 0 } },
  { id: 'amacha', rewards: { growth: 1, bonusScore: 0 } },
  { id: 'caffeinated', rewards: { growth: 1, bonusScore: 0 } },
  { id: 'lavender', rewards: { growth: 1, bonusScore: 0 } },
  { id: 'love', rewards: { growth: 1, bonusScore: 100 } },
  { id: 'treat', rewards: { growth: 1, bonusScore: 0 } },
  { id: 'heatwave', rewards: { growth: 1, bonusScore: 4 } },
  { id: 'spicyEnergy', rewards: { growth: 1, bonusScore: 0 } },
  { id: 'yuzu', rewards: { growth: 1, bonusScore: 0 } },
  { id: 'wasabi', rewards: { growth: 1, bonusScore: 0 } },
  { id: 'winterberry', rewards: { growth: 1, bonusScore: 0 } },

  // Cold variants
  { id: 'coldBeer', rewards: { growth: 2, bonusScore: 5 } },
  { id: 'coldCaffeinated', rewards: { growth: 3, bonusScore: 3 } },

  // Shield variants
  { id: 'caffeinatedShield', rewards: { growth: 2, bonusScore: 4 } },
  { id: 'loveShield', rewards: { growth: 2, bonusScore: 4 } },
  { id: 'mochiShield', rewards: { growth: 2, bonusScore: 4 } },

  // Frost variants
  { id: 'frostMochi', rewards: { growth: 2, bonusScore: 3 } },
  { id: 'frostWasabi', rewards: { growth: 2, bonusScore: 5 } },
  { id: 'heatwaveFrost', rewards: { growth: 3, bonusScore: 8 } },
  { id: 'winterberryFrost', rewards: { growth: 2, bonusScore: 5 } },

  // Lavender variants
  { id: 'lavenderCalm', rewards: { growth: 2, bonusScore: 3 } },

  // Yuzu variants
  { id: 'yuzuEnergy', rewards: { growth: 2, bonusScore: 4 } },

  // Gold variants
  { id: 'gold', rewards: { growth: 4, bonusScore: 4 } },
  { id: 'goldSpicy', rewards: { growth: 5, bonusScore: 25 } },

  // Treat variants
  { id: 'treatMochi', rewards: { growth: 3, bonusScore: 5 } },

  // Triple threat
  { id: 'tripleThreat', rewards: { growth: 5, bonusScore: 10 } },

  // Ultimate fusion
  { id: 'ultimateFusion', rewards: { growth: 10, bonusScore: 100 } },
];

/**
 * Lookup a simple apple config by behavior type ID.
 */
export function getSimpleAppleConfig(behaviorId: string): SimpleAppleConfig | undefined {
  return SIMPLE_APPLE_CONFIGS.find((config) => config.id === behaviorId);
}
