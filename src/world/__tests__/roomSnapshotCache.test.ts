import { describe, expect, it, vi } from 'vitest';
import { RoomSnapshotCache } from '../roomSnapshotCache.js';
import type { RoomSnapshot } from '../types.js';

function room(id: string): RoomSnapshot {
  return {
    id,
    layout: ['.#'],
    portals: [],
    biomeId: 'verdigris-basin',
    biomeTitle: 'Test',
    backgroundColor: 0,
    wallColor: 1,
    wallOutlineColor: 2,
  };
}

describe('room snapshot cache', () => {
  it('rehydrates post-eviction edits after the live reference is collected', async () => {
    const references: Array<{ value: object | undefined }> = [];
    vi.stubGlobal(
      'WeakRef',
      class {
        private readonly reference: { value: object | undefined };
        constructor(value: object) {
          this.reference = { value };
          references.push(this.reference);
        }
        deref(): object | undefined {
          return this.reference.value;
        }
      },
    );
    try {
      const cache = new RoomSnapshotCache(1);
      const first = cache.prepare(room('0,0,0'));
      cache.set(first.id, first);
      cache.set('1,0,0', cache.prepare(room('1,0,0')));
      first.layout[0] = '..';
      first.treasure = { x: 1, y: 0 };
      await Promise.resolve();
      for (const reference of references) {
        if (reference.value === first) reference.value = undefined;
      }
      const restored = cache.get(first.id);
      expect(restored).not.toBe(first);
      expect(restored?.layout).toEqual(['..']);
      expect(restored?.treasure).toEqual({ x: 1, y: 0 });
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('world-wide reads do not churn or promote the hot-room working set', () => {
    const cache = new RoomSnapshotCache(2);
    for (let index = 0; index < 12; index++) {
      cache.set(`${index},0,0`, cache.prepare(room(`${index},0,0`)));
    }
    const keysBefore = [...cache.keys()];
    expect(new Map(cache).size).toBe(12);
    expect([...cache.keys()]).toEqual(keysBefore);
    expect(cache.size).toBe(2);
  });
  it('bounds hot rooms while preserving edited terrain and pickups', () => {
    const cache = new RoomSnapshotCache(2);
    const edited = cache.prepare(room('0,0,0'));
    cache.set(edited.id, edited);
    edited.layout[0] = '..';
    edited.treasure = { x: 1, y: 0 };
    for (let index = 1; index <= 10; index++) {
      const next = cache.prepare(room(`${index},0,0`));
      cache.set(next.id, next);
    }
    expect(cache.size).toBe(2);
    expect(cache.knownSize).toBe(11);
    expect(cache.get(edited.id)).toBe(edited);
    expect(cache.get(edited.id)?.layout).toEqual(['..']);
    expect(cache.get(edited.id)?.treasure).toEqual({ x: 1, y: 0 });
    expect(cache.size).toBe(2);
  });

  it('preserves mutations through retained room references after eviction', () => {
    const cache = new RoomSnapshotCache(1);
    const first = cache.prepare(room('0,0,0'));
    cache.set(first.id, first);
    const next = cache.prepare(room('1,0,0'));
    cache.set(next.id, next);
    first.layout[0] = '##';
    first.portals.push({ x: 1, y: 0, destRoomId: next.id, destX: 0, destY: 0 });
    expect(cache.get(first.id)?.layout).toEqual(['##']);
    expect(cache.get(first.id)?.portals).toHaveLength(1);
    expect(new Map(cache).size).toBe(2);
    expect(cache.size).toBe(1);
  });

  it('removes archived rooms and does not revive cleared runs', () => {
    const cache = new RoomSnapshotCache(1);
    const first = cache.prepare(room('0,0,0'));
    cache.set(first.id, first);
    cache.set('1,0,0', cache.prepare(room('1,0,0')));
    expect(cache.delete(first.id)).toBe(true);
    expect(cache.get(first.id)).toBeUndefined();
    cache.clear();
    expect(cache.knownSize).toBe(0);
    first.layout[0] = '..';
    expect(cache.get(first.id)).toBeUndefined();
  });
});
