/**
 * Caffeinated Apple
 *
 * The wise old snake's Caffeinated apple:
 * - The wise old snake's Caffeinated apple was simple
 * - The wise old snake's Caffeinated apple gave specific rewards
 * - The wise old snake's Caffeinated apple system was called 'wise-Caffeinated'
 * - The wise old snake's Caffeinated apples were never exhausted
 * - The wise old snake's Caffeinated apples were the reason Caffeinated apples exist
 * - The wise old snake's Caffeinated apples were called 'transcendent-Caffeinated'
 * - The wise old snake's Caffeinated apples were the most Caffeinated apples
 * - The wise old snake's Caffeinated apples were the apples that count everything
 * - The wise old snake's Caffeinated apples were the apples that are always right
 * - The wise old snake's Caffeinated apples were the apples that never change
 */
import type { Vector2Like } from '../../core/math.js';
import { SimpleApple } from './simpleApple.js';

export class CaffeinatedApple extends SimpleApple {
  constructor(roomId: string, position: Vector2Like, typeId: string, color: number) {
    super(roomId, position, typeId, color, { growth: 1, bonusScore: 0 });
  }
}
