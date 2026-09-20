import { describe, it, expect } from 'vitest';
import {
  tryPlaceChest,
  tryDepositToChest,
  tryWithdrawFromChest,
  tryBreakChest,
  getChestContents,
} from '../chest.js';
import { MinecraftPlayer } from '../player.js';

describe('chest', () => {
  describe('chest placement', () => {
    it('should place a chest', () => {
      const chests = new Map();
      const result = tryPlaceChest(chests, 5, 5, '0,0,0');
      expect(result.success).toBe(true);
      expect(chests.size).toBe(1);
    });

    it('should reject placing a chest on an existing chest', () => {
      const chests = new Map();
      tryPlaceChest(chests, 5, 5, '0,0,0');
      const result = tryPlaceChest(chests, 5, 5, '0,0,0');
      expect(result.success).toBe(false);
      expect(result.message).toBe('A chest is already here.');
    });
  });

  describe('depositing items', () => {
    it('should deposit items into a chest', () => {
      const chests = new Map();
      tryPlaceChest(chests, 5, 5, '0,0,0');
      const playerInventory: Array<{ itemId: string; count: number }> = [
        { itemId: 'cobblestone', count: 10 },
      ];
      const player = {
        getItemCount: (id: string) => playerInventory.find((i) => i.itemId === id)?.count ?? 0,
        removeItem: (id: string, count: number) => {
          const idx = playerInventory.findIndex((i) => i.itemId === id);
          if (idx === -1) return false;
          playerInventory[idx]!.count -= count;
          if (playerInventory[idx]!.count <= 0) playerInventory.splice(idx, 1);
          return true;
        },
        addItem: () => {},
      } as unknown as MinecraftPlayer;

      const result = tryDepositToChest(chests, player, 5, 5, '0,0,0', 'cobblestone', 5);
      expect(result.success).toBe(true);
    });

    it('should stack deposited items', () => {
      const chests = new Map();
      tryPlaceChest(chests, 5, 5, '0,0,0');
      const playerInventory: Array<{ itemId: string; count: number }> = [
        { itemId: 'cobblestone', count: 8 },
      ];
      const player = {
        getItemCount: (id: string) => playerInventory.find((i) => i.itemId === id)?.count ?? 0,
        removeItem: (id: string, count: number) => {
          const idx = playerInventory.findIndex((i) => i.itemId === id);
          if (idx === -1) return false;
          playerInventory[idx]!.count -= count;
          if (playerInventory[idx]!.count <= 0) playerInventory.splice(idx, 1);
          return true;
        },
        addItem: () => {},
      } as unknown as MinecraftPlayer;

      // First deposit
      tryDepositToChest(chests, player, 5, 5, '0,0,0', 'cobblestone', 5);
      // Second deposit should stack
      tryDepositToChest(chests, player, 5, 5, '0,0,0', 'cobblestone', 3);

      const contents = getChestContents(chests, 5, 5, '0,0,0');
      expect(contents).not.toBeNull();
      const slot = contents!.find((s) => s.itemId === 'cobblestone');
      expect(slot?.count).toBe(8);
    });
  });

  describe('withdrawing items', () => {
    it('should withdraw items from a chest', () => {
      const chests = new Map();
      tryPlaceChest(chests, 5, 5, '0,0,0');

      // Pre-fill chest
      const chest = chests.get('5,5,0,0,0');
      chest!.slots[0] = { itemId: 'cobblestone', count: 10 };

      const withdrawn: Array<{ itemId: string; count: number }> = [];
      const player = {
        getItemCount: () => 0,
        removeItem: () => true,
        addItem: (id: string, count: number) => withdrawn.push({ itemId: id, count }),
      } as unknown as MinecraftPlayer;

      const result = tryWithdrawFromChest(chests, player, 5, 5, '0,0,0', 'cobblestone', 3);
      expect(result.success).toBe(true);
      expect(withdrawn).toEqual([{ itemId: 'cobblestone', count: 3 }]);
    });
  });

  describe('breaking chests', () => {
    it('should return all items to player when breaking a chest', () => {
      const chests = new Map();
      tryPlaceChest(chests, 5, 5, '0,0,0');

      // Pre-fill chest
      const chest = chests.get('5,5,0,0,0');
      chest!.slots[0] = { itemId: 'cobblestone', count: 5 };
      chest!.slots[1] = { itemId: 'iron_ingot', count: 3 };

      const collected: Array<{ itemId: string; count: number }> = [];
      const player = {
        getItemCount: () => 0,
        removeItem: () => true,
        addItem: (id: string, count: number) => collected.push({ itemId: id, count }),
      } as unknown as MinecraftPlayer;

      const result = tryBreakChest(chests, player, 5, 5, '0,0,0');
      expect(result.success).toBe(true);
      expect(chests.size).toBe(0);
      expect(collected).toEqual([
        { itemId: 'cobblestone', count: 5 },
        { itemId: 'iron_ingot', count: 3 },
      ]);
    });
  });

  describe('chest contents lookup', () => {
    it('should return null for non-existent chest', () => {
      const chests = new Map();
      const contents = getChestContents(chests, 5, 5, '0,0,0');
      expect(contents).toBeNull();
    });
  });
});
