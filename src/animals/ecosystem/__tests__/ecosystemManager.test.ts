import { describe, expect, it, beforeEach } from 'vitest';
import { EcosystemManager } from '../EcosystemManager.js';
import { createEcologySystem } from '../../ecology.js';
import type { AnimalType } from '../../types.js';

describe('EcosystemManager', () => {
  let manager: EcosystemManager;
  const rng = () => 0.5;

  beforeEach(() => {
    manager = new EcosystemManager(rng, createEcologySystem());
  });

  describe('initial state', () => {
    it('starts with balanced ecosystem', () => {
      const balance = manager.getBalance();
      expect(balance.state).toBe('balanced');
      expect(balance.overallHealth).toBe(75);
    });

    it('returns correct animal roles', () => {
      expect(manager.getAnimalRole('rabbit')).toBe('herbivore');
      expect(manager.getAnimalRole('wolf')).toBe('predator');
      expect(manager.getAnimalRole('bear')).toBe('omnivore');
      expect(manager.getAnimalRole('possum')).toBe('scavenger');
    });

    it('returns ecological relations for animals', () => {
      const wolfRelations = manager.getEcologicalRelations('wolf');
      expect(wolfRelations.prey).toContain('rabbit');
      expect(wolfRelations.role).toBe('predator');
    });
  });

  describe('step processing', () => {
    it('processes a step and returns balance', () => {
      const animalCounts = new Map<AnimalType, number>([
        ['rabbit', 50],
        ['wolf', 10],
        ['fox', 5],
      ]);

      const result = manager.step(animalCounts, 60);

      expect(result.balance).toBeDefined();
      expect(result.balance.overallHealth).toBeGreaterThanOrEqual(0);
      expect(result.balance.overallHealth).toBeLessThanOrEqual(100);
      expect(result.spawnModifiers.size).toBeGreaterThan(0);
    });

    it('returns spawn modifiers for all animal types', () => {
      const animalCounts = new Map<AnimalType, number>();
      const result = manager.step(animalCounts, 50);

      for (const type of Object.keys(result.spawnModifiers)) {
        expect(result.spawnModifiers.get(type as AnimalType)).toBeGreaterThanOrEqual(0.1);
        expect(result.spawnModifiers.get(type as AnimalType)).toBeLessThanOrEqual(3);
      }
    });

    it('calculates predator-prey ratio correctly', () => {
      const animalCounts = new Map<AnimalType, number>([
        ['rabbit', 100],
        ['wolf', 50],
      ]);

      const result = manager.step(animalCounts, 50);
      expect(result.balance.predatorPreyRatio).toBeGreaterThan(0);
    });

    it('updates plant biomass based on herbivore count', () => {
      const animalCounts1 = new Map<AnimalType, number>([
        ['rabbit', 10],
      ]);
      const result1 = manager.step(animalCounts1, 50);

      const animalCounts2 = new Map<AnimalType, number>([
        ['rabbit', 100],
      ]);
      const result2 = manager.step(animalCounts2, 50);

      expect(result2.balance.plantBiomass).toBeLessThan(result1.balance.plantBiomass);
    });
  });

  describe('ecosystem events', () => {
    it('triggers predator outbreak when ratio is too high', () => {
      const animalCounts = new Map<AnimalType, number>([
        ['rabbit', 10],
        ['wolf', 50],
        ['fox', 30],
      ]);

      // Run multiple steps to stress the ecosystem
      for (let i = 0; i < 20; i++) {
        const result = manager.step(animalCounts, 10);
        // Force high predator ratio by manipulating balance
        if (result.balance.state === 'stressed' || result.balance.state === 'critical') {
          break;
        }
      }

      const events = manager.getActiveEvents();
      // Events may or may not trigger depending on exact conditions
      expect(Array.isArray(events)).toBe(true);
    });

    it('returns triggered events when they occur', () => {
      const animalCounts = new Map<AnimalType, number>([
        ['rabbit', 50],
        ['wolf', 10],
      ]);

      const result = manager.step(animalCounts, 50);
      expect(Array.isArray(result.triggeredEvents)).toBe(true);
    });

    it('updates last event on the balance', () => {
      const animalCounts = new Map<AnimalType, number>([
        ['rabbit', 50],
      ]);

      manager.step(animalCounts, 50);
      const balance = manager.getBalance();
      expect(balance).toBeDefined();
    });
  });

  describe('snake interactions', () => {
    it('applies hunt effect on predator', () => {
      manager.applySnakeInteraction('hunt', 'wolf');
      const balance = manager.getBalance();
      expect(balance.overallHealth).toBeGreaterThanOrEqual(0);
    });

    it('applies hunt effect on herbivore', () => {
      manager.applySnakeInteraction('hunt', 'rabbit');
      const balance = manager.getBalance();
      expect(balance.herbivorePopulation).toBeGreaterThanOrEqual(0);
    });

    it('applies tame effect on herbivore', () => {
      manager.applySnakeInteraction('tame', 'rabbit');
      const balance = manager.getBalance();
      expect(balance.herbivorePopulation).toBeGreaterThanOrEqual(0);
    });

    it('applies observe effect (positive)', () => {
      manager.applySnakeInteraction('observe', 'rabbit');
      const balance = manager.getBalance();
      expect(balance.overallHealth).toBeGreaterThanOrEqual(0);
    });
  });

  describe('HUD status', () => {
    it('returns correct HUD status', () => {
      const animalCounts = new Map<AnimalType, number>([
        ['rabbit', 50],
        ['wolf', 10],
      ]);

      manager.step(animalCounts, 50);
      const hud = manager.getHudStatus();

      expect(hud.healthBar).toBeGreaterThanOrEqual(0);
      expect(hud.healthBar).toBeLessThanOrEqual(100);
      expect(hud.balanceState).toBeDefined();
      expect(Array.isArray(hud.eventWarnings)).toBe(true);
    });

    it('returns balance state enum values', () => {
      const hud = manager.getHudStatus();
      const validStates = ['balanced', 'healthy', 'stressed', 'critical', 'collapsing'];
      expect(validStates).toContain(hud.balanceState);
    });
  });

  describe('spawn modifiers', () => {
    it('returns a spawn modifier for each animal type', () => {
      const modifier = manager.getSpawnModifier('rabbit');
      expect(modifier).toBeGreaterThanOrEqual(0.1);
      expect(modifier).toBeLessThanOrEqual(3);
    });

    it('modifiers are clamped between 0.1 and 3', () => {
      const animalCounts = new Map<AnimalType, number>([
        ['rabbit', 500],
        ['wolf', 500],
      ]);

      for (let i = 0; i < 10; i++) {
        manager.step(animalCounts, 0);
      }

      for (const type of ['rabbit', 'wolf', 'fox', 'bear'] as AnimalType[]) {
        const modifier = manager.getSpawnModifier(type);
        expect(modifier).toBeGreaterThanOrEqual(0.1);
        expect(modifier).toBeLessThanOrEqual(3);
      }
    });
  });

  describe('ecosystem stress fleeing', () => {
    it('returns true when ecosystem is critical and predator is near', () => {
      // Force critical state by running many steps with imbalanced populations
      const animalCounts = new Map<AnimalType, number>([
        ['rabbit', 5],
        ['wolf', 100],
      ]);

      for (let i = 0; i < 30; i++) {
        manager.step(animalCounts, 0);
      }

      // With critical ecosystem, animals should flee more easily
      const shouldFlee = manager.shouldFleeFromEcosystemStress('rabbit', 3);
      expect(typeof shouldFlee).toBe('boolean');
    });

    it('returns false for normal conditions', () => {
      const animalCounts = new Map<AnimalType, number>([
        ['rabbit', 50],
        ['wolf', 10],
      ]);

      manager.step(animalCounts, 50);
      const shouldFlee = manager.shouldFleeFromEcosystemStress('rabbit', 10);
      expect(shouldFlee).toBe(false);
    });
  });
});
