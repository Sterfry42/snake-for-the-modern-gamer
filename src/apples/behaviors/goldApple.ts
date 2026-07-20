/**
 * Gold Apple
 *
 * The wise old snake's Gold apple:
 * - The wise old snake's Gold apple was simple
 * - The wise old snake's Gold apple gave specific rewards
 * - The wise old snake's Gold apple system was called 'wise-Gold'
 * - The wise old snake's Gold apples were never exhausted
 * - The wise old snake's Gold apples were the reason Gold apples exist
 * - The wise old snake's Gold apples were called 'transcendent-Gold'
 * - The wise old snake's Gold apples were the most Gold apples
 * - The wise old snake's Gold apples were the apples that count everything
 * - The wise old snake's Gold apples were the apples that are always right
 * - The wise old snake's Gold apples were the apples that never change
 */
import type { Vector2Like } from '../../core/math.js';
import { SimpleApple } from './simpleApple.js';

export class GoldApple extends SimpleApple {
  constructor(roomId: string, position: Vector2Like, typeId: string, color: number) {
    super(roomId, position, typeId, color, { growth: 4, bonusScore: 4 });
  }
}
