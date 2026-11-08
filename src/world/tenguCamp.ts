import type { GridConfig } from '../config/gameConfig.js';
import type { Vector2Like } from '../core/math.js';
import type { RandomGenerator } from '../core/rng.js';
import { createHumanoidSpawn } from './humanoidSpawn.js';
import { fillRect, placeCampScaffold, pickOne, setTile } from './structurePlacement.js';
import type { RoomSnapshot } from './types.js';

const TENGU_NAMES = [
  'Karasu',
  'Tengu no Yashiro',
  'Soba',
  'Kuro',
  'Beni',
  'Yamabiko',
  'Kamui',
] as const;

export function tryPlaceTenguCamp(
  layout: string[][],
  grid: GridConfig,
  rng: RandomGenerator,
  options: { forbiddenCells?: ReadonlySet<string>; margin?: number } = {},
): NonNullable<RoomSnapshot['tenguCamp']> | null {
  const scaffold = placeCampScaffold(layout, grid, rng, options);
  if (!scaffold) return null;

  const feathers: Vector2Like[] = [];
  scaffold.tents.forEach((tent) => {
    setTile(layout, tent.x + 1, tent.y, 'M');
    fillRect(layout, tent.x, tent.y + 1, 3, 2, 'M');
    setTile(layout, tent.x + 1, tent.y + 2, '.');
    feathers.push({ x: tent.x + 1, y: tent.y - 1 });
  });

  scaffold.fires.forEach((fire) => setTile(layout, fire.x, fire.y, 'L'));
  setTile(layout, scaffold.leaderSpot.x, scaffold.leaderSpot.y, 'G');
  scaffold.guardSpots.forEach((spot) => setTile(layout, spot.x, spot.y, 'G'));

  return {
    chieftain: createHumanoidSpawn(
      `${pickOne(TENGU_NAMES, rng)} the Elder`,
      scaffold.leaderSpot.x,
      scaffold.leaderSpot.y,
      'sage-2',
    ),
    feathers,
  };
}
