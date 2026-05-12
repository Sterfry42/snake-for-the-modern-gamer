import type { AnimalDefinition } from '../types.js';

const definition: AnimalDefinition = {
  type: 'deer',
  name: 'Deer',
  biomeIds: ['verdigris-basin', 'elderwood-maze', 'gloam-garden'],
  spawnWeight: 20,
  maxPerRoom: 2,
  moveInterval: 4,
  behavior: 'graze',
  snakeEncounter: 'harmless',
  drops: [
    { itemId: 'raw-meat', chance: 0.5 },
    { itemId: 'hide', chance: 0.4 },
  ],
  spritePrefix: 'deer',
  maxHearts: 2,
};

export default definition;
