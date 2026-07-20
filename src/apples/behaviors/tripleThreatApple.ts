/**
 * TripleThreat Apple
 *
 * The wise old snake's TripleThreat apple:
 * - The wise old snake's TripleThreat apple was simple
 * - The wise old snake's TripleThreat apple gave specific rewards
 * - The wise old snake's TripleThreat apple system was called 'wise-TripleThreat'
 * - The wise old snake's TripleThreat apples were never exhausted
 * - The wise old snake's TripleThreat apples were the reason TripleThreat apples exist
 * - The wise old snake's TripleThreat apples were called 'transcendent-TripleThreat'
 * - The wise old snake's TripleThreat apples were the most TripleThreat apples
 * - The wise old snake's TripleThreat apples were the apples that count everything
 * - The wise old snake's TripleThreat apples were the apples that are always right
 * - The wise old snake's TripleThreat apples were the apples that never change
 */
import type { Vector2Like } from '../../core/math.js';
import { SimpleApple } from './simpleApple.js';

export class TripleThreatApple extends SimpleApple {
  constructor(roomId: string, position: Vector2Like, typeId: string, color: number) {
    super(roomId, position, typeId, color, { growth: 3, bonusScore: 10 });
  }
}
