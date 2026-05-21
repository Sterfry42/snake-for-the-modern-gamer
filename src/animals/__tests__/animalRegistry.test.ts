import { describe, expect, it } from 'vitest';
import { AnimalRegistry } from '../animalRegistry.js';
import type { AnimalType } from '../types.js';

describe('AnimalRegistry', () => {
  describe('getAll', () => {
    it('returns all animal definitions', () => {
      const all = AnimalRegistry.getAll();
      expect(all).toHaveLength(16);
    });

    it('contains all expected animal types', () => {
      const all = AnimalRegistry.getAll().map((d) => d.type);
      const expected: AnimalType[] = [
        'rabbit',
        'deer',
        'fox',
        'wolf',
        'fish',
        'bird',
        'bear',
        'snake',
        'eagle',
        'jackalope',
        'raccoon',
        'coyote',
        'bison',
        'bass',
        'possum',
        'armadillo',
      ];
      for (const type of expected) {
        expect(all).toContain(type);
      }
    });
  });

  describe('getDefinition', () => {
    it('throws for unknown type', () => {
      expect(() => AnimalRegistry.getDefinition('dragon')).toThrow('Unknown animal type: dragon');
    });

    it('returns the correct definition for each type', () => {
      const rabbit = AnimalRegistry.getDefinition('rabbit');
      expect(rabbit.type).toBe('rabbit');
      expect(rabbit.name).toBe('Rabbit');
      expect(rabbit.behavior).toBe('wander');
      expect(rabbit.snakeEncounter).toBe('harmless');
      expect(rabbit.drops).toEqual([{ itemId: 'raw-meat', chance: 0.6 }]);
      expect(rabbit.maxHearts).toBe(1);
    });

    it('returns the wolf definition with correct properties', () => {
      const wolf = AnimalRegistry.getDefinition('wolf');
      expect(wolf.type).toBe('wolf');
      expect(wolf.name).toBe('Wolf');
      expect(wolf.behavior).toBe('chase');
      expect(wolf.snakeEncounter).toBe('dangerous');
      expect(wolf.maxHearts).toBe(3);
    });

    it('returns the bear definition as rare spawn', () => {
      const bear = AnimalRegistry.getDefinition('bear');
      expect(bear.type).toBe('bear');
      expect(bear.spawnWeight).toBe(5);
      expect(bear.maxHearts).toBe(4);
      expect(bear.drops).toHaveLength(3);
    });

    it('returns the fish definition with school behavior', () => {
      const fish = AnimalRegistry.getDefinition('fish');
      expect(fish.type).toBe('fish');
      expect(fish.behavior).toBe('school');
      expect(fish.snakeEncounter).toBe('harmless');
      expect(fish.drops).toEqual([{ itemId: 'fish-meat', chance: 0.6 }]);
    });

    it('returns the bird definition with perch behavior', () => {
      const bird = AnimalRegistry.getDefinition('bird');
      expect(bird.type).toBe('bird');
      expect(bird.behavior).toBe('perch');
      expect(bird.drops).toContainEqual({ itemId: 'feather', chance: 0.5 });
      expect(bird.drops).toContainEqual({ itemId: 'egg', chance: 0.2 });
    });

    it('returns the deer definition with graze behavior', () => {
      const deer = AnimalRegistry.getDefinition('deer');
      expect(deer.type).toBe('deer');
      expect(deer.behavior).toBe('graze');
      expect(deer.snakeEncounter).toBe('harmless');
    });

    it('returns the fox definition as tamable', () => {
      const fox = AnimalRegistry.getDefinition('fox');
      expect(fox.type).toBe('fox');
      expect(fox.snakeEncounter).toBe('tamable');
      expect(fox.behavior).toBe('wander');
    });

    it('returns the snake definition as dangerous', () => {
      const snake = AnimalRegistry.getDefinition('snake');
      expect(snake.type).toBe('snake');
      expect(snake.snakeEncounter).toBe('dangerous');
      expect(snake.behavior).toBe('wander');
    });
  });

  describe('getForBiome', () => {
    it('returns animals for verdigris-basin', () => {
      const animals = AnimalRegistry.getForBiome('verdigris-basin');
      expect(animals.map((a) => a.type)).toContain('rabbit');
      expect(animals.map((a) => a.type)).toContain('deer');
      expect(animals.map((a) => a.type)).toContain('fox');
    });

    it('returns animals for sunken-ocean', () => {
      const animals = AnimalRegistry.getForBiome('sunken-ocean');
      expect(animals.map((a) => a.type)).toContain('fish');
    });

    it('returns no animals for home-hearth', () => {
      const animals = AnimalRegistry.getForBiome('home-hearth');
      expect(animals).toHaveLength(0);
    });

    it('returns animals for sable-depths', () => {
      const animals = AnimalRegistry.getForBiome('sable-depths');
      expect(animals.map((a) => a.type)).toContain('wolf');
      expect(animals.map((a) => a.type)).toContain('bear');
      expect(animals.map((a) => a.type)).toContain('snake');
    });

    it('returns animals for ember-waste', () => {
      const animals = AnimalRegistry.getForBiome('ember-waste');
      expect(animals.map((a) => a.type)).toContain('fox');
      expect(animals.map((a) => a.type)).toContain('snake');
    });

    it('returns animals for gloam-garden', () => {
      const animals = AnimalRegistry.getForBiome('gloam-garden');
      expect(animals.map((a) => a.type)).toContain('rabbit');
      expect(animals.map((a) => a.type)).toContain('deer');
      expect(animals.map((a) => a.type)).toContain('fish');
      expect(animals.map((a) => a.type)).toContain('bird');
    });

    it('returns animals for elderwood-maze', () => {
      const animals = AnimalRegistry.getForBiome('elderwood-maze');
      expect(animals.map((a) => a.type)).toContain('rabbit');
      expect(animals.map((a) => a.type)).toContain('deer');
      expect(animals.map((a) => a.type)).toContain('wolf');
      expect(animals.map((a) => a.type)).toContain('bear');
      expect(animals.map((a) => a.type)).toContain('snake');
    });

    it('returns animals for moonlit-parish', () => {
      const animals = AnimalRegistry.getForBiome('moonlit-parish');
      expect(animals.map((a) => a.type)).toContain('wolf');
      expect(animals.map((a) => a.type)).toContain('bird');
    });

    it('returns the full Liberty Badlands roster', () => {
      const animals = AnimalRegistry.getForBiome('liberty-badlands');
      expect(animals.map((a) => a.type)).toEqual(
        expect.arrayContaining([
          'eagle',
          'jackalope',
          'raccoon',
          'coyote',
          'bison',
          'bass',
          'possum',
          'armadillo',
        ]),
      );
    });
  });

  describe('definition constraints', () => {
    it('all definitions have valid biome IDs', () => {
      const validBiomes = [
        'verdigris-basin', 'ember-waste', 'moonlit-parish',
        'sable-depths', 'gloam-garden', 'elderwood-maze',
        'sunken-ocean', 'home-hearth', 'jade-peak-province',
        'liberty-badlands',
      ];
      for (const def of AnimalRegistry.getAll()) {
        for (const biomeId of def.biomeIds) {
          expect(validBiomes).toContain(biomeId);
        }
      }
    });

    it('all spawn weights are positive', () => {
      for (const def of AnimalRegistry.getAll()) {
        expect(def.spawnWeight).toBeGreaterThan(0);
      }
    });

    it('all move intervals are positive', () => {
      for (const def of AnimalRegistry.getAll()) {
        expect(def.moveInterval).toBeGreaterThan(0);
      }
    });

    it('all max per room values are positive', () => {
      for (const def of AnimalRegistry.getAll()) {
        expect(def.maxPerRoom).toBeGreaterThan(0);
      }
    });

    it('all definitions have non-empty sprite prefixes', () => {
      for (const def of AnimalRegistry.getAll()) {
        expect(def.spritePrefix.length).toBeGreaterThan(0);
      }
    });

    it('dangerous animals have maxHearts defined', () => {
      const dangerous = AnimalRegistry.getAll().filter((d) => d.snakeEncounter === 'dangerous');
      for (const def of dangerous) {
        expect(def.maxHearts).toBeGreaterThan(0);
      }
    });

    it('tamable animals have maxHearts defined', () => {
      const tamable = AnimalRegistry.getAll().filter((d) => d.snakeEncounter === 'tamable');
      for (const def of tamable) {
        expect(def.maxHearts).toBeGreaterThan(0);
      }
    });

    it('dangerous animals are at least 2 hearts', () => {
      const dangerous = AnimalRegistry.getAll().filter((d) => d.snakeEncounter === 'dangerous');
      for (const def of dangerous) {
        expect(def.maxHearts ?? 0).toBeGreaterThanOrEqual(2);
      }
    });
  });
});
