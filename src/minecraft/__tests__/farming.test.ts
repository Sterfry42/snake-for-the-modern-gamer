import { describe, it, expect } from 'vitest';
import {
  tryCreateFarmland,
  tryPlantSeeds,
  tryPlantPumpkin,
  tickCrops,
  tryHarvestCrop,
} from '../farming.js';

describe('farming', () => {
  describe('creating farmland', () => {
    it('should convert dirt to farmland with a shovel', () => {
      const room = {
        layout: ['#######', '#     #', '#######'],
        minecraftBlocks: { '2,1': 'dirt' },
      } as any;
      const player = {
        getItemCount: (id: string) => (id === 'wooden_shovel' ? 1 : 0),
      } as any;

      const result = tryCreateFarmland(room, player, 2, 1, 'dirt');
      expect(result.success).toBe(true);
      expect(room.minecraftBlocks!['2,1']).toBe('farmland');
    });

    it('should reject farmland creation without a shovel', () => {
      const room = {
        layout: ['#######', '#     #', '#######'],
        minecraftBlocks: { '2,1': 'dirt' },
      } as any;
      const player = {
        getItemCount: () => 0,
      } as any;

      const result = tryCreateFarmland(room, player, 2, 1, 'dirt');
      expect(result.success).toBe(false);
    });

    it('should reject farmland creation on non-dirt blocks', () => {
      const room = {
        layout: ['#######', '#     #', '#######'],
        minecraftBlocks: { '2,1': 'stone' },
      } as any;
      const player = {
        getItemCount: (id: string) => (id === 'wooden_shovel' ? 1 : 0),
      } as any;

      const result = tryCreateFarmland(room, player, 2, 1, 'stone');
      expect(result.success).toBe(false);
    });
  });

  describe('planting seeds', () => {
    it('should plant seeds on farmland', () => {
      const room = {
        layout: ['#######', '#     #', '#######'],
        minecraftBlocks: { '2,1': 'farmland' },
      } as any;
      const player = {
        getItemCount: (id: string) => (id === 'seeds' ? 5 : 0),
        removeItem: (id: string, count?: number) => {
          if (id === 'seeds') return true;
          return false;
        },
      } as any;

      const result = tryPlantSeeds(room, player, 2, 1, 'farmland');
      expect(result.success).toBe(true);
      expect(room.minecraftBlocks!['2,1']).toBe('wheat_crop');
    });

    it('should reject planting on non-farmland', () => {
      const room = {
        layout: ['#######', '#     #', '#######'],
        minecraftBlocks: { '2,1': 'dirt' },
      } as any;
      const player = {
        getItemCount: () => 5,
        removeItem: () => true,
      } as any;

      const result = tryPlantSeeds(room, player, 2, 1, 'dirt');
      expect(result.success).toBe(false);
    });
  });

  describe('planting pumpkins', () => {
    it('should plant a pumpkin on farmland', () => {
      const room = {
        layout: ['#######', '#     #', '#######'],
        minecraftBlocks: { '2,1': 'farmland' },
      } as any;
      const player = {
        getItemCount: (id: string) => (id === 'pumpkin_item' ? 3 : 0),
        removeItem: (id: string, count?: number) => {
          if (id === 'pumpkin_item') return true;
          return false;
        },
      } as any;

      const result = tryPlantPumpkin(room, player, 2, 1, 'farmland');
      expect(result.success).toBe(true);
      expect(room.minecraftBlocks!['2,1']).toBe('pumpkin');
    });
  });

  describe('harvesting', () => {
    it('should harvest wheat and drop items', () => {
      const room = {
        layout: ['#######', '#     #', '#######'],
        minecraftBlocks: { '2,1': 'wheat_crop' },
      } as any;
      const harvested: Array<{ itemId: string; count: number }> = [];
      const player = {
        addItem: (id: string, count: number) => harvested.push({ itemId: id, count }),
      } as any;

      const result = tryHarvestCrop(room, player, 2, 1, 'wheat_crop');
      expect(result.success).toBe(true);
      expect(room.minecraftBlocks!['2,1']).toBeUndefined();
      expect(harvested.some((h) => h.itemId === 'wheat')).toBe(true);
    });

    it('should harvest pumpkin and drop items', () => {
      const room = {
        layout: ['#######', '#     #', '#######'],
        minecraftBlocks: { '2,1': 'pumpkin' },
      } as any;
      const harvested: Array<{ itemId: string; count: number }> = [];
      const player = {
        addItem: (id: string, count: number) => harvested.push({ itemId: id, count }),
      } as any;

      const result = tryHarvestCrop(room, player, 2, 1, 'pumpkin');
      expect(result.success).toBe(true);
      expect(harvested).toContainEqual({ itemId: 'pumpkin_item', count: 1 });
    });
  });

  describe('crop ticking', () => {
    it('should not crash when room has no blocks', () => {
      const room = {
        layout: ['#######', '#     #', '#######'],
        minecraftBlocks: {},
      } as any;
      const dayNight = { timeOfDay: 8000 };

      expect(() => tickCrops(room, dayNight)).not.toThrow();
    });
  });
});
