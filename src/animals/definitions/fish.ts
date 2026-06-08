import type { AnimalDefinition } from '../types.js';

const definition: AnimalDefinition = {
  type: 'fish',
  name: 'Fish',
  biomeIds: ['sunken-ocean', 'gloam-garden'],
  spawnWeight: 50,
  maxPerRoom: 5,
  moveInterval: 2,
  behavior: 'school',
  snakeEncounter: 'harmless',
  drops: [{ itemId: 'fish-meat', chance: 0.6 }],
  spritePrefix: 'fish',
  maxHearts: 1,
};

export default definition;
