import type { BiomeId } from '../world/biomes.js';
import type { AnimalType } from './types.js';

export interface SeasonalVariant {
  temperature: string;
  colorMod: { hueShift: number; saturationShift: number; lightnessShift: number };
  behaviorMod: Partial<{ moveInterval: number; spawnWeight: number }>;
}

export interface AnimalSeasonalData {
  type: AnimalType;
  biomes: Record<BiomeId, SeasonalVariant | null>;
}

const ANIMAL_SEASONS: AnimalSeasonalData[] = [
  {
    type: 'rabbit',
    biomes: {
      'verdigris-basin': {
        temperature: 'Mild',
        colorMod: { hueShift: 0, saturationShift: 0, lightnessShift: 0 },
        behaviorMod: {},
      },
      'ember-waste': {
        temperature: 'Scorching',
        colorMod: { hueShift: 15, saturationShift: -0.1, lightnessShift: 0.05 },
        behaviorMod: { moveInterval: -1 },
      },
      'moonlit-parish': {
        temperature: 'Cold',
        colorMod: { hueShift: -10, saturationShift: 0, lightnessShift: 0.05 },
        behaviorMod: { moveInterval: 1 },
      },
      'sable-depths': {
        temperature: 'Frigid',
        colorMod: { hueShift: -20, saturationShift: -0.1, lightnessShift: 0.1 },
        behaviorMod: { moveInterval: 2, spawnWeight: 0.5 },
      },
      'gloam-garden': {
        temperature: 'Humid',
        colorMod: { hueShift: 5, saturationShift: 0.1, lightnessShift: 0 },
        behaviorMod: {},
      },
      'elderwood-maze': {
        temperature: 'Canopied',
        colorMod: { hueShift: -5, saturationShift: 0.05, lightnessShift: -0.05 },
        behaviorMod: {},
      },
      'sunken-ocean': null,
      'home-hearth': null,
    },
  },
  {
    type: 'fox',
    biomes: {
      'verdigris-basin': {
        temperature: 'Mild',
        colorMod: { hueShift: 0, saturationShift: 0, lightnessShift: 0 },
        behaviorMod: {},
      },
      'ember-waste': {
        temperature: 'Scorching',
        colorMod: { hueShift: 10, saturationShift: -0.05, lightnessShift: 0.05 },
        behaviorMod: { moveInterval: -1 },
      },
      'moonlit-parish': {
        temperature: 'Cold',
        colorMod: { hueShift: -15, saturationShift: 0.1, lightnessShift: 0.05 },
        behaviorMod: {},
      },
      'sable-depths': {
        temperature: 'Frigid',
        colorMod: { hueShift: -25, saturationShift: -0.1, lightnessShift: 0.1 },
        behaviorMod: { moveInterval: 1 },
      },
      'gloam-garden': {
        temperature: 'Humid',
        colorMod: { hueShift: 5, saturationShift: 0.05, lightnessShift: 0 },
        behaviorMod: {},
      },
      'elderwood-maze': {
        temperature: 'Canopied',
        colorMod: { hueShift: -5, saturationShift: 0.05, lightnessShift: -0.05 },
        behaviorMod: {},
      },
      'sunken-ocean': null,
      'home-hearth': null,
    },
  },
  {
    type: 'wolf',
    biomes: {
      'verdigris-basin': null,
      'ember-waste': null,
      'moonlit-parish': {
        temperature: 'Cold',
        colorMod: { hueShift: -10, saturationShift: 0.1, lightnessShift: 0.1 },
        behaviorMod: {},
      },
      'sable-depths': {
        temperature: 'Frigid',
        colorMod: { hueShift: -20, saturationShift: -0.1, lightnessShift: 0.15 },
        behaviorMod: { spawnWeight: 0.7 },
      },
      'gloam-garden': null,
      'elderwood-maze': {
        temperature: 'Canopied',
        colorMod: { hueShift: -5, saturationShift: 0.05, lightnessShift: -0.05 },
        behaviorMod: {},
      },
      'sunken-ocean': null,
      'home-hearth': null,
    },
  },
  {
    type: 'deer',
    biomes: {
      'verdigris-basin': {
        temperature: 'Mild',
        colorMod: { hueShift: 0, saturationShift: 0, lightnessShift: 0 },
        behaviorMod: {},
      },
      'ember-waste': null,
      'moonlit-parish': null,
      'sable-depths': null,
      'gloam-garden': {
        temperature: 'Humid',
        colorMod: { hueShift: 5, saturationShift: 0.05, lightnessShift: 0 },
        behaviorMod: {},
      },
      'elderwood-maze': {
        temperature: 'Canopied',
        colorMod: { hueShift: -5, saturationShift: 0.05, lightnessShift: -0.05 },
        behaviorMod: {},
      },
      'sunken-ocean': null,
      'home-hearth': null,
    },
  },
  {
    type: 'bear',
    biomes: {
      'verdigris-basin': null,
      'ember-waste': null,
      'moonlit-parish': null,
      'sable-depths': {
        temperature: 'Frigid',
        colorMod: { hueShift: -10, saturationShift: -0.15, lightnessShift: 0.1 },
        behaviorMod: { spawnWeight: 0.6 },
      },
      'gloam-garden': null,
      'elderwood-maze': {
        temperature: 'Canopied',
        colorMod: { hueShift: 0, saturationShift: 0, lightnessShift: 0 },
        behaviorMod: {},
      },
      'sunken-ocean': null,
      'home-hearth': null,
    },
  },
  {
    type: 'fish',
    biomes: {
      'verdigris-basin': null,
      'ember-waste': null,
      'moonlit-parish': null,
      'sable-depths': null,
      'gloam-garden': {
        temperature: 'Humid',
        colorMod: { hueShift: 5, saturationShift: 0.1, lightnessShift: 0.05 },
        behaviorMod: {},
      },
      'elderwood-maze': null,
      'sunken-ocean': {
        temperature: 'Briny',
        colorMod: { hueShift: -5, saturationShift: 0.05, lightnessShift: -0.05 },
        behaviorMod: {},
      },
      'home-hearth': null,
    },
  },
  {
    type: 'bird',
    biomes: {
      'verdigris-basin': {
        temperature: 'Mild',
        colorMod: { hueShift: 0, saturationShift: 0, lightnessShift: 0 },
        behaviorMod: {},
      },
      'ember-waste': null,
      'moonlit-parish': {
        temperature: 'Cold',
        colorMod: { hueShift: -10, saturationShift: 0.1, lightnessShift: 0.1 },
        behaviorMod: {},
      },
      'sable-depths': null,
      'gloam-garden': {
        temperature: 'Humid',
        colorMod: { hueShift: 10, saturationShift: 0.15, lightnessShift: 0.05 },
        behaviorMod: {},
      },
      'elderwood-maze': {
        temperature: 'Canopied',
        colorMod: { hueShift: -5, saturationShift: 0.05, lightnessShift: 0 },
        behaviorMod: {},
      },
      'sunken-ocean': null,
      'home-hearth': null,
    },
  },
  {
    type: 'snake',
    biomes: {
      'verdigris-basin': null,
      'ember-waste': {
        temperature: 'Scorching',
        colorMod: { hueShift: 10, saturationShift: -0.1, lightnessShift: 0.1 },
        behaviorMod: { moveInterval: -1 },
      },
      'moonlit-parish': null,
      'sable-depths': {
        temperature: 'Frigid',
        colorMod: { hueShift: -15, saturationShift: -0.1, lightnessShift: 0.05 },
        behaviorMod: { spawnWeight: 0.7 },
      },
      'gloam-garden': null,
      'elderwood-maze': {
        temperature: 'Canopied',
        colorMod: { hueShift: 5, saturationShift: 0.05, lightnessShift: 0 },
        behaviorMod: {},
      },
      'sunken-ocean': null,
      'home-hearth': null,
    },
  },
];

export function getSeasonalVariant(
  animalType: AnimalType,
  biomeId: BiomeId,
): SeasonalVariant | null {
  const animalData = ANIMAL_SEASONS.find((d) => d.type === animalType);
  if (!animalData) {
    return null;
  }
  return animalData.biomes[biomeId] ?? null;
}

export function applySeasonalColor(
  baseColor: number,
  variant: SeasonalVariant,
): { hueShift: number; saturationShift: number; lightnessShift: number } {
  return variant.colorMod;
}

export function applySeasonalBehavior(
  originalMoveInterval: number,
  variant: SeasonalVariant,
): number {
  if (!variant.behaviorMod?.moveInterval) {
    return originalMoveInterval;
  }
  return Math.max(1, originalMoveInterval + variant.behaviorMod.moveInterval);
}

export function isSeasonalAnimal(animalType: AnimalType, biomeId: BiomeId): boolean {
  return getSeasonalVariant(animalType, biomeId) !== null;
}
