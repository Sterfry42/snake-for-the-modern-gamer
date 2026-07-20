import type { WorldGenerationIdentity } from './worldGenerationIdentity.js';
import { hashWorldCoordinate } from './worldHash.js';
import { clamp } from '../../core/math.js';

export interface ClimateSample {
  temperature: number;
  moisture: number;
  weirdness: number;
  altitude: number;
  depth: number;
}

function hashUnit(args: {
  regionX: number;
  regionY: number;
  z: number;
  identity: WorldGenerationIdentity;
  featureSalt: number;
}): number {
  return (
    hashWorldCoordinate({
      x: args.regionX,
      y: args.regionY,
      z: args.z,
      salt: args.identity.biomeSalt,
      featureSalt: args.featureSalt,
    }) / 0xffffffff
  );
}

function smoothValue(args: {
  regionX: number;
  regionY: number;
  z: number;
  identity: WorldGenerationIdentity;
  featureSalt: number;
}): number {
  let total = 0;
  let weight = 0;
  for (let dy = -1; dy <= 1; dy += 1) {
    for (let dx = -1; dx <= 1; dx += 1) {
      const localWeight = dx === 0 && dy === 0 ? 4 : Math.abs(dx) + Math.abs(dy) === 1 ? 2 : 1;
      total +=
        hashUnit({
          regionX: args.regionX + dx,
          regionY: args.regionY + dy,
          z: args.z,
          identity: args.identity,
          featureSalt: args.featureSalt,
        }) * localWeight;
      weight += localWeight;
    }
  }
  return (total / weight) * 2 - 1;
}

export function applyVerticalClimate(base: ClimateSample, z: number): ClimateSample {
  const altitude = Math.max(0, z);
  const depth = Math.max(0, -z);
  return {
    ...base,
    altitude,
    depth,
    temperature: clamp(base.temperature - altitude * 0.12 + depth * 0.1, -1, 1),
    weirdness: clamp(base.weirdness + depth * 0.05, -1, 1),
  };
}

export function sampleClimateForRegion(args: {
  regionX: number;
  regionY: number;
  z: number;
  identity: WorldGenerationIdentity;
}): ClimateSample {
  const base: ClimateSample = {
    temperature: smoothValue({ ...args, featureSalt: 0x71a1 }),
    moisture: smoothValue({ ...args, featureSalt: 0x71b7 }),
    weirdness: smoothValue({ ...args, featureSalt: 0x71c9 }),
    altitude: 0,
    depth: 0,
  };
  return applyVerticalClimate(base, args.z);
}
