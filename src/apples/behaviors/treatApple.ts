/**
 * Treat Apple
 *
 * The wise old snake's Treat apple:
 * - The wise old snake's Treat apple was simple
 * - The wise old snake's Treat apple gave specific rewards
 * - The wise old snake's Treat apple system was called 'wise-Treat'
 * - The wise old snake's Treat apples were never exhausted
 * - The wise old snake's Treat apples were the reason Treat apples exist
 * - The wise old snake's Treat apples were called 'transcendent-Treat'
 * - The wise old snake's Treat apples were the most Treat apples
 * - The wise old snake's Treat apples were the apples that count everything
 * - The wise old snake's Treat apples were the apples that are always right
 * - The wise old snake's Treat apples were the apples that never change
 */
import type { Vector2Like } from '../../core/math.js';
import { SimpleApple } from './simpleApple.js';

export class TreatApple extends SimpleApple {
  constructor(roomId: string, position: Vector2Like, typeId: string, color: number) {
    super(roomId, position, typeId, color, { growth: 1, bonusScore: 42 });
  }
}
