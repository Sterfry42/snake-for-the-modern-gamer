import { describe, expect, it } from 'vitest';
import { copyGameSnapshot } from '../gameProtocol.js';
import { RoomSnapshotCache } from '../../world/roomSnapshotCache.js';
import type { RoomSnapshot } from '../../world/types.js';

/**
 * copyGameSnapshot detached snapshots used to round-trip the entire payload
 * through JSON.parse(JSON.stringify(...)); the structural materializer must
 * produce identical plain output while reading RoomSnapshotCache proxies.
 */
describe('copyGameSnapshot structural materialization', () => {
  it('matches JSON round-trip output on a realistic nested snapshot', () => {
    const snapshot = {
      tick: 4200,
      localPlayerId: 'local',
      viewport: {
        centerRoomId: '0,0,0',
        rooms: {
          '0,0,0': {
            id: '0,0,0',
            room: {
              id: '0,0,0',
              layout: ['...'.repeat(3), '.....', '..#..'],
              biomeId: 'home-hearth',
              backgroundColor: 0x223344,
              portals: [{ id: 'p1', x: 0, y: 0, direction: { x: 1, y: 0 }, targetRoomId: '1,0,0' }],
              structures: [{ id: 'lamp-1', kind: 'lamp', x: 2, y: 2, owner: 'local' }],
            },
            apples: [{ x: 1, y: 2, typeId: 'base' }],
            enemies: [],
          },
        },
      },
      players: {
        local: {
          id: 'local',
          name: 'Player',
          roomId: '0,0,0',
          body: [
            { x: 1, y: 1 },
            { x: 0, y: 1 },
          ],
          direction: { x: 1, y: 0 },
          score: 15,
          alive: true,
          isLocal: true,
        },
      },
      ui: { paused: false },
      flags: {
        'modernRun.state': { streak: 3 },
        count: 7,
        nested: { deep: { list: [1, 2, { x: null }] } },
      },
      nulls: [null, 'a', 0, false],
    } as unknown as Parameters<typeof copyGameSnapshot>[0];

    const copied = copyGameSnapshot(snapshot);
    const jsonCopy = JSON.parse(JSON.stringify(snapshot)) as typeof copied;
    expect(copied).toEqual(jsonCopy);
    expect(copied).not.toBe(jsonCopy);
    expect(copied.players.local).not.toBe(jsonCopy.players.local);
    expect(copied.viewport.rooms['0,0,0']!.room).not.toBe(jsonCopy.viewport.rooms['0,0,0']!.room);
  });

  it('materializes RoomSnapshotCache proxies into plain detached data', () => {
    const room: RoomSnapshot = {
      id: '9,9,0',
      layout: ['.....', '..#..', '.....'],
      biomeId: 'home-hearth',
      biomeTitle: 'Home Hearth',
      backgroundColor: 0x101010,
      wallColor: 0x202020,
      wallOutlineColor: 0x303030,
      portals: [],
      apple: { x: 1, y: 1 },
    };
    const cache = new RoomSnapshotCache();
    cache.set(room.id, room);
    const proxiedRoom = cache.get(room.id)!;

    const snapshot = {
      tick: 1,
      localPlayerId: 'local',
      viewport: { centerRoomId: room.id, rooms: { [room.id]: { id: room.id, room: proxiedRoom } } },
      players: { local: { id: 'local' } },
      ui: { paused: false },
    } as unknown as Parameters<typeof copyGameSnapshot>[0];

    const copied = copyGameSnapshot(snapshot);
    const copiedRoom = copied.viewport.rooms[room.id]!.room as RoomSnapshot;
    expect(copiedRoom).not.toBe(proxiedRoom);
    expect(Array.isArray(copiedRoom.layout)).toBe(true);
    expect(copiedRoom).toEqual({
      id: room.id,
      layout: ['.....', '..#..', '.....'],
      biomeId: 'home-hearth',
      biomeTitle: 'Home Hearth',
      backgroundColor: 0x101010,
      wallColor: 0x202020,
      wallOutlineColor: 0x303030,
      portals: [],
      apple: { x: 1, y: 1 },
    });

    // The copy must not alias live world state in either direction.
    room.apple = { x: 4, y: 4 };
    expect((copiedRoom.apple as { x: number }).x).toBe(1);
    (copiedRoom.apple as { x: number }).x = 7;
    expect(room.apple.x).toBe(4);
  });

  it('matches JSON semantics for edge values and rejects cycles and BigInt', () => {
    const snapshot = {
      tick: 1,
      localPlayerId: 'local',
      viewport: { centerRoomId: '0,0,0', rooms: {} },
      players: {},
      ui: { paused: false },
      edges: {
        nonFinite: Number.POSITIVE_INFINITY,
        hole: [1, undefined, 3],
        dropped: { functionValue: () => 1, symbolValue: Symbol('x'), keep: 'yes' },
        when: new Date('2026-01-02T03:04:05.000Z'),
      },
    } as unknown as Parameters<typeof copyGameSnapshot>[0];

    const copied = copyGameSnapshot(snapshot) as unknown as { edges: Record<string, unknown> };
    const jsonCopy = JSON.parse(JSON.stringify(snapshot)) as { edges: Record<string, unknown> };
    expect(copied.edges).toEqual(jsonCopy.edges);
    expect(copied.edges.nonFinite).toBeNull();
    expect(copied.edges.hole).toEqual([1, null, 3]);
    expect(copied.edges.dropped).toEqual({ keep: 'yes' });
    expect(copied.edges.when).toBe('2026-01-02T03:04:05.000Z');

    const cyclic: Record<string, unknown> = { self: null };
    cyclic.self = cyclic;
    expect(() =>
      copyGameSnapshot(cyclic as unknown as Parameters<typeof copyGameSnapshot>[0]),
    ).toThrow('Invalid game snapshot');
    expect(() =>
      copyGameSnapshot({
        tick: 1n,
      } as unknown as Parameters<typeof copyGameSnapshot>[0]),
    ).toThrow('Invalid game snapshot');
  });
});
