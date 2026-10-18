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
  const emptyRow = ''.padEnd(roomWidth(rooms), ' ');
  const emptyRoom = Array.from({ length: roomHeight }, () => emptyRow);
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
  const { cells, width, height } = reachableCells(room, starts);
  return targets.filter(
    (target) =>
      !Number.isInteger(target.x) ||
      !Number.isInteger(target.y) ||
      target.x < 0 ||
      target.y < 0 ||
      target.x >= width ||
      target.y >= height ||
      cells[target.y * width + target.x] !== 1,
  );
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
): { cells: Uint8Array; width: number; height: number } {
  // Capture proxy-backed room geometry once instead of re-reading it for every edge.
  const layout = Array.from(room.layout);
  const width = Math.max(0, ...layout.map((row) => row.length));
  const height = layout.length;
  const walkable = new Uint8Array(width * height);
  const seen = new Uint8Array(width * height);
  for (let y = 0; y < height; y += 1) {
    const row = layout[y];
    for (let x = 0; x < row.length; x += 1) {
      if (isTownWalkable(row[x])) walkable[y * width + x] = 1;
    }
  }
  const queue: number[] = [];
  const visit = (key: number): void => {
    if (walkable[key] !== 1 || seen[key] === 1) return;
    seen[key] = 1;
    queue.push(key);
  };
  for (const start of starts) {
    if (
      Number.isInteger(start.x) &&
      Number.isInteger(start.y) &&
      start.x >= 0 &&
      start.x < width &&
      start.y >= 0 &&
      start.y < height
    ) {
      visit(start.y * width + start.x);
    }
  }
  for (let index = 0; index < queue.length; index += 1) {
    const current = queue[index];
    const x = current % width;
    if (x > 0) visit(current - 1);
    if (x + 1 < width) visit(current + 1);
    if (current >= width) visit(current - width);
    if (current + width < walkable.length) visit(current + width);
  }
  return { cells: seen, width, height };
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

function parseRoomId(roomId: string): [number, number, number] | undefined {
  const parts = roomId.split(',').map(Number);
  if (parts.length !== 3 || parts.some((part) => !Number.isFinite(part))) {
    return undefined;
  }
  return [parts[0]!, parts[1]!, parts[2]!];
}
