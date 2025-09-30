import type { Vector2Like } from "../core/math.js";

export interface GridConfig {
  cols: number;
  rows: number;
  cell: number;
}

export interface RngConfig {
  seed?: string;
}

export interface SpawnGuardConfig {
  enabled: boolean;
  safeCells: Vector2Like[];
}

export interface ObstacleSizeConfig {
  min: number;
  max: number;
}

export interface ObstacleConfig {
  count: ObstacleSizeConfig;
  width: ObstacleSizeConfig;
  height: ObstacleSizeConfig;
  margin: number;
}

export interface LadderConfig {
  enabled: boolean;
  chance: number;
  verticalOffset: number;
}

export interface WorldConfig {
  originRoomId: string;
  spawnGuard: SpawnGuardConfig;
  obstacles: ObstacleConfig;
  ladder: LadderConfig;
}

export interface AppleSpawnWeightConfig {
  base: number;
  scoreThreshold?: number;
}

export interface AppleTypeConfig {
  id: string;
  label: string;
  color: number;
  outlineDarkenFactor: number;
  spawn: AppleSpawnWeightConfig;
  behavior: "normal" | "shielded" | "gold" | "skittish";
}

export interface AppleSystemConfig {
  types: AppleTypeConfig[];
  skittishMoveChance: number;
}

export interface QuestSystemConfig {
  initialQuestCount: number;
  maxActiveQuests: number;
  questOfferChance: number;
}

export interface FeatureSystemConfig {
  enabled: string[];
}

export interface SnakeConfig {
  initialBody: Vector2Like[];
  initialDirection: Vector2Like;
  spawnBuffer: Vector2Like[];
}

export interface GameConfig {
  grid: GridConfig;
  snake: SnakeConfig;
  rng: RngConfig;
  world: WorldConfig;
  apples: AppleSystemConfig;
  quests: QuestSystemConfig;
  features: FeatureSystemConfig;
}

const initialSnakeBody: Vector2Like[] = [
  { x: 5, y: 12 },
  { x: 4, y: 12 },
  { x: 3, y: 12 },
];

const spawnBuffer: Vector2Like[] = [
  { x: 6, y: 12 },
  { x: 7, y: 12 },
];

export const defaultGameConfig: GameConfig = {
  grid: { cols: 32, rows: 24, cell: 24 },
  snake: {
    initialBody: initialSnakeBody,
    initialDirection: { x: 1, y: 0 },
    spawnBuffer,
  },
  rng: {},
  world: {
    originRoomId: "0,0,0",
    spawnGuard: {
      enabled: true,
      safeCells: [...initialSnakeBody, ...spawnBuffer],
    },
    obstacles: {
      count: { min: 2, max: 5 },
      width: { min: 3, max: 8 },
      height: { min: 2, max: 5 },
      margin: 2,
    },
    ladder: {
      enabled: true,
      chance: 0.3,
      verticalOffset: 1,
    },
  },
  apples: {
    types: [
      {
        id: "normal",
        label: "Standard Apple",
        color: 0xff6b6b,
        outlineDarkenFactor: 0.45,
        spawn: { base: 1 },
        behavior: "normal",
      },
      {
        id: "shielded",
        label: "Shielded Apple",
        color: 0xff3f3f,
        outlineDarkenFactor: 0.45,
        spawn: { base: 0.4, scoreThreshold: 10 },
        behavior: "shielded",
      },
      {
        id: "gold",
        label: "Golden Apple",
        color: 0xffd700,
        outlineDarkenFactor: 0.45,
        spawn: { base: 0.35, scoreThreshold: 10 },
        behavior: "gold",
      },
      {
        id: "skittish",
        label: "Skittish Apple",
        color: 0xff8578,
        outlineDarkenFactor: 0.45,
        spawn: { base: 0.35, scoreThreshold: 15 },
        behavior: "skittish",
      },
    ],
    skittishMoveChance: 0.45,
  },
  quests: {
    initialQuestCount: 3,
    maxActiveQuests: 5,
    questOfferChance: 0.002,
  },
  features: {
    enabled: ["coreScore", "wrapWall", "bonusApple", "hungerTimer"],
  },
};
