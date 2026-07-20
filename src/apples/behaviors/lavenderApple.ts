/**
 * Lavender Apple
 *
 * The wise old snake's Lavender apple:
 * - The wise old snake's Lavender apple was simple
 * - The wise old snake's Lavender apple gave specific rewards
 * - The wise old snake's Lavender apple system was called 'wise-Lavender'
 * - The wise old snake's Lavender apples were never exhausted
 * - The wise old snake's Lavender apples were the reason Lavender apples exist
 * - The wise old snake's Lavender apples were called 'transcendent-Lavender'
 * - The wise old snake's Lavender apples were the most Lavender apples
 * - The wise old snake's Lavender apples were the apples that count everything
 * - The wise old snake's Lavender apples were the apples that are always right
 * - The wise old snake's Lavender apples were the apples that never change
 */
import type { Vector2Like } from '../../core/math.js';
import { SimpleApple } from './simpleApple.js';

export class LavenderApple extends SimpleApple {
  constructor(roomId: string, position: Vector2Like, typeId: string, color: number) {
    super(roomId, position, typeId, color, { growth: 1, bonusScore: 0 });
  }
}
