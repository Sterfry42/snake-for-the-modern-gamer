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
  const variation = ((x * 17 + y * 31) % 7) - 3;
  if (tile === '~') {
    return { color: shiftColor(room.biomeId === 'sunken-ocean' ? 0x1d5f8f : 0x2d7fb8, variation) };
  }
  if (room.biomeId === 'mosaic-coast') {
    return { color: resolveMosaicCoastFloor(tile, x, y) };
  }
  if (room.biomeId === 'liberty-badlands') {
    return { color: resolveLibertyFloor(tile, x, y) };
  }
  if (tile === 'O') {
    return { color: shiftColor(0x236b88, variation) };
  }
  if (tile === 'H') {
    return { color: 0x3c2a1d };
  }
  if (tile === 'V' || tile === 'Q') {
    return { color: 0x263024 };
  }
  if (tile === 'X') {
    return { color: 0x241a30 };
  }
  if ('WETCKBPLZ'.includes(tile ?? '')) {
    return { color: shiftColor(0x6b4a2f, variation) };
  }
  if (tile === 'S') {
    return { color: (x + y) % 2 === 0 ? 0xc7433d : 0xffe0a3 };
  }
  if (tile === 'A') {
    return { color: 0xa56a3b };
  }
  if (tile === 'D' || tile === 'N' || tile === 'U' || tile === 'Y') {
    return { color: 0x7f5635 };
  }
  if ('dthjuxoMRFP'.includes(tile ?? '')) {
    return { color: 0x5d4636 };
  }
  if (tile === 'G') {
    return { color: 0x5c8a58 };
  }
  if (tile === 'R') {
    return { color: 0x8a4b2a };
  }
  if (tile === 'Z') {
    return { color: 0x24142f };
  }
  return { color: shiftColor(room.backgroundColor, variation) };
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
    color: resolveWallColor(room, tile, x, y),
    alpha: 1,
    textureKey: undefined,
  };
}

export function resolveWallOutlineColor(room: RoomSnapshot): number {
  return room.wallOutlineColor ?? darkenColor(room.wallColor, 0.35);
}

function resolveWallColor(
  room: RoomSnapshot,
  tile: string | undefined,
  x: number,
  y: number,
): number {
  if (tile === '%') return 0x8a5a2f;
  if (room.biomeId === 'mosaic-coast')
    return darkenColor(resolveMosaicCoastFloor(tile, x, y), 0.18);
  if (room.biomeId === 'liberty-badlands')
    return darkenColor(resolveLibertyFloor(tile, x, y), 0.22);
  if (tile === 'S') return (x + y) % 2 === 0 ? 0xc7433d : 0xffe0a3;
  if (tile === 'Z') return 0x17202b;
  if (tile === 'D' || tile === 'N' || tile === 'U' || tile === 'Y') return 0x7f5635;
  if (tile === 'V' || tile === 'Q' || tile === 'X') return 0x2c2f3a;
  return room.wallColor;
}

function resolveMosaicCoastFloor(tile: string | undefined, x: number, y: number): number {
  if (tile === 'M') return (x + y) % 3 === 0 ? 0x2f8fbd : (x + y) % 3 === 1 ? 0xf0c15a : 0xf4fbff;
  if (tile === 'a') return x % 2 === 0 ? 0x206fa3 : 0xd96a44;
  if (tile === 'b') return 0x486982;
  if (tile === 'p') return 0x8b5b3c;
  if (tile === 't') return 0xd96a44;
  if (tile === 'f' || tile === 'F') return 0x2f8fbd;
  if (tile === 'i') return 0xf4fbff;
  if (tile === 'G') return 0x2f9e44;
  if (tile === 'r') return 0xd9ccb6;
  return (x * 17 + y * 7) % 11 === 0 ? 0xeadfc9 : 0xf2e8d6;
}

function resolveLibertyFloor(tile: string | undefined, x: number, y: number): number {
  switch (tile) {
    case 'A':
    case 'E':
      return 0xb5362f;
    case 'F':
    case 'G':
      return 0x2f5f48;
    case 'L':
    case 'N':
    case 'P':
      return 0x424a54;
    case 'M':
      return x % 2 === 0 ? 0xe8e2d4 : 0xb5362f;
    case 'O':
      return 0x274c77;
    case 'W':
      return 0x8a5a2f;
    default:
      return (x + y) % 4 === 0 ? 0xc9b18a : 0xd6c09a;
  }
}

function shiftColor(color: number, amount: number): number {
  const adjust = (channel: number) => Math.max(0, Math.min(255, channel + amount));
  return (
    (adjust((color >> 16) & 0xff) << 16) | (adjust((color >> 8) & 0xff) << 8) | adjust(color & 0xff)
  );
}
