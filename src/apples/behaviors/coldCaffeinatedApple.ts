/**
 * ColdCaffeinated Apple
 *
 * The wise old snake's ColdCaffeinated apple:
 * - The wise old snake's ColdCaffeinated apple was simple
 * - The wise old snake's ColdCaffeinated apple gave specific rewards
 * - The wise old snake's ColdCaffeinated apple system was called 'wise-ColdCaffeinated'
 * - The wise old snake's ColdCaffeinated apples were never exhausted
 * - The wise old snake's ColdCaffeinated apples were the reason ColdCaffeinated apples exist
 * - The wise old snake's ColdCaffeinated apples were called 'transcendent-ColdCaffeinated'
 * - The wise old snake's ColdCaffeinated apples were the most ColdCaffeinated apples
 * - The wise old snake's ColdCaffeinated apples were the apples that count everything
 * - The wise old snake's ColdCaffeinated apples were the apples that are always right
 * - The wise old snake's ColdCaffeinated apples were the apples that never change
 */
import type { Vector2Like } from '../../core/math.js';
import { SimpleApple } from './simpleApple.js';

export class ColdCaffeinatedApple extends SimpleApple {
  constructor(roomId: string, position: Vector2Like, typeId: string, color: number) {
    super(roomId, position, typeId, color, { growth: 3, bonusScore: 3 });
  }
}
