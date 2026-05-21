import type { AnimalDefinition } from '../types.js';

const definition: AnimalDefinition = {
  type: 'raccoon',
  name: 'Raccoon',
  biomeIds: ['liberty-badlands'],
  spawnWeight: 18,
  maxPerRoom: 2,
  moveInterval: 2,
  behavior: 'wander',
  snakeEncounter: 'harmless',
  drops: [{ itemId: 'raw-meat', chance: 0.25 }],
  spritePrefix: 'raccoon',
  maxHearts: 1,
};

export default definition;
