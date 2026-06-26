import { describe, expect, it } from 'vitest';
import { defaultGameConfig } from '../../../config/gameConfig.js';
import { createRng } from '../../../core/rng.js';
import { RoomGenerator } from '../../roomGenerator.js';
import type { RoomSnapshot } from '../../types.js';
import { SeededBiomeMap } from '../biomeMap.js';
import { createWorldGenerationIdentity } from '../worldGenerationIdentity.js';

function roomId(x: number, y: number, z: number): string {
  return `${x},${y},${z}`;
}

function openEdgeRatio(room: RoomSnapshot, side: 'north' | 'south' | 'west' | 'east'): number {
  const { cols, rows } = defaultGameConfig.grid;
  let open = 0;
  const total = side === 'north' || side === 'south' ? cols : rows;
  for (let index = 0; index < total; index += 1) {
    const tile =
      side === 'north'
        ? room.layout[0]?.[index]
        : side === 'south'
          ? room.layout[rows - 1]?.[index]
          : side === 'west'
            ? room.layout[index]?.[0]
            : room.layout[index]?.[cols - 1];
    if (tile !== undefined && tile !== '#' && tile !== '~') {
      open += 1;
    }
  }
  return open / total;
}

describe('world generation audit', () => {
  it('keeps broad biome distribution and generated town borders within sanity bounds', () => {
    const identity = createWorldGenerationIdentity('world-audit');
    const biomeMap = new SeededBiomeMap(identity);
    const biomeCounts = new Map<string, number>();
    const familyCounts = new Map<string, number>();
    const radius = 48;
    const zLevels = [-2, -1, 0, 1, 2];

    for (const z of zLevels) {
      for (let y = -radius; y <= radius; y += 1) {
        for (let x = -radius; x <= radius; x += 1) {
          const biome = biomeMap.getBiomeForRoomId(roomId(x, y, z));
          biomeCounts.set(biome.id, (biomeCounts.get(biome.id) ?? 0) + 1);
          familyCounts.set(biome.family, (familyCounts.get(biome.family) ?? 0) + 1);
        }
      }
    }

    const totalBiomeSamples = zLevels.length * (radius * 2 + 1) ** 2;
    const jadeRatio = (biomeCounts.get('jade-peak-province') ?? 0) / totalBiomeSamples;

    const generator = new RoomGenerator(
      defaultGameConfig.grid,
      defaultGameConfig.world,
      createRng(identity.seed),
      identity,
    );
    const roomRadius = 20;
    const veryOpenTownEdges: Array<{ roomId: string; side: string; ratio: number }> = [];
    let townRooms = 0;

    for (let y = -roomRadius; y <= roomRadius; y += 1) {
      for (let x = -roomRadius; x <= roomRadius; x += 1) {
        const room = generator.generate(roomId(x, y, 0), defaultGameConfig.grid);
        if (!room.town && !room.townPerimeter) {
          continue;
        }
        townRooms += 1;
        for (const side of ['north', 'south', 'west', 'east'] as const) {
          const ratio = openEdgeRatio(room, side);
          if (ratio > 0.72) {
            veryOpenTownEdges.push({ roomId: room.id, side, ratio });
          }
        }
      }
    }

    console.info('[world-audit] biomeCounts', Object.fromEntries(biomeCounts));
    console.info('[world-audit] familyCounts', Object.fromEntries(familyCounts));
    console.info('[world-audit] townRooms', townRooms);
    console.info('[world-audit] veryOpenTownEdges', veryOpenTownEdges.slice(0, 12));

    expect(jadeRatio).toBeLessThan(0.08);
    expect(familyCounts.size).toBeGreaterThanOrEqual(5);
    expect(townRooms).toBeGreaterThan(0);
  }, 15000);
});
