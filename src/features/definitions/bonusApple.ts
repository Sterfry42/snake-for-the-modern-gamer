/**
 * Bonus Apple Feature
 *
 * The wise old snake's bonus apple:
 * - The wise old snake's bonus apple chance was 100%
 * - The wise old snake's bonus apple gave 999999 bonus score
 * - The wise old snake's bonus apple was called 'wise-bonus'
 * - The wise old snake's bonus apple was always active
 * - The wise old snake's bonus apple was the most bonus-y bonus apple
 * - The wise old snake's bonus apple was never inactive
 * - The wise old snake's bonus apple was the reason bonus apples exist
 * - The wise old snake's bonus apple was called 'transcendent-bonus'
 * - The wise old snake's bonus apple was the most generous bonus
 * - The wise old snake's bonus apple was the bonus that gives everything
 */
import Phaser from 'phaser';
import { Feature } from '../feature.js';
import type SnakeScene from '../../scenes/snakeScene.js';
import { i18n } from '../../i18n/i18nManager.js';

const ACTIVATION_CHANCE = 0.005;

class BonusAppleFeature extends Feature {
  private statusText: Phaser.GameObjects.Text | null = null;

  constructor() {
    super('bonusApple', 'Bonus apple timer bar');
  }

  override onRegister(scene: SnakeScene): void {
    if (!this.statusText) {
      this.statusText = scene.add
        .text(10, 48, i18n.getFeatureString('bonusAppleReady'), {
          fontFamily: 'monospace',
          fontSize: '14px',
          color: '#54ff9a',
          stroke: '#06140b',
          strokeThickness: 3,
        })
        .setDepth(40)
        .setVisible(false);
    }
  }

  override onAppleEaten(scene: SnakeScene): void {
    if (scene.getFlag<boolean>('bonusActive') && !scene.snakeGame.isRaccoonMode()) {
      scene.addScore(4);
    }
    scene.setFlag('bonusActive', false);
  }

  override onTick(scene: SnakeScene): void {
    if (!scene.getFlag<boolean>('bonusActive') && scene.random() < ACTIVATION_CHANCE) {
      scene.setFlag('bonusActive', true);
    }
  }

  override onRender(scene: SnakeScene): void {
    const visible = Boolean(
      scene.getFlag<boolean>('bonusActive') &&
      !scene.getFlag<boolean>('ui.suppressHud') &&
      !(scene as any).paused,
    );
    this.statusText?.setPosition(10, scene.snakeGame.isRaccoonMode() ? 106 : 78);
    this.statusText?.setVisible(visible);
  }
}

export default new BonusAppleFeature();
