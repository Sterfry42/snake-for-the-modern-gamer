import type { AnimalDefinition } from '../types.js';

const definition: AnimalDefinition = {
  type: 'bird',
  name: 'Bird',
  biomeIds: ['moonlit-parish', 'gloam-garden', 'verdigris-basin'],
  spawnWeight: 30,
  maxPerRoom: 3,
  moveInterval: 4,
  behavior: 'perch',
  snakeEncounter: 'harmless',
  drops: [
    { itemId: 'feather', chance: 0.5 },
    { itemId: 'egg', chance: 0.2 },
  ],
  spritePrefix: 'bird',
  maxHearts: 1,
};

export default definition;
