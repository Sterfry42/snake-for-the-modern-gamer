import type { WorldHumanoidSpawn } from './types.js';

export function createHumanoidSpawn(
  name: string,
  x: number,
  y: number,
  portraitId?: string,
): WorldHumanoidSpawn {
  return {
    id: `npc-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
    name,
    portraitId,
    x,
    y,
  };
}
