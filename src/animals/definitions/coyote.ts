import type { AnimalDefinition } from '../types.js';

const definition: AnimalDefinition = {
  type: 'coyote',
  name: 'Coyote',
  biomeIds: ['liberty-badlands'],
  spawnWeight: 18,
  maxPerRoom: 2,
  moveInterval: 2,
  behavior: 'chase',
  snakeEncounter: 'dangerous',
  drops: [{ itemId: 'hide', chance: 0.45 }],
  spritePrefix: 'coyote',
  maxHearts: 2,
};

export default definition;
