import { chooseDigSiteVariant } from '../archaeology/molemanArchaeology.js';
import type { GridConfig } from '../config/gameConfig.js';
import type { RandomGenerator } from '../core/rng.js';
import { createHumanoidSpawn } from './humanoidSpawn.js';
import {
  fillRect,
  placeRectWithFallback,
  pickOne,
  setTile,
  type StructureBounds,
} from './structurePlacement.js';
import type { RoomSnapshot } from './types.js';

const FOREMAN_NAMES = [
  'Foreman Grub',
  'Foreman Nib',
  'Foreman Toma',
  'Foreman Rusk',
  'Foreman Peb',
] as const;

export function tryPlaceMolemanDigSite(
  layout: string[][],
  grid: GridConfig,
  rng: RandomGenerator,
  options: { forbiddenCells?: ReadonlySet<string>; margin?: number; biomeId?: string } = {},
): NonNullable<RoomSnapshot['molemanDigSite']> | null {
  const width = 12;
  const height = 9;
  const bounds = placeRectWithFallback(layout, grid, width, height, rng, {
    forbiddenCells: options.forbiddenCells,
    margin: options.margin ?? 4,
  });
  if (!bounds) return null;

  stampDigSite(layout, bounds);
  const variant = chooseDigSiteVariant(options.biomeId ?? '', rng);
  const foremanX = bounds.left + Math.floor(width / 2);
  const foremanY = bounds.top + height - 3;

  return {
    id: `dig:${bounds.left},${bounds.top}`,
    name: `${variant.i18nNameKey} Site`,
    variantId: variant.id,
    foreman: {
      ...createHumanoidSpawn(pickOne(FOREMAN_NAMES, rng), foremanX, foremanY, 'moleman-foreman'),
      id: `moleman-foreman-${bounds.left}-${bounds.top}`,
    },
    bounds,
    pit: { x: bounds.left + Math.floor(width / 2), y: bounds.top + 3 },
  };
}

function stampDigSite(layout: string[][], bounds: StructureBounds): void {
  const { left, top, width, height } = bounds;
  const centerX = left + Math.floor(width / 2);
  const foremanY = top + height - 3;
  fillRect(layout, left, top, width, height, 'E');

  for (let y = top + 1; y < top + height - 1; y += 1) {
    const inset = Math.min(3, Math.abs(foremanY - y));
    for (let x = left + inset; x < left + width - inset; x += 1) {
      setTile(layout, x, y, y % 2 === 0 ? 'W' : 'T');
    }
  }

  for (let y = top + 2; y <= top + 4; y += 1) {
    for (let x = centerX - 3; x <= centerX + 3; x += 1) {
      setTile(layout, x, y, y === top + 3 ? (x % 2 === 0 ? 'C' : 'K') : 'W');
    }
  }

  fillRect(layout, centerX - 1, top + 3, 3, 2, 'D');

  const decorTiles: Array<readonly [number, number, string]> = [
    [left + 1, top + 1, 'L'],
    [left + width - 2, top + 1, 'L'],
    [left + 1, top + height - 2, 'C'],
    [left + width - 2, top + height - 2, 'K'],
    [left + 3, top + height - 1, 'T'],
    [left + width - 4, top, 'T'],
  ];
  for (const [x, y, tile] of decorTiles) setTile(layout, x, y, tile);

  fillRect(layout, centerX - 2, foremanY - 1, 5, 3, 'E');
  setTile(layout, centerX - 3, foremanY, 'T');
  setTile(layout, centerX + 3, foremanY, 'T');
  setTile(layout, centerX - 3, foremanY + 1, 'W');
  setTile(layout, centerX + 3, foremanY + 1, 'W');
}
