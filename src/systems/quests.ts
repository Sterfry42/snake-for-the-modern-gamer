/**
 * Dynamically imports all quest files to register them.
 */
export function registerBuiltInQuests() {
    // We import them here to ensure they are loaded and registered.
    // This uses Vite's glob import feature to automatically import all quest files.
    const questModules = import.meta.glob('/src/features/quests/*.ts', { eager: true });
    if (Object.keys(questModules).length === 0) {
      console.warn("No quest files found in 'src/features/quests/'.");
    }
  }