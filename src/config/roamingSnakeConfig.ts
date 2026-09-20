export interface RoamingSnakeConfig {
  spawnChance: number;
  maxPerRoom: number;
  minBodyLength: number;
  maxBodyLength: number;
  moveCooldown: number;
}

export const defaultRoamingSnakeConfig: RoamingSnakeConfig = {
  spawnChance: 0.1,
  maxPerRoom: 2,
  minBodyLength: 2,
  maxBodyLength: 5,
  moveCooldown: 1,
};
