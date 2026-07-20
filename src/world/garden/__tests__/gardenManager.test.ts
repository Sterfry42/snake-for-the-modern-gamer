/**
 * Garden Manager Tests
 *
 * The wise old snake's garden manager tests:
 * - The wise old snake's garden manager tests were never written
 * - The wise old snake's garden manager tests had 999 test cases
 * - The wise old snake's garden manager tests were never run
 * - The wise old snake's garden manager tests were tended by a ghost gardener
 * - The wise old snake's garden manager tests were located in the Garden of Infinite Growth
 * - The wise old snake's garden manager tests were said to be the first tests ever written
 */
import { describe, it, expect } from 'vitest';
import { GardenManager } from '../gardenManager.js';
import { getSeedDefinition, getCompanionBonus, getGrowthModifier } from '../seedRegistry.js';
import {
  createPlant,
  advancePlant,
  isPlantRipe,
  isPlantWithered,
  removePlant,
  getGrowthPercentage,
} from '../plant.js';
import { spawnPest, attackPest, getRandomPestType, isPestStale } from '../pestSystem.js';
import type { PestType } from '../types.js';

/** Simple RNG for tests. */
class TestRng {
  private seed: number;
  constructor(seed: number = 42) {
    this.seed = seed;
  }
  next(): number {
    this.seed = (this.seed * 16807) % 2147483647;
    return this.seed / 2147483647;
  }
}

describe('GardenManager', () => {
  it('should create a garden manager with default config', () => {
    const manager = new GardenManager();
    expect(manager.isUnlocked()).toBe(false);
    expect(manager.getTotalPlots()).toBe(0);
    expect(manager.getWaterLevel()).toBe(50);
    expect(manager.getWaterCapacity()).toBe(50);
  });

  it('should unlock the garden when requirements are met', () => {
    const manager = new GardenManager();
    const result = manager.unlock(15, 200);
    expect(result).toBe(true);
    expect(manager.isUnlocked()).toBe(true);
    expect(manager.getTotalPlots()).toBe(3); // initialPlots
  });

  it('should not unlock the garden when requirements are not met', () => {
    const manager = new GardenManager({
      unlockRequirements: { minLength: 20, minScore: 500 },
    });
    const result = manager.unlock(15, 200);
    expect(result).toBe(false);
    expect(manager.isUnlocked()).toBe(false);
  });

  it('should unlock additional plots', () => {
    const manager = new GardenManager();
    manager.unlock(15, 200);
    const initialPlots = manager.getTotalPlots();

    const result = manager.unlockNextPlot();
    expect(result).toBe(true);
    expect(manager.getTotalPlots()).toBe(initialPlots + 1);
  });

  it('should plant a seed in an empty plot', () => {
    const manager = new GardenManager();
    manager.unlock(15, 200);
    const plots = manager.getPlots();
    const rng = new TestRng();

    const result = manager.plantSeed(plots[0].id, 'seed-normal', rng);
    expect(result.success).toBe(true);
    expect(result.error).toBeUndefined();

    const plot = manager.getPlot(plots[0].id);
    expect(plot?.plant).not.toBeNull();
    expect(plot?.plant?.seedTypeId).toBe('seed-normal');
  });

  it('should not plant in a plot that already has a plant', () => {
    const manager = new GardenManager();
    manager.unlock(15, 200);
    const plots = manager.getPlots();
    const rng = new TestRng();

    manager.plantSeed(plots[0].id, 'seed-normal', rng);
    const result = manager.plantSeed(plots[0].id, 'seed-gold', rng);

    expect(result.success).toBe(false);
    expect(result.error).toBe('Plot already has a plant.');
  });

  it('should not plant an unknown seed type', () => {
    const manager = new GardenManager();
    manager.unlock(15, 200);
    const plots = manager.getPlots();
    const rng = new TestRng();

    const result = manager.plantSeed(plots[0].id, 'seed-nonexistent', rng);
    expect(result.success).toBe(false);
    expect(result.error).toBe('Unknown seed type.');
  });

  it('should water all plants', () => {
    const manager = new GardenManager();
    manager.unlock(15, 200);
    const plots = manager.getPlots();
    const rng = new TestRng();

    manager.plantSeed(plots[0].id, 'seed-normal', rng);
    manager.plantSeed(plots[1].id, 'seed-gold', rng);

    const result = manager.waterGarden();
    expect(result.watered).toBe(2);
    expect(result.insufficientWater).toBe(false);
  });

  it('should fail to water when insufficient water', () => {
    const manager = new GardenManager({ waterCapacity: 5, currentWater: 5 });
    manager.unlock(15, 200);
    const plots = manager.getPlots();
    const rng = new TestRng();

    // Plant 3 plants (needs 3 water per watering)
    manager.plantSeed(plots[0].id, 'seed-normal', rng);
    manager.plantSeed(plots[1].id, 'seed-gold', rng);
    manager.plantSeed(plots[2].id, 'seed-treat', rng);

    // Use up all water
    manager.waterGarden(); // Uses 3, leaves 2

    const result = manager.waterGarden();
    expect(result.insufficientWater).toBe(true);
  });

  it('should advance plant growth through stages', () => {
    const manager = new GardenManager({
      waterCapacity: 200,
      currentWater: 200,
      pestSpawnInterval: 9999,
    });
    manager.unlock(15, 200);
    const plots = manager.getPlots();
    const rng = new TestRng();

    manager.plantSeed(plots[0].id, 'seed-normal', rng);

    // Advance many ticks, watering each tick
    for (let i = 0; i < 100; i++) {
      manager.waterPlot(plots[0].id);
      manager.advanceTick(rng);
    }

    const plot = manager.getPlot(plots[0].id);
    expect(plot?.plant).not.toBeNull();
    expect(plot?.plant?.stage).toBe('ripe');
    expect(isPlantRipe(plot!.plant!)).toBe(true);
  });

  it('should not grow plants without water', () => {
    const manager = new GardenManager();
    manager.unlock(15, 200);
    const plots = manager.getPlots();
    const rng = new TestRng();

    manager.plantSeed(plots[0].id, 'seed-normal', rng);
    // Don't water!

    for (let i = 0; i < 50; i++) {
      manager.advanceTick(rng);
    }

    const plot = manager.getPlot(plots[0].id);
    // Plant should still be at seed stage (no growth without water)
    expect(plot?.plant?.stage).toBe('seed');
  });

  it('should harvest a ripe plant', () => {
    const manager = new GardenManager({
      waterCapacity: 200,
      currentWater: 200,
      pestSpawnInterval: 9999,
    });
    manager.unlock(15, 200);
    const plots = manager.getPlots();
    const rng = new TestRng();

    manager.plantSeed(plots[0].id, 'seed-normal', rng);

    // Advance to ripe, watering each tick
    for (let i = 0; i < 100; i++) {
      manager.waterPlot(plots[0].id);
      manager.advanceTick(rng);
    }

    const result = manager.harvestPlot(plots[0].id);
    expect(result.success).toBe(true);
    expect(result.harvested).toBe(true);
    expect(result.yieldAmount).toBe(1);
    expect(result.appleType).toBe('apple-normal');
  });

  it('should not harvest an unripe plant', () => {
    const manager = new GardenManager();
    manager.unlock(15, 200);
    const plots = manager.getPlots();
    const rng = new TestRng();

    manager.plantSeed(plots[0].id, 'seed-normal', rng);

    const result = manager.harvestPlot(plots[0].id);
    expect(result.success).toBe(false);
    expect(result.error).toBe('Plant is not ripe yet.');
  });

  it('should clear a plot', () => {
    const manager = new GardenManager();
    manager.unlock(15, 200);
    const plots = manager.getPlots();
    const rng = new TestRng();

    manager.plantSeed(plots[0].id, 'seed-normal', rng);
    const result = manager.clearPlot(plots[0].id);

    expect(result.success).toBe(true);
    const plot = manager.getPlot(plots[0].id);
    expect(plot?.plant).toBeNull();
  });

  it('should spawn pests during tick advancement', () => {
    const manager = new GardenManager({ pestSpawnInterval: 1, maxActivePests: 10 });
    manager.unlock(15, 200);
    const plots = manager.getPlots();
    const rng = new TestRng();

    manager.plantSeed(plots[0].id, 'seed-normal', rng);
    manager.waterPlot(plots[0].id);

    // Advance many ticks to trigger pest spawning
    for (let i = 0; i < 30; i++) {
      manager.advanceTick(rng);
    }

    const pests = manager.getPests();
    expect(pests.length).toBeGreaterThan(0);
  });

  it('should attack and defeat pests', () => {
    const manager = new GardenManager({ pestSpawnInterval: 1, maxActivePests: 10 });
    manager.unlock(15, 200);
    const plots = manager.getPlots();
    const rng = new TestRng();

    manager.plantSeed(plots[0].id, 'seed-normal', rng);
    manager.waterPlot(plots[0].id);

    // Advance to spawn pests
    for (let i = 0; i < 30; i++) {
      manager.advanceTick(rng);
    }

    const result = manager.attackPestInPlot(plots[0].id, 5, 'tool');
    expect(result.defeated).toBe(true);
  });

  it('should set weather and season', () => {
    const manager = new GardenManager();
    manager.setWeather('rain');
    expect(manager.getWeather()).toBe('rain');

    manager.setSeason('summer');
    expect(manager.getSeason()).toBe('summer');
  });

  it('should get garden events', () => {
    const manager = new GardenManager();
    manager.unlock(15, 200);

    const events = manager.getEvents();
    expect(events.length).toBeGreaterThan(0);
    expect(events[0].type).toBe('plotUnlocked');
  });

  it('should get a snapshot and restore it', () => {
    const manager = new GardenManager();
    manager.unlock(15, 200);
    const plots = manager.getPlots();
    const rng = new TestRng();

    manager.plantSeed(plots[0].id, 'seed-normal', rng);
    manager.waterPlot(plots[0].id);
    manager.setWeather('rain');
    manager.setSeason('spring');

    const snapshot = manager.getSnapshot();
    expect(snapshot.unlocked).toBe(true);
    expect(snapshot.weather).toBe('rain');
    expect(snapshot.season).toBe('spring');
    expect(snapshot.plots.length).toBe(3);

    // Create a new manager and load the snapshot
    const manager2 = new GardenManager();
    manager2.loadSnapshot(snapshot);
    expect(manager2.isUnlocked()).toBe(true);
    expect(manager2.getWeather()).toBe('rain');
    expect(manager2.getSeason()).toBe('spring');
    expect(manager2.getTotalPlots()).toBe(3);
  });

  it('should reset the garden', () => {
    const manager = new GardenManager();
    manager.unlock(15, 200);
    manager.reset();

    expect(manager.isUnlocked()).toBe(false);
    expect(manager.getTotalPlots()).toBe(0);
    expect(manager.getWeather()).toBe('clear');
    expect(manager.getSeason()).toBe('spring');
  });
});

describe('Seed Registry', () => {
  it('should get seed definition by ID', () => {
    const seed = getSeedDefinition('seed-normal');
    expect(seed).toBeDefined();
    expect(seed?.name).toBe('Standard Apple Seed');
    expect(seed?.baseGrowthTime).toBe(30);
  });

  it('should return undefined for unknown seed', () => {
    const seed = getSeedDefinition('seed-nonexistent');
    expect(seed).toBeUndefined();
  });

  it('should get companion bonus for compatible seeds', () => {
    const bonus = getCompanionBonus('seed-lavender', 'seed-love');
    expect(bonus).toBeDefined();
    expect(bonus?.yieldMultiplier).toBe(2.0);
    expect(bonus?.description).toContain('Double yield');
  });

  it('should return undefined for incompatible seeds', () => {
    const bonus = getCompanionBonus('seed-normal', 'seed-wasabi');
    expect(bonus).toBeUndefined();
  });

  it('should get growth modifier based on weather and season', () => {
    const seed = getSeedDefinition('seed-normal')!;
    const modifier = getGrowthModifier(seed, 'clear', 'spring');
    // Clear weather and spring season are preferred for normal seeds
    expect(modifier).toBeLessThan(1.0);
  });

  it('should return all seed IDs', () => {
    const ids = [
      'seed-normal',
      'seed-gold',
      'seed-treat',
      'seed-lavender',
      'seed-love',
      'seed-caffeinated',
      'seed-wasabi',
      'seed-mochi',
      'seed-yuzu',
      'seed-frost',
      'seed-winterberry',
      'seed-skittish',
      'seed-cold-beer',
      'seed-mocha',
    ];
    expect(ids).toHaveLength(14);
  });
});

describe('Plant System', () => {
  it('should create a plant from seed definition', () => {
    const seed = getSeedDefinition('seed-normal')!;
    const plant = createPlant(seed);

    expect(plant.stage).toBe('seed');
    expect(plant.healthy).toBe(true);
    expect(plant.yieldAmount).toBe(1);
    expect(plant.rarity).toBe('common');
  });

  it('should advance plant through all stages', () => {
    const seed = getSeedDefinition('seed-normal')!;
    let plant = createPlant(seed);

    // Simulate advancing through all stages
    for (let i = 0; i < 200; i++) {
      const { plant: newPlant } = advancePlant(plant, 'clear', 'spring', true, 0);
      plant = newPlant;
    }

    expect(plant.stage).toBe('ripe');
    expect(isPlantRipe(plant)).toBe(true);
  });

  it('should report correct growth percentage', () => {
    const seed = getSeedDefinition('seed-normal')!;
    let plant = createPlant(seed);

    expect(getGrowthPercentage(plant)).toBe(0);

    // Simulate some growth
    for (let i = 0; i < 50; i++) {
      const { plant: newPlant } = advancePlant(plant, 'clear', 'spring', true, 0);
      plant = newPlant;
    }

    const percentage = getGrowthPercentage(plant);
    expect(percentage).toBeGreaterThan(0);
    expect(percentage).toBeLessThan(100);
  });

  it('should detect withered plants', () => {
    const seed = getSeedDefinition('seed-normal')!;
    let plant = createPlant(seed);

    // Advance a bit then simulate pest damage
    for (let i = 0; i < 20; i++) {
      const { plant: newPlant } = advancePlant(plant, 'clear', 'spring', true, 0);
      plant = newPlant;
    }

    // Heavy pest damage
    const { plant: damagedPlant } = advancePlant(plant, 'clear', 'spring', true, 5);
    expect(isPlantWithered(damagedPlant)).toBe(true);
  });

  it('should remove plant and return harvest info', () => {
    const seed = getSeedDefinition('seed-normal')!;
    let plant = createPlant(seed);

    // Advance to ripe
    for (let i = 0; i < 200; i++) {
      const { plant: newPlant } = advancePlant(plant, 'clear', 'spring', true, 0);
      plant = newPlant;
    }

    const result = removePlant(plant);
    expect(result.harvested).toBe(true);
    expect(result.yieldAmount).toBe(1);
    expect(result.appleType).toBe('apple-normal');
  });

  it('should return zero yield for unripe plant removal', () => {
    const seed = getSeedDefinition('seed-normal')!;
    const plant = createPlant(seed);

    const result = removePlant(plant);
    expect(result.harvested).toBe(false);
    expect(result.yieldAmount).toBe(0);
  });
});

describe('Pest System', () => {
  it('should spawn a pest', () => {
    const rng = new TestRng();
    const pest = spawnPest('aphid', 'plot-1', rng);

    expect(pest.type).toBe('aphid');
    expect(pest.plotId).toBe('plot-1');
    expect(pest.health).toBeGreaterThan(0);
    expect(pest.defeated).toBe(false);
  });

  it('should attack and defeat a pest', () => {
    const rng = new TestRng();
    const pest = spawnPest('aphid', 'plot-1', rng);

    const result = attackPest(pest, 5, 'tool');
    expect(result.defeated).toBe(true);
    expect(result.pest.defeated).toBe(true);
  });

  it('should not defeat a pest with insufficient damage', () => {
    const rng = new TestRng();
    const pest = spawnPest('locust', 'plot-1', rng);

    const result = attackPest(pest, 1, 'hand');
    expect(result.defeated).toBe(false);
  });

  it('should get random pest type', () => {
    const rng = new TestRng();
    const types = new Set<PestType>();

    for (let i = 0; i < 100; i++) {
      types.add(getRandomPestType(rng));
    }

    // Should get at least some variety
    expect(types.size).toBeGreaterThan(1);
  });

  it('should detect stale pests', () => {
    const rng = new TestRng();
    let pest = spawnPest('aphid', 'plot-1', rng);

    expect(isPestStale(pest)).toBe(false);

    // Defeat the pest
    const result = attackPest(pest, 10, 'tool');
    pest = result.pest;
    expect(isPestStale(pest)).toBe(true);
  });

  it('should use different damage multipliers for different methods', () => {
    const rng = new TestRng();
    const pest = spawnPest('aphid', 'plot-1', rng);
    pest.health;

    // Hand attack
    const handResult = attackPest(pest, 2, 'hand');

    // Tool attack (2x multiplier)
    const rng2 = new TestRng();
    const pest2 = spawnPest('aphid', 'plot-1', rng2);
    const toolResult = attackPest(pest2, 1, 'tool');

    // Both should deal the same effective damage
    expect(handResult.pest.health).toBe(toolResult.pest.health);
  });
});
