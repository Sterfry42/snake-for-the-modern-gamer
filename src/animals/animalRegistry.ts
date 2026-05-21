import type { AnimalDefinition } from './types.js';
import rabbitDef from './definitions/rabbit.js';
import deerDef from './definitions/deer.js';
import foxDef from './definitions/fox.js';
import wolfDef from './definitions/wolf.js';
import fishDef from './definitions/fish.js';
import birdDef from './definitions/bird.js';
import bearDef from './definitions/bear.js';
import snakeAnimalDef from './definitions/snakeAnimal.js';
import eagleDef from './definitions/eagle.js';
import jackalopeDef from './definitions/jackalope.js';
import raccoonDef from './definitions/raccoon.js';
import coyoteDef from './definitions/coyote.js';
import bisonDef from './definitions/bison.js';
import bassDef from './definitions/bass.js';
import possumDef from './definitions/possum.js';
import armadilloDef from './definitions/armadillo.js';

const ALL_DEFINITIONS: readonly AnimalDefinition[] = [
  rabbitDef,
  deerDef,
  foxDef,
  wolfDef,
  fishDef,
  birdDef,
  bearDef,
  snakeAnimalDef,
  eagleDef,
  jackalopeDef,
  raccoonDef,
  coyoteDef,
  bisonDef,
  bassDef,
  possumDef,
  armadilloDef,
];

const DEFINITION_MAP = new Map<string, AnimalDefinition>(
  ALL_DEFINITIONS.map((def) => [def.type, def]),
);

export class AnimalRegistry {
  static getDefinition(type: string): AnimalDefinition {
    const def = DEFINITION_MAP.get(type);
    if (!def) {
      throw new Error(`Unknown animal type: ${type}`);
    }
    return def;
  }

  static getAll(): readonly AnimalDefinition[] {
    return ALL_DEFINITIONS;
  }

  static getForBiome(biomeId: string): readonly AnimalDefinition[] {
    return ALL_DEFINITIONS.filter((def) => def.biomeIds.includes(biomeId));
  }
}
