import type { AnimalDefinition } from '../types.js';

const definition: AnimalDefinition = {
  type: 'snake',
  name: 'Snake',
  biomeIds: ['ember-waste', 'sable-depths', 'elderwood-maze'],
  spawnWeight: 15,
  maxPerRoom: 2,
  moveInterval: 3,
  behavior: 'wander',
  snakeEncounter: 'dangerous',
  drops: [{ itemId: 'raw-meat', chance: 0.5 }],
  spritePrefix: 'snake',
  maxHearts: 2,
};

export default definition;
