import type { MinecraftPlayerState } from './types.js';
import { PLAYER_MAX_HEALTH, PLAYER_MAX_HUNGER } from './config.js';
import type { RoomSnapshot } from '../world/types.js';
import { getMinecraftItem } from './itemRegistry.js';
import { isMinecraftBlockType, isSolidBlock, isBlockableBlock } from './blockRegistry.js';

export class MinecraftPlayer {
  state: MinecraftPlayerState;
  armorSlots: Record<string, string | null>;

  // Creative mode palette slot (0-indexed, defaults to 0)
  creativePaletteSlot: number = 0;

  static readonly CREATIVE_BLOCK_TYPES: readonly string[] = [
    'dirt', 'grass', 'stone', 'cobblestone', 'sand',
    'gravel', 'wood', 'planks', 'torch', 'glass',
    'furnace', 'chest', 'bed', 'crafting_table', 'pumpkin',
    'iron_block', 'gold_block', 'diamond_ore', 'iron_ore', 'coal_ore',
  ];

  cyclePaletteSlot(delta: number): void {
    const blocks = MinecraftPlayer.CREATIVE_BLOCK_TYPES;
    if (blocks.length === 0) return;
    this.creativePaletteSlot = ((this.creativePaletteSlot + delta) % blocks.length + blocks.length) % blocks.length;
  }

  constructor() {
    this.state = {
      health: PLAYER_MAX_HEALTH,
      maxHealth: PLAYER_MAX_HEALTH,
      hunger: PLAYER_MAX_HUNGER,
      maxHunger: PLAYER_MAX_HUNGER,
      xp: 0,
      xpLevel: 0,
      armorPoints: 0,
      spawnX: 0,
      spawnY: 0,
      spawnRoomId: '0,0,0',
      inventory: [],
      equippedTool: null,
    };
    this.armorSlots = {
      head: null,
      torso: null,
      legs: null,
      feet: null,
    };
  }

  resetHealth(): void {
    this.state.health = this.state.maxHealth;
  }

  resetHunger(): void {
    this.state.hunger = this.state.maxHunger;
  }

  takeDamage(amount: number): void {
    this.state.health = Math.max(0, this.state.health - amount);
  }

  heal(amount: number): void {
    this.state.health = Math.min(this.state.maxHealth, this.state.health + amount);
  }

  addXp(amount: number): void {
    this.state.xp += amount;
    const threshold = this.xpForLevel(this.state.xpLevel);
    while (this.state.xp >= threshold) {
      this.state.xp -= this.xpForLevel(this.state.xpLevel);
      this.xpLevelUp();
    }
  }

  private xpForLevel(level: number): number {
    if (level < 16) return level * 7;
    if (level < 32) return level * 7 + 40;
    return level * 7 + 120;
  }

  private xpLevelUp(): void {
    this.state.xpLevel += 1;
  }

  setSpawn(x: number, y: number, roomId: string): void {
    this.state.spawnX = x;
    this.state.spawnY = y;
    this.state.spawnRoomId = roomId;
  }

  canInteractWithBlock(blockId: string): boolean {
    if (!isMinecraftBlockType(blockId)) return false;
    if (!isSolidBlock(blockId)) return true;
    const tool = this.state.equippedTool;
    if (!tool) return false;
    return canMineBlock(tool, blockId);
  }

  addItem(itemId: string, count: number = 1): void {
    const existing = this.state.inventory.find((item) => item.itemId === itemId);
    if (existing) {
      existing.count += count;
    } else {
      this.state.inventory.push({ itemId, count });
    }
  }

  removeItem(itemId: string, count: number = 1): boolean {
    const index = this.state.inventory.findIndex((item) => item.itemId === itemId);
    if (index === -1) return false;
    const item = this.state.inventory[index]!;
    if (item.count < count) return false;
    item.count -= count;
    if (item.count <= 0) {
      this.state.inventory.splice(index, 1);
    }
    return true;
  }

  getItemCount(itemId: string): number {
    const item = this.state.inventory.find((i) => i.itemId === itemId);
    return item?.count ?? 0;
  }

  equipTool(itemId: string): boolean {
    const item = getMinecraftItem(itemId);
    if (!item || !item.kind) return false;
    this.state.equippedTool = itemId;
    return true;
  }

  getEquippedTool(): string | null {
    return this.state.equippedTool;
  }

  eat(foodItemId: string): boolean {
    const item = getMinecraftItem(foodItemId);
    if (!item || item.kind !== 'consumable') return false;
    const hungerRestore = this.getHungerRestore(foodItemId);
    if (hungerRestore <= 0) return false;
    if (this.state.hunger >= this.state.maxHunger) return false;
    if (!this.removeItem(foodItemId, 1)) return false;
    this.state.hunger = Math.min(this.state.maxHunger, this.state.hunger + hungerRestore);
    return true;
  }

  private getHungerRestore(itemId: string): number {
    switch (itemId) {
      case 'cooked_beef':
        return 8;
      case 'bread':
        return 5;
      case 'raw_beef':
        return 3;
      default:
        return 0;
    }
  }

  equipArmor(itemId: string): boolean {
    const slot = getArmorSlot(itemId);
    if (!slot) return false;
    // Unequip current armor in that slot
    const currentEquipped = this.armorSlots[slot];
    if (currentEquipped) {
      this.addItem(currentEquipped, 1);
    }
    // Remove from inventory and equip
    if (this.removeItem(itemId, 1)) {
      this.armorSlots[slot] = itemId;
      this.recalculateArmor();
      return true;
    }
    return false;
  }

  unequipArmor(slot: string): boolean {
    const equipped = this.armorSlots[slot];
    if (!equipped) return false;
    this.addItem(equipped, 1);
    this.armorSlots[slot] = null;
    this.recalculateArmor();
    return true;
  }

  autoEquipArmor(slotName: string): boolean {
    const slot = getArmorSlotBySuffix(slotName);
    if (!slot) return false;

    const currentEquipped = this.armorSlots[slot];
    if (currentEquipped) {
      this.addItem(currentEquipped, 1);
    }

    // Find best armor in inventory for this slot
    let bestItem: { itemId: string; tier: number } | null = null;
    for (const invItem of this.state.inventory) {
      const itemSlot = getArmorSlot(invItem.itemId);
      if (itemSlot === slot && invItem.count > 0) {
        const tier = ARMOR_VALUES[invItem.itemId] ?? 0;
        if (!bestItem || tier > bestItem.tier) {
          bestItem = { itemId: invItem.itemId, tier };
        }
      }
    }

    if (bestItem) {
      this.removeItem(bestItem.itemId, 1);
      this.armorSlots[slot] = bestItem.itemId;
      this.recalculateArmor();
      return true;
    }
    return false;
  }

  autoUnequipArmor(slotName: string): boolean {
    const slot = getArmorSlotBySuffix(slotName);
    if (!slot) return false;
    return this.unequipArmor(slot);
  }

  getArmorSlotName(slotName: string): string | null {
    const slot = getArmorSlotBySuffix(slotName);
    if (!slot) return null;
    return this.armorSlots[slot];
  }

  getArmorPoints(): number {
    let total = 0;
    for (const slotId of Object.keys(this.armorSlots)) {
      const armorItem = this.armorSlots[slotId];
      if (armorItem) {
        total += ARMOR_VALUES[armorItem] ?? 0;
      }
    }
    this.state.armorPoints = total;
    return total;
  }

  takeDamageWithArmor(amount: number): number {
    const armorPoints = this.getArmorPoints();
    const reduction = Math.min(armorPoints / 25, 0.8);
    const damage = Math.max(1, Math.floor(amount * (1 - reduction)));
    this.takeDamage(damage);
    return damage;
  }

  recalculateArmor(): void {
    this.getArmorPoints();
  }

  reset(): void {
    this.state.health = this.state.maxHealth;
    this.state.hunger = this.state.maxHunger;
    this.state.xp = 0;
    this.state.xpLevel = 0;
    this.state.armorPoints = 0;
    this.state.equippedTool = null;
    this.armorSlots = {
      head: null,
      torso: null,
      legs: null,
      feet: null,
    };
  }
}

const ARMOR_VALUES: Record<string, number> = {
  leather_helmet: 2,
  leather_chestplate: 5,
  leather_leggings: 4,
  leather_boots: 2,
  iron_helmet: 6,
  iron_chestplate: 15,
  iron_leggings: 9,
  iron_boots: 4,
  diamond_helmet: 8,
  diamond_chestplate: 20,
  diamond_leggings: 12,
  diamond_boots: 4,
};

function getArmorSlot(itemId: string): string | null {
  if (itemId.endsWith('_helmet')) return 'head';
  if (itemId.endsWith('_chestplate')) return 'torso';
  if (itemId.endsWith('_leggings')) return 'legs';
  if (itemId.endsWith('_boots')) return 'feet';
  return null;
}

function getArmorSlotBySuffix(suffix: string): string | null {
  const map: Record<string, string> = {
    helmet: 'head',
    chestplate: 'torso',
    leggings: 'legs',
    boots: 'feet',
  };
  return map[suffix] ?? null;
}

export function isWalkable(room: RoomSnapshot, x: number, y: number): boolean {
  const tile = room.layout[y]?.[x];
  if (tile === '#' || tile === '%') return false;
  if (tile === '~') return false;

  if (room.minecraftBlocks) {
    const blockType = room.minecraftBlocks[`${x},${y}`];
    if (blockType && isBlockableBlock(blockType)) return false;
    // Lava blocks movement
    if (blockType === 'lava') return false;
  }

  return true;
}

export function isWalkableWithCreativeOverride(
  room: RoomSnapshot,
  x: number,
  y: number,
  creativeMode: boolean,
): boolean {
  // Check wall tiles - never walkable even in creative mode
  const tile = room.layout[y]?.[x];
  if (tile === '#' || tile === '%') return false;
  if (tile === '~') return false;

  if (creativeMode) {
    // In creative mode, allow walking over any Minecraft block except lava
    if (room.minecraftBlocks) {
      const blockType = room.minecraftBlocks[`${x},${y}`];
      if (blockType === 'lava') return false;
    }
    return true;
  }

  // Non-creative mode: use normal walkability check
  return isWalkable(room, x, y);
}

export function canMineBlock(toolId: string, blockId: string): boolean {
  const toolTier = getToolTier(toolId);
  if (!toolTier) return false;

  const minTierForBlock = getMinToolTierForBlock(blockId);
  return toolTier >= minTierForBlock;
}

export function getToolTier(toolId: string): number {
  const tierMap: Record<string, number> = {
    // Wood tier
    wooden_pickaxe: 1,
    wooden_axe: 1,
    wooden_shovel: 1,
    wooden_sword: 1,
    // Stone tier
    stone_pickaxe: 2,
    stone_axe: 2,
    stone_shovel: 2,
    stone_sword: 2,
    // Iron tier
    iron_pickaxe: 3,
    iron_axe: 3,
    iron_shovel: 3,
    iron_sword: 3,
    // Diamond tier
    diamond_pickaxe: 4,
  };
  return tierMap[toolId] ?? 0;
}

// @ts-expect-error TS6133 - unused declaration
function _getBlockHardness(blockId: string): number {
  const hardnessMap: Record<string, number> = {
    dirt: 1,
    grass: 1,
    sand: 1,
    glass: 1,
    cobblestone: 3,
    stone: 3,
    gravel: 2,
    wood: 2,
    planks: 2,
    torch: 0,
    lava: 0,
    water: 0,
    coal_ore: 4,
    iron_ore: 5,
    iron_block: 5,
    gold_block: 5,
    diamond_ore: 7,
    crafting_table: 2,
  };
  return hardnessMap[blockId] ?? 1;
}

function getMinToolTierForBlock(blockId: string): number {
  const tierMap: Record<string, number> = {
    dirt: 1,
    grass: 1,
    sand: 1,
    gravel: 2,
    cobblestone: 2,
    stone: 2,
    coal_ore: 2,
    iron_ore: 3,
    iron_block: 3,
    gold_block: 3,
    diamond_ore: 4,
    glass: 1,
    wood: 1,
    planks: 1,
    crafting_table: 1,
  };
  return tierMap[blockId] ?? 1;
}
