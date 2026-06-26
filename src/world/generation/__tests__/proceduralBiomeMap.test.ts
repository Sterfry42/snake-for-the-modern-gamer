import { describe, expect, it } from 'vitest';
import {
  biomeCountsAs,
  biomeHasTag,
  getBiomeDefinition,
  getBiomeClimateClass,
  getBiomesByFamily,
  getBiomeForRoom,
  type BiomeId,
} from '../../biomes.js';
import { areBiomesCompatible } from '../biomeCompatibility.js';
import { SeededBiomeMap, STARTER_BIOME_RADIUS } from '../biomeMap.js';
import { createWorldGenerationIdentity } from '../worldGenerationIdentity.js';

function roomId(x: number, y: number, z = 0): string {
  return `${x},${y},${z}`;
}

function mapFor(seed: string): SeededBiomeMap {
  return new SeededBiomeMap(createWorldGenerationIdentity(seed));
}

describe('seeded procedural biome map', () => {
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
        if (first.getBiomeForRoomId(roomId(x, y)).id !== second.getBiomeForRoomId(roomId(x, y)).id) {
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
    const countTags = (z: number) => {
      const tags = { cave: 0, underground: 0, highAltitude: 0, cold: 0, hot: 0 };
      for (let y = 24; y <= 56; y += 1) {
        for (let x = 24; x <= 56; x += 1) {
          const biome = biomeMap.getBiomeForRoomId(roomId(x, y, z));
          if (biomeCountsAs(biome.id, 'cave')) tags.cave += 1;
          if (biomeHasTag(biome.id, 'underground')) tags.underground += 1;
          if (biomeHasTag(biome.id, 'high-altitude')) tags.highAltitude += 1;
          if (biomeHasTag(biome.id, 'cold') || biomeHasTag(biome.id, 'frigid')) tags.cold += 1;
          if (biomeHasTag(biome.id, 'hot')) tags.hot += 1;
        }
      }
      return tags;
    };

    const surface = countTags(0);
    const above = countTags(3);
    const below = countTags(-3);

    expect(below.cave).toBeGreaterThan(surface.cave);
    expect(below.underground).toBeGreaterThan(surface.underground);
    expect(above.highAltitude + above.cold).toBeGreaterThan(surface.highAltitude + surface.cold);
  });

  it('exposes biome family, tag, and climate helpers', () => {
    expect(biomeCountsAs('gloam-garden', 'forest')).toBe(true);
    expect(biomeHasTag('ember-caverns', 'underground')).toBe(true);
    expect(getBiomesByFamily('cave').map((biome) => biome.id)).toContain('fungal-grotto');
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
