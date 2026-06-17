import { FeatureRegistry, type FeatureHook } from '../features/featureRegistry.js';
import type SnakeScene from '../scenes/snakeScene.js';
import type { Feature } from '../features/feature.js';

export class FeatureManager {
  private readonly registry = FeatureRegistry.getInstance();

  async load(scene: SnakeScene, enabledFeatures: string[]): Promise<void> {
    await this.registry.loadBuiltIns(enabledFeatures);
    this.call('onRegister', scene);
  }

  call(hook: FeatureHook, scene: SnakeScene, ...args: any[]): void {
    this.registry.invoke(hook, scene, ...args);
  }

  getFeature<T extends Feature>(id: string): T | undefined {
    return this.registry.getAll().find((f) => f.id === id) as T | undefined;
  }

  clear(): void {
    this.registry.clear();
  }
}

export function registerFeature(feature: Feature): void {
  FeatureRegistry.getInstance().register(feature);
}
