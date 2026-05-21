import type { AnimalDefinition } from '../types.js';

const definition: AnimalDefinition = {
  type: 'eagle',
  name: 'Eagle',
  biomeIds: ['liberty-badlands'],
  spawnWeight: 20,
  maxPerRoom: 1,
  moveInterval: 4,
  behavior: 'perch',
  snakeEncounter: 'harmless',
  drops: [{ itemId: 'feather', chance: 0.6 }],
  spritePrefix: 'eagle',
  maxHearts: 1,
};

export default definition;
