import type { AnimalDefinition } from '../types.js';

const definition: AnimalDefinition = {
  type: 'fox',
  name: 'Fox',
  biomeIds: ['verdigris-basin', 'ember-waste', 'elderwood-maze'],
  spawnWeight: 15,
  maxPerRoom: 1,
  moveInterval: 2,
  behavior: 'wander',
  snakeEncounter: 'tamable',
  drops: [
    { itemId: 'raw-meat', chance: 0.4 },
    { itemId: 'hide', chance: 0.3 },
  ],
  spritePrefix: 'fox',
  maxHearts: 2,
};

export default definition;
