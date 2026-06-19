import type { AnimalDefinition } from '../types.js';

const definition: AnimalDefinition = {
  type: 'frog',
  name: 'Frog',
  biomeIds: ['verdigris-basin', 'gloam-garden', 'elderwood-maze', 'liberty-badlands'],
  spawnWeight: 30,
  maxPerRoom: 4,
  moveInterval: 2,
  behavior: 'wander',
  snakeEncounter: 'harmless',
  drops: [{ itemId: 'frog-meat', chance: 0.7 }],
  spritePrefix: 'frog',
  maxHearts: 1,
};

export default definition;
