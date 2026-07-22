import { describe, expect, it } from 'vitest';
import { SettlementManager } from '../AnimalSettlement.js';
import type { AnimalType } from '../../types.js';
import type { SettlementType } from '../../ecosystem/types.js';

describe('SettlementManager', () => {
  const manager = new SettlementManager();

  describe('settlement definitions', () => {
    it('returns all settlement definitions', () => {
      const defs = SettlementManager.getDefinitions();
      expect(defs.length).toBeGreaterThan(0);
    });

    it('gets a settlement definition by type', () => {
      const def = SettlementManager.getDefinition('beaver-dam');
      expect(def.type).toBe('beaver-dam');
      expect(def.name).toBe('Beaver Dam');
    });

    it('throws for unknown settlement type', () => {
      expect(() => SettlementManager.getDefinition('fake-type' as SettlementType)).toThrow();
    });

    it('gets settlements for a biome tag', () => {
      const forestSettlements = SettlementManager.getSettlementsForBiome('forest');
      expect(forestSettlements.length).toBeGreaterThan(0);
    });

    it('checks if an animal can inhabit a settlement', () => {
      expect(SettlementManager.canInhabit('beaver-dam', 'rabbit')).toBe(true);
      expect(SettlementManager.canInhabit('beaver-dam', 'wolf')).toBe(false);
      expect(SettlementManager.canInhabit('wolf-pack-lair', 'wolf')).toBe(true);
    });

    it('gets goods from a settlement type', () => {
      const goods = SettlementManager.getSettlementGoods('beaver-dam');
      expect(goods).toContain('honey');
      expect(goods).toContain('wood-planks');
    });
  });

  describe('creating settlements', () => {
    it('creates a settlement with sufficient population', () => {
      const population = new Map<AnimalType, number>([['rabbit', 4]]);

      const settlement = manager.createSettlement('rabbit-warren', '0,0,0', population, 1);

      expect(settlement.id).toBeDefined();
      expect(settlement.definition.type).toBe('rabbit-warren');
      expect(settlement.totalPopulation).toBe(4);
      expect(settlement.level).toBe(1);
      expect(settlement.isKingdom).toBe(false);
    });

    it('throws when population is insufficient', () => {
      const population = new Map<AnimalType, number>([['rabbit', 2]]);

      expect(() => manager.createSettlement('rabbit-warren', '0,0,0', population, 1)).toThrow();
    });

    it('throws for unknown settlement type', () => {
      const population = new Map<AnimalType, number>([['rabbit', 5]]);

      expect(() => manager.createSettlement('fake-type' as SettlementType, '0,0,0', population, 1)).toThrow();
    });
  });

  describe('managing population', () => {
    it('adds animals to a settlement', () => {
      const population = new Map<AnimalType, number>([['rabbit', 5]]);
      const settlement = manager.createSettlement('rabbit-warren', '0,0,0', population, 1);

      const result = manager.addAnimals(settlement.id, 'rabbit', 3);
      expect(result).toBe(true);
      expect(settlement.totalPopulation).toBe(8);
    });

    it('rejects adding wrong animal type', () => {
      const population = new Map<AnimalType, number>([['rabbit', 5]]);
      const settlement = manager.createSettlement('rabbit-warren', '0,0,0', population, 1);

      const result = manager.addAnimals(settlement.id, 'wolf', 3);
      expect(result).toBe(false);
    });

    it('removes animals from a settlement', () => {
      const population = new Map<AnimalType, number>([['rabbit', 5]]);
      const settlement = manager.createSettlement('rabbit-warren', '0,0,0', population, 1);

      const result = manager.removeAnimals(settlement.id, 'rabbit', 2);
      expect(result).toBe(true);
      expect(settlement.totalPopulation).toBe(3);
    });

    it('deletes settlement when population reaches zero', () => {
      const population = new Map<AnimalType, number>([['raccoon', 3]]);
      const settlement = manager.createSettlement('raccoon-trash-kingdom', '0,0,0', population, 1);

      manager.removeAnimals(settlement.id, 'raccoon', 3);
      expect(manager.getSettlement(settlement.id)).toBeUndefined();
    });

    it('returns false for invalid settlement ID', () => {
      const result = manager.addAnimals('fake-id', 'rabbit', 1);
      expect(result).toBe(false);
    });
  });

  describe('market operations', () => {
    it('gets market goods from a settlement', () => {
      const population = new Map<AnimalType, number>([['rabbit', 5]]);
      const settlement = manager.createSettlement('rabbit-warren', '0,0,0', population, 1);

      const goods = manager.getMarketGoods(settlement.id);
      expect(Array.isArray(goods)).toBe(true);
    });

    it('purchases a good from a settlement', () => {
      const population = new Map<AnimalType, number>([['rabbit', 5]]);
      const settlement = manager.createSettlement('rabbit-warren', '0,0,0', population, 1);

      const goods = manager.getMarketGoods(settlement.id);
      if (goods.length > 0) {
        const result = manager.purchaseGood(settlement.id, goods[0].id, 100);
        expect(result.success).toBe(true);
      }
    });

    it('rejects purchase with insufficient price', () => {
      const population = new Map<AnimalType, number>([['rabbit', 5]]);
      const settlement = manager.createSettlement('rabbit-warren', '0,0,0', population, 1);

      const goods = manager.getMarketGoods(settlement.id);
      if (goods.length > 0) {
        const result = manager.purchaseGood(settlement.id, goods[0].id, 0);
        expect(result.success).toBe(false);
      }
    });

    it('rejects purchase for unknown good', () => {
      const population = new Map<AnimalType, number>([['rabbit', 5]]);
      manager.createSettlement('rabbit-warren', '0,0,0', population, 1);

      const result = manager.purchaseGood('0,0,0', 'fake-good', 100);
      expect(result.success).toBe(false);
    });
  });

  describe('settlement queries', () => {
    let freshManager: SettlementManager;
    beforeEach(() => {
      // Create fresh manager between tests
      freshManager = new SettlementManager();
    });
    it('gets a settlement by ID', () => {
      const population = new Map<AnimalType, number>([['rabbit', 5]]);
      const settlement = freshManager.createSettlement('rabbit-warren', '0,0,0', population, 1);

      const found = freshManager.getSettlement(settlement.id);
      expect(found).toBeDefined();
      expect(found?.id).toBe(settlement.id);
    });

    it('gets settlements in a room', () => {
      const population1 = new Map<AnimalType, number>([['rabbit', 5]]);
      const population2 = new Map<AnimalType, number>([['wolf', 5]]);

      freshManager.createSettlement('rabbit-warren', '0,0,0', population1, 1);
      freshManager.createSettlement('wolf-pack-lair', '0,0,0', population2, 1);

      const inRoom = freshManager.getSettlementsInRoom('0,0,0');
      expect(inRoom.length).toBe(2);
    });

    it('gets all settlements', () => {
      freshManager.createSettlement('rabbit-warren', '0,0,0', new Map([['rabbit', 5]]), 1);
      freshManager.createSettlement('wolf-pack-lair', '0,0,0', new Map([['wolf', 5]]), 1);

      const all = freshManager.getAllSettlements();
      expect(all.length).toBe(2);
    });
  });

  describe('diplomacy', () => {
    it('establishes trade between settlements', () => {
      const pop1 = new Map<AnimalType, number>([['rabbit', 5]]);
      const pop2 = new Map<AnimalType, number>([['fox', 5]]);

      const s1 = manager.createSettlement('rabbit-warren', '0,0,0', pop1, 1);
      const s2 = manager.createSettlement('fox-den', '0,0,0', pop2, 1);

      const result = manager.establishTrade(s1.id, s2.id);
      expect(result).toBe(true);
    });

    it('gets neutral diplomacy status', () => {
      const pop1 = new Map<AnimalType, number>([['rabbit', 5]]);
      const pop2 = new Map<AnimalType, number>([['fox', 5]]);

      const s1 = manager.createSettlement('rabbit-warren', '0,0,0', pop1, 1);
      const s2 = manager.createSettlement('fox-den', '0,0,0', pop2, 1);

      const status = manager.getDiplomacyStatus(s1.id, s2.id);
      expect(status).toBe('neutral');
    });
  });

  describe('settlement updates', () => {
    it('updates settlements with population dynamics', () => {
      const population = new Map<AnimalType, number>([['rabbit', 5]]);
      const settlement = manager.createSettlement('rabbit-warren', '0,0,0', population, 1);

      manager.updateSettlements();
      expect(manager.getSettlement(settlement.id)).toBeDefined();
    });

    it('dissolves settlements with insufficient population', () => {
      const population = new Map<AnimalType, number>([['raccoon', 3]]);
      const settlement = manager.createSettlement('raccoon-trash-kingdom', '0,0,0', population, 1);

      // Remove all animals
      manager.removeAnimals(settlement.id, 'raccoon', 3);

      expect(manager.getSettlement(settlement.id)).toBeUndefined();
    });
  });
});
