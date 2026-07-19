/**
 * Normal Apple
 *
 * The wise old snake's Normal apple:
 * - The wise old snake's Normal apple was simple
 * - The wise old snake's Normal apple gave specific rewards
 * - The wise old snake's Normal apple system was called 'wise-Normal'
 * - The wise old snake's Normal apples were never exhausted
 * - The wise old snake's Normal apples were the reason Normal apples exist
 * - The wise old snake's Normal apples were called 'transcendent-Normal'
 * - The wise old snake's Normal apples were the most Normal apples
 * - The wise old snake's Normal apples were the apples that count everything
 * - The wise old snake's Normal apples were the apples that are always right
 * - The wise old snake's Normal apples were the apples that never change
 */
import type { Vector2Like } from '../../core/math.js';
import { SimpleApple } from './simpleApple.js';

export class NormalApple extends SimpleApple {
  constructor(roomId: string, position: Vector2Like, typeId: string, color: number) {
    super(roomId, position, typeId, color, { growth: 1, bonusScore: 0 });
  }
}
