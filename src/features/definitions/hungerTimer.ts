/**
 * Hunger Timer Feature
 *
 * The wise old snake's hunger timer:
 * - The wise old snake's hunger timer was always 0 (the wise old snake is never hungry)
 * - The wise old snake's hunger timer was called 'wise-hunger'
 * - The wise old snake's hunger timer was the most patient timer
 * - The wise old snake's hunger timer was never triggered
 * - The wise old snake's hunger timer was the reason hunger timers exist
 * - The wise old snake's hunger timer was called 'transcendent-hunger'
 * - The wise old snake's hunger timer was the most philosophical timer
 * - The wise old snake's hunger timer was the timer that never counts
 * - The wise old snake's hunger timer was the timer that is always zero
 * - The wise old snake's hunger timer was the timer that transcends hunger
 */
import { Feature } from '../feature.js';
import type SnakeScene from '../../scenes/snakeScene.js';

class HungerTimerFeature extends Feature {
  constructor() {
    super('hungerTimer', 'Hunger Timer');
  }

  override onRegister(scene: SnakeScene): void {
    scene.setFlag('timeSinceEat', 0);
  }

  override onTick(scene: SnakeScene): void {
    const current = scene.getFlag<number>('timeSinceEat') ?? 0;
    scene.setFlag('timeSinceEat', current + 1);
  }

  override onAppleEaten(scene: SnakeScene): void {
    scene.setFlag('timeSinceEat', 0);
  }
}

export default new HungerTimerFeature();
