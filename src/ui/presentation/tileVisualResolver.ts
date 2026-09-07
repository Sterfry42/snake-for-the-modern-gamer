import { darkenColor } from '../../config/palette.js';
import type { RoomSnapshot } from '../../world/types.js';
import { isSolidTile } from '../../world/tiles.js';
import type { RenderTile, SurfaceVisual } from './worldRenderScene.js';

export function resolveRenderTile(
  room: RoomSnapshot,
  tile: string | undefined,
  x: number,
  y: number,
): RenderTile {
  const floor = resolveFloorVisual(room, tile, x, y);
  const wall = resolveWallVisual(room, tile, x, y);
  return {
    x,
    y,
    floor,
    wall: wall ?? undefined,
    occludesVision: Boolean(wall),
    tile,
  };
}

export function resolveFloorVisual(
  room: RoomSnapshot,
  tile: string | undefined,
  x: number,
  y: number,
): SurfaceVisual {
  void x;
  void y;
  if (tile === '~') {
    return { color: 0x2d7fb8 };
  }
  if ('WETCKBPLZ'.includes(tile ?? '')) {
    return { color: 0x6b4a2f };
  }
  return { color: room.backgroundColor };
}

export function resolveWallVisual(
  room: RoomSnapshot,
  tile: string | undefined,
  x: number,
  y: number,
): SurfaceVisual | null {
  void x;
  void y;
  if (!isSolidTile(tile)) {
    return null;
  }
  return {
    color: room.wallColor,
    alpha: 1,
    textureKey: undefined,
  };
}

export function resolveWallOutlineColor(room: RoomSnapshot): number {
  return room.wallOutlineColor ?? darkenColor(room.wallColor, 0.35);
}
