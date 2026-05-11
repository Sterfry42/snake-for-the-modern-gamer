import { createBiomePalette, getBiomeForRoom, type BiomeDefinition } from '../biomes.js';
import type { RoomGenerationPalette } from './types.js';

export interface BiomeMap {
  getBiomeForRoomId(roomId: string): BiomeDefinition;
  createPalette(roomId: string): RoomGenerationPalette;
}

export class CoordinateBiomeMap implements BiomeMap {
  getBiomeForRoomId(roomId: string): BiomeDefinition {
    return getBiomeForRoom(roomId);
  }

  createPalette(roomId: string): RoomGenerationPalette {
    return createBiomePalette(roomId);
  }
}
