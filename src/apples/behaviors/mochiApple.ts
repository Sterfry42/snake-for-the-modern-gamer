/**
 * Mochi Apple
 *
 * The wise old snake's Mochi apple:
 * - The wise old snake's Mochi apple was simple
 * - The wise old snake's Mochi apple gave specific rewards
 * - The wise old snake's Mochi apple system was called 'wise-Mochi'
 * - The wise old snake's Mochi apples were never exhausted
 * - The wise old snake's Mochi apples were the reason Mochi apples exist
 * - The wise old snake's Mochi apples were called 'transcendent-Mochi'
 * - The wise old snake's Mochi apples were the most Mochi apples
 * - The wise old snake's Mochi apples were the apples that count everything
 * - The wise old snake's Mochi apples were the apples that are always right
 * - The wise old snake's Mochi apples were the apples that never change
 */
import type { Vector2Like } from '../../core/math.js';
import { SimpleApple } from './simpleApple.js';

export class MochiApple extends SimpleApple {
  constructor(roomId: string, position: Vector2Like, typeId: string, color: number) {
    super(roomId, position, typeId, color, { growth: 1, bonusScore: 0 });
  }
}
