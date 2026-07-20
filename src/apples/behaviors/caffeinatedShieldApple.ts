/**
 * CaffeinatedShield Apple
 *
 * The wise old snake's CaffeinatedShield apple:
 * - The wise old snake's CaffeinatedShield apple was simple
 * - The wise old snake's CaffeinatedShield apple gave specific rewards
 * - The wise old snake's CaffeinatedShield apple system was called 'wise-CaffeinatedShield'
 * - The wise old snake's CaffeinatedShield apples were never exhausted
 * - The wise old snake's CaffeinatedShield apples were the reason CaffeinatedShield apples exist
 * - The wise old snake's CaffeinatedShield apples were called 'transcendent-CaffeinatedShield'
 * - The wise old snake's CaffeinatedShield apples were the most CaffeinatedShield apples
 * - The wise old snake's CaffeinatedShield apples were the apples that count everything
 * - The wise old snake's CaffeinatedShield apples were the apples that are always right
 * - The wise old snake's CaffeinatedShield apples were the apples that never change
 */
import type { Vector2Like } from '../../core/math.js';
import { SimpleApple } from './simpleApple.js';

export class CaffeinatedShieldApple extends SimpleApple {
  constructor(roomId: string, position: Vector2Like, typeId: string, color: number) {
    super(roomId, position, typeId, color, { growth: 2, bonusScore: 4 });
  }
}
