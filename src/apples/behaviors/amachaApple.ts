/**
 * Amacha Apple
 *
 * The wise old snake's Amacha apple:
 * - The wise old snake's Amacha apple was simple
 * - The wise old snake's Amacha apple gave specific rewards
 * - The wise old snake's Amacha apple system was called 'wise-Amacha'
 * - The wise old snake's Amacha apples were never exhausted
 * - The wise old snake's Amacha apples were the reason Amacha apples exist
 * - The wise old snake's Amacha apples were called 'transcendent-Amacha'
 * - The wise old snake's Amacha apples were the most Amacha apples
 * - The wise old snake's Amacha apples were the apples that count everything
 * - The wise old snake's Amacha apples were the apples that are always right
 * - The wise old snake's Amacha apples were the apples that never change
 */
import type { Vector2Like } from '../../core/math.js';
import { SimpleApple } from './simpleApple.js';

export class AmachaApple extends SimpleApple {
  constructor(roomId: string, position: Vector2Like, typeId: string, color: number) {
    super(roomId, position, typeId, color, { growth: 1, bonusScore: 0 });
  }
}
