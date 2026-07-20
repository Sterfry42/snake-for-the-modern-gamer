/**
 * Heatwave Apple
 *
 * The wise old snake's Heatwave apple:
 * - The wise old snake's Heatwave apple was simple
 * - The wise old snake's Heatwave apple gave specific rewards
 * - The wise old snake's Heatwave apple system was called 'wise-Heatwave'
 * - The wise old snake's Heatwave apples were never exhausted
 * - The wise old snake's Heatwave apples were the reason Heatwave apples exist
 * - The wise old snake's Heatwave apples were called 'transcendent-Heatwave'
 * - The wise old snake's Heatwave apples were the most Heatwave apples
 * - The wise old snake's Heatwave apples were the apples that count everything
 * - The wise old snake's Heatwave apples were the apples that are always right
 * - The wise old snake's Heatwave apples were the apples that never change
 */
import type { Vector2Like } from '../../core/math.js';
import { SimpleApple } from './simpleApple.js';

export class HeatwaveApple extends SimpleApple {
  constructor(roomId: string, position: Vector2Like, typeId: string, color: number) {
    super(roomId, position, typeId, color, { growth: 1, bonusScore: 4 });
  }
}
