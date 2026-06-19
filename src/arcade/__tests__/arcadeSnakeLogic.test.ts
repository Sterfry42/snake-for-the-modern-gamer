import { describe, expect, it } from 'vitest';
import {
  createArcadeSnakeRun,
  finalizeArcadeRun,
  getArcadeMainGamePayout,
  getArcadeUnbankedPayout,
  purchaseHomeArcadeCabinet,
  queueArcadeDirection,
  tickArcadeSnake,
  wrapArcadePosition,
} from '../arcadeSnakeLogic.js';
import {
  createDefaultArcadeSnakeSaveData,
  normalizeArcadeSnakeSaveData,
} from '../arcadeSnakeTypes.js';

const constantRng =
  (value = 0.99) =>
  () =>
    value;

describe('arcade snake movement', () => {
  it('advances in the current direction', () => {
    const save = createDefaultArcadeSnakeSaveData();
    const run = createArcadeSnakeRun(save, constantRng());
    run.apple.position = { x: 12, y: 10 };
    tickArcadeSnake(run, save, constantRng());
    expect(run.snake[0]).toEqual({ x: 7, y: 6 });
    expect(run.snake).toHaveLength(3);
  });

  it('wraps on all four edges', () => {
    expect(wrapArcadePosition({ x: -1, y: 4 })).toEqual({ x: 15, y: 4 });
    expect(wrapArcadePosition({ x: 16, y: 4 })).toEqual({ x: 0, y: 4 });
    expect(wrapArcadePosition({ x: 4, y: -1 })).toEqual({ x: 4, y: 11 });
    expect(wrapArcadePosition({ x: 4, y: 12 })).toEqual({ x: 4, y: 0 });
  });

  it('ignores direct reverse and applies one queued direction', () => {
    const save = createDefaultArcadeSnakeSaveData();
    const run = createArcadeSnakeRun(save, constantRng());
    run.apple.position = { x: 12, y: 10 };
    queueArcadeDirection(run, 'left');
    expect(run.queuedDirection).toBeUndefined();
    queueArcadeDirection(run, 'up');
    queueArcadeDirection(run, 'down');
    tickArcadeSnake(run, save, constantRng());
    expect(run.direction).toBe('up');
    expect(run.snake[0]).toEqual({ x: 6, y: 5 });
  });

  it('buffers a fast two-turn corner sequence across movement ticks', () => {
    const save = createDefaultArcadeSnakeSaveData();
    const run = createArcadeSnakeRun(save, constantRng());
    run.apple.position = { x: 12, y: 10 };
    queueArcadeDirection(run, 'up');
    queueArcadeDirection(run, 'left');
    tickArcadeSnake(run, save, constantRng());
    expect(run.direction).toBe('up');
    expect(run.snake[0]).toEqual({ x: 6, y: 5 });
    tickArcadeSnake(run, save, constantRng());
    expect(run.direction).toBe('left');
    expect(run.snake[0]).toEqual({ x: 5, y: 5 });
  });

  it('ends on self and barrier collision', () => {
    const save = createDefaultArcadeSnakeSaveData();
    const selfRun = createArcadeSnakeRun(save, constantRng());
    selfRun.snake = [
      { x: 4, y: 4 },
      { x: 4, y: 5 },
      { x: 3, y: 5 },
      { x: 3, y: 4 },
      { x: 3, y: 3 },
    ];
    selfRun.direction = 'left';
    selfRun.apple.position = { x: 10, y: 10 };
    expect(tickArcadeSnake(selfRun, save, constantRng()).events).toContainEqual({
      type: 'game-over',
      reason: 'self',
    });

    const barrierRun = createArcadeSnakeRun(save, constantRng());
    barrierRun.barriers = [{ x: 7, y: 6 }];
    barrierRun.apple.position = { x: 10, y: 10 };
    expect(tickArcadeSnake(barrierRun, save, constantRng()).events).toContainEqual({
      type: 'game-over',
      reason: 'barrier',
    });
  });

  it('kills the snake when a shielded apple is approached from a protected direction', () => {
    const save = createDefaultArcadeSnakeSaveData();
    const run = createArcadeSnakeRun(save, constantRng());
    run.apple = {
      type: 'barrier',
      position: { x: 7, y: 6 },
      spawnedAtTick: 0,
      protectedDirections: ['right'],
    };
    expect(tickArcadeSnake(run, save, constantRng()).events).toContainEqual({
      type: 'game-over',
      reason: 'shielded',
    });
  });

  it('ends on a deleted tile', () => {
    const save = createDefaultArcadeSnakeSaveData();
    const run = createArcadeSnakeRun(save, constantRng());
    run.apple.position = { x: 12, y: 10 };
    run.deletedTiles = [{ x: 7, y: 6 }];
    expect(tickArcadeSnake(run, save, constantRng()).events).toContainEqual({
      type: 'game-over',
      reason: 'deleted',
    });
  });
});

describe('arcade apples and stats', () => {
  it.each([
    ['regular', 1],
    ['golden', 3],
    ['scurry', 2],
    ['barrier', 2],
    ['corrupted', 1],
  ] as const)('%s apple scores and grows', (type, score) => {
    const save = createDefaultArcadeSnakeSaveData();
    const run = createArcadeSnakeRun(save, constantRng());
    run.apple = { type, position: { x: 7, y: 6 }, spawnedAtTick: 0 };
    tickArcadeSnake(run, save, constantRng());
    expect(run.score).toBe(score);
    expect(run.snake).toHaveLength(4);
    if (type === 'corrupted') {
      expect(run.corruptionThisRun).toBe(5);
      expect(save.stats.corruption).toBe(5);
      expect(save.stats.corruptedApplesEaten).toBe(1);
    }
  });

  it('despawns an ignored corrupted apple without increasing corruption', () => {
    const save = createDefaultArcadeSnakeSaveData();
    const run = createArcadeSnakeRun(save, constantRng());
    run.apple = {
      type: 'corrupted',
      position: { x: 12, y: 10 },
      spawnedAtTick: 0,
      expiresAtTick: 1,
    };
    const events = tickArcadeSnake(run, save, constantRng());
    expect(events.events).toContainEqual({ type: 'corrupted-apple-despawned' });
    expect(save.stats.corruption).toBe(0);
    expect(save.stats.corruptedApplesEaten).toBe(0);
  });

  it('does not respawn an apple on a deleted tile', () => {
    const save = createDefaultArcadeSnakeSaveData();
    const run = createArcadeSnakeRun(save, constantRng());
    run.deletedTiles = [{ x: 15, y: 11 }];
    run.apple = { type: 'regular', position: { x: 7, y: 6 }, spawnedAtTick: 0 };
    tickArcadeSnake(run, save, constantRng());
    expect(run.apple.position).not.toEqual({ x: 15, y: 11 });
  });

  it('guarantees a disguised corrupted apple once a run reaches score 15', () => {
    const save = createDefaultArcadeSnakeSaveData();
    const run = createArcadeSnakeRun(save, constantRng());
    run.score = 14;
    run.apple = { type: 'regular', position: { x: 7, y: 6 }, spawnedAtTick: 0 };
    tickArcadeSnake(run, save, constantRng());
    expect(run.score).toBe(15);
    expect(run.apple.type).toBe('corrupted');
    expect(run.corruptedAppleSpawnedThisRun).toBe(true);
  });

  it('adds one persistent corruption for every run after the first', () => {
    const save = createDefaultArcadeSnakeSaveData();
    createArcadeSnakeRun(save, constantRng());
    expect(save.stats.corruption).toBe(0);
    createArcadeSnakeRun(save, constantRng());
    expect(save.stats.corruption).toBe(1);
  });

  it('resets quest caps saved by the old premature-unlock implementation', () => {
    const migrated = normalizeArcadeSnakeSaveData({
      version: 1,
      questCapUnlocked: true,
      questCapEquipped: true,
    });
    expect(migrated.questCapUnlocked).toBe(false);
    expect(migrated.questCapEquipped).toBe(false);
    expect(migrated.version).toBe(2);
  });

  it('finalizes lifetime, high score, loops, and completed quests', () => {
    const save = createDefaultArcadeSnakeSaveData();
    const run = createArcadeSnakeRun(save, constantRng());
    run.score = 24;
    run.loopsThisRun = 3;
    run.quests = [
      {
        id: 'reach-score',
        label: 'Reach score 20',
        progress: 20,
        target: 20,
        completed: true,
        rewardXp: 10,
        startedAtScore: 5,
        startedAtTick: 5,
      },
    ];
    finalizeArcadeRun(save, run);
    expect(save.stats.lifetimeScore).toBe(24);
    expect(save.stats.highScore).toBe(24);
    expect(save.stats.totalLoops).toBe(3);
    expect(save.stats.questsCompleted).toBe(1);
  });

  it('purchases the home cabinet only with enough score', () => {
    const save = createDefaultArcadeSnakeSaveData();
    expect(purchaseHomeArcadeCabinet(save, 199)).toEqual({ ok: false, score: 199 });
    expect(save.hasHomeCabinet).toBe(false);
    expect(purchaseHomeArcadeCabinet(save, 250)).toEqual({ ok: true, score: 50 });
    expect(save.hasHomeCabinet).toBe(true);
  });

  it('converts arcade score to half main-game score rounded up', () => {
    expect(getArcadeMainGamePayout(0)).toBe(0);
    expect(getArcadeMainGamePayout(1)).toBe(1);
    expect(getArcadeMainGamePayout(7)).toBe(4);
    expect(getArcadeMainGamePayout(20)).toBe(10);
  });

  it('banks cumulative arcade payout exactly once as score increases', () => {
    let banked = 0;
    const paid: number[] = [];
    for (const score of [1, 2, 3, 4, 5, 20, 20]) {
      const payout = getArcadeUnbankedPayout(score, banked);
      paid.push(payout);
      banked += payout;
    }
    expect(paid).toEqual([1, 0, 1, 0, 1, 7, 0]);
    expect(banked).toBe(10);
  });
});
