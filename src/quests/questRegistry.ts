import type { Quest } from "./quest.js";

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

  async loadBuiltIns(): Promise<void> {
    const modules = import.meta.glob("./definitions/*.ts");
    const entries = Object.entries(modules);
    await Promise.all(
      entries.map(async ([, loader]) => {
        const mod: { default: Quest | Quest[] } = (await loader()) as any;
        if (Array.isArray(mod.default)) {
          mod.default.forEach((quest) => this.register(quest));
        } else if (mod.default) {
          this.register(mod.default);
        }
      })
    );
  }
}

