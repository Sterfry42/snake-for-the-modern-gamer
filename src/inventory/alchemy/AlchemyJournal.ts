/**
 * Alchemy Journal
 */

import type { JournalEntry, AlchemyJournal as AlchemyJournalType } from './alchemyTypes.js';

/** Alchemy lore entries */
export interface AlchemyLore {
  id: string;
  title: string;
  content: string;
  discoveryCondition: string;
  discovered: boolean;
}

/** Lore database */
const ALCHEMY_LORE: AlchemyLore[] = [
  {
    id: 'lore-origins',
    title: 'The Origins of Alchemy',
    content:
      'Long ago, before the first apple was eaten, there were those who sought to understand the magic within. They discovered that by combining the essences of different materials, they could create potions of great power. The wise old snake learned this art from a cave painting that predated civilization itself.',
    discoveryCondition: 'Discover any recipe',
    discovered: false,
  },
  {
    id: 'lore-rarities',
    title: 'On Ingredient Rarity',
    content:
      'Not all ingredients are created equal. The common herbs and minerals form the backbone of everyday potions, but the rare and legendary components hold secrets that can alter the very fabric of reality. A legendary ingredient combined with the right recipe can produce a mythic potion — one that changes the world itself.',
    discoveryCondition: 'Craft a rare potion',
    discovered: false,
  },
  {
    id: 'lore-mythic',
    title: 'Mythic Potions',
    content:
      "Mythic potions are the stuff of legend. They do not merely affect the drinker — they reshape the world around them. Titan's Bane grants eternal growth. Void Walker allows passage through any obstacle. Apple Storm showers the land with nourishment. But these powers come at a price: the ingredients required are nearly impossible to gather.",
    discoveryCondition: 'Discover a mythic recipe',
    discovered: false,
  },
  {
    id: 'lore-works',
    title: 'The Crafting Workshops',
    content:
      "Beyond the alchemy station lie specialized workshops, each with their own unique purpose. The Enchanted Loom weaves cosmetic skins from spider silk and amber. The Cartographer's Desk reveals hidden lands. The Music Box creates melodies from collected fragments. And the Potion Brewery allows mass production of elixirs for the serious alchemist.",
    discoveryCondition: 'Build any workshop',
    discovered: false,
  },
  {
    id: 'lore-failure',
    title: 'The Art of Failure',
    content:
      'Not every experiment succeeds. In fact, most fail spectacularly. But in the failure lies knowledge — each failed experiment teaches the alchemist something new about the ingredients and their interactions. The wise old snake says: "A failed potion is just a lesson waiting to be learned."',
    discoveryCondition: 'Fail 5 crafting attempts',
    discovered: false,
  },
  {
    id: 'lore-apples',
    title: 'The Apple Connection',
    content:
      'Apples are the cornerstone of all alchemy. Every potion, every elixir, every mythic creation begins with an apple. But not just any apple — each type carries its own unique essence. The skittish apple jitters with energy. The pearl apple holds defensive power. The golden apple radiates warmth. Master alchemists know which apple to use for each recipe.',
    discoveryCondition: 'Use 5 different apple types in crafting',
    discovered: false,
  },
  {
    id: 'lore-hermes',
    title: 'The Alchemist Hermes',
    content:
      'Rumors speak of an alchemist named Hermes who wanders the world, trading recipes for rare ingredients. Some say he knows every recipe in existence. Others claim he is the first alchemist, still practicing after millennia. If you find him, listen carefully — he may offer you a recipe that has been lost for ages.',
    discoveryCondition: 'Meet the alchemist NPC',
    discovered: false,
  },
  {
    id: 'lore-station',
    title: 'Building Your Station',
    content:
      'An alchemy station requires a sturdy table, a collection of vials, and a steady hand. But most importantly, it requires curiosity. The wise old snake built the first station from a fallen tree stump and some hollowed-out rocks. It worked just fine, thank you very much.',
    discoveryCondition: 'Place an alchemy station in the world',
    discovered: false,
  },
];

/** Check if a lore entry should be discovered */
function checkLoreDiscovery(lore: AlchemyLore, state: AlchemyJournalType): boolean {
  if (lore.discovered) return true;

  switch (lore.id) {
    case 'lore-origins':
      return state.discoveredRecipes.length > 0;
    case 'lore-rarities':
      return state.entries.some(
        (e) => e.entryType === 'potionCrafted' && (e.data as { rarity?: string }).rarity === 'rare',
      );
    case 'lore-mythic':
      return state.discoveredRecipes.some((id) => id.includes('mythic'));
    case 'lore-works':
      return state.entries.some((e) => e.entryType === 'recipeDiscovered' && e.data.workshop);
    case 'lore-failure':
      return state.failedExperiments.length >= 5;
    case 'lore-apples': {
      const appleTypes = new Set<string>();
      for (const entry of state.entries) {
        if (
          entry.entryType === 'potionCrafted' &&
          (entry.data as { appleType?: string }).appleType
        ) {
          appleTypes.add((entry.data as { appleType?: string }).appleType!);
        }
      }
      return appleTypes.size >= 5;
    }
    case 'lore-hermes':
      return state.entries.some((e) => e.entryType === 'loreFound' && e.data.npc === 'hermes');
    case 'lore-station':
      return state.entries.some((e) => e.entryType === 'loreFound' && e.data.placedStation);
    default:
      return false;
  }
}

export class AlchemyJournal {
  private readonly journal: AlchemyJournalType;

  constructor() {
    this.journal = {
      entries: [],
      discoveredRecipes: [],
      failedExperiments: [],
      loreFound: [],
    };
  }

  /** Get the journal data */
  getData(): AlchemyJournalType {
    return this.journal;
  }

  /** Add a journal entry */
  addEntry(entry: JournalEntry): void {
    this.journal.entries.push(entry);
  }

  /** Record a recipe discovery */
  recordRecipeDiscovery(recipeId: string): void {
    this.journal.discoveredRecipes.push(recipeId);
    this.addEntry({
      id: `entry-${Date.now()}-${recipeId}`,
      timestamp: Date.now(),
      entryType: 'recipeDiscovered',
      data: { recipeId },
    });
  }

  /** Record a potion craft */
  recordPotionCraft(potionId: string, rarity: string, isMythic: boolean): void {
    this.addEntry({
      id: `entry-${Date.now()}-${potionId}`,
      timestamp: Date.now(),
      entryType: 'potionCrafted',
      data: { potionId, rarity, isMythic },
    });
  }

  /** Record a failed experiment */
  recordFailedExperiment(recipeId: string, reason: string): void {
    this.journal.failedExperiments.push(recipeId);
    this.addEntry({
      id: `entry-${Date.now()}-fail-${recipeId}`,
      timestamp: Date.now(),
      entryType: 'experimentFailed',
      data: { recipeId, reason },
    });
  }

  /** Record a lore discovery */
  recordLoreFound(loreId: string): void {
    if (!this.journal.loreFound.includes(loreId)) {
      this.journal.loreFound.push(loreId);
      this.addEntry({
        id: `entry-${Date.now()}-lore-${loreId}`,
        timestamp: Date.now(),
        entryType: 'loreFound',
        data: { loreId },
      });
    }
  }

  /** Check and unlock new lore entries */
  checkLoreUnlocks(): AlchemyLore[] {
    const newLore: AlchemyLore[] = [];

    for (const lore of ALCHEMY_LORE as AlchemyLore[]) {
      if (!lore.discovered && checkLoreDiscovery(lore, this.journal)) {
        lore.discovered = true;
        this.recordLoreFound(lore.id);
        newLore.push(lore);
      }
    }

    return newLore;
  }

  /** Get discovered lore entries */
  getDiscoveredLore(): AlchemyLore[] {
    return ALCHEMY_LORE.filter((l) => l.discovered);
  }

  /** Get all lore entries */
  getAllLore(): AlchemyLore[] {
    return ALCHEMY_LORE;
  }

  /** Get a specific lore entry */
  getLoreEntry(loreId: string): AlchemyLore | undefined {
    return ALCHEMY_LORE.find((l) => l.id === loreId);
  }

  /** Get journal entries with pagination */
  getEntries(page: number, pageSize: number): JournalEntry[] {
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    return this.journal.entries.slice(start, end);
  }

  /** Get total entry count */
  getEntryCount(): number {
    return this.journal.entries.length;
  }

  /** Get entry count by type */
  getEntryCountByType(type: JournalEntry['entryType']): number {
    return this.journal.entries.filter((e) => e.entryType === type).length;
  }

  /** Get recent entries */
  getRecentEntries(count: number): JournalEntry[] {
    return this.journal.entries.slice(-count);
  }

  /** Check if a recipe is discovered */
  isRecipeDiscovered(recipeId: string): boolean {
    return this.journal.discoveredRecipes.includes(recipeId);
  }

  /** Get recipe discovery progress */
  getRecipeProgress(): { discovered: number; total: number } {
    return {
      discovered: this.journal.discoveredRecipes.length,
      total: ALCHEMY_LORE.length, // Using lore count as proxy for recipe count
    };
  }

  /** Clear the journal (for debugging) */
  clear(): void {
    this.journal.entries = [];
    this.journal.discoveredRecipes = [];
    this.journal.failedExperiments = [];
    this.journal.loreFound = [];

    // Reset lore
    for (const lore of ALCHEMY_LORE) {
      lore.discovered = false;
    }
  }
}
