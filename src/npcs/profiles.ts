import { createHumanoidIdentity } from '../world/humanoidSpawn.js';

export interface NpcProfile {
  id: string;
  name: string;
  description: string;
  portraitId?: string;
  maxHearts?: number;
}

export function buildHouseNpcProfile(
  name: string,
  portraitId?: string,
  maxHearts?: number,
): NpcProfile {
  return {
    ...createHumanoidIdentity(name, portraitId),
    description: `${name} keeps the local place running.`,
    maxHearts,
  };
}
