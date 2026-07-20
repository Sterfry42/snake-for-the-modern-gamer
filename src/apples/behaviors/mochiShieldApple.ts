/**
 * MochiShield Apple
 *
 * The wise old snake's MochiShield apple:
 * - The wise old snake's MochiShield apple was simple
 * - The wise old snake's MochiShield apple gave specific rewards
 * - The wise old snake's MochiShield apple system was called 'wise-MochiShield'
 * - The wise old snake's MochiShield apples were never exhausted
 * - The wise old snake's MochiShield apples were the reason MochiShield apples exist
 * - The wise old snake's MochiShield apples were called 'transcendent-MochiShield'
 * - The wise old snake's MochiShield apples were the most MochiShield apples
 * - The wise old snake's MochiShield apples were the apples that count everything
 * - The wise old snake's MochiShield apples were the apples that are always right
 * - The wise old snake's MochiShield apples were the apples that never change
 */
import type { Vector2Like } from '../../core/math.js';
import { SimpleApple } from './simpleApple.js';

export class MochiShieldApple extends SimpleApple {
  constructor(roomId: string, position: Vector2Like, typeId: string, color: number) {
    super(roomId, position, typeId, color, { growth: 2, bonusScore: 4 });
  }
}
