import { hashString } from './worldHash.js';

export interface WorldGenerationIdentity {
  seed: string;
  worldSalt: number;
  biomeSalt: number;
  riverSalt: number;
  barrierSalt: number;
  structureSalt: number;
  townSalt: number;
}

export function createWorldGenerationIdentity(seed = 'default-world'): WorldGenerationIdentity {
  const normalizedSeed = seed.trim() || 'default-world';
  const salt = (label: string) => hashString(`${normalizedSeed}:${label}`);
  return {
    seed: normalizedSeed,
    worldSalt: salt('world'),
    biomeSalt: salt('biome'),
    riverSalt: salt('river'),
    barrierSalt: salt('barrier'),
    structureSalt: salt('structure'),
    townSalt: salt('town'),
  };
}
