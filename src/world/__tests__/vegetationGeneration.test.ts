import { describe, expect, it } from 'vitest';
import { defaultGameConfig, type GridConfig } from '../../config/gameConfig.js';
import { RoomGenerator } from '../roomGenerator.js';
import { createRng } from '../../core/rng.js';
import type { RoomSnapshot } from '../types.js';
import { ALL_VEGETATION_VARIANTS } from '../generation/stages/vegetationOperations.js';

function generateRoom(
  roomId: string,
  seed: string,
  grid: GridConfig = defaultGameConfig.grid,
): RoomSnapshot {
  const rng = createRng(seed);
  const generator = new RoomGenerator(grid, defaultGameConfig.world, rng);
  return generator.generate(roomId, grid);
}

describe('vegetation generation', () => {
  it('places vegetation in regular rooms', () => {
    const room = generateRoom('0,0,0', 'veg-sanity');
    expect(room.vegetation).toBeDefined();
  });

  it('does not place vegetation in elderwood-maze', () => {
    const room = generateRoom('3,-1,0', 'veg-elderwood');
    expect(room.vegetation).toBeUndefined();
  });

  it('does not place vegetation in sunken-ocean', () => {
    const room = generateRoom('0,-9,0', 'veg-ocean');
    expect(room.vegetation).toBeUndefined();
  });

  it('uses only valid vegetation type strings', () => {
    const room = generateRoom('0,0,0', 'veg-types');
    if (room.vegetation) {
      for (const v of room.vegetation) {
        expect(ALL_VEGETATION_VARIANTS).toContain(v.variant);
      }
    }
  });

  it('vegetation instances are within grid bounds (1-cell margin)', () => {
    const room = generateRoom('0,0,0', 'veg-bounds');
    const { cols, rows } = defaultGameConfig.grid;
    if (room.vegetation) {
      for (const v of room.vegetation) {
        expect(v.x).toBeGreaterThanOrEqual(1);
        expect(v.x).toBeLessThan(cols - 1);
        expect(v.y).toBeGreaterThanOrEqual(1);
        expect(v.y).toBeLessThan(rows - 1);
      }
    }
  });

  it('does not place vegetation on non-passable tiles', () => {
    const room = generateRoom('0,0,0', 'veg-no-block');
    const layout = room.layout;
    if (room.vegetation) {
      for (const v of room.vegetation) {
        expect(layout[v.y]?.[v.x]).toBe('.');
      }
    }
  });

  it('creates 40 vegetation variant names', () => {
    expect(ALL_VEGETATION_VARIANTS.length).toBe(40);
  });

  it('produces deterministic vegetation for the same room and seed', () => {
    const first = generateRoom('0,0,0', 'veg-deterministic');
    const second = generateRoom('0,0,0', 'veg-deterministic');
    expect(first.vegetation).toEqual(second.vegetation);
  });
});
