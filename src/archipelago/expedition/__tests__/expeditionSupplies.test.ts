import { describe, it, expect, beforeEach } from 'vitest';
import { ExpeditionSupplies } from '../ExpeditionSupplies.js';
import { createRng } from '../../../core/rng.js';

describe('ExpeditionSupplies', () => {
  let supplies: ExpeditionSupplies;

  beforeEach(() => {
    supplies = new ExpeditionSupplies(createRng('test'));
  });

  describe('getSlots', () => {
    it('should return 6 slots', () => {
      const slots = supplies.getSlots();
      expect(slots).toHaveLength(6);
    });

    it('should return empty slots initially', () => {
      const slots = supplies.getSlots();
      for (const slot of slots) {
        expect(slot.appleTypeId).toBeNull();
        expect(slot.quantity).toBe(1);
      }
    });
  });

  describe('setSlotApple', () => {
    it('should set apple in valid slot', () => {
      const result = supplies.setSlotApple(0, 'caffeinated', 1);
      expect(result).toBe(true);

      const slot = supplies.getSlot(0);
      expect(slot.appleTypeId).toBe('caffeinated');
      expect(slot.quantity).toBe(1);
    });

    it('should fail for invalid slot index', () => {
      const result = supplies.setSlotApple(10, 'caffeinated');
      expect(result).toBe(false);
    });

    it('should clamp quantity between 1 and 3', () => {
      supplies.setSlotApple(0, 'caffeinated', 10);
      expect(supplies.getSlot(0).quantity).toBe(3);

      supplies.setSlotApple(1, 'wasabi', 0);
      expect(supplies.getSlot(1).quantity).toBe(1);
    });

    it('should clear slot when set to null', () => {
      supplies.setSlotApple(0, 'caffeinated', 1);
      supplies.setSlotApple(0, null);
      expect(supplies.getSlot(0).appleTypeId).toBeNull();
    });
  });

  describe('isSlotOccupied', () => {
    it('should return false for empty slot', () => {
      expect(supplies.isSlotOccupied(0)).toBe(false);
    });

    it('should return true for occupied slot', () => {
      supplies.setSlotApple(0, 'caffeinated');
      expect(supplies.isSlotOccupied(0)).toBe(true);
    });
  });

  describe('getOccupiedSlotCount', () => {
    it('should return 0 initially', () => {
      expect(supplies.getOccupiedSlotCount()).toBe(0);
    });

    it('should count occupied slots', () => {
      supplies.setSlotApple(0, 'caffeinated');
      supplies.setSlotApple(2, 'wasabi');
      expect(supplies.getOccupiedSlotCount()).toBe(2);
    });
  });

  describe('clearSlots', () => {
    it('should clear all slots', () => {
      supplies.setSlotApple(0, 'caffeinated');
      supplies.setSlotApple(1, 'wasabi');
      supplies.clearSlots();

      const slots = supplies.getSlots();
      for (const slot of slots) {
        expect(slot.appleTypeId).toBeNull();
      }
    });
  });

  describe('getAvailableSupplies', () => {
    it('should return supplies for volcanic-isle', () => {
      const supplies_list = supplies.getAvailableSupplies('volcanic-isle');
      expect(supplies_list).toHaveLength(5);

      const essential = supplies_list.filter((s) => s.category === 'essential');
      expect(essential).toHaveLength(1);
      expect(essential[0].appleTypeId).toBe('caffeinated');
    });

    it('should return supplies for crystal-cavern', () => {
      const supplies_list = supplies.getAvailableSupplies('crystal-cavern');
      expect(supplies_list).toHaveLength(5);
    });

    it('should return empty for unknown island', () => {
      const supplies_list = supplies.getAvailableSupplies('unknown-island' as any);
      expect(supplies_list).toHaveLength(0);
    });
  });

  describe('packForExpedition', () => {
    it('should succeed with correct supplies', () => {
      supplies.setSlotApple(0, 'caffeinated', 1);
      supplies.setSlotApple(1, 'wasabi', 1);

      const result = supplies.packForExpedition('volcanic-isle');
      expect(result.success).toBe(true);
      expect(result.score).toBeGreaterThan(0);
    });

    it('should fail with missing essential', () => {
      supplies.setSlotApple(0, 'frost', 1);

      const result = supplies.packForExpedition('volcanic-isle');
      expect(result.success).toBe(false);
      expect(result.missingEssentials).toContain('caffeinated');
    });

    it('should fail with avoided apple', () => {
      supplies.setSlotApple(0, 'caffeinated', 1);
      supplies.setSlotApple(1, 'frost', 1);

      const result = supplies.packForExpedition('volcanic-isle');
      expect(result.success).toBe(false);
      expect(result.avoidedItems).toContain('frost');
    });

    it('should calculate score correctly', () => {
      // Empty pack - no essentials, no recommendations, no utilization
      supplies.clearSlots();
      let result = supplies.packForExpedition('volcanic-isle');
      expect(result.score).toBe(0);

      // Partial pack - has essential but no recommendations
      supplies.setSlotApple(0, 'caffeinated', 1);
      result = supplies.packForExpedition('volcanic-isle');
      expect(result.score).toBeGreaterThan(0);
      expect(result.score).toBeLessThan(50);

      // Good pack - essential + recommendations + utilization
      supplies.setSlotApple(0, 'caffeinated', 1);
      supplies.setSlotApple(1, 'wasabi', 1);
      supplies.setSlotApple(2, 'heatwave', 1);
      result = supplies.packForExpedition('volcanic-isle');
      expect(result.score).toBeGreaterThan(50);
    });

    it('should work for all islands', () => {
      const islands: Array<
        | 'volcanic-isle'
        | 'crystal-cavern'
        | 'sunken-temple'
        | 'sky-garden'
        | 'ancient-ruins'
        | 'mirror-dimension'
      > = [
        'volcanic-isle',
        'crystal-cavern',
        'sunken-temple',
        'sky-garden',
        'ancient-ruins',
        'mirror-dimension',
      ];

      for (const island of islands) {
        const result = supplies.packForExpedition(island);
        expect(result).toBeDefined();
        expect(typeof result.success).toBe('boolean');
        expect(typeof result.score).toBe('number');
      }
    });
  });

  describe('quickPackRandom', () => {
    it('should pack essential apples first', () => {
      supplies.quickPackRandom('volcanic-isle');

      const occupied = supplies.getSlots().filter((s) => s.appleTypeId !== null);
      expect(occupied.length).toBeGreaterThan(0);

      // First slot should be the essential apple
      const firstSlot = supplies.getSlot(0);
      expect(firstSlot.appleTypeId).toBe('caffeinated');
    });

    it('should fill up to 6 slots', () => {
      supplies.quickPackRandom('volcanic-isle');
      expect(supplies.getOccupiedSlotCount()).toBeLessThanOrEqual(6);
    });
  });

  describe('drag and drop', () => {
    it('should start drag on occupied slot', () => {
      supplies.setSlotApple(0, 'caffeinated');
      supplies.startDrag(0);

      expect(supplies.isDragging()).toBe(true);
      const data = supplies.getDragData();
      expect(data.appleTypeId).toBe('caffeinated');
      expect(data.sourceSlot).toBe(0);
    });

    it('should not start drag on empty slot', () => {
      supplies.startDrag(0);
      expect(supplies.isDragging()).toBe(false);
    });

    it('should swap slots on end drag', () => {
      supplies.setSlotApple(0, 'caffeinated');
      supplies.setSlotApple(1, 'wasabi');

      supplies.startDrag(0);
      supplies.endDrag(1);

      expect(supplies.getSlot(0).appleTypeId).toBe('wasabi');
      expect(supplies.getSlot(1).appleTypeId).toBe('caffeinated');
    });

    it('should cancel drag', () => {
      supplies.setSlotApple(0, 'caffeinated');
      supplies.startDrag(0);
      supplies.cancelDrag();

      expect(supplies.isDragging()).toBe(false);
      expect(supplies.getSlot(0).appleTypeId).toBe('caffeinated'); // Unchanged
    });
  });
});
