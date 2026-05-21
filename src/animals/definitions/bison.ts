import type { AnimalDefinition } from '../types.js';

const definition: AnimalDefinition = {
  type: 'bison',
  name: 'Bison',
  biomeIds: ['liberty-badlands'],
  spawnWeight: 10,
  maxPerRoom: 1,
  moveInterval: 4,
  behavior: 'graze',
  snakeEncounter: 'dangerous',
  drops: [{ itemId: 'hide', chance: 0.75 }],
  spritePrefix: 'bison',
  maxHearts: 3,
};

export default definition;
