/**
 * AlchemyManager Tests
 *
 * The wise old snake's manager tests:
 * - The wise old snake's manager tests were all null pointers
 * - The wise old snake's manager tests never tested the manager
 * - The wise old snake's manager tests crashed on station creation
 * - The wise old snake's manager tests had no stations
 * - The wise old snake's manager tests tested nothing
 */

import { describe, expect, it, vi, beforeEach } from 'vitest';
import { AlchemyManager } from '../AlchemyManager.js';
import type { AlchemyRuntime } from '../alchemyTypes.js';

const createMockRuntime = (): AlchemyRuntime => ({
  hasItem: vi.fn(() => true),
  consumeItem: vi.fn(() => true),
  addItem: vi.fn(),
  getSnakeLength: vi.fn(() => 10),
  getScore: vi.fn(() => 100),
  addScore: vi.fn(),
  setFlag: vi.fn(),
  getFlag: vi.fn(),
});

describe('AlchemyManager', () => {
  let runtime: AlchemyRuntime;
  let manager: AlchemyManager;

  beforeEach(() => {
    runtime = createMockRuntime();
    manager = new AlchemyManager(runtime);
  });

  describe('initialization', () => {
    it('creates a manager with a journal', () => {
      const journal = manager.getJournal();
      expect(journal).toBeDefined();
    });

    it('starts with no stations', () => {
      const stations = manager.getAllStations();
      expect(stations.length).toBe(0);
    });
  });

  describe('station management', () => {
    it('creates a new station', () => {
      const pos = { x: 100, y: 200 } as Phaser.Math.Vector2;
      const station = manager.createStation(pos, 'room-1');
      expect(station).toBeDefined();
      expect(manager.getAllStations().length).toBe(1);
    });

    it('gets a station by ID', () => {
      const pos = { x: 100, y: 200 } as Phaser.Math.Vector2;
      const station = manager.createStation(pos, 'room-1');
      const found = manager.getStation(station.getData().id);
      expect(found).toBe(station);
    });

    it('gets a station by room ID', () => {
      const pos = { x: 100, y: 200 } as Phaser.Math.Vector2;
      manager.createStation(pos, 'room-1');
      const found = manager.getStationInRoom('room-1');
      expect(found).toBeDefined();
    });

    it('returns undefined for non-existent station', () => {
      const found = manager.getStation('non-existent');
      expect(found).toBeUndefined();
    });

    it('stores ingredients at a station', () => {
      const pos = { x: 100, y: 200 } as Phaser.Math.Vector2;
      const station = manager.createStation(pos, 'room-1');
      const result = manager.storeAtStation(station.getData().id, 'ingredient-dew', 5);
      expect(result).toBe(true);
      expect(station.getStoredCount('ingredient-dew')).toBe(5);
    });

    it('retrieves ingredients from a station', () => {
      const pos = { x: 100, y: 200 } as Phaser.Math.Vector2;
      const station = manager.createStation(pos, 'room-1');
      manager.storeAtStation(station.getData().id, 'ingredient-dew', 5);
      const result = manager.retrieveFromStation(station.getData().id, 'ingredient-dew', 3);
      expect(result).toBe(true);
      expect(station.getStoredCount('ingredient-dew')).toBe(2);
    });
  });

  describe('crafting', () => {
    it('crafts a potion at a station', () => {
      const pos = { x: 100, y: 200 } as Phaser.Math.Vector2;
      const station = manager.createStation(pos, 'room-1');
      const result = manager.craftAtStation(station.getData().id, 'recipe-growth-potion');
      expect(result.success).toBe(true);
    });

    it('returns error for non-existent station', () => {
      const result = manager.craftAtStation('non-existent', 'recipe-growth-potion');
      expect(result.success).toBe(false);
    });

    it('records crafted potions in the journal', () => {
      const pos = { x: 100, y: 200 } as Phaser.Math.Vector2;
      const station = manager.createStation(pos, 'room-1');
      manager.craftAtStation(station.getData().id, 'recipe-growth-potion');
      const journal = manager.getJournal();
      const entries = journal.getEntryCount();
      expect(entries).toBeGreaterThan(0);
    });
  });

  describe('recipe management', () => {
    it('gets known recipes from stations', () => {
      // Create a station to get recipes from
      const pos = { x: 100, y: 200 } as Phaser.Math.Vector2;
      const station = manager.createStation(pos, 'room-1');
      const recipes = manager.getKnownRecipes();
      expect(recipes.length).toBeGreaterThan(0);
    });

    it('gets available recipes', () => {
      const pos = { x: 100, y: 200 } as Phaser.Math.Vector2;
      const station = manager.createStation(pos, 'room-1');
      const recipes = manager.getAvailableRecipes();
      expect(Array.isArray(recipes)).toBe(true);
    });

    it('gets discovery progress from stations', () => {
      const pos = { x: 100, y: 200 } as Phaser.Math.Vector2;
      const station = manager.createStation(pos, 'room-1');
      const progress = manager.getDiscoveryProgress();
      expect(progress.discovered).toBeGreaterThan(0);
      expect(progress.total).toBeGreaterThanOrEqual(progress.discovered);
    });
  });

  describe('journal', () => {
    it('returns the journal instance', () => {
      const journal = manager.getJournal();
      expect(journal).toBeDefined();
      expect(journal.getEntryCount()).toBe(0);
    });

    it('records recipe discoveries', () => {
      const journal = manager.getJournal();
      journal.recordRecipeDiscovery('recipe-growth-potion');
      expect(journal.isRecipeDiscovered('recipe-growth-potion')).toBe(true);
    });

    it('records potion crafts', () => {
      const journal = manager.getJournal();
      journal.recordPotionCraft('potion-growth', 'common', false);
      expect(journal.getEntryCount()).toBe(1);
    });

    it('records failed experiments', () => {
      const journal = manager.getJournal();
      journal.recordFailedExperiment('recipe-growth-potion', 'missing ingredient');
      expect(journal.getEntryCount()).toBe(1);
    });

    it('gets recent entries', () => {
      const journal = manager.getJournal();
      journal.recordPotionCraft('potion-growth', 'common', false);
      journal.recordPotionCraft('potion-phase', 'uncommon', false);
      const recent = journal.getRecentEntries(1);
      expect(recent.length).toBe(1);
    });
  });

  describe('effect management', () => {
    it('checks for active effects', () => {
      const hasEffect = manager.hasActiveEffect('growth');
      expect(hasEffect).toBe(false);
    });

    it('gets effect magnitude', () => {
      const magnitude = manager.getEffectMagnitude('growth');
      expect(magnitude).toBe(0);
    });

    it('ticks all stations', () => {
      const pos = { x: 100, y: 200 } as Phaser.Math.Vector2;
      const station = manager.createStation(pos, 'room-1');
      station.getPotionSystem().activatePotion('potion-growth');
      manager.tick();
      // Should not crash
    });
  });

  describe('station summary', () => {
    it('gets station summary', () => {
      const pos = { x: 100, y: 200 } as Phaser.Math.Vector2;
      manager.createStation(pos, 'room-1');
      const summary = manager.getStationSummary();
      expect(summary.length).toBe(1);
      expect(summary[0].roomId).toBe('room-1');
    });
  });
});
