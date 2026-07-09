import { describe, expect, it } from 'vitest';
import {
  createBiomeLocatorItem,
  findNearestBiome,
  findNearestBiomeByRegion,
  formatLocatorResult,
  getAllLocatorItemIds,
  getLocatorBiomeId,
  getLocatorItemId,
  isLocatorItemId,
  lookupNearestBiomes,
  lookupNearestBiomesByRegion,
} from '../biomeLocators.js';
import { getAllBiomeDefinitions, getBiomeDefinition } from '../biomes.js';

/**
 * Region size — must match the production constant.
 */
const REGION_SIZE = 8;

function makeResolver(biomeAssignments: Map<string, string>): (roomId: string) => any {
  return (roomId: string) => {
    // Parse the room id and normalize to its region's center room.
    // This simulates how production biomes are constant within an 8×8 region.
    const parts = roomId.split(',').map(Number);
    const rx = Math.floor(parts[0] / REGION_SIZE);
    const ry = Math.floor(parts[1] / REGION_SIZE);
    const rz = parts[2] ?? 0;
    const centerRoomId = `${rx * REGION_SIZE + 4},${ry * REGION_SIZE + 4},${rz}`;

    const biomeId = biomeAssignments.get(centerRoomId);
    if (!biomeId) {
      return getBiomeDefinition('verdigris-basin');
    }
    return getBiomeDefinition(biomeId as any);
  };
}

describe('biome locator item helpers', () => {
  it('generates one locator id per biome', () => {
    const allBiomes = getAllBiomeDefinitions();
    const locatorIds = getAllLocatorItemIds();
    expect(locatorIds).toHaveLength(allBiomes.length);
    for (const biome of allBiomes) {
      expect(locatorIds).toContain(getLocatorItemId(biome.id));
    }
  });

  it('identifies locator item ids', () => {
    expect(isLocatorItemId('locator-verdigris-basin')).toBe(true);
    expect(isLocatorItemId('locator-sable-depths')).toBe(true);
    expect(isLocatorItemId('healing-potion')).toBe(false);
    expect(isLocatorItemId('not-a-locator')).toBe(false);
  });

  it('extracts biome id from locator item id', () => {
    expect(getLocatorBiomeId('locator-ember-waste')).toBe('ember-waste');
    expect(getLocatorBiomeId('locator-home-hearth')).toBe('home-hearth');
    expect(getLocatorBiomeId('healing-potion')).toBeNull();
  });

  it('creates a valid item for each biome', () => {
    for (const biome of getAllBiomeDefinitions()) {
      const item = createBiomeLocatorItem(biome);
      expect(item.id).toBe(getLocatorItemId(biome.id));
      expect(item.name).toBe(`${biome.title} Locator`);
      expect(item.kind).toBe('consumable');
      expect(item.category).toBe('material');
      expect(item.description).toContain(biome.title);
    }
  });

  it('names include the biome title', () => {
    const emberItem = createBiomeLocatorItem(getBiomeDefinition('ember-waste'));
    expect(emberItem.name).toBe('Ember Waste Locator');
    const sableItem = createBiomeLocatorItem(getBiomeDefinition('sable-depths'));
    expect(sableItem.name).toBe('Sable Depths Locator');
  });
});

describe('findNearestBiome', () => {
  it('finds the target biome on the same floor', () => {
    const grid = new Map<string, string>();
    // Use region center rooms so the resolver maps correctly.
    grid.set('4,4,0', 'verdigris-basin');
    grid.set('12,4,0', 'ember-waste');

    const resolveBiome = makeResolver(grid);
    const result = findNearestBiome('0,0,0', 'ember-waste', true, resolveBiome);

    expect(result).not.toBeNull();
    expect(result!.biome.id).toBe('ember-waste');
    // Room-based BFS finds room 8,0,0 first (distance 8), whose region has ember-waste.
    expect(result!.distance).toBe(8);
  });

  it('finds the target biome across floors', () => {
    const grid = new Map<string, string>();
    grid.set('4,4,0', 'verdigris-basin');
    grid.set('4,4,-1', 'ember-waste');

    const resolveBiome = makeResolver(grid);
    const result = findNearestBiome('0,0,0', 'ember-waste', false, resolveBiome);

    expect(result).not.toBeNull();
    expect(result!.biome.id).toBe('ember-waste');
    // Room-based BFS finds room 0,0,-1 first (distance 1)
    expect(result!.coordinates[2]).toBe(-1);
  });

  it('returns null when biome is not found', () => {
    const grid = new Map<string, string>();
    grid.set('4,4,0', 'verdigris-basin');
    grid.set('12,4,0', 'verdigris-basin');

    const resolveBiome = makeResolver(grid);
    const result = findNearestBiome('0,0,0', 'ember-waste', true, resolveBiome);

    expect(result).toBeNull();
  });

  it('only matches exact biome id, not family', () => {
    const grid = new Map<string, string>();
    grid.set('4,4,0', 'verdigris-basin');
    grid.set('12,4,0', 'elderwood-maze');

    const resolveBiome = makeResolver(grid);
    const result = findNearestBiome('0,0,0', 'rainforest', true, resolveBiome);
    expect(result).toBeNull();
  });

  it('matches the exact biome when present', () => {
    const grid = new Map<string, string>();
    grid.set('4,4,0', 'verdigris-basin');
    grid.set('4,12,0', 'rainforest');

    const resolveBiome = makeResolver(grid);
    const result = findNearestBiome('0,0,0', 'rainforest', true, resolveBiome);
    expect(result).not.toBeNull();
    expect(result!.biome.id).toBe('rainforest');
  });

  it('finds nearest in BFS order (manhattan distance)', () => {
    const grid = new Map<string, string>();
    grid.set('4,4,0', 'verdigris-basin');
    grid.set('12,4,0', 'ember-waste');
    grid.set('4,12,0', 'ember-waste');

    const resolveBiome = makeResolver(grid);
    const result = findNearestBiome('0,0,0', 'ember-waste', true, resolveBiome);

    expect(result).not.toBeNull();
    // Both regions are same manhattan distance from origin region
    expect(result!.distance).toBeGreaterThan(0);
  });

  it('handles non-coordinate room ids gracefully', () => {
    const grid = new Map<string, string>();
    grid.set('4,4,0', 'ember-waste');

    const resolveBiome = makeResolver(grid);
    // cave: ids should fall back to [0,0,0]
    const result = findNearestBiome('cave:abc', 'ember-waste', true, resolveBiome);
    expect(result).not.toBeNull();
    expect(result!.biome.id).toBe('ember-waste');
  });

  it('stops searching beyond the max radius', () => {
    const grid = new Map<string, string>();
    grid.set('4,4,0', 'verdigris-basin');
    // Place ember-waste beyond default radius (100 regions = 800 rooms).
    grid.set('804,4,0', 'ember-waste'); // region (100,0) — center at 804,4

    const resolveBiome = makeResolver(grid);
    const result = findNearestBiome('0,0,0', 'ember-waste', true, resolveBiome);
    expect(result).toBeNull();
  });

  it('finds biome within the max radius', () => {
    const grid = new Map<string, string>();
    grid.set('4,4,0', 'verdigris-basin');
    grid.set('12,4,0', 'ember-waste');

    const resolveBiome = makeResolver(grid);
    const result = findNearestBiome('0,0,0', 'ember-waste', true, resolveBiome);
    expect(result).not.toBeNull();
    expect(result!.biome.id).toBe('ember-waste');
  });

  it('respects an explicit larger maxRadius', () => {
    const grid = new Map<string, string>();
    grid.set('4,4,0', 'verdigris-basin');
    grid.set('52,4,0', 'ember-waste');

    const resolveBiome = makeResolver(grid);
    // maxRadius=100 rooms, target is 52 rooms away in x — within range.
    const result = findNearestBiome('0,0,0', 'ember-waste', true, resolveBiome, 500, 100);
    expect(result).not.toBeNull();
    expect(result!.biome.id).toBe('ember-waste');
  });
});

describe('lookupNearestBiomes', () => {
  it('returns both same-floor and any-floor results', () => {
    const grid = new Map<string, string>();
    grid.set('4,4,0', 'verdigris-basin');
    grid.set('12,4,0', 'ember-waste');
    grid.set('4,4,-1', 'sable-depths');

    const resolveBiome = makeResolver(grid);
    const lookup = lookupNearestBiomes('0,0,0', 'ember-waste', resolveBiome);

    expect(lookup.sameFloor).not.toBeNull();
    expect(lookup.sameFloor!.biome.id).toBe('ember-waste');

    expect(lookup.anyFloor).not.toBeNull();
    expect(lookup.anyFloor!.biome.id).toBe('ember-waste');
  });

  it('any-floor may find a closer biome on another floor', () => {
    const grid = new Map<string, string>();
    grid.set('4,4,0', 'verdigris-basin');
    grid.set('20,4,0', 'ember-waste'); // region (2,0), farther away
    grid.set('4,4,-1', 'ember-waste'); // region (0,0,-1), adjacent

    const resolveBiome = makeResolver(grid);
    const lookup = lookupNearestBiomes('0,0,0', 'ember-waste', resolveBiome);

    expect(lookup.sameFloor).not.toBeNull();
    expect(lookup.anyFloor).not.toBeNull();
    // Any-floor should find the closer one on z=-1
    expect(lookup.anyFloor!.distance).toBeLessThanOrEqual(lookup.sameFloor!.distance);
  });
});

describe('findNearestBiomeByRegion', () => {
  it('finds target biome via region BFS', () => {
    const grid = new Map<string, string>();
    grid.set('4,4,0', 'verdigris-basin');
    grid.set('12,4,0', 'ember-waste'); // region (1,0)

    const resolveBiome = makeResolver(grid);
    const result = findNearestBiomeByRegion('0,0,0', 'ember-waste', true, resolveBiome);

    expect(result).not.toBeNull();
    expect(result!.biome.id).toBe('ember-waste');
    // Origin region (0,0) center = 4,4,0. Target region (1,0) center = 12,4,0.
    // Manhattan from origin room (0,0,0) to region center (12,4,0) = 16
    expect(result!.distance).toBe(16);
  });

  it('finds biome on adjacent floor via region BFS', () => {
    const grid = new Map<string, string>();
    grid.set('4,4,0', 'verdigris-basin');
    grid.set('4,4,-1', 'ember-waste');

    const resolveBiome = makeResolver(grid);
    const result = findNearestBiomeByRegion('0,0,0', 'ember-waste', false, resolveBiome);

    expect(result).not.toBeNull();
    expect(result!.biome.id).toBe('ember-waste');
    expect(result!.coordinates[2]).toBe(-1);
  });

  it('returns null when biome not found in any region', () => {
    const grid = new Map<string, string>();
    grid.set('4,4,0', 'verdigris-basin');
    grid.set('12,4,0', 'verdigris-basin');

    const resolveBiome = makeResolver(grid);
    const result = findNearestBiomeByRegion('0,0,0', 'ember-waste', true, resolveBiome);
    expect(result).toBeNull();
  });

  it('respects sameFloor constraint', () => {
    const grid = new Map<string, string>();
    grid.set('4,4,0', 'verdigris-basin');
    grid.set('4,4,-1', 'ember-waste');

    const resolveBiome = makeResolver(grid);
    const sameFloor = findNearestBiomeByRegion('0,0,0', 'ember-waste', true, resolveBiome);
    const anyFloor = findNearestBiomeByRegion('0,0,0', 'ember-waste', false, resolveBiome);

    expect(sameFloor).toBeNull();
    expect(anyFloor).not.toBeNull();
  });
});

describe('lookupNearestBiomesByRegion', () => {
  it('returns both same-floor and any-floor results', () => {
    const grid = new Map<string, string>();
    grid.set('4,4,0', 'verdigris-basin');
    grid.set('12,4,0', 'ember-waste');
    grid.set('4,4,-1', 'sable-depths');

    const resolveBiome = makeResolver(grid);
    const lookup = lookupNearestBiomesByRegion('0,0,0', 'ember-waste', resolveBiome);

    expect(lookup.sameFloor).not.toBeNull();
    expect(lookup.sameFloor!.biome.id).toBe('ember-waste');
    expect(lookup.anyFloor).not.toBeNull();
    expect(lookup.anyFloor!.biome.id).toBe('ember-waste');
  });
});

describe('formatLocatorResult', () => {
  it('formats a result with coordinates and distance', () => {
    const biome = getBiomeDefinition('ember-waste');
    const result = {
      roomId: '5,10,-2',
      distance: 12,
      biome,
      coordinates: [5, 10, -2] as [number, number, number],
    };
    const formatted = formatLocatorResult(result, 'Same floor');
    expect(formatted).toContain('Ember Waste');
    expect(formatted).toContain('X=5');
    expect(formatted).toContain('Y=10');
    expect(formatted).toContain('Z=-2');
    expect(formatted).toContain('12 rooms away');
  });

  it('says "right here" when distance is 0', () => {
    const biome = getBiomeDefinition('verdigris-basin');
    const result = {
      roomId: '0,0,0',
      distance: 0,
      biome,
      coordinates: [0, 0, 0] as [number, number, number],
    };
    const formatted = formatLocatorResult(result, 'Any floor');
    expect(formatted).toContain('right here');
  });
});
