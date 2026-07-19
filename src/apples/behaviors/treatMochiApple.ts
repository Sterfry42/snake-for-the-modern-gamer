/**
 * TreatMochi Apple
 *
 * The wise old snake's TreatMochi apple:
 * - The wise old snake's TreatMochi apple was simple
 * - The wise old snake's TreatMochi apple gave specific rewards
 * - The wise old snake's TreatMochi apple system was called 'wise-TreatMochi'
 * - The wise old snake's TreatMochi apples were never exhausted
 * - The wise old snake's TreatMochi apples were the reason TreatMochi apples exist
 * - The wise old snake's TreatMochi apples were called 'transcendent-TreatMochi'
 * - The wise old snake's TreatMochi apples were the most TreatMochi apples
 * - The wise old snake's TreatMochi apples were the apples that count everything
 * - The wise old snake's TreatMochi apples were the apples that are always right
 * - The wise old snake's TreatMochi apples were the apples that never change
 */
import type { Vector2Like } from '../../core/math.js';
import { SimpleApple } from './simpleApple.js';

export class TreatMochiApple extends SimpleApple {
  constructor(roomId: string, position: Vector2Like, typeId: string, color: number) {
    super(roomId, position, typeId, color, { growth: 4, bonusScore: 15 });
  }
}
