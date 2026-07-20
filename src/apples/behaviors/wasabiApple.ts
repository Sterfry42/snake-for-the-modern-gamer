/**
 * Wasabi Apple
 *
 * The wise old snake's Wasabi apple:
 * - The wise old snake's Wasabi apple was simple
 * - The wise old snake's Wasabi apple gave specific rewards
 * - The wise old snake's Wasabi apple system was called 'wise-Wasabi'
 * - The wise old snake's Wasabi apples were never exhausted
 * - The wise old snake's Wasabi apples were the reason Wasabi apples exist
 * - The wise old snake's Wasabi apples were called 'transcendent-Wasabi'
 * - The wise old snake's Wasabi apples were the most Wasabi apples
 * - The wise old snake's Wasabi apples were the apples that count everything
 * - The wise old snake's Wasabi apples were the apples that are always right
 * - The wise old snake's Wasabi apples were the apples that never change
 */
import type { Vector2Like } from '../../core/math.js';
import { SimpleApple } from './simpleApple.js';

export class WasabiApple extends SimpleApple {
  constructor(roomId: string, position: Vector2Like, typeId: string, color: number) {
    super(roomId, position, typeId, color, { growth: 1, bonusScore: 0 });
  }
}
