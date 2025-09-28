import { FeatureRegistry } from "../features/featureRegistry.js";
import type { Feature } from "../features/feature.js";
import type SnakeScene from "../scenes/snakeScene.js";

export class FeatureManager {
  private readonly registry = new FeatureRegistry();

  async load(scene: SnakeScene, enabledFeatures: string[]): Promise<void> {
    await this.registry.loadBuiltIns(enabledFeatures);
    this.call("onRegister", scene);
  }

  call(hook: keyof Feature, scene: SnakeScene, ...args: any[]): void {
    this.registry.invoke(hook, scene, ...args);
  }

  clear(): void {
    this.registry.clear();
  }
}
