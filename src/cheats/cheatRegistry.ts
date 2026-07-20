/**
 * Central cheat registry. All cheats are defined here so they
 * automatically appear in the cheat menu and are discoverable by tests.
 *
 * To add a new cheat:
 *   1. Add an entry to CHEAT_DEFINITIONS below
 *   2. Implement the logic in snakeScene.applyCheatCode()
 */

export type CheatCategory =
  | 'stats'
  | 'lives'
  | 'items'
  | 'cosmetics'
  | 'quests'
  | 'bosses'
  | 'structures'
  | 'tools';

export interface CheatDefinition {
  /** Display name shown in the cheat menu */
  name: string;
  /** Human-readable alias list (e.g. "immortal / mammamia / starman / mario") */
  code: string;
  /** Primary code used to activate the cheat (first alias) */
  primaryCode: string;
  /** Short description shown in the cheat menu */
  description: string;
  /** All aliases that activate this cheat (used by applyCheatCode) */
  aliases: string[];
  /** Category this cheat belongs to (controls grouping in the UI) */
  category: CheatCategory;
}

// === CATEGORY ORDERING ===
// Categories are rendered in this order in the cheats UI.
export const CATEGORY_ORDER: readonly CheatCategory[] = [
  'stats',
  'lives',
  'items',
  'cosmetics',
  'quests',
  'bosses',
  'structures',
  'tools',
];

/**
 * Human-readable label for a cheat category.
 * These are used as section headers in the cheats UI.
 */
export function getCategoryLabel(category: CheatCategory): string {
  const labels: Record<CheatCategory, string> = {
    stats: 'Stats & Score',
    lives: 'Lives & Survival',
    items: 'Items & Inventory',
    cosmetics: 'Cosmetics',
    quests: 'Quests',
    bosses: 'Bosses',
    structures: 'Structures',
    tools: 'Tools & Utilities',
  };
  return labels[category];
}

/**
 * Get the index of a category in the display order.
 * Lower index = displayed first.
 */
export function getCategoryOrder(category: CheatCategory): number {
  return CATEGORY_ORDER.indexOf(category);
}

/**
 * Get all cheats grouped by category, in display order.
 * Each category is guaranteed to appear (even if empty).
 */
export function getCheatsByCategory(): Map<CheatCategory, readonly CheatDefinition[]> {
  const grouped = new Map<CheatCategory, CheatDefinition[]>();
  for (const cat of CATEGORY_ORDER) {
    grouped.set(cat, []);
  }
  for (const cheat of CHEAT_DEFINITIONS) {
    const group = grouped.get(cheat.category);
    if (group) {
      group.push(cheat);
    }
  }
  // Sort within each category by primary code for stable ordering.
  for (const [, cheats] of grouped) {
    cheats.sort((a, b) => a.primaryCode.localeCompare(b.primaryCode));
  }
  return grouped;
}

export const CHEAT_DEFINITIONS: readonly CheatDefinition[] = [
  // === STATS & SCORE ===
  {
    name: 'SPECIAL MAX',
    code: 'special10 / stats10',
    primaryCode: 'special10',
    description: 'Set all SPECIAL stats to 10.',
    aliases: ['special10', 'special', 'stats10'],
    category: 'stats',
  },
  {
    name: 'APPLE SCORE x100',
    code: 'investingincrypto',
    primaryCode: 'investingincrypto',
    description: 'Apple score multiplied by 100.',
    aliases: ['investingincrypto'],
    category: 'stats',
  },
  // === LIVES & SURVIVAL ===
  {
    name: '+100 LIVES',
    code: 'imawiddlebabywhoneedshelp',
    primaryCode: 'imawiddlebabywhoneedshelp',
    description: 'Add 100 extra life charges.',
    aliases: ['imawiddlebabywhoneedshelp'],
    category: 'lives',
  },
  {
    name: 'IMMORTAL',
    code: 'immortal / mammamia / starman / mario',
    primaryCode: 'immortal',
    description: 'Invincibility, full heat/cold resistance, swimming enabled.',
    aliases: ['immortal', 'mammamia', 'starman', 'mario'],
    category: 'lives',
  },
  // === ITEMS & INVENTORY ===
  {
    name: "RYAN'S CLOSET",
    code: "ryan's closet / ryans closet",
    primaryCode: "ryan's closet",
    description: 'Acquire all useful items and auto-equip key gear.',
    aliases: ["ryan's closet", 'ryans closet'],
    category: 'items',
  },
  {
    name: 'ALL CARDS',
    code: 'ebaycollector',
    primaryCode: 'ebaycollector',
    description: 'Acquire every card in the collection.',
    aliases: ['ebaycollector'],
    category: 'items',
  },
  // === COSMETICS ===
  {
    name: "LINDSEY'S CLOSET",
    code: "lindsey's closet / lindsleys closet",
    primaryCode: "lindsey's closet",
    description: 'Unlock every cosmetic theme, hat, cowbell, and loud walking noise.',
    aliases: ["lindsey's closet", 'lindsleys closet'],
    category: 'cosmetics',
  },
  // === QUESTS ===
  {
    name: 'GREEN PURCHASE',
    code: 'teleporterquest / greenpurchase',
    primaryCode: 'teleporterquest',
    description: 'Start the Green Purchase quest.',
    aliases: ['teleporterquest', 'greenpurchase'],
    category: 'quests',
  },
  {
    name: 'FIND MY BABY',
    code: 'findmybaby / babyquest',
    primaryCode: 'findmybaby',
    description: 'Start the Find My Baby quest.',
    aliases: ['findmybaby', 'babyquest'],
    category: 'quests',
  },
  {
    name: 'FREAK YOU',
    code: 'freakyou / timequest',
    primaryCode: 'freakyou',
    description: 'Start the Freak You quest.',
    aliases: ['freakyou', 'timequest'],
    category: 'quests',
  },
  // === BOSSES ===
  {
    name: 'SPAWN FREAK DENNIS',
    code: 'freakdennis',
    primaryCode: 'freakdennis',
    description: 'Spawn Freak Dennis boss in current room.',
    aliases: ['freakdennis'],
    category: 'bosses',
  },
  {
    name: 'SPAWN FREAKER DENNIS',
    code: 'freakerdennis',
    primaryCode: 'freakerdennis',
    description: 'Spawn Freaker Dennis boss in current room.',
    aliases: ['freakerdennis'],
    category: 'bosses',
  },
  {
    name: 'SPAWN JASON STATHAM',
    code: 'jasonstatham',
    primaryCode: 'jasonstatham',
    description: 'Spawn Jason Statham boss in current room.',
    aliases: ['jasonstatham'],
    category: 'bosses',
  },
  // === STRUCTURES ===
  {
    name: 'SPAWN VILLAGE',
    code: 'village',
    primaryCode: 'village',
    description: 'Spawn a village in the current room.',
    aliases: ['village'],
    category: 'structures',
  },
  {
    name: 'SPAWN GOBLIN CAMP',
    code: 'goblin',
    primaryCode: 'goblin',
    description: 'Spawn a goblin camp in the current room.',
    aliases: ['goblin'],
    category: 'structures',
  },
  {
    name: 'SPAWN QUEST HOUSE',
    code: 'quest',
    primaryCode: 'quest',
    description: 'Spawn a quest house in the current room.',
    aliases: ['quest'],
    category: 'structures',
  },
  {
    name: 'SPAWN SNAKE MCDONALDS',
    code: 'mcdonalds / snakemcdonalds',
    primaryCode: 'mcdonalds',
    description: 'Spawn a Snake McDonalds in the current room.',
    aliases: ['mcdonalds', 'snakemcdonalds'],
    category: 'structures',
  },
  {
    name: "SPAWN SNAKE CANIE'S",
    code: 'canies / snakecanies',
    primaryCode: 'canies',
    description: "Spawn a Snake Cane's in the current room.",
    aliases: ['canies', 'snakecanies'],
    category: 'structures',
  },
  {
    name: 'SPAWN SHRINE',
    code: 'shrine',
    primaryCode: 'shrine',
    description: 'Spawn a shrine in the current room.',
    aliases: ['shrine'],
    category: 'structures',
  },
  {
    name: 'SPAWN RAMEN STAND',
    code: 'ramen / ramenstand',
    primaryCode: 'ramen',
    description: 'Spawn a ramen stand in the current room.',
    aliases: ['ramen', 'ramenstand'],
    category: 'structures',
  },
  {
    name: 'SPAWN KOI POND',
    code: 'koi / koipond',
    primaryCode: 'koi',
    description: 'Spawn a koi pond in the current room.',
    aliases: ['koi', 'koipond'],
    category: 'structures',
  },
  {
    name: 'SPAWN TENGU CAMP',
    code: 'tengu',
    primaryCode: 'tengu',
    description: 'Spawn a tengu camp in the current room.',
    aliases: ['tengu'],
    category: 'structures',
  },
  {
    name: 'SPAWN ROADSIDE MONUMENT',
    code: 'monument',
    primaryCode: 'monument',
    description: 'Spawn a roadside monument in the current room.',
    aliases: ['monument'],
    category: 'structures',
  },
  {
    name: 'SPAWN ALL-NITE DINER',
    code: 'diner / allnitediner',
    primaryCode: 'diner',
    description: 'Spawn an all-nite diner in the current room.',
    aliases: ['diner', 'allnitediner'],
    category: 'structures',
  },
  {
    name: 'SPAWN FIREWORK STAND',
    code: 'fireworks / fireworkstand',
    primaryCode: 'fireworks',
    description: 'Spawn a firework stand in the current room.',
    aliases: ['fireworks', 'fireworkstand'],
    category: 'structures',
  },
  {
    name: 'SPAWN JACKALOPE LODGE',
    code: 'jackalope',
    primaryCode: 'jackalope',
    description: 'Spawn a jackalope lodge in the current room.',
    aliases: ['jackalope'],
    category: 'structures',
  },
  {
    name: 'SPAWN MOLEMAN DIG SITE',
    code: 'moleman',
    primaryCode: 'moleman',
    description: 'Spawn a moleman dig site in the current room.',
    aliases: ['moleman'],
    category: 'structures',
  },
  {
    name: 'SPAWN MOTEL POOL',
    code: 'motelpool',
    primaryCode: 'motelpool',
    description: 'Spawn a motel pool in the current room.',
    aliases: ['motelpool'],
    category: 'structures',
  },
  {
    name: 'SPAWN GRIDIRON YARD',
    code: 'gridiron',
    primaryCode: 'gridiron',
    description: 'Spawn a gridiron yard in the current room.',
    aliases: ['gridiron'],
    category: 'structures',
  },
  {
    name: 'SPAWN BILLBOARD ORACLE',
    code: 'billboard',
    primaryCode: 'billboard',
    description: 'Spawn a billboard oracle in the current room.',
    aliases: ['billboard'],
    category: 'structures',
  },
  {
    name: 'SPAWN ROAD CREW',
    code: 'roadcrew',
    primaryCode: 'roadcrew',
    description: 'Spawn a road crew in the current room.',
    aliases: ['roadcrew'],
    category: 'structures',
  },
  {
    name: 'SPAWN ALL STRUCTURES',
    code: 'allstructures / spawnall',
    primaryCode: 'allstructures',
    description: 'Spawn all possible structures in the current room.',
    aliases: ['allstructures', 'spawnall'],
    category: 'structures',
  },
  {
    name: 'CLEAR ROOM',
    code: 'clearroom / clear / clearr',
    primaryCode: 'clearroom',
    description: 'Clear all structures and walls from the current room.',
    aliases: ['clearroom', 'clear', 'clearr'],
    category: 'structures',
  },
  // === TOOLS & UTILITIES ===
  {
    name: 'HOME ARCADE',
    code: 'homearcade / installarcade',
    primaryCode: 'homearcade',
    description: 'Install the home arcade cabinet.',
    aliases: ['homearcade', 'installarcade'],
    category: 'tools',
  },
  {
    name: 'CARD TABLES',
    code: 'cardshark / playcards',
    primaryCode: 'cardshark',
    description: 'Unlock card tables in interactions.',
    aliases: ['cardshark', 'playcards'],
    category: 'tools',
  },
  {
    name: 'PERF HUD',
    code: '90fps240hz',
    primaryCode: '90fps240hz',
    description: 'Toggle the performance counter overlay.',
    aliases: ['90fps240hz'],
    category: 'tools',
  },
  {
    name: 'MOLEMAN DIG',
    code: 'molemandig / archaeology',
    primaryCode: 'molemandig',
    description: 'Open Moleman Archaeology immediately.',
    aliases: ['molemandig', 'archaeology'],
    category: 'tools',
  },
  {
    name: 'NAVIGATOR',
    code: 'navigator / compassmaster',
    primaryCode: 'navigator',
    description: 'Acquire every biome locator in the game.',
    aliases: ['navigator', 'compassmaster'],
    category: 'tools',
  },
];

/**
 * Lookup a cheat by its normalized alias.
 * Returns undefined if no cheat matches.
 */
export function findCheatByCode(normalizedCode: string): CheatDefinition | undefined {
  const lower = normalizedCode.toLowerCase().trim();
  for (const cheat of CHEAT_DEFINITIONS) {
    for (const alias of cheat.aliases) {
      if (alias.toLowerCase().trim() === lower) {
        return cheat;
      }
    }
  }
  return undefined;
}

/**
 * Get all aliases that activate any cheat (for validation).
 */
export function getAllCheatAliases(): Set<string> {
  const aliases = new Set<string>();
  for (const cheat of CHEAT_DEFINITIONS) {
    for (const alias of cheat.aliases) {
      aliases.add(alias.toLowerCase().trim());
    }
  }
  return aliases;
}
