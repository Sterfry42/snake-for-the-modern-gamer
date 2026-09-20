import { isBlockingTownTile } from '../../world/town.js';
import { isSolidTile } from '../../world/tiles.js';
import type { RoomSnapshot } from '../../world/types.js';

export interface ReachabilityTarget {
  x: number;
  y: number;
  label: string;
}

export function renderTownAtlas(rooms: readonly RoomSnapshot[]): string {
  const coordinateRooms = rooms
    .map((room) => ({ room, coord: parseRoomId(room.id) }))
    .filter((entry): entry is { room: RoomSnapshot; coord: [number, number, number] } =>
      Boolean(entry.coord),
    );
  if (coordinateRooms.length === 0) {
    return '[no coordinate town rooms]';
  }
  const xs = coordinateRooms.map((entry) => entry.coord[0]);
  const ys = coordinateRooms.map((entry) => entry.coord[1]);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const byId = new Map(coordinateRooms.map((entry) => [entry.room.id, entry.room]));
  const roomHeight = coordinateRooms[0]?.room.layout.length ?? 0;
  const emptyRoom = Array.from({ length: roomHeight }, () => ''.padEnd(roomWidth(rooms), ' '));
  const atlas: string[] = [];

  for (let y = minY; y <= maxY; y += 1) {
    for (let row = 0; row < roomHeight; row += 1) {
      const chunks: string[] = [];
      for (let x = minX; x <= maxX; x += 1) {
        const room = byId.get(`${x},${y},0`);
        chunks.push(room?.layout[row] ?? emptyRoom[row] ?? '');
      }
      atlas.push(chunks.join('  '));
    }
    atlas.push('');
  }
  return atlas.join('\n').trimEnd();
}

export function unreachableTargets(
  room: RoomSnapshot,
  targets: readonly ReachabilityTarget[],
  starts: readonly ReachabilityTarget[] = defaultReachabilityStarts(room),
): ReachabilityTarget[] {
  const reachable = reachableCells(room, starts);
  return targets.filter((target) => !reachable.has(keyOf(target)));
}

export function defaultReachabilityStarts(room: RoomSnapshot): ReachabilityTarget[] {
  const starts: ReachabilityTarget[] = [];
  const height = room.layout.length;
  const width = room.layout[0]?.length ?? 0;
  for (let x = 0; x < width; x += 1) {
    pushIfWalkable(room, starts, x, 0, 'north edge');
    pushIfWalkable(room, starts, x, height - 1, 'south edge');
  }
  for (let y = 0; y < height; y += 1) {
    pushIfWalkable(room, starts, 0, y, 'west edge');
    pushIfWalkable(room, starts, width - 1, y, 'east edge');
  }
  if (starts.length > 0) {
    return starts;
  }
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (isTownWalkable(room.layout[y]?.[x])) {
        return [{ x, y, label: 'first walkable tile' }];
      }
    }
  }
  return [];
}

export function isTownWalkable(tile: string | undefined): boolean {
  return Boolean(tile && tile !== '~' && !isSolidTile(tile) && !isBlockingTownTile(tile));
}

function reachableCells(
  room: RoomSnapshot,
  starts: readonly ReachabilityTarget[],
): ReadonlySet<string> {
  const queue = starts.filter((start) => isTownWalkable(room.layout[start.y]?.[start.x]));
  const seen = new Set(queue.map(keyOf));
  for (let index = 0; index < queue.length; index += 1) {
    const current = queue[index]!;
    for (const direction of [
      { x: 1, y: 0 },
      { x: -1, y: 0 },
      { x: 0, y: 1 },
      { x: 0, y: -1 },
    ]) {
      const next = { x: current.x + direction.x, y: current.y + direction.y };
      const key = keyOf(next);
      if (seen.has(key) || !isTownWalkable(room.layout[next.y]?.[next.x])) {
        continue;
      }
      seen.add(key);
      queue.push({ ...next, label: key });
    }
  }
  return seen;
}

function pushIfWalkable(
  room: RoomSnapshot,
  starts: ReachabilityTarget[],
  x: number,
  y: number,
  label: string,
): void {
  if (isTownWalkable(room.layout[y]?.[x])) {
    starts.push({ x, y, label });
  }
}

function roomWidth(rooms: readonly RoomSnapshot[]): number {
  return Math.max(0, ...rooms.map((room) => room.layout[0]?.length ?? 0));
}

function keyOf(point: { x: number; y: number }): string {
  return `${point.x},${point.y}`;
}

function parseRoomId(roomId: string): [number, number, number] | undefined {
  const parts = roomId.split(',').map(Number);
  if (parts.length !== 3 || parts.some((part) => !Number.isFinite(part))) {
    return undefined;
  }
  return [parts[0]!, parts[1]!, parts[2]!];
}
