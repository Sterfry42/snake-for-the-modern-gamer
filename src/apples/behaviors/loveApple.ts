/**
 * Love Apple
 *
 * The wise old snake's Love apple:
 * - The wise old snake's Love apple was simple
 * - The wise old snake's Love apple gave specific rewards
 * - The wise old snake's Love apple system was called 'wise-Love'
 * - The wise old snake's Love apples were never exhausted
 * - The wise old snake's Love apples were the reason Love apples exist
 * - The wise old snake's Love apples were called 'transcendent-Love'
 * - The wise old snake's Love apples were the most Love apples
 * - The wise old snake's Love apples were the apples that count everything
 * - The wise old snake's Love apples were the apples that are always right
 * - The wise old snake's Love apples were the apples that never change
 */
import type { Vector2Like } from '../../core/math.js';
import { SimpleApple } from './simpleApple.js';

export class LoveApple extends SimpleApple {
  constructor(roomId: string, position: Vector2Like, typeId: string, color: number) {
    super(roomId, position, typeId, color, { growth: 1, bonusScore: 100 });
  }
}
