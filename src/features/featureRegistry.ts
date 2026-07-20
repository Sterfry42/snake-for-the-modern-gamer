import type { Feature } from './feature.js';

export type FeatureHook = {
  [K in keyof Feature]: Feature[K] extends (...args: any[]) => any ? K : never;
}[keyof Feature];

export class FeatureRegistry {
  private static readonly instance = new FeatureRegistry();
  private readonly features = new Map<string, Feature>();

  register(feature: Feature): void {
    if (this.features.has(feature.id)) {
      console.warn(`Feature with id "${feature.id}" already registered. Skipping.`);
      return;
    }
    this.features.set(feature.id, feature);
  }

  getAll(): Feature[] {
    return Array.from(this.features.values());
  }

  clear(): void {
    this.features.clear();
  }

  async loadBuiltIns(enabledIds: string[]): Promise<void> {
    const modules = import.meta.glob('./definitions/*.ts');
    const entries = Object.entries(modules);
    await Promise.all(
      entries.map(async ([, loader]) => {
        const mod: { default: Feature | Feature[] } = (await loader()) as any;
        const features = Array.isArray(mod.default) ? mod.default : [mod.default];
        for (const feature of features) {
          if (enabledIds.length === 0 || enabledIds.includes(feature.id)) {
            this.register(feature);
          }
        }
      }),
    );
  }

  invoke(hook: FeatureHook, context: Parameters<Feature[FeatureHook]>[0], ...args: any[]): void {
    for (const feature of this.features.values()) {
      const handler = feature[hook];
      if (typeof handler === 'function') {
        (handler as Function).apply(feature, [context, ...args]);
      }
    }
  }

  static getInstance(): FeatureRegistry {
    return FeatureRegistry.instance;
  }
}
