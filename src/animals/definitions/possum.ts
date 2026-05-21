import type { AnimalDefinition } from '../types.js';

const definition: AnimalDefinition = {
  type: 'possum',
  name: 'Possum',
  biomeIds: ['liberty-badlands'],
  spawnWeight: 22,
  maxPerRoom: 2,
  moveInterval: 3,
  behavior: 'flee',
  snakeEncounter: 'harmless',
  drops: [{ itemId: 'raw-meat', chance: 0.15 }],
  spritePrefix: 'possum',
  maxHearts: 1,
};

export default definition;
