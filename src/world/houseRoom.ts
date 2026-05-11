import type { GridConfig } from '../config/gameConfig.js';
import type { RoomSnapshot } from './types.js';
import { createBiomePalette } from './biomes.js';

// Creates a calm, open "house" room layout that we can decorate.
// Layout uses '.' for floor. Decorations will use custom letters and are non-colliding.
export function createHouseRoom(roomId: string, grid: GridConfig): RoomSnapshot {
  const cols = grid.cols;
  const rows = grid.rows;
  const layout: string[] = [];

  // Soft, slightly brighter background for a cozy vibe
  const palette = createBiomePalette(roomId);

  // Start with open floor (.)
  for (let y = 0; y < rows; y++) layout.push('.'.repeat(cols));

  // Base cozy cube centered in the room; interior = 'W' wood, border walls '#'
  const baseWidth = Math.min(14, Math.max(10, Math.floor(cols * 0.45)));
  const baseHeight = Math.min(10, Math.max(8, Math.floor(rows * 0.42)));
  const left = Math.floor(cols / 2 - baseWidth / 2);
  const top = Math.floor(rows / 2 - baseHeight / 2);
  drawHouseCube(layout, left, top, baseWidth, baseHeight);
  carveHouseDoor(layout, left, top, baseWidth, baseHeight);

  return {
    id: roomId,
    layout,
    portals: [],
    biomeId: palette.biomeId,
    biomeTitle: palette.biomeTitle,
    backgroundColor: palette.backgroundColor,
    wallColor: palette.wallColor,
    wallOutlineColor: palette.wallOutlineColor,
  };
}

function setChar(layout: string[], x: number, y: number, ch: string): void {
  const row = layout[y];
  if (!row) return;
  const chars = row.split('');
  if (x < 0 || x >= chars.length) return;
  chars[x] = ch;
  layout[y] = chars.join('');
}

export function drawHouseCube(
  layout: string[],
  left: number,
  top: number,
  width: number,
  height: number,
) {
  const right = left + width - 1;
  const bottom = top + height - 1;
  for (let y = top; y <= bottom; y++) {
    for (let x = left; x <= right; x++) {
      const isBorder = x === left || x === right || y === top || y === bottom;
      setChar(layout, x, y, isBorder ? '#' : 'W');
    }
  }
}

// Carve a small doorway in the south wall and place a rug just inside
export function carveHouseDoor(
  layout: string[],
  left: number,
  top: number,
  width: number,
  height: number,
) {
  const bottom = top + height - 1;
  const cx = Math.floor(left + width / 2);
  const doorHalf = Math.max(1, Math.floor(Math.min(3, Math.floor(width / 6)) / 2));
  for (let x = cx - doorHalf; x <= cx + doorHalf; x++) {
    setChar(layout, x, bottom, '.'); // open doorway
    // rug one tile inside
    if (bottom - 1 > top) setChar(layout, x, bottom - 1, 'E');
  }
  // Add a trim/frame inside the doorway (two rows up)
  const trimY = Math.max(top + 1, bottom - 2);
  for (let x = cx - doorHalf; x <= cx + doorHalf; x++) {
    setChar(layout, x, trimY, 'T');
  }
}
