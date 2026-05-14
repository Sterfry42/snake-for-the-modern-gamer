import type SnakeScene from '../scenes/snakeScene.js';

export type FeatureContext = SnakeScene;

export abstract class Feature {
  protected constructor(
    public readonly id: string,
    public readonly label: string,
  ) {}

  onRegister(_context: FeatureContext): void {}
  onActionStep(context: FeatureContext): void {
    this.onTick(context);
  }
  onTick(_context: FeatureContext): void {}
  onRender(_context: FeatureContext): void {}
  onAppleEaten(_context: FeatureContext): void {}
  onGameOver(_context: FeatureContext): void {}
}
