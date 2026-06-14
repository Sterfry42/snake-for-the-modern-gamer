import { describe, it, expect } from 'vitest';
import {
  canSmelt,
  getSmeltingTime,
  isFuel,
  getFuelBurnTime,
  createFurnaceState,
  tryLoadFurnace,
  tryCollectFurnaceOutput,
  tryPlaceFurnace,
  tickFurnaces,
} from '../furnace.js';

describe('furnace', () => {
  describe('smelting recipes', () => {
    it('should recognize valid smeltable items', () => {
      expect(canSmelt('raw_iron')).toBe('iron_ingot');
      expect(canSmelt('raw_gold')).toBe('gold_ingot');
      expect(canSmelt('raw_beef')).toBe('cooked_beef');
      expect(canSmelt('cobblestone')).toBe('stone');
      expect(canSmelt('sand')).toBe('glass');
    });

    it('should reject non-smeltable items', () => {
      expect(canSmelt('dirt')).toBeNull();
      expect(canSmelt('stone')).toBeNull();
      expect(canSmelt('wood')).toBeNull();
    });

    it('should return correct smelting times', () => {
      expect(getSmeltingTime('raw_iron')).toBe(20);
      expect(getSmeltingTime('raw_beef')).toBe(15);
      expect(getSmeltingTime('cobblestone')).toBe(10);
      expect(getSmeltingTime('sand')).toBe(10);
    });
  });

  describe('fuel', () => {
    it('should identify valid fuel items', () => {
      expect(isFuel('coal')).toBe(true);
      expect(isFuel('stick')).toBe(true);
      expect(isFuel('planks_item')).toBe(true);
      expect(isFuel('wood')).toBe(true);
      expect(isFuel('dirt')).toBe(false);
    });

    it('should return correct fuel burn times', () => {
      expect(getFuelBurnTime('coal')).toBe(10);
      expect(getFuelBurnTime('wood')).toBe(4);
      expect(getFuelBurnTime('stick')).toBe(2);
      expect(getFuelBurnTime('planks_item')).toBe(2);
    });
  });

  describe('furnace placement', () => {
    it('should place a furnace', () => {
      const furnaces = new Map();
      const result = tryPlaceFurnace(furnaces, 5, 5, '0,0,0');
      expect(result.success).toBe(true);
      expect(furnaces.size).toBe(1);
    });

    it('should reject placing a furnace on an existing furnace', () => {
      const furnaces = new Map();
      tryPlaceFurnace(furnaces, 5, 5, '0,0,0');
      const result = tryPlaceFurnace(furnaces, 5, 5, '0,0,0');
      expect(result.success).toBe(false);
      expect(result.message).toBe('A furnace is already here.');
    });
  });

  describe('furnace loading', () => {
    it('should load fuel into a furnace', () => {
      const furnaces = new Map();
      tryPlaceFurnace(furnaces, 5, 5, '0,0,0');
      const player = {
        getItemCount: (id: string) => (id === 'coal' ? 5 : 0),
        removeItem: (id: string, count?: number) => {
          if (id === 'coal') return true;
          return false;
        },
        addItem: () => {},
      } as any;

      const result = tryLoadFurnace(furnaces, player, 5, 5, '0,0,0', 'coal');
      expect(result.success).toBe(true);
    });

    it('should load smeltable input into a furnace', () => {
      const furnaces = new Map();
      tryPlaceFurnace(furnaces, 5, 5, '0,0,0');
      const player = {
        getItemCount: (id: string) => (id === 'coal' ? 5 : id === 'raw_iron' ? 3 : 0),
        removeItem: (id: string, count?: number) => {
          if (id === 'coal' || id === 'raw_iron') return true;
          return false;
        },
        addItem: () => {},
      } as any;

      tryLoadFurnace(furnaces, player, 5, 5, '0,0,0', 'coal');
      tryLoadFurnace(furnaces, player, 5, 5, '0,0,0', 'raw_iron');
      const furnace = furnaces.get('5,5,0,0,0');
      expect(furnace?.inputItem).toBe('raw_iron');
      expect(furnace?.outputItem).toBe('iron_ingot');
    });
  });

  describe('furnace ticking', () => {
    it('should progress smelting over time', () => {
      const furnaces = new Map();
      tryPlaceFurnace(furnaces, 5, 5, '0,0,0');
      const player = {
        getItemCount: (id: string) => (id === 'coal' ? 10 : id === 'raw_iron' ? 3 : 0),
        removeItem: (id: string) => {
          if (id === 'coal' || id === 'raw_iron') return true;
          return false;
        },
        addItem: () => {},
      } as any;

      tryLoadFurnace(furnaces, player, 5, 5, '0,0,0', 'coal');
      tryLoadFurnace(furnaces, player, 5, 5, '0,0,0', 'raw_iron');

      tickFurnaces(furnaces, []);
      const furnace = furnaces.get('5,5,0,0,0');
      expect(furnace?.progress).toBe(1);
    });

    it('should complete smelting when progress reaches threshold', () => {
      const furnaces = new Map();
      tryPlaceFurnace(furnaces, 5, 5, '0,0,0');

      // Manually set up a running furnace
      const furnace = furnaces.get('5,5,0,0,0');
      furnace!.inputItem = 'raw_iron';
      furnace!.outputItem = 'iron_ingot';
      furnace!.outputCount = 1;
      furnace!.fuelItem = 'coal';
      furnace!.fuelRemaining = 30;
      furnace!.burning = true;

      for (let i = 0; i < 20; i++) {
        tickFurnaces(furnaces, []);
      }
      expect(furnace?.inputItem).toBeNull();
      expect(furnace?.outputItem).toBe('iron_ingot');
      expect(furnace?.outputCount).toBe(1);
    });
  });

  describe('output collection', () => {
    it('should collect furnace output', () => {
      const furnaces = new Map();
      tryPlaceFurnace(furnaces, 5, 5, '0,0,0');
      // Manually set up a completed furnace
      const furnace = furnaces.get('5,5,0,0,0');
      furnace!.inputItem = null;
      furnace!.outputItem = 'iron_ingot';
      furnace!.outputCount = 1;
      furnace!.burning = false;

      const outputItems: string[] = [];
      const player = {
        getItemCount: () => 0,
        removeItem: () => true,
        addItem: (id: string) => {
          outputItems.push(id);
        },
      } as any;

      const result = tryCollectFurnaceOutput(furnaces, player, 5, 5, '0,0,0');
      expect(result.success).toBe(true);
    });
  });

  describe('unknown input handling', () => {
    it('should not process items with no smelting recipe', () => {
      const furnaces = new Map();
      tryPlaceFurnace(furnaces, 5, 5, '0,0,0');
      const furnace = furnaces.get('5,5,0,0,0');
      // Set up with an unknown input (no smelting recipe for dirt)
      furnace!.inputItem = 'dirt';
      furnace!.outputItem = null;
      furnace!.outputCount = 0;
      furnace!.fuelItem = 'coal';
      furnace!.fuelRemaining = 10;
      furnace!.burning = true;

      tickFurnaces(furnaces, []);

      // The furnace continues burning since outputItem is null
      // (smelting block only runs when both input AND output are set)
      const updated = furnaces.get('5,5,0,0,0');
      expect(updated?.inputItem).toBe('dirt');
      expect(updated?.burning).toBe(true);
      expect(updated?.fuelRemaining).toBe(9); // Fuel still burns
    });

    it('should complete smelting when enough fuel is provided', () => {
      const furnaces = new Map();
      tryPlaceFurnace(furnaces, 5, 5, '0,0,0');
      const player = {
        getItemCount: (id: string) => (id === 'coal' ? 20 : id === 'raw_iron' ? 5 : 0),
        removeItem: (id: string) => {
          if (id === 'coal' || id === 'raw_iron') return true;
          return false;
        },
        addItem: () => {},
      } as any;

      // Load 3 coal (30 burn time total), then raw_iron
      tryLoadFurnace(furnaces, player, 5, 5, '0,0,0', 'coal');
      tryLoadFurnace(furnaces, player, 5, 5, '0,0,0', 'coal');
      tryLoadFurnace(furnaces, player, 5, 5, '0,0,0', 'coal');
      tryLoadFurnace(furnaces, player, 5, 5, '0,0,0', 'raw_iron');

      // Run 20 ticks to complete one smelt (raw_iron takes 20 ticks, coal gives 30 fuel)
      for (let i = 0; i < 20; i++) {
        tickFurnaces(furnaces, []);
      }

      const furnace = furnaces.get('5,5,0,0,0');
      expect(furnace?.inputItem).toBeNull();
      expect(furnace?.outputItem).toBe('iron_ingot');
      expect(furnace?.outputCount).toBe(1);
    });
  });
});
