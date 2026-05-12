import type { AnimalDefinition } from '../types.js';

const definition: AnimalDefinition = {
  type: 'rabbit',
  name: 'Rabbit',
  biomeIds: ['verdigris-basin', 'gloam-garden', 'elderwood-maze'],
  spawnWeight: 40,
  maxPerRoom: 3,
  moveInterval: 3,
  behavior: 'wander',
  snakeEncounter: 'harmless',
  drops: [
    { itemId: 'raw-meat', chance: 0.6 },
  ],
  spritePrefix: 'rabbit',
  maxHearts: 1,
};

export default definition;
