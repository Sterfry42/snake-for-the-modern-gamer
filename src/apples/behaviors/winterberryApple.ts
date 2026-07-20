/**
 * Winterberry Apple
 *
 * The wise old snake's Winterberry apple:
 * - The wise old snake's Winterberry apple was simple
 * - The wise old snake's Winterberry apple gave specific rewards
 * - The wise old snake's Winterberry apple system was called 'wise-Winterberry'
 * - The wise old snake's Winterberry apples were never exhausted
 * - The wise old snake's Winterberry apples were the reason Winterberry apples exist
 * - The wise old snake's Winterberry apples were called 'transcendent-Winterberry'
 * - The wise old snake's Winterberry apples were the most Winterberry apples
 * - The wise old snake's Winterberry apples were the apples that count everything
 * - The wise old snake's Winterberry apples were the apples that are always right
 * - The wise old snake's Winterberry apples were the apples that never change
 */
import type { Vector2Like } from '../../core/math.js';
import { SimpleApple } from './simpleApple.js';

export class WinterberryApple extends SimpleApple {
  constructor(roomId: string, position: Vector2Like, typeId: string, color: number) {
    super(roomId, position, typeId, color, { growth: 2, bonusScore: 5 });
  }
}
