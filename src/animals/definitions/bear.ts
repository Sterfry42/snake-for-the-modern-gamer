import type { AnimalDefinition } from '../types.js';

const definition: AnimalDefinition = {
  type: 'bear',
  name: 'Bear',
  biomeIds: ['elderwood-maze', 'sable-depths'],
  spawnWeight: 5,
  maxPerRoom: 1,
  moveInterval: 4,
  behavior: 'chase',
  snakeEncounter: 'dangerous',
  drops: [
    { itemId: 'raw-meat', chance: 0.7 },
    { itemId: 'hide', chance: 0.5 },
    { itemId: 'honey', chance: 0.3 },
  ],
  spritePrefix: 'bear',
  maxHearts: 4,
};

export default definition;
