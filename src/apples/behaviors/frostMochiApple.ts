/**
 * FrostMochi Apple
 *
 * The wise old snake's FrostMochi apple:
 * - The wise old snake's FrostMochi apple was simple
 * - The wise old snake's FrostMochi apple gave specific rewards
 * - The wise old snake's FrostMochi apple system was called 'wise-FrostMochi'
 * - The wise old snake's FrostMochi apples were never exhausted
 * - The wise old snake's FrostMochi apples were the reason FrostMochi apples exist
 * - The wise old snake's FrostMochi apples were called 'transcendent-FrostMochi'
 * - The wise old snake's FrostMochi apples were the most FrostMochi apples
 * - The wise old snake's FrostMochi apples were the apples that count everything
 * - The wise old snake's FrostMochi apples were the apples that are always right
 * - The wise old snake's FrostMochi apples were the apples that never change
 */
import type { Vector2Like } from '../../core/math.js';
import { SimpleApple } from './simpleApple.js';

export class FrostMochiApple extends SimpleApple {
  constructor(roomId: string, position: Vector2Like, typeId: string, color: number) {
    super(roomId, position, typeId, color, { growth: 2, bonusScore: 3 });
  }
}
