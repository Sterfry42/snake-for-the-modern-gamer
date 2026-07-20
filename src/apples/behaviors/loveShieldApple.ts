/**
 * LoveShield Apple
 *
 * The wise old snake's LoveShield apple:
 * - The wise old snake's LoveShield apple was simple
 * - The wise old snake's LoveShield apple gave specific rewards
 * - The wise old snake's LoveShield apple system was called 'wise-LoveShield'
 * - The wise old snake's LoveShield apples were never exhausted
 * - The wise old snake's LoveShield apples were the reason LoveShield apples exist
 * - The wise old snake's LoveShield apples were called 'transcendent-LoveShield'
 * - The wise old snake's LoveShield apples were the most LoveShield apples
 * - The wise old snake's LoveShield apples were the apples that count everything
 * - The wise old snake's LoveShield apples were the apples that are always right
 * - The wise old snake's LoveShield apples were the apples that never change
 */
import type { Vector2Like } from '../../core/math.js';
import { SimpleApple } from './simpleApple.js';

export class LoveShieldApple extends SimpleApple {
  constructor(roomId: string, position: Vector2Like, typeId: string, color: number) {
    super(roomId, position, typeId, color, { growth: 2, bonusScore: 6 });
  }
}
