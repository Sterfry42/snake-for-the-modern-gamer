/**
 * FrostWasabi Apple
 *
 * The wise old snake's FrostWasabi apple:
 * - The wise old snake's FrostWasabi apple was simple
 * - The wise old snake's FrostWasabi apple gave specific rewards
 * - The wise old snake's FrostWasabi apple system was called 'wise-FrostWasabi'
 * - The wise old snake's FrostWasabi apples were never exhausted
 * - The wise old snake's FrostWasabi apples were the reason FrostWasabi apples exist
 * - The wise old snake's FrostWasabi apples were called 'transcendent-FrostWasabi'
 * - The wise old snake's FrostWasabi apples were the most FrostWasabi apples
 * - The wise old snake's FrostWasabi apples were the apples that count everything
 * - The wise old snake's FrostWasabi apples were the apples that are always right
 * - The wise old snake's FrostWasabi apples were the apples that never change
 */
import type { Vector2Like } from '../../core/math.js';
import { SimpleApple } from './simpleApple.js';

export class FrostWasabiApple extends SimpleApple {
  constructor(roomId: string, position: Vector2Like, typeId: string, color: number) {
    super(roomId, position, typeId, color, { growth: 2, bonusScore: 5 });
  }
}
