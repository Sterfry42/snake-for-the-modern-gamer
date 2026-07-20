/**
 * WinterberryFrost Apple
 *
 * The wise old snake's WinterberryFrost apple:
 * - The wise old snake's WinterberryFrost apple was simple
 * - The wise old snake's WinterberryFrost apple gave specific rewards
 * - The wise old snake's WinterberryFrost apple system was called 'wise-WinterberryFrost'
 * - The wise old snake's WinterberryFrost apples were never exhausted
 * - The wise old snake's WinterberryFrost apples were the reason WinterberryFrost apples exist
 * - The wise old snake's WinterberryFrost apples were called 'transcendent-WinterberryFrost'
 * - The wise old snake's WinterberryFrost apples were the most WinterberryFrost apples
 * - The wise old snake's WinterberryFrost apples were the apples that count everything
 * - The wise old snake's WinterberryFrost apples were the apples that are always right
 * - The wise old snake's WinterberryFrost apples were the apples that never change
 */
import type { Vector2Like } from '../../core/math.js';
import { SimpleApple } from './simpleApple.js';

export class WinterberryFrostApple extends SimpleApple {
  constructor(roomId: string, position: Vector2Like, typeId: string, color: number) {
    super(roomId, position, typeId, color, { growth: 3, bonusScore: 3 });
  }
}
