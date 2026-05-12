import type { AnimalDefinition } from '../types.js';

const definition: AnimalDefinition = {
  type: 'wolf',
  name: 'Wolf',
  biomeIds: ['moonlit-parish', 'sable-depths', 'elderwood-maze'],
  spawnWeight: 12,
  maxPerRoom: 2,
  moveInterval: 2,
  behavior: 'chase',
  snakeEncounter: 'dangerous',
  drops: [
    { itemId: 'raw-meat', chance: 0.5 },
    { itemId: 'hide', chance: 0.4 },
  ],
  spritePrefix: 'wolf',
  maxHearts: 3,
};

export default definition;
