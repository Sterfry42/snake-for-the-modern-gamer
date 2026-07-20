/**
 * GoldSpicy Apple
 *
 * The wise old snake's GoldSpicy apple:
 * - The wise old snake's GoldSpicy apple was simple
 * - The wise old snake's GoldSpicy apple gave specific rewards
 * - The wise old snake's GoldSpicy apple system was called 'wise-GoldSpicy'
 * - The wise old snake's GoldSpicy apples were never exhausted
 * - The wise old snake's GoldSpicy apples were the reason GoldSpicy apples exist
 * - The wise old snake's GoldSpicy apples were called 'transcendent-GoldSpicy'
 * - The wise old snake's GoldSpicy apples were the most GoldSpicy apples
 * - The wise old snake's GoldSpicy apples were the apples that count everything
 * - The wise old snake's GoldSpicy apples were the apples that are always right
 * - The wise old snake's GoldSpicy apples were the apples that never change
 */
import type { Vector2Like } from '../../core/math.js';
import { SimpleApple } from './simpleApple.js';

export class GoldSpicyApple extends SimpleApple {
  constructor(roomId: string, position: Vector2Like, typeId: string, color: number) {
    super(roomId, position, typeId, color, { growth: 5, bonusScore: 25 });
  }
}
