import type { GridConfig } from '../config/gameConfig.js';
import type { RandomGenerator } from '../core/rng.js';
import { vectorKey } from '../core/math.js';
import type { DigSiteVariantId } from '../archaeology/molemanArchaeology.js';
import { chooseDigSiteVariant } from '../archaeology/molemanArchaeology.js';
import type { RoomSnapshot } from './types.js';

interface PlacementOptions {
  forbiddenCells?: ReadonlySet<string>;
  margin?: number;
  biomeId?: string;
}

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
  options: PlacementOptions = {},
): NonNullable<RoomSnapshot['molemanDigSite']> | null {
  const width = 12;
  const height = 9;
  const margin = options.margin ?? 4;
  for (let attempt = 0; attempt < 80; attempt += 1) {
    const left = randomIntInRange(rng, margin, Math.max(margin + 1, grid.cols - width - margin));
    const top = randomIntInRange(rng, margin, Math.max(margin + 1, grid.rows - height - margin));
    if (!canPlace(layout, left, top, width, height, options.forbiddenCells)) {
      continue;
    }
    stampDigSite(layout, left, top, width, height);
    const variant = chooseDigSiteVariant(options.biomeId ?? '', rng);
    return {
      id: `dig:${left},${top}`,
      name: `${variant.i18nNameKey} Site`,
      variantId: variant.id,
      foreman: {
        id: `moleman-foreman-${left}-${top}`,
        name: FOREMAN_NAMES[Math.floor(rng() * FOREMAN_NAMES.length)]!,
        role: 'house',
        encounterType: 'flavor',
        portraitId: 'moleman-foreman',
        stats: { str: 7, dex: 4, con: 8, int: 5, wis: 6, cha: 5 },
        maxHearts: 5,
        x: left + Math.floor(width / 2),
        y: top + height - 3,
      },
      bounds: { left, top, width, height },
      pit: { x: left + Math.floor(width / 2), y: top + 3 },
    };
  }
  return null;
}

function canPlace(
  layout: string[][],
  left: number,
  top: number,
  width: number,
  height: number,
  forbiddenCells?: ReadonlySet<string>,
): boolean {
  for (let y = top - 1; y <= top + height; y += 1) {
    for (let x = left - 1; x <= left + width; x += 1) {
      if (forbiddenCells?.has(vectorKey({ x, y }))) return false;
      const tile = layout[y]?.[x];
      if (tile === undefined || tile !== '.') return false;
    }
  }
  return true;
}

function stampDigSite(
  layout: string[][],
  left: number,
  top: number,
  width: number,
  height: number,
): void {
  const centerX = left + Math.floor(width / 2);
  for (let y = top; y < top + height; y += 1) {
    for (let x = left; x < left + width; x += 1) {
      layout[y]![x] = '.';
    }
  }
  for (let x = left + 2; x < left + width - 2; x += 1) {
    layout[top + 2]![x] = 'W';
    layout[top + 3]![x] = x % 2 === 0 ? 'C' : 'K';
    layout[top + 4]![x] = 'W';
  }
  for (let x = centerX - 2; x <= centerX + 2; x += 1) {
    layout[top + 1]![x] = 'T';
  }
  layout[top + 3]![centerX - 1] = 'D';
  layout[top + 3]![centerX] = 'D';
  layout[top + 3]![centerX + 1] = 'D';
  layout[top + 4]![centerX - 1] = 'D';
  layout[top + 4]![centerX] = 'D';
  layout[top + 4]![centerX + 1] = 'D';

  const rockTiles: Array<readonly [number, number]> = [
    [left + 1, top + 1],
    [left + width - 2, top + 1],
    [left + 1, top + height - 2],
    [left + width - 2, top + height - 2],
    [left + 3, top + height - 1],
    [left + width - 4, top],
  ];
  for (const [x, y] of rockTiles) {
    layout[y]![x] = '#';
  }

  layout[top + height - 3]![centerX - 2] = 'T';
  layout[top + height - 3]![centerX - 1] = 'T';
  layout[top + height - 3]![centerX + 1] = 'T';
  layout[top + height - 3]![centerX + 2] = 'T';
  layout[top + height - 2]![centerX - 3] = 'W';
  layout[top + height - 2]![centerX + 3] = 'W';
}

function randomIntInRange(
  rng: RandomGenerator,
  minInclusive: number,
  maxExclusive: number,
): number {
  return minInclusive + Math.floor(rng() * Math.max(1, maxExclusive - minInclusive));
}
