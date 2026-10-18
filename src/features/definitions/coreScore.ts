/**
 * Core Score Feature
 */
import Phaser from 'phaser';
import { Feature } from '../feature.js';
import type SnakeScene from '../../scenes/snakeScene.js';
import { i18n } from '../../i18n/i18nManager.js';
import { awardAppleScore } from '../basicGameplayHooks.js';

class ScoreFeature extends Feature {
  private scoreText: Phaser.GameObjects.Text | null = null;

  constructor() {
    super('coreScore', 'Score HUD');
  }

  override onRegister(scene: SnakeScene): void {
    if (!this.scoreText) {
      this.scoreText = scene.add
        .text(10, 8, this.composeLabel(scene), {
          fontFamily: 'monospace',
          fontSize: '16px',
          color: '#9ad1ff',
          lineSpacing: 2,
        })
        .setDepth(40);
    }
  }

  override onRender(scene: SnakeScene): void {
    const suppressed = !!scene.getFlag<boolean>('ui.suppressHud');
    this.scoreText?.setVisible(!suppressed);
    if (!suppressed && this.scoreText) {
      const startY = scene.getLeftHudBottomY();
      this.scoreText.setPosition(10, startY);
      this.scoreText.setText(this.composeLabel(scene));
    }
  }

  override onAppleEaten(scene: SnakeScene): void {
    awardAppleScore(scene.snakeGame, (amount) => scene.addScore(amount));
  }

  override onGameOver(scene: SnakeScene): void {
    this.scoreText?.setText(this.composeLabel(scene, 0));
  }

  getBottomY(): number {
    if (!this.scoreText) return 0;
    return this.scoreText.getBounds().bottom + 4;
  }

  private composeLabel(scene: SnakeScene, scoreOverride?: number): string {
    const score = scoreOverride ?? scene.score;
    if (scene.snakeGame.isRaccoonMode()) {
      const bandit = Math.round(scene.snakeGame.getRaccoonBanditMeter());
      return `${i18n.getFeatureString('scoreLabel')}: ${score}\nWeight: ${scene.snakeGame.getRaccoonHudWeightText()}\nBandit: ${bandit}`;
    }
    return `${i18n.getFeatureString('scoreLabel')}: ${score}\n${i18n.getFeatureString('lengthLabel')}: ${scene.snake.length}`;
  }
}

export default new ScoreFeature();
