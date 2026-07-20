import { describe, expect, it } from 'vitest';
import { defaultGameConfig } from '../../config/gameConfig.js';
import { createRng } from '../../core/rng.js';
import { RoomGenerator } from '../roomGenerator.js';
import { getBiomeForRoom } from '../biomes.js';
import type { RoomSnapshot } from '../types.js';
import { createWorldGenerationIdentity } from '../generation/worldGenerationIdentity.js';

type RoomCoord = { x: number; y: number; z: number };

function roomId(coord: RoomCoord): string {
  return `${coord.x},${coord.y},${coord.z}`;
}

function generateRoomWithSeed(seed: string, coord: RoomCoord): RoomSnapshot {
  const identity = createWorldGenerationIdentity(seed);
  const rng = createRng(seed);
  const generator = new RoomGenerator(defaultGameConfig.world, rng, identity);
  return generator.generate(roomId(coord), defaultGameConfig.grid);
}

describe('deterministic fairness tests', () => {
  const origin = { x: 0, y: 0, z: 0 };
  const testRadius = 3;
  const longRunningWorldTestTimeout = 60_000;

  function buildTestCoords(): RoomCoord[] {
    const coords: RoomCoord[] = [];
    for (let y = -testRadius; y <= testRadius; y++) {
      for (let x = -testRadius; x <= testRadius; x++) {
        coords.push({ x, y, z: 0 });
      }
    }
    return coords;
  }

  const testCoords = buildTestCoords();

  describe('sequential seed diversity', () => {
    it(
      'no two sequential seeds produce identical vegetation in all rooms',
      () => {
        const seeds = 50;
        const vegetationBySeed = new Map<number, Map<string, string>>();

        for (let i = 0; i < seeds; i++) {
          const seed = `fairness-seq-${i}`;
          const vegetation = new Map<string, string>();
          for (const coord of testCoords) {
            const room = generateRoomWithSeed(seed, coord);
            vegetation.set(
              roomId(coord),
              JSON.stringify(
                (room.vegetation ?? []).map(({ x, y, variant }) => ({
                  x,
                  y,
                  variant,
                })),
              ),
            );
          }
          vegetationBySeed.set(i, vegetation);
        }

        // Compare each pair of adjacent seeds
        for (let i = 0; i < seeds - 1; i++) {
          const first = vegetationBySeed.get(i)!;
          const second = vegetationBySeed.get(i + 1)!;
          let different = false;
          for (const [id, count] of first) {
            if (count !== second.get(id)) {
              different = true;
              break;
            }
          }
          expect(different).toBe(true);
        }
      },
      longRunningWorldTestTimeout,
    );

    it(
      '50 sequential seeds all produce valid worlds (no crashes)',
      () => {
        for (let i = 0; i < 50; i++) {
          const seed = `validity-seq-${i}`;
          for (const coord of testCoords) {
            const room = generateRoomWithSeed(seed, coord);
            expect(room.layout.length).toBe(defaultGameConfig.grid.rows);
            for (const row of room.layout) {
              expect(row.length).toBe(defaultGameConfig.grid.cols);
            }
          }
        }
      },
      longRunningWorldTestTimeout,
    );

    it(
      '100 sequential seeds maintain consistent origin room biome',
      () => {
        const biomes = new Set<string>();
        for (let i = 0; i < 100; i++) {
          const seed = `origin-biome-${i}`;
          const room = generateRoomWithSeed(seed, origin);
          biomes.add(room.biomeId);
        }
        // Origin room biome is coordinate-dependent, should be the same
        expect(biomes.size).toBe(1);
      },
      longRunningWorldTestTimeout,
    );

    it(
      '100 sequential seeds maintain consistent origin room archetype',
      () => {
        const archetypes = new Set<string>();
        for (let i = 0; i < 100; i++) {
          const seed = `origin-arch-${i}`;
          const room = generateRoomWithSeed(seed, origin);
          archetypes.add(room.archetypeId ?? 'undefined');
        }
        // Origin room should consistently be 'classic' archetype
        expect(archetypes.has('classic')).toBe(true);
        expect(archetypes.size).toBe(1);
      },
      longRunningWorldTestTimeout,
    );

    it(
      '100 sequential seeds never produce completely blocked worlds',
      () => {
        for (let i = 0; i < 100; i++) {
          const seed = `no-blocked-${i}`;
          let hasPassable = false;
          for (const coord of testCoords) {
            const room = generateRoomWithSeed(seed, coord);
            const passable = room.layout.some((row) => row.split('').some((ch) => ch !== '#'));
            if (passable) {
              hasPassable = true;
              break;
            }
          }
          expect(hasPassable).toBe(true);
        }
      },
      longRunningWorldTestTimeout,
    );

    it(
      '100 sequential seeds maintain consistent coordinate-dependent features',
      () => {
        const coords = [
          { x: 0, y: 0, z: 0 },
          { x: 3, y: -1, z: 0 },
          { x: 0, y: -9, z: 0 },
        ];

        for (const coord of coords) {
          const expectedBiome = getBiomeForRoom(roomId(coord)).id;

          for (let i = 0; i < 50; i++) {
            const seed = `coord-feature-${i}`;
            const room = generateRoomWithSeed(seed, coord);
            expect(room.biomeId).toBe(expectedBiome);
          }
        }
      },
      longRunningWorldTestTimeout,
    );

    it(
      '100 sequential seeds produce rooms with at least some passable tiles',
      () => {
        for (let i = 0; i < 100; i++) {
          const seed = `passable-${i}`;
          for (const coord of testCoords) {
            const room = generateRoomWithSeed(seed, coord);
            const hasPassable = room.layout.some((row) => row.split('').some((ch) => ch !== '#'));
            expect(hasPassable).toBe(true);
          }
        }
      },
      longRunningWorldTestTimeout,
    );
  });

  describe('biome distribution', () => {
    it(
      'biome types are within expected ranges across 100 seeds',
      () => {
        const biomeCounts = new Map<string, number>();
        const totalRooms = 100 * testCoords.length;

        for (let i = 0; i < 100; i++) {
          const seed = `biome-dist-${i}`;
          for (const coord of testCoords) {
            const room = generateRoomWithSeed(seed, coord);
            biomeCounts.set(room.biomeId, (biomeCounts.get(room.biomeId) ?? 0) + 1);
          }
        }

        const oceanCount = biomeCounts.get('sunken-ocean') ?? 0;
        const forestCount = biomeCounts.get('elderwood-maze') ?? 0;
        const oceanRatio = oceanCount / totalRooms;
        const forestRatio = forestCount / totalRooms;

        expect(oceanRatio).toBeLessThan(0.1);
        expect(forestRatio).toBeLessThan(0.1);

        const libertyCount = biomeCounts.get('liberty-badlands') ?? 0;
        expect(libertyCount).toBe(0);

        const commonBiomes = [
          'verdigris-basin',
          'sundrop-plains',
          'dawnvale-fells',
          'jade-peak-province',
        ];
        const commonCount = commonBiomes.reduce(
          (sum, biome) => sum + (biomeCounts.get(biome) ?? 0),
          0,
        );
        expect(commonCount / totalRooms).toBeGreaterThan(0.3);
      },
      longRunningWorldTestTimeout,
    );

    it(
      'fixed coordinates always produce the same biome regardless of seed',
      () => {
        const coords = [
          { x: 0, y: 0, z: 0 },
          { x: 3, y: -1, z: 0 },
          { x: -7, y: -6, z: 0 },
          { x: 0, y: -9, z: 0 },
        ];

        for (const coord of coords) {
          const expectedBiome = getBiomeForRoom(roomId(coord)).id;
          for (let i = 0; i < 20; i++) {
            const seed = `coord-biome-${i}`;
            const room = generateRoomWithSeed(seed, coord);
            expect(room.biomeId).toBe(expectedBiome);
          }
        }
      },
      longRunningWorldTestTimeout,
    );
  });

  describe('structural integrity', () => {
    it(
      'all rooms have valid dimensions',
      () => {
        for (let i = 0; i < 50; i++) {
          const seed = `dimensions-${i}`;
          for (const coord of testCoords) {
            const room = generateRoomWithSeed(seed, coord);
            expect(room.layout.length).toBe(defaultGameConfig.grid.rows);
            for (let y = 0; y < room.layout.length; y++) {
              expect(room.layout[y].length).toBe(defaultGameConfig.grid.cols);
            }
          }
        }
      },
      longRunningWorldTestTimeout,
    );

    it(
      'all rooms have valid biomes',
      () => {
        const validBiomes = new Set<string>();
        for (let x = -20; x <= 20; x++) {
          for (let y = -20; y <= 20; y++) {
            const biome = getBiomeForRoom(`${x},${y},0`);
            validBiomes.add(biome.id);
          }
        }

        for (let i = 0; i < 50; i++) {
          const seed = `valid-biome-${i}`;
          for (const coord of testCoords) {
            const room = generateRoomWithSeed(seed, coord);
            expect(validBiomes.has(room.biomeId)).toBe(true);
          }
        }
      },
      longRunningWorldTestTimeout,
    );

    it(
      'all rooms have valid color values',
      () => {
        for (let i = 0; i < 50; i++) {
          const seed = `colors-${i}`;
          for (const coord of testCoords) {
            const room = generateRoomWithSeed(seed, coord);
            expect(room.backgroundColor).toBeGreaterThanOrEqual(0);
            expect(room.wallColor).toBeGreaterThanOrEqual(0);
            expect(room.wallOutlineColor).toBeGreaterThanOrEqual(0);
          }
        }
      },
      longRunningWorldTestTimeout,
    );

    it(
      'all rooms have at least one passable tile',
      () => {
        for (let i = 0; i < 50; i++) {
          const seed = `passable-${i}`;
          for (const coord of testCoords) {
            const room = generateRoomWithSeed(seed, coord);
            const hasPassable = room.layout.some((row) => row.split('').some((ch) => ch !== '#'));
            expect(hasPassable).toBe(true);
          }
        }
      },
      longRunningWorldTestTimeout,
    );

    it('origin room is never an ocean room', () => {
      for (let i = 0; i < 50; i++) {
        const seed = `origin-no-ocean-${i}`;
        const room = generateRoomWithSeed(seed, origin);
        expect(room.biomeId).not.toBe('sunken-ocean');
      }
    });

    it('origin room is never a dense forest room', () => {
      for (let i = 0; i < 50; i++) {
        const seed = `origin-no-forest-${i}`;
        const room = generateRoomWithSeed(seed, origin);
        expect(room.biomeId).not.toBe('elderwood-maze');
      }
    });
  });

  describe('deterministic verification', () => {
    it(
      '100 sequential seeds are all internally consistent (run twice)',
      () => {
        const results = new Map<string, Map<string, string>>();

        for (let i = 0; i < 100; i++) {
          const seed = `verify-consistent-${i}`;
          const rooms = new Map<string, string>();
          for (const coord of testCoords) {
            const room = generateRoomWithSeed(seed, coord);
            rooms.set(roomId(coord), room.layout.join('|'));
          }
          results.set(seed, rooms);
        }

        for (let i = 0; i < 100; i++) {
          const seed = `verify-consistent-${i}`;
          for (const coord of testCoords) {
            const room = generateRoomWithSeed(seed, coord);
            const expected = results.get(seed)?.get(roomId(coord));
            expect(room.layout.join('|')).toBe(expected);
          }
        }
      },
      longRunningWorldTestTimeout,
    );

    it('Liberty Badlands biome is consistent across seeds', () => {
      const libertyCoord = { x: -7, y: -6, z: 0 };
      for (let i = 0; i < 50; i++) {
        const seed = `liberty-${i}`;
        const room = generateRoomWithSeed(seed, libertyCoord);
        expect(room.biomeId).toBe('liberty-badlands');
      }
    });

    it('vegetation placement varies across seeds for the same coordinate', () => {
      const coord = { x: 0, y: 0, z: 0 };
      const vegetationConfigs = new Set<string>();

      for (let i = 0; i < 50; i++) {
        const seed = `veg-varies-${i}`;
        const room = generateRoomWithSeed(seed, coord);
        const config =
          room.vegetation?.map((v) => `${v.x},${v.y},${v.variant}`).join(';') ?? 'none';
        vegetationConfigs.add(config);
      }

      expect(vegetationConfigs.size).toBeGreaterThan(1);
    });
  });
});
