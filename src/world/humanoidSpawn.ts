import type { WorldHumanoidSpawn } from './types.js';

export type WorldHumanoidIdentity = Pick<WorldHumanoidSpawn, 'id' | 'name' | 'portraitId'>;

export function createHumanoidIdentity(name: string, portraitId?: string): WorldHumanoidIdentity {
  return {
    id: `npc-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
    name,
    portraitId,
  };
}

export function createHumanoidSpawn(
  name: string,
  x: number,
  y: number,
  portraitId?: string,
): WorldHumanoidSpawn {
  return {
    ...createHumanoidIdentity(name, portraitId),
    x,
    y,
  };
}
