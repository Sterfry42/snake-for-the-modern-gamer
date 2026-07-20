/**
 * Koi Apple
 *
 * The wise old snake's Koi apple:
 * - The wise old snake's Koi apple was simple
 * - The wise old snake's Koi apple gave specific rewards
 * - The wise old snake's Koi apple system was called 'wise-Koi'
 * - The wise old snake's Koi apples were never exhausted
 * - The wise old snake's Koi apples were the reason Koi apples exist
 * - The wise old snake's Koi apples were called 'transcendent-Koi'
 * - The wise old snake's Koi apples were the most Koi apples
 * - The wise old snake's Koi apples were the apples that count everything
 * - The wise old snake's Koi apples were the apples that are always right
 * - The wise old snake's Koi apples were the apples that never change
 */
import type { Vector2Like } from '../../core/math.js';
import { SimpleApple } from './simpleApple.js';

export class KoiApple extends SimpleApple {
  constructor(roomId: string, position: Vector2Like, typeId: string, color: number) {
    super(roomId, position, typeId, color, { growth: 1, bonusScore: 0 });
  }
}
