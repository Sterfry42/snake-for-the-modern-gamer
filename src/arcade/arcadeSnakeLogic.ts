import { chooseArcadeAppleType, moveScurryApple, spawnArcadeApple } from './arcadeSnakeApples.js';
import { maybeScheduleArcadeCorruption } from './arcadeSnakeCorruption.js';
import { maybeAddArcadeQuest, updateArcadeQuests } from './arcadeSnakeQuests.js';
import {
  ARCADE_GRID_HEIGHT,
  ARCADE_GRID_WIDTH,
  ARCADE_TICK_MS,
  createDefaultArcadeSnakeSaveData,
  type ArcadeAppleType,
  type ArcadeDirection,
  type ArcadeRandom,
  type ArcadeSnakeRunState,
  type ArcadeSnakeSaveData,
  type ArcadeTickEvent,
  type ArcadeTickResult,
  type ArcadeTilePosition,
} from './arcadeSnakeTypes.js';

const VECTORS: Record<ArcadeDirection, ArcadeTilePosition> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

const OPPOSITE: Record<ArcadeDirection, ArcadeDirection> = {
  up: 'down',
  down: 'up',
  left: 'right',
  right: 'left',
};

const samePosition = (a: ArcadeTilePosition, b: ArcadeTilePosition): boolean =>
  a.x === b.x && a.y === b.y;

export function wrapArcadePosition(pos: ArcadeTilePosition): ArcadeTilePosition {
  return {
    x: (pos.x + ARCADE_GRID_WIDTH) % ARCADE_GRID_WIDTH,
    y: (pos.y + ARCADE_GRID_HEIGHT) % ARCADE_GRID_HEIGHT,
  };
}

export function createArcadeSnakeRun(
  save: ArcadeSnakeSaveData = createDefaultArcadeSnakeSaveData(),
  rng: ArcadeRandom = Math.random,
): ArcadeSnakeRunState {
  const previousPlayCount = save.stats.playCount;
  save.stats.playCount += 1;
  if (previousPlayCount > 0) save.stats.corruption += 1;
  const snake = [
    { x: 6, y: 6 },
    { x: 5, y: 6 },
    { x: 4, y: 6 },
  ];
  return {
    score: 0,
    xp: 0,
    level: 1,
    snake,
    direction: 'right',
    directionBuffer: [],
    apple: spawnArcadeApple('regular', 0, snake, [], rng),
    barriers: [],
    deletedTiles: [],
    quests: [],
    loopsThisRun: 0,
    corruptionThisRun: 0,
    corruptedApplesEatenThisRun: 0,
    corruptedAppleSpawnedThisRun: false,
    lastQuestRollScore: 0,
    applesEatenWithoutLeft: 0,
    speedMultiplier: 1,
    arcadeHat: save.questCapEquipped ? 'Quest Cap' : 'None',
    questsCompletedThisRun: 0,
    tick: 0,
    elapsedMs: 0,
    isPaused: false,
    isGameOver: false,
  };
}

export function queueArcadeDirection(
  state: ArcadeSnakeRunState,
  direction: ArcadeDirection,
): ArcadeTickEvent[] {
  if (state.isGameOver || state.isPaused) return [];
  if (
    state.disabledDirection === direction &&
    state.disabledDirectionUntilTick !== undefined &&
    state.tick < state.disabledDirectionUntilTick
  ) {
    return [{ type: 'direction-failure-input-rejected', direction }];
  }
  const pending = [
    ...(state.queuedDirection ? [state.queuedDirection] : []),
    ...state.directionBuffer,
  ];
  const reference = pending[pending.length - 1] ?? state.direction;
  if (direction === reference || direction === OPPOSITE[reference]) return [];
  if (!state.queuedDirection) {
    state.queuedDirection = direction;
  } else if (state.directionBuffer.length < 1) {
    state.directionBuffer.push(direction);
  }
  if (direction === 'left') state.applesEatenWithoutLeft = 0;
  return [];
}

export function tickArcadeSnake(
  state: ArcadeSnakeRunState,
  save: ArcadeSnakeSaveData,
  rng: ArcadeRandom = Math.random,
  elapsedMs = ARCADE_TICK_MS,
): ArcadeTickResult {
  const events: ArcadeTickEvent[] = [];
  if (state.isPaused || state.isGameOver) return { state, events };
  state.tick += 1;
  state.elapsedMs += elapsedMs;

  if (
    state.speedMultiplierUntilTick !== undefined &&
    state.tick >= state.speedMultiplierUntilTick
  ) {
    state.speedMultiplier = 1;
    state.speedMultiplierUntilTick = undefined;
  }

  if (
    state.disabledDirection &&
    state.disabledDirectionUntilTick !== undefined &&
    state.tick >= state.disabledDirectionUntilTick
  ) {
    events.push({ type: 'direction-failure-end', direction: state.disabledDirection });
    state.disabledDirection = undefined;
    state.disabledDirectionUntilTick = undefined;
  }

  if (state.queuedDirection && state.queuedDirection !== OPPOSITE[state.direction]) {
    state.direction = state.queuedDirection;
  }
  state.queuedDirection = state.directionBuffer.shift();

  const head = state.snake[0]!;
  const vector = VECTORS[state.direction];
  const rawNext = { x: head.x + vector.x, y: head.y + vector.y };
  const wrapped = wrapArcadePosition(rawNext);
  const looped = rawNext.x !== wrapped.x || rawNext.y !== wrapped.y;
  const ateApple = samePosition(wrapped, state.apple.position);
  if (
    ateApple &&
    state.apple.type === 'barrier' &&
    state.apple.protectedDirections?.includes(state.direction)
  ) {
    state.isGameOver = true;
    events.push({ type: 'game-over', reason: 'shielded' });
    return { state, events };
  }
  const bodyToCheck = ateApple ? state.snake : state.snake.slice(0, -1);
  if (bodyToCheck.some((segment) => samePosition(segment, wrapped))) {
    state.isGameOver = true;
    events.push({ type: 'game-over', reason: 'self' });
    return { state, events };
  }
  if (state.barriers.some((barrier) => samePosition(barrier, wrapped))) {
    state.isGameOver = true;
    events.push({ type: 'game-over', reason: 'barrier' });
    return { state, events };
  }
  if (state.deletedTiles.some((tile) => samePosition(tile, wrapped))) {
    state.isGameOver = true;
    events.push({ type: 'game-over', reason: 'deleted' });
    return { state, events };
  }

  state.snake.unshift(wrapped);
  if (looped) {
    state.loopsThisRun += 1;
    events.push(...updateArcadeQuests(state, { type: 'loop' }));
  }

  if (ateApple) {
    const appleType = state.apple.type;
    const scoreGained = getArcadeAppleScore(appleType);
    const previousLevel = state.level;
    state.score += scoreGained;
    state.level = Math.floor(state.score / 10) + 1;
    state.applesEatenWithoutLeft += 1;
    events.push({ type: 'apple-eaten', appleType, scoreGained });
    if (state.level > previousLevel) events.push({ type: 'level-up', level: state.level });
    if (appleType === 'corrupted') {
      state.corruptionThisRun += 5;
      state.corruptedApplesEatenThisRun += 1;
      save.stats.corruption += 5;
      save.stats.corruptedApplesEaten += 1;
      events.push({ type: 'corrupted-apple-eaten' });
    }
    state.barriers = [];
    const nextType =
      !state.corruptedAppleSpawnedThisRun && state.score >= 15
        ? 'corrupted'
        : chooseArcadeAppleType(save.stats, state.score, rng);
    state.apple = spawnArcadeApple(nextType, state.tick, state.snake, state.deletedTiles, rng);
    if (nextType === 'corrupted') state.corruptedAppleSpawnedThisRun = true;
    events.push(...updateArcadeQuests(state, { type: 'apple', appleType }));
    events.push(...maybeAddArcadeQuest(state, rng));
    if (appleType === 'golden') save.stats.totalGoldenApplesEaten += 1;
    if (appleType === 'scurry') save.stats.totalScurryApplesEaten += 1;
    if (appleType === 'barrier') save.stats.totalBarrierApplesEaten += 1;
  } else {
    state.snake.pop();
  }

  if (
    state.apple.type === 'corrupted' &&
    state.apple.expiresAtTick !== undefined &&
    state.tick >= state.apple.expiresAtTick
  ) {
    events.push({ type: 'corrupted-apple-despawned' });
    state.apple = spawnArcadeApple(
      chooseArcadeAppleType(
        { ...save.stats, corruption: 0, corruptedApplesEaten: 0 },
        Math.min(9, state.score),
        rng,
      ),
      state.tick,
      state.snake,
      state.deletedTiles,
      rng,
    );
    if (state.apple.type === 'corrupted') state.corruptedAppleSpawnedThisRun = true;
  }

  const scurry = moveScurryApple(state, rng);
  if (scurry.movedFrom) {
    events.push({
      type: 'scurry-moved',
      from: scurry.movedFrom,
      to: scurry.apple.position,
    });
  }
  state.apple = scurry.apple;
  events.push(...updateArcadeQuests(state, { type: 'tick' }));
  events.push(...maybeScheduleArcadeCorruption(save.stats, state, rng));
  return { state, events };
}

export function finalizeArcadeRun(
  save: ArcadeSnakeSaveData,
  run: ArcadeSnakeRunState,
): ArcadeSnakeSaveData {
  save.stats.lifetimeScore += run.score;
  save.stats.highScore = Math.max(save.stats.highScore, run.score);
  save.stats.totalLoops += run.loopsThisRun;
  save.stats.questsCompleted += run.quests.filter((quest) => quest.completed).length;
  if (save.stats.corruption > 0) save.stats.corruption += 1;
  return save;
}

export function purchaseHomeArcadeCabinet(
  save: ArcadeSnakeSaveData,
  mainGameScore: number,
): { ok: boolean; score: number } {
  if (save.hasHomeCabinet || mainGameScore < 200) return { ok: false, score: mainGameScore };
  save.hasHomeCabinet = true;
  return { ok: true, score: mainGameScore - 200 };
}

export function getArcadeAppleScore(type: ArcadeAppleType): number {
  switch (type) {
    case 'golden':
      return 3;
    case 'scurry':
    case 'barrier':
      return 2;
    default:
      return 1;
  }
}

export function getArcadeMainGamePayout(score: number): number {
  return Math.ceil(Math.max(0, score) / 2);
}
