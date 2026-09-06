import type { GridConfig } from '../config/gameConfig.js';
import type { RandomGenerator } from '../core/rng.js';
import { createHumanoidIdentity } from './humanoidSpawn.js';
import {
  fillRect,
  findRandomRectPlacement,
  pickOne,
  setTile,
} from './structurePlacement.js';
import type { RoomSnapshot } from './types.js';

const FIREWORK_STAND_NAMES = [
  'Big Boom Barn',
  'Liberty Sparks',
  "Dale's Discount Explosions",
  'Bottle Rocket Chapel',
  'The Responsible Pyromancer',
  'Roman Candle Ranch',
] as const;

const FIREWORK_VENDOR_NAMES = [
  'Firework Dale',
  'Roman Candle Randy',
  'Boom-Boom Marlene',
  'Legal Terry',
  'Sparkler Sue',
  'Bottle Rocket Bobby',
] as const;
const FIREWORK_INSPECTOR_NAMES = [
  'Inspector June',
  'Clipboard Carl',
  'Safety Marlene',
  'Permit Hank',
] as const;

interface PlacementOptions {
  forbiddenCells?: ReadonlySet<string>;
  margin?: number;
}

export function tryPlaceFireworkStand(
  layout: string[][],
  grid: GridConfig,
  rng: RandomGenerator,
  options: PlacementOptions = {},
): NonNullable<RoomSnapshot['fireworkStand']> | null {
  if (grid.cols < 18 || grid.rows < 14) return null;

  const width = 12;
  const height = 7;
  const area = findRandomRectPlacement(layout, grid, rng, {
    width,
    height,
    margin: options.margin ?? 5,
    attempts: 24,
    forbiddenCells: options.forbiddenCells,
  });
  if (!area) return null;

  fillRect(layout, area.left, area.top, width, height, 'E');
  fillRect(layout, area.left + 1, area.top + 1, width - 2, 1, 'N');
  fillRect(layout, area.left + 2, area.top + 2, 6, 3, 'F');
  fillRect(layout, area.left + 2, area.top + 5, 3, 1, 'P');
  fillRect(layout, area.left + 5, area.top + 5, 3, 1, 'W');
  setTile(layout, area.left + 3, area.top + 1, 'N');
  setTile(layout, area.left + 9, area.top + 2, 'L');
  setTile(layout, area.left + 9, area.top + 4, 'P');
  setTile(layout, area.left + 10, area.top + 5, 'L');

  const vendorX = area.left + 8;
  const vendorY = area.top + 4;
  const inspectorX = area.left + 10;
  const inspectorY = area.top + 3;
  setTile(layout, vendorX, vendorY, 'G');
  setTile(layout, inspectorX, inspectorY, 'G');

  return {
    vendor: {
      ...createHumanoidIdentity(pickOne(FIREWORK_VENDOR_NAMES, rng), 'sage-1'),
      x: vendorX,
      y: vendorY,
    },
    inspector: {
      ...createHumanoidIdentity(pickOne(FIREWORK_INSPECTOR_NAMES, rng), 'sage-2'),
      x: inspectorX,
      y: inspectorY,
    },
    sellsFireworks: true,
    standName: pickOne(FIREWORK_STAND_NAMES, rng),
  };
}
