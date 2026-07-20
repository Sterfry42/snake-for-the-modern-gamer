import type { MinecraftPlayer } from './player.js';

// ─── Enchantment Types ──────────────────────────────────────────────────────

export interface Enchantment {
  id: EnchantmentId;
  name: string;
  description: string;
  maxLevel: number;
  minLevel: number;
  weight: number;
}

export type EnchantmentId =
  | 'power'
  | 'punch'
  | 'flame'
  | 'infinity'
  | 'sharpness'
  | 'smite'
  | 'bane_of_arthropods'
  | 'knockback'
  | 'fire_aspect'
  | 'looting'
  | 'efficiency'
  | 'silk_touch'
  | 'unbreaking'
  | 'fortune'
  | 'fortune_block'
  | 'fortune_crop'
  | 'protection'
  | 'feather_falling'
  | 'blast_protection'
  | 'respiration'
  | 'soul_speed'
  | 'swift_sneak'
  | 'mending'
  | 'vanishing_curse'
  | 'binding_curse'
  | 'luck_of_the_sea'
  | 'lure';

export interface EnchantableItem {
  itemId: string;
  allowedEnchantments: EnchantmentId[];
  maxEnchantmentLevel: number;
}

export interface EnchantedItemState {
  itemId: string;
  enchantments: Map<string, number>;
  enchantmentLevel: number;
}

// ─── Enchantment Book Registry ──────────────────────────────────────────────

export const ENCHANTMENTS: Record<EnchantmentId, Enchantment> = {
  power: {
    id: 'power',
    name: 'Power',
    description: 'Increases damage of bows',
    maxLevel: 5,
    minLevel: 1,
    weight: 10,
  },
  punch: {
    id: 'punch',
    name: 'Punch',
    description: 'Increases arrow knockback',
    maxLevel: 2,
    minLevel: 1,
    weight: 8,
  },
  flame: {
    id: 'flame',
    name: 'Flame',
    description: 'Arrows set targets on fire',
    maxLevel: 1,
    minLevel: 1,
    weight: 8,
  },
  infinity: {
    id: 'infinity',
    name: 'Infinity',
    description: 'Bows consume only 1 arrow',
    maxLevel: 1,
    minLevel: 1,
    weight: 2,
  },
  sharpness: {
    id: 'sharpness',
    name: 'Sharpness',
    description: 'Increases melee damage',
    maxLevel: 5,
    minLevel: 1,
    weight: 10,
  },
  smite: {
    id: 'smite',
    name: 'Smite',
    description: 'Bonus damage to undead mobs',
    maxLevel: 5,
    minLevel: 1,
    weight: 8,
  },
  bane_of_arthropods: {
    id: 'bane_of_arthropods',
    name: 'Bane of Arthropods',
    description: 'Bonus damage to arthropods',
    maxLevel: 5,
    minLevel: 1,
    weight: 6,
  },
  knockback: {
    id: 'knockback',
    name: 'Knockback',
    description: 'Increases melee knockback',
    maxLevel: 2,
    minLevel: 1,
    weight: 10,
  },
  fire_aspect: {
    id: 'fire_aspect',
    name: 'Fire Aspect',
    description: 'Attacks set mobs on fire',
    maxLevel: 2,
    minLevel: 1,
    weight: 6,
  },
  looting: {
    id: 'looting',
    name: 'Looting',
    description: 'Mobs drop more items',
    maxLevel: 3,
    minLevel: 1,
    weight: 6,
  },
  efficiency: {
    id: 'efficiency',
    name: 'Efficiency',
    description: 'Increases mining speed',
    maxLevel: 5,
    minLevel: 1,
    weight: 10,
  },
  silk_touch: {
    id: 'silk_touch',
    name: 'Silk Touch',
    description: 'Blocks drop themselves when mined',
    maxLevel: 1,
    minLevel: 1,
    weight: 3,
  },
  unbreaking: {
    id: 'unbreaking',
    name: 'Unbreaking',
    description: 'Increases tool durability',
    maxLevel: 3,
    minLevel: 1,
    weight: 10,
  },
  fortune: {
    id: 'fortune',
    name: 'Fortune',
    description: 'Blocks drop more items',
    maxLevel: 3,
    minLevel: 1,
    weight: 6,
  },
  fortune_block: {
    id: 'fortune_block',
    name: 'Fortune (Blocks)',
    description: 'Blocks drop more items',
    maxLevel: 3,
    minLevel: 1,
    weight: 6,
  },
  fortune_crop: {
    id: 'fortune_crop',
    name: 'Fortune (Crops)',
    description: 'Crops drop more items',
    maxLevel: 3,
    minLevel: 1,
    weight: 6,
  },
  protection: {
    id: 'protection',
    name: 'Protection',
    description: 'Reduces all damage',
    maxLevel: 4,
    minLevel: 1,
    weight: 10,
  },
  feather_falling: {
    id: 'feather_falling',
    name: 'Feather Falling',
    description: 'Reduces fall damage',
    maxLevel: 4,
    minLevel: 1,
    weight: 8,
  },
  blast_protection: {
    id: 'blast_protection',
    name: 'Blast Protection',
    description: 'Reduces explosion damage',
    maxLevel: 4,
    minLevel: 1,
    weight: 6,
  },
  respiration: {
    id: 'respiration',
    name: 'Respiration',
    description: 'Extends underwater breathing',
    maxLevel: 3,
    minLevel: 1,
    weight: 6,
  },
  soul_speed: {
    id: 'soul_speed',
    name: 'Soul Speed',
    description: 'Increases speed on soul sand',
    maxLevel: 3,
    minLevel: 1,
    weight: 2,
  },
  swift_sneak: {
    id: 'swift_sneak',
    name: 'Swift Sneak',
    description: 'Increases crouching speed',
    maxLevel: 3,
    minLevel: 1,
    weight: 1,
  },
  mending: {
    id: 'mending',
    name: 'Mending',
    description: 'XP repairs the item',
    maxLevel: 1,
    minLevel: 1,
    weight: 2,
  },
  vanishing_curse: {
    id: 'vanishing_curse',
    name: 'Curse of Vanishing',
    description: 'Item disappears on death',
    maxLevel: 1,
    minLevel: 1,
    weight: 1,
  },
  binding_curse: {
    id: 'binding_curse',
    name: 'Curse of Binding',
    description: 'Cannot be removed until broken',
    maxLevel: 1,
    minLevel: 1,
    weight: 1,
  },
  luck_of_the_sea: {
    id: 'luck_of_the_sea',
    name: 'Luck of the Sea',
    description: 'Increases fishing loot quality',
    maxLevel: 3,
    minLevel: 1,
    weight: 5,
  },
  lure: {
    id: 'lure',
    name: 'Lure',
    description: 'Reduces fishing wait time',
    maxLevel: 3,
    minLevel: 1,
    weight: 5,
  },
};

// ─── Enchantable Items Registry ─────────────────────────────────────────────

export const ENCHANTABLE_ITEMS: Record<string, EnchantableItem> = {
  wooden_pickaxe: {
    itemId: 'wooden_pickaxe',
    allowedEnchantments: ['efficiency', 'unbreaking', 'fortune_block', 'silk_touch', 'mending'],
    maxEnchantmentLevel: 5,
  },
  stone_pickaxe: {
    itemId: 'stone_pickaxe',
    allowedEnchantments: ['efficiency', 'unbreaking', 'fortune_block', 'silk_touch', 'mending'],
    maxEnchantmentLevel: 5,
  },
  iron_pickaxe: {
    itemId: 'iron_pickaxe',
    allowedEnchantments: ['efficiency', 'unbreaking', 'fortune_block', 'silk_touch', 'mending'],
    maxEnchantmentLevel: 5,
  },
  diamond_pickaxe: {
    itemId: 'diamond_pickaxe',
    allowedEnchantments: ['efficiency', 'unbreaking', 'fortune_block', 'silk_touch', 'mending'],
    maxEnchantmentLevel: 5,
  },
  wooden_sword: {
    itemId: 'wooden_sword',
    allowedEnchantments: [
      'sharpness',
      'smite',
      'bane_of_arthropods',
      'knockback',
      'fire_aspect',
      'looting',
      'unbreaking',
      'mending',
    ],
    maxEnchantmentLevel: 5,
  },
  stone_sword: {
    itemId: 'stone_sword',
    allowedEnchantments: [
      'sharpness',
      'smite',
      'bane_of_arthropods',
      'knockback',
      'fire_aspect',
      'looting',
      'unbreaking',
      'mending',
    ],
    maxEnchantmentLevel: 5,
  },
  iron_sword: {
    itemId: 'iron_sword',
    allowedEnchantments: [
      'sharpness',
      'smite',
      'bane_of_arthropods',
      'knockback',
      'fire_aspect',
      'looting',
      'unbreaking',
      'mending',
    ],
    maxEnchantmentLevel: 5,
  },
  leather_helmet: {
    itemId: 'leather_helmet',
    allowedEnchantments: ['protection', 'feather_falling', 'respiration', 'mending'],
    maxEnchantmentLevel: 4,
  },
  leather_chestplate: {
    itemId: 'leather_chestplate',
    allowedEnchantments: ['protection', 'blast_protection', 'respiration', 'mending'],
    maxEnchantmentLevel: 4,
  },
  leather_leggings: {
    itemId: 'leather_leggings',
    allowedEnchantments: ['protection', 'blast_protection', 'respiration', 'mending'],
    maxEnchantmentLevel: 4,
  },
  leather_boots: {
    itemId: 'leather_boots',
    allowedEnchantments: ['protection', 'feather_falling', 'respiration', 'mending'],
    maxEnchantmentLevel: 4,
  },
  iron_helmet: {
    itemId: 'iron_helmet',
    allowedEnchantments: ['protection', 'feather_falling', 'respiration', 'mending'],
    maxEnchantmentLevel: 4,
  },
  iron_chestplate: {
    itemId: 'iron_chestplate',
    allowedEnchantments: ['protection', 'blast_protection', 'respiration', 'mending'],
    maxEnchantmentLevel: 4,
  },
  iron_leggings: {
    itemId: 'iron_leggings',
    allowedEnchantments: ['protection', 'blast_protection', 'respiration', 'mending'],
    maxEnchantmentLevel: 4,
  },
  iron_boots: {
    itemId: 'iron_boots',
    allowedEnchantments: ['protection', 'feather_falling', 'respiration', 'mending'],
    maxEnchantmentLevel: 4,
  },
  diamond_helmet: {
    itemId: 'diamond_helmet',
    allowedEnchantments: ['protection', 'feather_falling', 'respiration', 'mending'],
    maxEnchantmentLevel: 4,
  },
  diamond_chestplate: {
    itemId: 'diamond_chestplate',
    allowedEnchantments: ['protection', 'blast_protection', 'respiration', 'mending'],
    maxEnchantmentLevel: 4,
  },
  diamond_leggings: {
    itemId: 'diamond_leggings',
    allowedEnchantments: ['protection', 'blast_protection', 'respiration', 'mending'],
    maxEnchantmentLevel: 4,
  },
  diamond_boots: {
    itemId: 'diamond_boots',
    allowedEnchantments: ['protection', 'feather_falling', 'respiration', 'mending'],
    maxEnchantmentLevel: 4,
  },
};

// ─── Enchanting Recipes ─────────────────────────────────────────────────────

export interface EnchantingRecipe {
  id: string;
  name: string;
  requiredItems: Array<{ itemId: string; count: number }>;
  enchantment: EnchantmentId;
  minLevel: number;
  maxLevel: number;
  xpCost: number;
}

export const ENCHANTING_RECIPES: readonly EnchantingRecipe[] = [
  // Common enchantments
  {
    id: 'enchant_sharpness',
    name: 'Sharpness',
    requiredItems: [
      { itemId: 'diamond', count: 2 },
      { itemId: 'coal', count: 1 },
    ],
    enchantment: 'sharpness',
    minLevel: 1,
    maxLevel: 5,
    xpCost: 10,
  },
  {
    id: 'enchant_power',
    name: 'Power',
    requiredItems: [
      { itemId: 'diamond', count: 2 },
      { itemId: 'coal', count: 1 },
    ],
    enchantment: 'power',
    minLevel: 1,
    maxLevel: 5,
    xpCost: 10,
  },
  {
    id: 'enchant_efficiency',
    name: 'Efficiency',
    requiredItems: [
      { itemId: 'diamond', count: 2 },
      { itemId: 'coal', count: 1 },
    ],
    enchantment: 'efficiency',
    minLevel: 1,
    maxLevel: 5,
    xpCost: 10,
  },
  {
    id: 'enchant_unbreaking',
    name: 'Unbreaking',
    requiredItems: [
      { itemId: 'diamond', count: 2 },
      { itemId: 'coal', count: 1 },
    ],
    enchantment: 'unbreaking',
    minLevel: 1,
    maxLevel: 3,
    xpCost: 10,
  },
  {
    id: 'enchant_protection',
    name: 'Protection',
    requiredItems: [
      { itemId: 'diamond', count: 2 },
      { itemId: 'coal', count: 1 },
    ],
    enchantment: 'protection',
    minLevel: 1,
    maxLevel: 4,
    xpCost: 10,
  },
  {
    id: 'enchant_looting',
    name: 'Looting',
    requiredItems: [
      { itemId: 'diamond', count: 3 },
      { itemId: 'coal', count: 2 },
    ],
    enchantment: 'looting',
    minLevel: 1,
    maxLevel: 3,
    xpCost: 15,
  },
  {
    id: 'enchant_fortune',
    name: 'Fortune',
    requiredItems: [
      { itemId: 'diamond', count: 3 },
      { itemId: 'coal', count: 2 },
    ],
    enchantment: 'fortune_block',
    minLevel: 1,
    maxLevel: 3,
    xpCost: 15,
  },
  {
    id: 'enchant_silk_touch',
    name: 'Silk Touch',
    requiredItems: [
      { itemId: 'diamond', count: 4 },
      { itemId: 'coal', count: 3 },
    ],
    enchantment: 'silk_touch',
    minLevel: 1,
    maxLevel: 1,
    xpCost: 25,
  },
  {
    id: 'enchant_mending',
    name: 'Mending',
    requiredItems: [
      { itemId: 'diamond', count: 5 },
      { itemId: 'coal', count: 3 },
    ],
    enchantment: 'mending',
    minLevel: 1,
    maxLevel: 1,
    xpCost: 40,
  },
  {
    id: 'enchant_fire_aspect',
    name: 'Fire Aspect',
    requiredItems: [
      { itemId: 'diamond', count: 3 },
      { itemId: 'coal', count: 2 },
    ],
    enchantment: 'fire_aspect',
    minLevel: 1,
    maxLevel: 2,
    xpCost: 15,
  },
  {
    id: 'enchant_smite',
    name: 'Smite',
    requiredItems: [
      { itemId: 'diamond', count: 2 },
      { itemId: 'coal', count: 1 },
    ],
    enchantment: 'smite',
    minLevel: 1,
    maxLevel: 5,
    xpCost: 10,
  },
  {
    id: 'enchant_knockback',
    name: 'Knockback',
    requiredItems: [
      { itemId: 'diamond', count: 2 },
      { itemId: 'coal', count: 1 },
    ],
    enchantment: 'knockback',
    minLevel: 1,
    maxLevel: 2,
    xpCost: 10,
  },
  {
    id: 'enchant_feather_falling',
    name: 'Feather Falling',
    requiredItems: [
      { itemId: 'diamond', count: 2 },
      { itemId: 'coal', count: 1 },
    ],
    enchantment: 'feather_falling',
    minLevel: 1,
    maxLevel: 4,
    xpCost: 10,
  },
  {
    id: 'enchant_respiration',
    name: 'Respiration',
    requiredItems: [
      { itemId: 'diamond', count: 3 },
      { itemId: 'coal', count: 2 },
    ],
    enchantment: 'respiration',
    minLevel: 1,
    maxLevel: 3,
    xpCost: 15,
  },
  {
    id: 'enchant_curse_vanishing',
    name: 'Curse of Vanishing',
    requiredItems: [{ itemId: 'coal', count: 3 }],
    enchantment: 'vanishing_curse',
    minLevel: 1,
    maxLevel: 1,
    xpCost: 20,
  },
  {
    id: 'enchant_curse_binding',
    name: 'Curse of Binding',
    requiredItems: [{ itemId: 'coal', count: 3 }],
    enchantment: 'binding_curse',
    minLevel: 1,
    maxLevel: 1,
    xpCost: 20,
  },
];

// ─── Enchantment Application ────────────────────────────────────────────────

export function canEnchantItem(itemId: string): boolean {
  return itemId in ENCHANTABLE_ITEMS;
}

export function getEnchantableItem(itemId: string): EnchantableItem | undefined {
  return ENCHANTABLE_ITEMS[itemId];
}

export function getValidEnchantments(itemId: string): EnchantmentId[] {
  const item = ENCHANTABLE_ITEMS[itemId];
  return item?.allowedEnchantments ?? [];
}

export function calculateEnchantCost(enchantment: EnchantmentId, level: number): number {
  const enchant = ENCHANTMENTS[enchantment];
  if (!enchant) return 0;
  return enchant.minLevel + (level - 1) * 5;
}

export function isEnchantmentCompatible(
  existingEnchantments: Map<string, number>,
  enchantmentId: EnchantmentId,
): boolean {
  // Curse enchantments are incompatible with everything
  const curseEnchantments: EnchantmentId[] = ['vanishing_curse', 'binding_curse'];
  if (curseEnchantments.includes(enchantmentId)) {
    return existingEnchantments.size === 0;
  }

  // Check for mutually exclusive enchantments
  const exclusions: Partial<Record<EnchantmentId, EnchantmentId[]>> = {
    sharpness: ['smite', 'bane_of_arthropods'],
    smite: ['sharpness', 'bane_of_arthropods'],
    bane_of_arthropods: ['sharpness', 'smite'],
    protection: ['blast_protection'],
    blast_protection: ['protection'],
  };

  const exclusionsList = exclusions[enchantmentId] ?? [];
  for (const excl of exclusionsList) {
    if (existingEnchantments.has(excl)) {
      return false;
    }
  }

  // Check if already enchanted at max level
  const currentLevel = existingEnchantments.get(enchantmentId);
  const enchant = ENCHANTMENTS[enchantmentId];
  if (enchant && currentLevel !== undefined && currentLevel >= enchant.maxLevel) {
    return false;
  }

  return true;
}

export function getEnchantmentsForItem(itemId: string): EnchantmentId[] {
  const item = ENCHANTABLE_ITEMS[itemId];
  return item?.allowedEnchantments ?? [];
}

// ─── Enchanting Table State ─────────────────────────────────────────────────

export interface EnchantingTableState {
  x: number;
  y: number;
  roomId: string;
}

export function createEnchantingTableState(
  x: number,
  y: number,
  roomId: string,
): EnchantingTableState {
  return { x, y, roomId };
}

export function tryPlaceEnchantingTable(
  enchantingTables: Map<string, EnchantingTableState>,
  x: number,
  y: number,
  roomId: string,
): { success: boolean; message?: string } {
  const key = `${x},${y},${roomId}`;
  if (enchantingTables.has(key)) {
    return { success: false, message: 'An enchanting table is already here.' };
  }
  enchantingTables.set(key, createEnchantingTableState(x, y, roomId));
  return { success: true };
}

export function tryBreakEnchantingTable(
  enchantingTables: Map<string, EnchantingTableState>,
  x: number,
  y: number,
  roomId: string,
): { success: boolean; message?: string } {
  const key = `${x},${y},${roomId}`;
  if (!enchantingTables.has(key)) {
    return { success: false, message: 'No enchanting table here.' };
  }
  enchantingTables.delete(key);
  return { success: true };
}

// ─── Bookshelf Proximity ────────────────────────────────────────────────────

export function getBookshelfCount(
  enchantingTableX: number,
  enchantingTableY: number,
  room: { minecraftBlocks?: Record<string, string> },
): number {
  const range = 2;
  let count = 0;

  for (let dx = -range; dx <= range; dx++) {
    for (let dy = -range; dy <= range; dy++) {
      const key = `${enchantingTableX + dx},${enchantingTableY + dy}`;
      if (room.minecraftBlocks?.[key] === 'bookshelf') {
        count++;
      }
    }
  }

  return Math.min(count, 15);
}

// ─── Random Enchantment Selection ───────────────────────────────────────────

export function getAvailableEnchantmentsForItem(
  itemId: string,
  enchantingTableLevel: number,
  _bookshelfCount: number,
  existingEnchantments: Map<string, number>,
): EnchantmentId[] {
  const valid = getEnchantmentsForItem(itemId);
  return valid.filter((eId) => {
    const enchant = ENCHANTMENTS[eId];
    if (!enchant) return false;
    if (enchant.minLevel > enchantingTableLevel) return false;
    if (!isEnchantmentCompatible(existingEnchantments, eId)) return false;
    return true;
  });
}

export function getRandomEnchantment(
  itemId: string,
  enchantingTableLevel: number,
  bookshelfCount: number,
  existingEnchantments: Map<string, number>,
  rng: () => number = Math.random,
): EnchantmentId | null {
  const available = getAvailableEnchantmentsForItem(
    itemId,
    enchantingTableLevel,
    bookshelfCount,
    existingEnchantments,
  );

  if (available.length === 0) return null;

  // Weight by enchantment weight (rarer enchantments less likely)
  const totalWeight = available.reduce((sum, eId) => {
    const enchant = ENCHANTMENTS[eId];
    return sum + (enchant?.weight ?? 5);
  }, 0);

  let roll = rng() * totalWeight;
  for (const eId of available) {
    const enchant = ENCHANTMENTS[eId];
    roll -= enchant?.weight ?? 5;
    if (roll <= 0) return eId;
  }

  return available[0];
}

// ─── Enchant Level Calculation ──────────────────────────────────────────────

export function calculateEnchantLevel(
  enchantingTableLevel: number,
  bookshelfCount: number,
  rng: () => number,
): number {
  const maxLevel = Math.min(enchantingTableLevel + Math.floor(bookshelfCount / 2), 15);
  const minLevel = Math.max(Math.floor(maxLevel / 2), 1);
  return Math.floor(rng() * (maxLevel - minLevel + 1)) + minLevel;
}

// ─── Enchant Application ────────────────────────────────────────────────────

export function applyEnchantment(
  player: MinecraftPlayer,
  itemId: string,
  enchantment: EnchantmentId,
  level: number,
  xpCost: number,
): { success: boolean; message?: string } {
  const enchantable = ENCHANTABLE_ITEMS[itemId];
  if (!enchantable) {
    return { success: false, message: 'Cannot enchant this item.' };
  }

  if (player.state.xpLevel < xpCost) {
    return { success: false, message: `Not enough XP levels! Need ${xpCost}.` };
  }

  // Find the item in inventory
  const invItem = player.state.inventory.find((i) => i.itemId === itemId);
  if (!invItem || invItem.count <= 0) {
    return { success: false, message: 'Item not in inventory.' };
  }

  // Track enchantment state on the player's enchanted items
  if (!player.state.enchantedItems) {
    player.state.enchantedItems = [];
  }

  const existingEnchanted = player.state.enchantedItems.find(
    (e: EnchantedItemState) => e.itemId === itemId,
  );

  if (existingEnchanted) {
    // Add to existing enchantments
    const currentLevel = existingEnchanted.enchantments.get(enchantment) ?? 0;
    existingEnchanted.enchantments.set(
      enchantment,
      Math.min(currentLevel + level, ENCHANTMENTS[enchantment]?.maxLevel ?? level),
    );
  } else {
    // Create new enchanted item entry
    player.state.enchantedItems.push({
      itemId,
      enchantments: new Map<string, number>([[enchantment, level]]),
      enchantmentLevel: level,
    });
  }

  // Deduct XP
  player.state.xpLevel -= xpCost;

  return { success: true };
}

// ─── Enchantment Effects ────────────────────────────────────────────────────

export function getEnchantmentBonus(itemId: string, enchantmentId: EnchantmentId): number {
  if (!playerStateHasEnchantedItem(itemId)) return 0;

  const enchanted = playerStateGetEnchantedItem(itemId);
  if (!enchanted) return 0;

  return enchanted.enchantments.get(enchantmentId) ?? 0;
}

function playerStateHasEnchantedItem(_itemId: string): boolean {
  return false;
}

function playerStateGetEnchantedItem(_itemId: string): EnchantedItemState | null {
  return null;
}

export function getDamageBonus(itemId: string): number {
  let total = 0;

  const sharpnessLevel = getEnchantmentBonus(itemId, 'sharpness');
  total += sharpnessLevel;

  const smiteLevel = getEnchantmentBonus(itemId, 'smite');
  total += smiteLevel * 2;

  const baneLevel = getEnchantmentBonus(itemId, 'bane_of_arthropods');
  total += baneLevel * 2;

  return total;
}

export function getMiningSpeedMultiplier(itemId: string): number {
  const efficiencyLevel = getEnchantmentBonus(itemId, 'efficiency');
  return 1 + efficiencyLevel * 0.5;
}

export function getBlockDropMultiplier(itemId: string): number {
  const fortuneLevel = getEnchantmentBonus(itemId, 'fortune_block');
  if (fortuneLevel === 0) return 1;
  return Math.min(4, 1 + Math.floor(fortuneLevel / 2));
}

export function getCropDropMultiplier(itemId: string): number {
  const fortuneLevel = getEnchantmentBonus(itemId, 'fortune_crop');
  if (fortuneLevel === 0) return 1;
  return Math.min(4, 1 + Math.floor(fortuneLevel / 2));
}

export function getProtectionReduction(player: MinecraftPlayer): number {
  let totalProtection = 0;

  for (const slotName of Object.keys(player.armorSlots)) {
    const armorItem = player.armorSlots[slotName];
    if (!armorItem) continue;
    const protectionLevel = getEnchantmentBonus(armorItem, 'protection');
    totalProtection += protectionLevel;
  }

  return Math.min(totalProtection * 0.04, 0.8);
}

export function getBlastProtectionReduction(player: MinecraftPlayer): number {
  let totalBlastProtection = 0;

  for (const slotName of Object.keys(player.armorSlots)) {
    const armorItem = player.armorSlots[slotName];
    if (!armorItem) continue;
    const blastLevel = getEnchantmentBonus(armorItem, 'blast_protection');
    totalBlastProtection += blastLevel;
  }

  return Math.min(totalBlastProtection * 0.05, 0.8);
}

// ─── Enchanting UI Data ─────────────────────────────────────────────────────

export interface EnchantOption {
  enchantment: EnchantmentId;
  level: number;
  xpCost: number;
  label: string;
}

export function getEnchantOptionsForItem(
  itemId: string,
  enchantingTableLevel: number,
  bookshelfCount: number,
  existingEnchantments: Map<string, number>,
): EnchantOption[] {
  const options: EnchantOption[] = [];

  const enchantId = getRandomEnchantment(
    itemId,
    enchantingTableLevel,
    bookshelfCount,
    existingEnchantments,
  );

  if (enchantId) {
    const enchant = ENCHANTMENTS[enchantId];
    const level = calculateEnchantLevel(enchantingTableLevel, bookshelfCount, () => {
      const rng = Math.random();
      if (rng < 0.5) return Math.max(1, Math.floor(enchant.minLevel / 2));
      return enchant.minLevel;
    });
    const xpCost = calculateEnchantCost(enchantId, level);

    options.push({
      enchantment: enchantId,
      level,
      xpCost,
      label: `${enchant.name} ${level}`,
    });
  }

  return options;
}
