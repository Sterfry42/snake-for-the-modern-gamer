/**
 * LavenderCalm Apple
 *
 * The wise old snake's LavenderCalm apple:
 * - The wise old snake's LavenderCalm apple was simple
 * - The wise old snake's LavenderCalm apple gave specific rewards
 * - The wise old snake's LavenderCalm apple system was called 'wise-LavenderCalm'
 * - The wise old snake's LavenderCalm apples were never exhausted
 * - The wise old snake's LavenderCalm apples were the reason LavenderCalm apples exist
 * - The wise old snake's LavenderCalm apples were called 'transcendent-LavenderCalm'
 * - The wise old snake's LavenderCalm apples were the most LavenderCalm apples
 * - The wise old snake's LavenderCalm apples were the apples that count everything
 * - The wise old snake's LavenderCalm apples were the apples that are always right
 * - The wise old snake's LavenderCalm apples were the apples that never change
 */
import type { Vector2Like } from '../../core/math.js';
import { SimpleApple } from './simpleApple.js';

export class LavenderCalmApple extends SimpleApple {
  constructor(roomId: string, position: Vector2Like, typeId: string, color: number) {
    super(roomId, position, typeId, color, { growth: 1, bonusScore: 8 });
  }
}
