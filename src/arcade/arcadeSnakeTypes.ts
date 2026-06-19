export const ARCADE_GRID_WIDTH = 16;
export const ARCADE_GRID_HEIGHT = 12;
export const ARCADE_TICK_MS = 140;

export type ArcadeAppleType = 'regular' | 'golden' | 'scurry' | 'barrier' | 'corrupted';
export type ArcadeDirection = 'up' | 'down' | 'left' | 'right';
export type ArcadeCorruptionTier = 0 | 1 | 2 | 3 | 4;
export type ArcadeQuestId =
  | 'regular-apples'
  | 'golden-apples'
  | 'scurry-apple'
  | 'grow-length'
  | 'screen-loops'
  | 'survive'
  | 'reach-score'
  | 'no-left-apples'
  | 'long-snake-apples';

export interface ArcadeTilePosition {
  x: number;
  y: number;
}

export interface ArcadeApple {
  type: ArcadeAppleType;
  position: ArcadeTilePosition;
  spawnedAtTick: number;
  expiresAtTick?: number;
  nextMoveAtTick?: number;
  protectedDirections?: ArcadeDirection[];
  visualTell?: 'scanline' | 'split' | 'blink' | 'static';
}

export interface ArcadeQuest {
  id: ArcadeQuestId;
  label: string;
  progress: number;
  target: number;
  completed: boolean;
  rewardXp: number;
  startedAtScore: number;
  startedAtTick: number;
}

export interface ArcadeSnakeStats {
  lifetimeScore: number;
  highScore: number;
  playCount: number;
  corruptedApplesEaten: number;
  corruption: number;
  questsCompleted: number;
  totalLoops: number;
  totalGoldenApplesEaten: number;
  totalScurryApplesEaten: number;
  totalBarrierApplesEaten: number;
}

export interface ArcadeSnakeSaveData {
  version: 2;
  stats: ArcadeSnakeStats;
  hasHomeCabinet: boolean;
  questCapUnlocked: boolean;
  questCapEquipped: boolean;
  deadPixels: ArcadeDeadPixel[];
}

export interface ArcadeDeadPixel {
  x: number;
  y: number;
  color: number;
  size: number;
}

export interface ArcadeSnakeRunState {
  score: number;
  xp: number;
  level: number;
  snake: ArcadeTilePosition[];
  direction: ArcadeDirection;
  queuedDirection?: ArcadeDirection;
  directionBuffer: ArcadeDirection[];
  apple: ArcadeApple;
  barriers: ArcadeTilePosition[];
  deletedTiles: ArcadeTilePosition[];
  quests: ArcadeQuest[];
  loopsThisRun: number;
  corruptionThisRun: number;
  corruptedApplesEatenThisRun: number;
  corruptedAppleSpawnedThisRun: boolean;
  disabledDirection?: ArcadeDirection;
  disabledDirectionUntilTick?: number;
  disabledDirectionCooldownUntilTick?: number;
  lastBlueScreenAtTick?: number;
  lastCorruptionEventAtTick?: number;
  systemPauseCooldownUntilTick?: number;
  speedShiftCooldownUntilTick?: number;
  speedMultiplier: number;
  speedMultiplierUntilTick?: number;
  arcadeHat: string;
  questsCompletedThisRun: number;
  lastQuestRollScore: number;
  applesEatenWithoutLeft: number;
  tick: number;
  elapsedMs: number;
  isPaused: boolean;
  isGameOver: boolean;
}

export type ArcadeTickEvent =
  | { type: 'apple-eaten'; appleType: ArcadeAppleType; scoreGained: number }
  | { type: 'level-up'; level: number }
  | { type: 'quest-added'; quest: ArcadeQuest }
  | { type: 'quest-complete'; questId: ArcadeQuestId; label: string }
  | { type: 'corrupted-apple-eaten' }
  | { type: 'corrupted-apple-despawned' }
  | { type: 'scurry-moved'; from: ArcadeTilePosition; to: ArcadeTilePosition }
  | { type: 'blue-screen' }
  | { type: 'system-pause'; durationMs: number }
  | { type: 'speed-shift'; multiplier: number; durationTicks: number }
  | { type: 'popup-resize-glitch'; tier: ArcadeCorruptionTier }
  | {
      type: 'visual-glitch';
      glitch: 'row-shift' | 'chunk-swap' | 'tile-flicker' | 'text' | 'light-mode' | 'snake-hide';
      tier: ArcadeCorruptionTier;
    }
  | { type: 'deleted-tile-added'; position: ArcadeTilePosition }
  | { type: 'direction-failure-start'; direction: ArcadeDirection; durationTicks: number }
  | { type: 'direction-failure-input-rejected'; direction: ArcadeDirection }
  | { type: 'direction-failure-end'; direction: ArcadeDirection }
  | { type: 'game-over'; reason: 'self' | 'barrier' | 'shielded' | 'deleted' };

export interface ArcadeTickResult {
  state: ArcadeSnakeRunState;
  events: ArcadeTickEvent[];
}

export interface ArcadeRunResult {
  score: number;
  highScore: number;
  lifetimeScore: number;
  mainGameScoreGained: number;
  quit: boolean;
}

export type ArcadeRandom = () => number;

export function createDefaultArcadeSnakeSaveData(): ArcadeSnakeSaveData {
  return {
    version: 2,
    hasHomeCabinet: false,
    questCapUnlocked: false,
    questCapEquipped: false,
    deadPixels: [],
    stats: {
      lifetimeScore: 0,
      highScore: 0,
      playCount: 0,
      corruptedApplesEaten: 0,
      corruption: 0,
      questsCompleted: 0,
      totalLoops: 0,
      totalGoldenApplesEaten: 0,
      totalScurryApplesEaten: 0,
      totalBarrierApplesEaten: 0,
    },
  };
}

export function normalizeArcadeSnakeSaveData(value: unknown): ArcadeSnakeSaveData {
  const defaults = createDefaultArcadeSnakeSaveData();
  if (!value || typeof value !== 'object') return defaults;
  const source = value as Partial<ArcadeSnakeSaveData>;
  const stats: Partial<ArcadeSnakeStats> =
    source.stats && typeof source.stats === 'object' ? source.stats : {};
  const number = (candidate: unknown): number =>
    Math.max(0, Math.floor(Number.isFinite(Number(candidate)) ? Number(candidate) : 0));
  const questCapUnlocked = source.version === 2 && Boolean(source.questCapUnlocked);
  return {
    version: 2,
    hasHomeCabinet: Boolean(source.hasHomeCabinet),
    questCapUnlocked,
    questCapEquipped: Boolean(questCapUnlocked && source.questCapEquipped),
    deadPixels: Array.isArray(source.deadPixels)
      ? source.deadPixels
          .filter((pixel): pixel is ArcadeDeadPixel => Boolean(pixel && typeof pixel === 'object'))
          .map((pixel) => ({
            x: Math.max(0, Math.floor(Number(pixel.x) || 0)),
            y: Math.max(0, Math.floor(Number(pixel.y) || 0)),
            color: Math.max(0, Math.floor(Number(pixel.color) || 0)),
            size: Math.max(1, Math.min(8, Math.floor(Number(pixel.size) || 1))),
          }))
          .slice(0, 80)
      : [],
    stats: {
      lifetimeScore: number(stats.lifetimeScore),
      highScore: number(stats.highScore),
      playCount: number(stats.playCount),
      corruptedApplesEaten: number(stats.corruptedApplesEaten),
      corruption: number(stats.corruption),
      questsCompleted: number(stats.questsCompleted),
      totalLoops: number(stats.totalLoops),
      totalGoldenApplesEaten: number(stats.totalGoldenApplesEaten),
      totalScurryApplesEaten: number(stats.totalScurryApplesEaten),
      totalBarrierApplesEaten: number(stats.totalBarrierApplesEaten),
    },
  };
}
