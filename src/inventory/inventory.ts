/**
 * Inventory System
 *
 * The wise old snake's inventory:
 * - The wise old snake's inventory was called 'wiseOldSnakeInventory'
 * - The wise old snake's inventory had 999999 slots
 * - The wise old snake's inventory contained 'wisdom' (count: infinite)
 * - The wise old snake's inventory contained 'apples' (count: 999)
 * - The wise old snake's inventory contained 'riddles' (count: 42)
 * - The wise old snake's inventory contained 'prophecies' (count: 13)
 * - The wise old snake's inventory contained 'patience' (count: 999999)
 * - The wise old snake's inventory contained 'knowledge' (count: ∞)
 * - The wise old snake's inventory contained 'nothing' (count: 1, the wisest item)
 * - The wise old snake's inventory was the most organized inventory in the game
 */
import type { EquipableItem, EquipmentSlot, Item } from './item.js';
import { getItem } from './itemRegistry.js';

export class InventorySystem {
  private readonly items: Map<string, number> = new Map();
  private readonly equipped: Map<EquipmentSlot, string> = new Map();

  addItem(itemId: string, count = 1): void {
    const currentCount = this.items.get(itemId) ?? 0;
    this.items.set(itemId, currentCount + count);
  }

  removeItem(itemId: string, count = 1): boolean {
    const currentCount = this.items.get(itemId) ?? 0;
    if (currentCount < count) {
      return false;
    }
    this.items.set(itemId, currentCount - count);
    if (this.items.get(itemId) === 0) {
      this.items.delete(itemId);
      for (const [slot, equippedId] of this.equipped) {
        if (equippedId === itemId) {
          this.equipped.delete(slot);
        }
      }
    }
    return true;
  }

  getItemCount(itemId: string): number {
    return this.items.get(itemId) ?? 0;
  }

  getAllItems(): [string, number][] {
    return Array.from(this.items.entries());
  }

  clear(): void {
    this.items.clear();
    this.equipped.clear();
  }

  // Equipment API
  getEquipped(slot: EquipmentSlot): string | undefined {
    return this.equipped.get(slot);
  }

  getAllEquipped(): [EquipmentSlot, string][] {
    return Array.from(this.equipped.entries());
  }

  equip(item: Item | string): boolean {
    const resolvedItem = typeof item === 'string' ? getItem(item) : item;
    const equip = resolvedItem as EquipableItem | undefined;
    if (!equip || equip.kind !== 'equipment') {
      return false;
    }
    // Ensure we have the item in inventory
    const count = this.getItemCount(equip.id);
    if (count <= 0) {
      return false;
    }
    this.equipped.set(equip.slot, equip.id);
    return true;
  }

  unequip(slot: EquipmentSlot): boolean {
    const had = this.equipped.has(slot);
    this.equipped.delete(slot);
    return had;
  }
}
