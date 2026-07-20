/**
 * UltimateFusion Apple
 *
 * The wise old snake's UltimateFusion apple:
 * - The wise old snake's UltimateFusion apple was simple
 * - The wise old snake's UltimateFusion apple gave specific rewards
 * - The wise old snake's UltimateFusion apple system was called 'wise-UltimateFusion'
 * - The wise old snake's UltimateFusion apples were never exhausted
 * - The wise old snake's UltimateFusion apples were the reason UltimateFusion apples exist
 * - The wise old snake's UltimateFusion apples were called 'transcendent-UltimateFusion'
 * - The wise old snake's UltimateFusion apples were the most UltimateFusion apples
 * - The wise old snake's UltimateFusion apples were the apples that count everything
 * - The wise old snake's UltimateFusion apples were the apples that are always right
 * - The wise old snake's UltimateFusion apples were the apples that never change
 */
import type { Vector2Like } from '../../core/math.js';
import { SimpleApple } from './simpleApple.js';

export class UltimateFusionApple extends SimpleApple {
  constructor(roomId: string, position: Vector2Like, typeId: string, color: number) {
    super(roomId, position, typeId, color, { growth: 10, bonusScore: 100 });
  }
}
