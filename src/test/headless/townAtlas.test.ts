import { describe, expect, it } from 'vitest';
import { unreachableTargets } from './townAtlas.js';
import type { RoomSnapshot } from '../../world/types.js';
import { RoomSnapshotCache } from '../../world/roomSnapshotCache.js';

function room(layout: string[]): RoomSnapshot {
  return {
    id: '0,0,0',
    layout,
    portals: [],
    biomeId: 'verdigris-basin',
    biomeTitle: 'Test',
    backgroundColor: 0,
    wallColor: 1,
    wallOutlineColor: 2,
  };
}

describe('town reachability diagnostics', () => {
  it('keeps walls, water, disconnected cells, and outside targets unreachable in a proxy-backed room', () => {
    const source = new RoomSnapshotCache().prepare(room(['.##.', '.#~#', '..#.']));
    const targets = [
      { x: 1, y: 2, label: 'reachable' },
      { x: 1, y: 0, label: 'wall' },
      { x: 2, y: 1, label: 'water' },
      { x: 3, y: 0, label: 'disconnected' },
      { x: -1, y: 1, label: 'outside' },
      { x: 0, y: 0.5, label: 'fractional' },
    ];
    expect(
      unreachableTargets(source, targets, [{ x: 0, y: 0, label: 'start' }]).map(
        (target) => target.label,
      ),
    ).toEqual(['wall', 'water', 'disconnected', 'outside', 'fractional']);
    expect(source.layout).toEqual(['.##.', '.#~#', '..#.']);
  });

  it('respects ragged rows, empty rooms, and duplicate starting cells', () => {
    const targets = [
      { x: 2, y: 0, label: 'upper right' },
      { x: 2, y: 2, label: 'lower right' },
    ];
    const start = { x: 0, y: 0, label: 'start' };
    expect(unreachableTargets(room(['...', '.', '...']), targets, [start, start])).toEqual([]);
    expect(unreachableTargets(room([]), targets)).toEqual(targets);
  });
});
