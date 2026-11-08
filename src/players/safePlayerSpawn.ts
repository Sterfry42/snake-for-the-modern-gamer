import type { Vector2Like } from '../core/math.js';
import { isSolidTile, tileHasTag } from '../world/tiles.js';
import type { RoomSnapshot } from '../world/types.js';

export class SpawnAreaUnavailable extends Error {
  constructor() {
    super('Spawn area unavailable. Clear space in the origin room and try again.');
    this.name = 'SpawnAreaUnavailable';
  }
}

/** Deterministic local geometry: no incumbent player anchor or gameplay RNG. */
export function findSafePlayerSpawn(options: {
  room: RoomSnapshot;
  preferredBody: readonly Vector2Like[];
  preferredDirection: Vector2Like;
  blocked: readonly Vector2Like[];
  players: readonly (readonly Vector2Like[])[];
  forwardClearance?: number;
}): { body: Vector2Like[]; direction: Vector2Like } {
  const { room, preferredBody, preferredDirection: direction } = options;
  const anchor = preferredBody[0];
  if (!anchor) throw new SpawnAreaUnavailable();
  const blocked = new Set(options.blocked.map((point) => `${point.x},${point.y}`));
  const candidates = room.layout.flatMap((row, y) => [...row].map((_, x) => ({ x, y })));
  candidates.sort(
    (a, b) =>
      Math.abs(a.x - anchor.x) +
        Math.abs(a.y - anchor.y) -
        Math.abs(b.x - anchor.x) -
        Math.abs(b.y - anchor.y) ||
      a.y - b.y ||
      a.x - b.x,
  );
  for (const head of candidates) {
    const body = preferredBody.map((point) => ({
      x: point.x + head.x - anchor.x,
      y: point.y + head.y - anchor.y,
    }));
    const clearance = Array.from({ length: options.forwardClearance ?? 3 }, (_, index) => ({
      x: head.x + direction.x * (index + 1),
      y: head.y + direction.y * (index + 1),
    }));
    if (
      [...body, ...clearance].some((point) => {
        const tile = room.layout[point.y]?.[point.x];
        return (
          !tile ||
          isSolidTile(tile) ||
          tileHasTag(tile, 'liquid') ||
          tileHasTag(tile, 'townBlocking') ||
          blocked.has(`${point.x},${point.y}`) ||
          options.players.some((segments) =>
            segments.some(
              (segment) => Math.abs(point.x - segment.x) + Math.abs(point.y - segment.y) <= 1,
            ),
          )
        );
      })
    )
      continue;
    return { body, direction: { ...direction } };
  }
  throw new SpawnAreaUnavailable();
}
