/**
 * Quest Registry
 */
import type { Quest } from './quest.js';
import { builtInQuestLoaders } from './builtInQuests.js';

export class QuestRegistry {
  private readonly quests = new Map<string, Quest>();

  register(quest: Quest): void {
    if (this.quests.has(quest.id)) {
      console.warn(`Quest with id "${quest.id}" is already registered. Skipping.`);
      return;
    }
    this.quests.set(quest.id, quest);
  }

  clear(): void {
    this.quests.clear();
  }

  getAll(): Quest[] {
    return Array.from(this.quests.values());
  }

  getAvailable(exclude: Iterable<string>): Quest[] {
    const excludeSet = new Set(exclude);
    return this.getAll().filter((quest) => !excludeSet.has(quest.id));
  }

  getById(id: string): Quest | undefined {
    return this.quests.get(id);
  }

  async loadBuiltIns(): Promise<void> {
    await Promise.all(
      builtInQuestLoaders.map(async (loader) => {
        const mod = await loader();
        if (!('default' in mod)) return;
        if (Array.isArray(mod.default)) {
          mod.default.forEach((quest) => this.register(quest));
        } else if (mod.default) {
          this.register(mod.default);
        }
      }),
    );
  }
}
