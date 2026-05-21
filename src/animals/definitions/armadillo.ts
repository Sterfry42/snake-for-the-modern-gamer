import type { AnimalDefinition } from '../types.js';

const definition: AnimalDefinition = {
  type: 'armadillo',
  name: 'Armadillo',
  biomeIds: ['liberty-badlands'],
  spawnWeight: 16,
  maxPerRoom: 2,
  moveInterval: 4,
  behavior: 'graze',
  snakeEncounter: 'harmless',
  drops: [{ itemId: 'hide', chance: 0.35 }],
  spritePrefix: 'armadillo',
  maxHearts: 2,
};

export default definition;
