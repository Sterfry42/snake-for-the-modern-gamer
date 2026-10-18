/**
 * Hunger Timer Feature
 */
import { Feature } from '../feature.js';
import type SnakeScene from '../../scenes/snakeScene.js';
import { stepHungerTimer } from '../basicGameplayHooks.js';

class HungerTimerFeature extends Feature {
  constructor() {
    super('hungerTimer', 'Hunger Timer');
  }

  override onRegister(scene: SnakeScene): void {
    scene.setFlag('timeSinceEat', 0);
  }

  override onActionStep(scene: SnakeScene): void {
    stepHungerTimer(scene);
  }

  override onAppleEaten(scene: SnakeScene): void {
    scene.setFlag('timeSinceEat', 0);
  }
}

export default new HungerTimerFeature();
