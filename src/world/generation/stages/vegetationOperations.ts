import type { RoomGenerationContext } from '../types.js';
import { getBiomeDefinition } from '../../biomes.js';
import { hashWorldCoordinate, hashChance } from '../worldHash.js';
import { vectorKey } from '../../../core/math.js';
import type { VegetationType } from '../../types.js';

export const ALL_VEGETATION_VARIANTS: readonly VegetationType[] = [
  'grass-1', 'grass-2', 'grass-3', 'grass-4', 'grass-5',
  'flower-1', 'flower-2', 'flower-3', 'flower-4', 'flower-5',
  'bush-1', 'bush-2', 'bush-3', 'bush-4', 'bush-5',
  'mushroom-1', 'mushroom-2', 'mushroom-3', 'mushroom-4', 'mushroom-5',
  'vine-1', 'vine-2', 'vine-3', 'vine-4', 'vine-5',
  'rock-1', 'rock-2', 'rock-3', 'rock-4', 'rock-5',
  'tree-1', 'tree-2', 'tree-3', 'tree-4', 'tree-5',
  'decor-1', 'decor-2', 'decor-3', 'decor-4', 'decor-5',
] as const;

export class VegetationOperations {
  place(context: RoomGenerationContext): void {
    const VEG = context.vegetation;
    VEG.length = 0;

    // Exclusion: town rooms (membership or adjacency)
    if (context.townMembership || context.townAdjacency) return;

    // Exclusion: elderwood-maze (has its own tree tile rendering)
    // Exclusion: sunken-ocean (water tiles throughout)
    const biomeId = context.palette.biomeId;
    if (biomeId === 'elderwood-maze' || biomeId === 'sunken-ocean') return;

    // Get density from biome definition
    const biome = getBiomeDefinition(biomeId);
    const density = biome.vegetationDensity ?? 10;
    if (density <= 0) return;

    const MAX_VEG = 32;
    const { cols, rows } = context.grid;
    const margin = 1;

    // Guard against tiny rooms
    const validCols = cols - 2 * margin;
    const validRows = rows - 2 * margin;
    if (validCols <= 0 || validRows <= 0) return;

    // Parse room coordinates for deterministic hashing
    const roomIdParts = context.roomId.split(',').map(Number);
    const roomX = roomIdParts[0] ?? 0;
    const roomY = roomIdParts[1] ?? 0;
    const roomZ = roomIdParts[2] ?? 0;

    for (let y = margin; y < margin + validRows && VEG.length < MAX_VEG; y++) {
      for (let x = margin; x < margin + validCols && VEG.length < MAX_VEG; x++) {
        if (context.layout[y]?.[x] !== '.') continue;
        if (context.spawnGuard?.protected?.has(vectorKey({ x, y }))) continue;
        if (context.protectedCells?.has(vectorKey({ x, y }))) continue;

        const hash = hashWorldCoordinate({
          x: roomX, y: roomY, z: roomZ,
          salt: 2001,
          featureSalt: x * 1000 + y,
        });

        if (hashChance(hash, density)) {
          const variantIdx = hash % ALL_VEGETATION_VARIANTS.length;
          VEG.push({ x, y, variant: ALL_VEGETATION_VARIANTS[variantIdx] });
        }
      }
    }
  }
}
