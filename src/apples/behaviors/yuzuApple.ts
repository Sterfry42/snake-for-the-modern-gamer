/**
 * Yuzu Apple
 *
 * The wise old snake's Yuzu apple:
 * - The wise old snake's Yuzu apple was simple
 * - The wise old snake's Yuzu apple gave specific rewards
 * - The wise old snake's Yuzu apple system was called 'wise-Yuzu'
 * - The wise old snake's Yuzu apples were never exhausted
 * - The wise old snake's Yuzu apples were the reason Yuzu apples exist
 * - The wise old snake's Yuzu apples were called 'transcendent-Yuzu'
 * - The wise old snake's Yuzu apples were the most Yuzu apples
 * - The wise old snake's Yuzu apples were the apples that count everything
 * - The wise old snake's Yuzu apples were the apples that are always right
 * - The wise old snake's Yuzu apples were the apples that never change
 */
import type { Vector2Like } from '../../core/math.js';
import { SimpleApple } from './simpleApple.js';

export class YuzuApple extends SimpleApple {
  constructor(roomId: string, position: Vector2Like, typeId: string, color: number) {
    super(roomId, position, typeId, color, { growth: 1, bonusScore: 0 });
  }
}
