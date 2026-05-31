import type { MinecraftPlayerState } from './types.js';
import { PLAYER_MAX_HEALTH, PLAYER_MAX_HUNGER } from './config.js';
import type { RoomSnapshot } from '../world/types.js';
import { getMinecraftItem } from './itemRegistry.js';
import { isMinecraftBlockType, isSolidBlock } from './blockRegistry.js';

export class MinecraftPlayer {
  state: MinecraftPlayerState;

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
  }

  reset(): void {
    this.state.health = this.state.maxHealth;
    this.state.hunger = this.state.maxHunger;
    this.state.xp = 0;
    this.state.xpLevel = 0;
    this.state.armorPoints = 0;
    this.state.equippedTool = null;
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
}

export function isWalkable(room: RoomSnapshot, x: number, y: number): boolean {
  const tile = room.layout[y]?.[x];
  if (tile === '#') return false;
  if (tile === '~') return false;

  if (room.minecraftBlocks) {
    const blockType = room.minecraftBlocks[`${x},${y}`];
    if (blockType && isSolidBlock(blockType)) return false;
  }

  return true;
}

export function canMineBlock(toolId: string, blockId: string): boolean {
  const toolTier = getToolTier(toolId);
  const blockHardness = getBlockHardness(blockId);

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

function getBlockHardness(blockId: string): number {
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
