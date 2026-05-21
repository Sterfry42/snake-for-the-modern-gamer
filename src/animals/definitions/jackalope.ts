import type { AnimalDefinition } from '../types.js';

const definition: AnimalDefinition = {
  type: 'jackalope',
  name: 'Jackalope',
  biomeIds: ['liberty-badlands'],
  spawnWeight: 30,
  maxPerRoom: 2,
  moveInterval: 1,
  behavior: 'wander',
  snakeEncounter: 'tamable',
  drops: [{ itemId: 'hide', chance: 0.2 }],
  spritePrefix: 'jackalope',
  maxHearts: 1,
};

export default definition;
