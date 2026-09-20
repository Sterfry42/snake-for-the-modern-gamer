import { describe, expect, it } from 'vitest';
import type { RoomSnapshot } from '../../world/types.js';
import { resolveFloorVisual } from './tileVisualResolver.js';

function createRoom(overrides: Partial<RoomSnapshot>): RoomSnapshot {
  return {
    id: '0,0,0',
    layout: ['................................'],
    portals: [],
    biomeId: 'verdigris-basin',
    biomeTitle: 'Verdigris Basin',
    backgroundColor: 0x66aa66,
    wallColor: 0x335533,
    wallOutlineColor: 0x102010,
    ...overrides,
  };
}

describe('tile visual resolver', () => {
  it('lets Liberty Badlands own floor aliases before generic rooms claim them', () => {
    const liberty = createRoom({
      biomeId: 'liberty-badlands',
      biomeTitle: 'Liberty Badlands',
    });
    const ordinary = createRoom({});

    expect(resolveFloorVisual(liberty, 'A', 4, 4).color).toBe(0xb5362f);
    expect(resolveFloorVisual(liberty, 'F', 4, 4).color).toBe(0x2f5f48);
    expect(resolveFloorVisual(liberty, 'G', 4, 4).color).toBe(0x2f5f48);
    expect(resolveFloorVisual(liberty, 'O', 4, 4).color).toBe(0x274c77);
    expect(resolveFloorVisual(ordinary, 'A', 4, 4).color).not.toBe(0xb5362f);
  });

  it('lets Mosaic Coast own shared aliases before fallback floor styling', () => {
    const mosaic = createRoom({
      biomeId: 'mosaic-coast',
      biomeTitle: 'Mosaic Coast',
    });

    expect(resolveFloorVisual(mosaic, 'F', 2, 3).color).toBe(0x2f8fbd);
    expect(resolveFloorVisual(mosaic, 'G', 2, 3).color).toBe(0x2f9e44);
  });
});
