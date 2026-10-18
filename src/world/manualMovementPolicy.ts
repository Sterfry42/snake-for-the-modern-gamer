import type { GridConfig } from '../config/gameConfig.js';
import type { Vector2Like } from '../core/math.js';
import type { RoomSnapshot } from './types.js';
import { parseCoordinateRoomId } from './roomAddress.js';

/** Shared player movement policy. This never decides whether world clocks run. */
export function isManualMovementArea(
  room: RoomSnapshot,
  head: Vector2Like,
  grid: GridConfig,
): boolean {
  const coordinate = parseCoordinateRoomId(room.id);
  const local = {
    x: head.x - (coordinate?.x ?? 0) * grid.cols,
    y: head.y - (coordinate?.y ?? 0) * grid.rows,
  };
  const tile = room.layout[local.y]?.[local.x];
  if (!tile || tile === '#') return false;
  const bounds =
    room.village?.safeArea ??
    room.goblinCamp?.safeArea ??
    room.snakeMcDonalds?.bounds ??
    (room.town ? { left: 0, top: 0, width: grid.cols, height: grid.rows } : undefined) ??
    room.molemanDigSite?.bounds ??
    room.garage?.bounds;
  if (bounds)
    return (
      local.x >= bounds.left &&
      local.y >= bounds.top &&
      local.x < bounds.left + bounds.width &&
      local.y < bounds.top + bounds.height
    );
  if (room.bulletTrainStation) {
    const station = room.bulletTrainStation;
    const points = [
      { x: station.entranceX - 4, y: station.entranceY - 2 },
      { x: station.entranceX + 4, y: station.entranceY + 2 },
      ...station.decorations,
    ];
    const xs = points.map((point) => point.x);
    const ys = points.map((point) => point.y);
    return (
      local.x >= Math.min(...xs) &&
      local.x <= Math.max(...xs) &&
      local.y >= Math.min(...ys) &&
      local.y <= Math.max(...ys)
    );
  }
  const tags =
    room.allNiteDiner ||
    room.fireworkStand ||
    room.roadsideMonument ||
    room.jackalopeLodge ||
    room.gridironYard
      ? 'AELMNPRWFG'
      : room.questGiver
        ? 'WETG'
        : room.snakeCanes
          ? 'WETVK'
          : 'WETCKBPLDRZ';
  if (
    !room.allNiteDiner &&
    !room.fireworkStand &&
    !room.roadsideMonument &&
    !room.jackalopeLodge &&
    !room.gridironYard &&
    !room.questGiver &&
    !room.snakeCanes &&
    !tags.includes(tile)
  )
    return false;
  const points = room.layout.flatMap((row, y) =>
    [...row].flatMap((value, x) => (tags.includes(value) ? [{ x, y }] : [])),
  );
  return (
    points.length > 0 &&
    local.x >= Math.min(...points.map((point) => point.x)) &&
    local.x <= Math.max(...points.map((point) => point.x)) &&
    local.y >= Math.min(...points.map((point) => point.y)) &&
    local.y <= Math.max(...points.map((point) => point.y))
  );
}
