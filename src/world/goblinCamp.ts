import type { GridConfig } from '../config/gameConfig.js';
import type { RandomGenerator } from '../core/rng.js';
import { pickNpcName } from '../npcs/npcNames.js';
import { createHumanoidSpawn } from './humanoidSpawn.js';
import { fillRect, placeCampScaffold, pickOne, setTile } from './structurePlacement.js';
import type { RoomSnapshot } from './types.js';

const CAMP_NAMES = [
  'Ledgerbite Camp',
  'The Bad Contract',
  'Muckstamp Hollow',
  'Needletooth Rest',
  'The Green Notary',
] as const;

function drawTent(layout: string[][], left: number, top: number): void {
  setTile(layout, left + 1, top, 'T');
  fillRect(layout, left, top + 1, 3, 2, 'S');
  setTile(layout, left + 1, top + 2, '.');
}

function randomName(rng: RandomGenerator): string {
  return pickNpcName('goblin', rng);
}

export function tryPlaceGoblinCamp(
  layout: string[][],
  grid: GridConfig,
  rng: RandomGenerator,
  options: { forbiddenCells?: ReadonlySet<string>; margin?: number } = {},
): NonNullable<RoomSnapshot['goblinCamp']> | null {
  const scaffold = placeCampScaffold(layout, grid, rng, options);
  if (!scaffold) return null;

  scaffold.tents.forEach((tent) => drawTent(layout, tent.x, tent.y));
  scaffold.fires.forEach((fire) => setTile(layout, fire.x, fire.y, 'L'));
  setTile(layout, scaffold.leaderSpot.x, scaffold.leaderSpot.y, 'G');
  scaffold.guardSpots.forEach((spot) => setTile(layout, spot.x, spot.y, 'G'));

  return {
    id: `goblin-camp:${scaffold.camp.left},${scaffold.camp.top}`,
    name: pickOne(CAMP_NAMES, rng),
    center: scaffold.center,
    safeArea: scaffold.safeArea,
    tents: scaffold.tents,
    fires: scaffold.fires,
    guards: scaffold.guardSpots.map((spot) =>
      createHumanoidSpawn(randomName(rng), spot.x, spot.y, 'sage-2'),
    ),
    shopkeeper: createHumanoidSpawn(
      `${randomName(rng)} the Clerk`,
      scaffold.leaderSpot.x,
      scaffold.leaderSpot.y,
      'sage-1',
    ),
  };
}
