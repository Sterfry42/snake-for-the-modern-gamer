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
