import type { AnimalDefinition } from '../types.js';

const definition: AnimalDefinition = {
  type: 'bass',
  name: 'Bass',
  biomeIds: ['liberty-badlands'],
  spawnWeight: 14,
  maxPerRoom: 3,
  moveInterval: 2,
  behavior: 'school',
  snakeEncounter: 'hunt',
  drops: [{ itemId: 'fish-meat', chance: 0.7 }],
  spritePrefix: 'bass',
  maxHearts: 1,
};

export default definition;
