import type { RoomGenerationContext } from '../types.js';
import { biomeCountsAs, getBiomeDefinition } from '../../biomes.js';
import { hashWorldCoordinate, hashChance } from '../worldHash.js';
import { vectorKey } from '../../../core/math.js';
import type { VegetationType } from '../../types.js';

export const ALL_VEGETATION_VARIANTS: readonly VegetationType[] = [
  'grass-1',
  'grass-2',
  'grass-3',
  'grass-4',
  'grass-5',
  'flower-1',
  'flower-2',
  'flower-3',
  'flower-4',
  'flower-5',
  'bush-1',
  'bush-2',
  'bush-3',
  'bush-4',
  'bush-5',
  'mushroom-1',
  'mushroom-2',
  'mushroom-3',
  'mushroom-4',
  'mushroom-5',
  'vine-1',
  'vine-2',
  'vine-3',
  'vine-4',
  'vine-5',
  'rock-1',
  'rock-2',
  'rock-3',
  'rock-4',
  'rock-5',
  'tree-1',
  'tree-2',
  'tree-3',
  'tree-4',
  'tree-5',
  'decor-1',
  'decor-2',
  'decor-3',
  'decor-4',
  'decor-5',
  'cactus-1',
  'cactus-2',
  'cactus-3',
  'cactus-4',
  'cactus-5',
] as const;

export function placeVegetation(context: RoomGenerationContext): void {
  const vegetation = context.vegetation;
  vegetation.length = 0;

  if (context.townMembership || context.townAdjacency) return;

  const biomeId = context.palette.biomeId;
  if (biomeId === 'elderwood-maze' || biomeCountsAs(biomeId, 'ocean')) return;

  const biome = getBiomeDefinition(biomeId);
  const density = biome.vegetationDensity ?? 10;
  if (density <= 0) return;

  const maxVegetation = 32;
  const { cols, rows } = context.grid;
  const margin = 1;
  const validCols = cols - 2 * margin;
  const validRows = rows - 2 * margin;
  if (validCols <= 0 || validRows <= 0) return;

  const roomIdParts = context.roomId.split(',').map(Number);
  const roomX = roomIdParts[0] ?? 0;
  const roomY = roomIdParts[1] ?? 0;
  const roomZ = roomIdParts[2] ?? 0;

  for (let y = margin; y < margin + validRows && vegetation.length < maxVegetation; y++) {
    for (let x = margin; x < margin + validCols && vegetation.length < maxVegetation; x++) {
      if (context.layout[y]?.[x] !== '.') continue;
      if (context.spawnGuard?.protected?.has(vectorKey({ x, y }))) continue;
      if (context.protectedCells?.has(vectorKey({ x, y }))) continue;

      const hash = hashWorldCoordinate({
        x: roomX,
        y: roomY,
        z: roomZ,
        salt: 2001,
        featureSalt: x * 1000 + y,
      });

      if (hashChance(hash, density)) {
        const variantIdx = hash % ALL_VEGETATION_VARIANTS.length;
        vegetation.push({ x, y, variant: ALL_VEGETATION_VARIANTS[variantIdx] });
      }
    }
  }
}
