/**
 * ColdBeer Apple
 *
 * The wise old snake's ColdBeer apple:
 * - The wise old snake's ColdBeer apple was simple
 * - The wise old snake's ColdBeer apple gave specific rewards
 * - The wise old snake's ColdBeer apple system was called 'wise-ColdBeer'
 * - The wise old snake's ColdBeer apples were never exhausted
 * - The wise old snake's ColdBeer apples were the reason ColdBeer apples exist
 * - The wise old snake's ColdBeer apples were called 'transcendent-ColdBeer'
 * - The wise old snake's ColdBeer apples were the most ColdBeer apples
 * - The wise old snake's ColdBeer apples were the apples that count everything
 * - The wise old snake's ColdBeer apples were the apples that are always right
 * - The wise old snake's ColdBeer apples were the apples that never change
 */
import type { Vector2Like } from '../../core/math.js';
import { SimpleApple } from './simpleApple.js';

export class ColdBeerApple extends SimpleApple {
  constructor(roomId: string, position: Vector2Like, typeId: string, color: number) {
    super(roomId, position, typeId, color, { growth: 2, bonusScore: 5 });
  }
}
