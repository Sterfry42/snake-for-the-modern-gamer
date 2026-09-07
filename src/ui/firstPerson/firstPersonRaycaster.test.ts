import { describe, expect, it } from 'vitest';
import type { FirstPersonWorldView } from './firstPersonTypes.js';
import { castRay } from './firstPersonRaycaster.js';

const wall = { id: 'wall', occludesVision: true, wallHeight: 1, wallColor: 0xffffff };
const open = { id: 'open', occludesVision: false, wallHeight: 0, wallColor: 0 };

function world(layout: readonly string[]): FirstPersonWorldView {
  return {
    width: layout[0]?.length ?? 0,
    height: layout.length,
    roomId: 'test',
    skyColor: 0,
    floorColor: 0,
    fogColor: 0,
    getCell(x, y) {
      if (x < 0 || y < 0 || y >= layout.length || x >= (layout[y]?.length ?? 0)) return null;
      return {
        x,
        y,
        tile: layout[y]?.[x],
        material: layout[y]?.[x] === '#' ? wall : open,
      };
    },
    getBillboards: () => [],
  };
}

describe('first-person raycaster', () => {
  it('hits a vertical wall with perpendicular distance', () => {
    const hit = castRay(world(['....#', '....#', '....#']), { x: 1.5, y: 1.5, yaw: 0 }, 0, {
      maxDistance: 12,
    });
    expect(hit.hit).toBe(true);
    expect(hit.mapX).toBe(4);
    expect(hit.distance).toBeCloseTo(2.5);
    expect(hit.side).toBe('x');
  });

  it('hits a horizontal wall', () => {
    const hit = castRay(
      world(['.....', '.....', '#####']),
      { x: 2.5, y: 0.5, yaw: 0 },
      Math.PI / 2,
      {
        maxDistance: 12,
      },
    );
    expect(hit.hit).toBe(true);
    expect(hit.mapY).toBe(2);
    expect(hit.distance).toBeCloseTo(1.5);
    expect(hit.side).toBe('y');
  });

  it('returns an open ray at max distance', () => {
    const hit = castRay(world(['.....', '.....', '.....']), { x: 1.5, y: 1.5, yaw: 0 }, 0, {
      maxDistance: 2,
    });
    expect(hit.hit).toBe(false);
    expect(hit.distance).toBeCloseTo(2);
  });

  it('handles an adjacent wall', () => {
    const hit = castRay(world(['.#.', '...']), { x: 0.5, y: 0.5, yaw: 0 }, 0, {
      maxDistance: 12,
    });
    expect(hit.hit).toBe(true);
    expect(hit.mapX).toBe(1);
    expect(hit.distance).toBeCloseTo(0.5);
  });
});
