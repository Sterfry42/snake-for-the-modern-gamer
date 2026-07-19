import { describe, expect, it } from 'vitest';
import {
  biomeCountsAs,
  biomeHasTag,
  getBiomeDefinition,
  getBiomeClimateClass,
  getBiomeThermalClass,
  getBiomeVerticalClass,
  getBiomesByFamily,
  getBiomeForRoom,
  type BiomeId,
} from '../../biomes.js';
import { areBiomesCompatible } from '../biomeCompatibility.js';
import { getVerticalLayerBiomeWeights, SeededBiomeMap, STARTER_BIOME_RADIUS } from '../biomeMap.js';
import { createWorldGenerationIdentity } from '../worldGenerationIdentity.js';

function roomId(x: number, y: number, z = 0): string {
  return `${x},${y},${z}`;
}

function mapFor(seed: string): SeededBiomeMap {
  return new SeededBiomeMap(createWorldGenerationIdentity(seed));
}

describe('seeded procedural biome map', () => {
  it('reserves depth -1000 for actively hot biomes', () => {
    const biomeMap = mapFor('hell-depth-hot-only');
    for (let y = -24; y <= 24; y += 6) {
      for (let x = -24; x <= 24; x += 6) {
        expect(biomeMap.getBiomeForRoomId(roomId(x, y, -1000)).temperatureHazard).toBe('hot');
      }
    }
  });

  it('keeps the authored starter biome layout stable across seeds', () => {
    const canonical = mapFor('starter-canonical');
    const seeds = ['starter-a', 'starter-b', 'starter-c', 'starter-d', 'starter-e'];

    for (const seed of seeds) {
      const biomeMap = mapFor(seed);
      for (let y = -STARTER_BIOME_RADIUS; y <= STARTER_BIOME_RADIUS; y += 1) {
        for (let x = -STARTER_BIOME_RADIUS; x <= STARTER_BIOME_RADIUS; x += 1) {
          const id = roomId(x, y);
          expect(biomeMap.getBiomeForRoomId(id).id).toBe(canonical.getBiomeForRoomId(id).id);
          expect(biomeMap.getBiomeForRoomId(id).id).toBe(getBiomeForRoom(id).id);
        }
      }
    }
  });

  it('varies procedural biome regions by seed outside the starter region', () => {
    const first = mapFor('procedural-alpha');
    const second = mapFor('procedural-beta');
    let differences = 0;

    for (let y = 28; y <= 52; y += 1) {
      for (let x = 28; x <= 52; x += 1) {
        if (
          first.getBiomeForRoomId(roomId(x, y)).id !== second.getBiomeForRoomId(roomId(x, y)).id
        ) {
          differences += 1;
        }
      }
    }

    expect(differences).toBeGreaterThan(25);
  });

  it('produces readable patches instead of one-room biome static', () => {
    const biomeMap = mapFor('patch-size-sanity');
    let sameAsEast = 0;
    let comparisons = 0;
    const families = new Set<string>();
    const variants = new Set<string>();

    for (let y = 32; y <= 60; y += 1) {
      for (let x = 32; x <= 60; x += 1) {
        const current = biomeMap.getBiomeForRoomId(roomId(x, y));
        const east = biomeMap.getBiomeForRoomId(roomId(x + 1, y));
        variants.add(current.id);
        families.add(current.family);
        comparisons += 1;
        if (current.id === east.id) {
          sameAsEast += 1;
        }
      }
    }

    expect(sameAsEast / comparisons).toBeGreaterThan(0.55);
    expect(variants.size).toBeGreaterThanOrEqual(3);
    expect(families.size).toBeGreaterThanOrEqual(2);
  });

  it('uses vertical depth and altitude to influence biome distribution', () => {
    const biomeMap = mapFor('vertical-distribution');
    const countClasses = (z: number) => {
      const classes = { subterranean: 0, sky: 0, regular: 0, cold: 0, hot: 0 };
      for (let y = 24; y <= 56; y += 1) {
        for (let x = 24; x <= 56; x += 1) {
          const biome = biomeMap.getBiomeForRoomId(roomId(x, y, z));
          const vertical = getBiomeVerticalClass(biome);
          const thermal = getBiomeThermalClass(biome);
          if (vertical === 'subterranean') classes.subterranean += 1;
          if (vertical === 'sky') classes.sky += 1;
          if (vertical === 'regular') classes.regular += 1;
          if (thermal === 'cold') classes.cold += 1;
          if (thermal === 'hot') classes.hot += 1;
        }
      }
      return classes;
    };

    const surface = countClasses(0);
    const above = countClasses(6);
    const below = countClasses(-6);
    const veryDeep = countClasses(-14);
    const highSky = countClasses(14);

    expect(surface.regular).toBeGreaterThan(surface.subterranean);
    expect(below.subterranean).toBeGreaterThan(surface.subterranean);
    expect(below.subterranean).toBeGreaterThan(below.regular);
    expect(veryDeep.hot).toBeGreaterThan(below.hot);
    expect(above.sky).toBeGreaterThan(surface.sky);
    expect(highSky.cold).toBeGreaterThanOrEqual(above.cold);
  });

  it('makes first adjacent vertical layers feel like mixed world strata', () => {
    const biomeMap = mapFor('adjacent-layer-mix');
    const countVertical = (z: number) => {
      const classes = { subterranean: 0, sky: 0, regular: 0, total: 0 };
      for (let y = -24; y <= 24; y += 1) {
        for (let x = -24; x <= 24; x += 1) {
          const vertical = getBiomeVerticalClass(biomeMap.getBiomeForRoomId(roomId(x, y, z)));
          if (vertical === 'subterranean') classes.subterranean += 1;
          if (vertical === 'sky') classes.sky += 1;
          if (vertical === 'regular') classes.regular += 1;
          classes.total += 1;
        }
      }
      return classes;
    };

    const below = countVertical(-1);
    const above = countVertical(1);

    expect(below.subterranean / below.total).toBeGreaterThan(0.42);
    expect(below.subterranean / below.total).toBeLessThan(0.62);
    expect(above.sky / above.total).toBeGreaterThan(0.42);
    expect(above.sky / above.total).toBeLessThan(0.72);
  });

  it('keeps same-column descent from commonly repeating one biome for many layers', () => {
    const seeds = ['vertical-novelty-a', 'vertical-novelty-b', 'vertical-novelty-c'];
    for (const seed of seeds) {
      const biomeMap = mapFor(seed);
      let threeLayerRepeats = 0;
      let fourLayerRepeats = 0;
      let columns = 0;

      for (let y = -24; y <= 24; y += 1) {
        for (let x = -24; x <= 24; x += 1) {
          const biomes = [0, -1, -2, -3].map((z) => biomeMap.getBiomeForRoomId(roomId(x, y, z)));
          if (getBiomeVerticalClass(biomes[0]) !== 'regular') {
            continue;
          }
          const ids = biomes.map((biome) => biome.id);
          if (ids[0] === ids[1] && ids[1] === ids[2]) {
            threeLayerRepeats += 1;
          }
          if (ids[0] === ids[1] && ids[1] === ids[2] && ids[2] === ids[3]) {
            fourLayerRepeats += 1;
          }
          columns += 1;
        }
      }

      expect(columns).toBeGreaterThan(500);
      expect(threeLayerRepeats / columns).toBeLessThan(0.01);
      expect(fourLayerRepeats / columns).toBe(0);
    }
  });

  it('keeps vertical strata deterministic regardless of room lookup order', () => {
    const first = mapFor('vertical-order-independent');
    const second = mapFor('vertical-order-independent');
    const column = { x: 31, y: -17 };

    const surfaceFirst = [0, -1, -2, -3, -4].map(
      (z) => first.getBiomeForRoomId(roomId(column.x, column.y, z)).id,
    );
    const deepFirst = [-4, -3, -2, -1, 0]
      .map((z) => second.getBiomeForRoomId(roomId(column.x, column.y, z)).id)
      .reverse();

    expect(deepFirst).toEqual(surfaceFirst);
  });

  it('exposes clear vertical layer curves for normal world biome selection', () => {
    const surface = getVerticalLayerBiomeWeights(0);
    const below1 = getVerticalLayerBiomeWeights(-1);
    const below5 = getVerticalLayerBiomeWeights(-5);
    const below10 = getVerticalLayerBiomeWeights(-10);
    const deep = getVerticalLayerBiomeWeights(-16);
    const above1 = getVerticalLayerBiomeWeights(1);
    const above10 = getVerticalLayerBiomeWeights(10);
    const high = getVerticalLayerBiomeWeights(16);

    expect(surface.vertical.regular).toBeGreaterThan(surface.vertical.subterranean);
    expect(below1.vertical.subterranean).toBeGreaterThan(below1.vertical.regular);
    expect(below1.vertical.subterranean).toBeLessThan(below5.vertical.subterranean);
    expect(below5.vertical.subterranean).toBeGreaterThan(below1.vertical.subterranean);
    expect(below10.vertical.subterranean).toBeGreaterThan(below5.vertical.subterranean);
    expect(deep.thermal.hot).toBeGreaterThan(below10.thermal.hot);
    expect(deep.thermal.cold).toBeLessThan(below5.thermal.cold);
    expect(above1.vertical.sky).toBeGreaterThan(surface.vertical.sky);
    expect(above10.vertical.sky).toBeGreaterThan(above1.vertical.sky);
    expect(high.thermal.cold).toBeGreaterThan(above10.thermal.cold);
  });

  it('exposes biome family, tag, and climate helpers', () => {
    expect(biomeCountsAs('gloam-garden', 'forest')).toBe(true);
    expect(biomeHasTag('ember-caverns', 'underground')).toBe(true);
    expect(getBiomesByFamily('cave').map((biome) => biome.id)).toContain('fungal-grotto');
    expect(getBiomeVerticalClass(getBiomeDefinition('fungal-grotto'))).toBe('subterranean');
    expect(getBiomeVerticalClass(getBiomeDefinition('jade-peak-province'))).toBe('sky');
    expect(getBiomeClimateClass('frozen-sea')).toBe('frigid');
  });

  it('defines and reaches the world-expansion biomes', () => {
    const expected: Array<{ id: BiomeId; roomId: string }> = [
      { id: 'neon-underpass', roomId: '12,-2,0' },
      { id: 'glass-desert', roomId: '-12,3,0' },
      { id: 'titan-ribcage', roomId: '0,9,-1' },
      { id: 'radioactive-orchard', roomId: '3,-12,0' },
      { id: 'clockwork-quarry', roomId: '14,4,0' },
    ];

    for (const { id, roomId } of expected) {
      const definition = getBiomeDefinition(id);
      expect(definition.id).toBe(id);
      expect(definition.title.length).toBeGreaterThan(0);
      expect(definition.generation).toBeDefined();
      expect(definition.transition).toBeDefined();
      expect(definition.animalSpawnChance).toBeGreaterThanOrEqual(0);
      expect(getBiomeForRoom(roomId).id).toBe(id);
    }
  });

  it('rejects direct hot-to-cold biome compatibility without a special transition', () => {
    const result = areBiomesCompatible(
      mapFor('compat').getBiomeForRoomId(roomId(40, 40, -3)),
      mapFor('compat').getBiomeForRoomId(roomId(40, 40, 3)),
    );
    const direct = areBiomesCompatible(
      getBiomesByFamily('desert').find((biome) => biome.id === 'ember-waste')!,
      getBiomesByFamily('ocean').find((biome) => biome.id === 'frozen-sea')!,
    );

    expect(result.compatible).toBeTypeOf('boolean');
    expect(direct.compatible).toBe(false);
    expect(direct.reason).toBe('hot-cold-direct-adjacency');
  });
});
