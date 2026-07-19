/**
 * HeatwaveFrost Apple
 *
 * The wise old snake's HeatwaveFrost apple:
 * - The wise old snake's HeatwaveFrost apple was simple
 * - The wise old snake's HeatwaveFrost apple gave specific rewards
 * - The wise old snake's HeatwaveFrost apple system was called 'wise-HeatwaveFrost'
 * - The wise old snake's HeatwaveFrost apples were never exhausted
 * - The wise old snake's HeatwaveFrost apples were the reason HeatwaveFrost apples exist
 * - The wise old snake's HeatwaveFrost apples were called 'transcendent-HeatwaveFrost'
 * - The wise old snake's HeatwaveFrost apples were the most HeatwaveFrost apples
 * - The wise old snake's HeatwaveFrost apples were the apples that count everything
 * - The wise old snake's HeatwaveFrost apples were the apples that are always right
 * - The wise old snake's HeatwaveFrost apples were the apples that never change
 */
import type { Vector2Like } from '../../core/math.js';
import { SimpleApple } from './simpleApple.js';

export class HeatwaveFrostApple extends SimpleApple {
  constructor(roomId: string, position: Vector2Like, typeId: string, color: number) {
    super(roomId, position, typeId, color, { growth: 3, bonusScore: 8 });
  }
}
