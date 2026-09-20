import type SnakeScene from '../scenes/snakeScene.js';

export type FeatureContext = SnakeScene;

export abstract class Feature {
  protected constructor(
    public readonly id: string,
    public readonly label: string,
  ) {}

  onRegister(context: FeatureContext): void {
    void context;
  }
  onActionStep(context: FeatureContext): void {
    this.onTick(context);
  }
  onTick(context: FeatureContext): void {
    void context;
  }
  onRender(context: FeatureContext): void {
    void context;
  }
  onAppleEaten(context: FeatureContext): void {
    void context;
  }
  onGameOver(context: FeatureContext): void {
    void context;
  }
}
