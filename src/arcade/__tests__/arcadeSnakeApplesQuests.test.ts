import { describe, expect, it } from 'vitest';
import {
  chooseArcadeAppleType,
  getCorruptedAppleChance,
  spawnArcadeApple,
} from '../arcadeSnakeApples.js';
import { createArcadeSnakeRun } from '../arcadeSnakeLogic.js';
import { maybeAddArcadeQuest, updateArcadeQuests } from '../arcadeSnakeQuests.js';
import { createDefaultArcadeSnakeSaveData } from '../arcadeSnakeTypes.js';

describe('arcade apple spawning', () => {
  it('only chooses regular apples before score 5 without corruption eligibility', () => {
    const save = createDefaultArcadeSnakeSaveData();
    expect(chooseArcadeAppleType(save.stats, 4, () => 0.01)).toBe('regular');
  });

  it('unlocks modern apples after score 5', () => {
    const save = createDefaultArcadeSnakeSaveData();
    expect(chooseArcadeAppleType(save.stats, 5, () => 0.7)).toBe('golden');
    expect(chooseArcadeAppleType(save.stats, 5, () => 0.82)).toBe('scurry');
    expect(chooseArcadeAppleType(save.stats, 5, () => 0.95)).toBe('barrier');
  });

  it('scales and caps corrupted apple chance', () => {
    const save = createDefaultArcadeSnakeSaveData();
    expect(getCorruptedAppleChance(save.stats, 0)).toBe(0);
    save.stats.playCount = 3;
    const baseline = getCorruptedAppleChance(save.stats, 0);
    save.stats.corruption = 999;
    save.stats.corruptedApplesEaten = 999;
    expect(getCorruptedAppleChance(save.stats, 0)).toBeGreaterThan(baseline);
    expect(getCorruptedAppleChance(save.stats, 0)).toBe(0.18);
  });

  it('never spawns on the snake, barriers, or immediate next tile when avoidable', () => {
    const snake = [
      { x: 6, y: 6 },
      { x: 5, y: 6 },
    ];
    const barriers = [{ x: 7, y: 7 }];
    const apple = spawnArcadeApple('regular', 0, snake, barriers, () => 0);
    expect(snake).not.toContainEqual(apple.position);
    expect(barriers).not.toContainEqual(apple.position);
    expect(Math.abs(apple.position.x - 6) + Math.abs(apple.position.y - 6)).toBeGreaterThan(1);
  });

  it('gives special apples their hidden tells and directional shields', () => {
    const corrupted = spawnArcadeApple('corrupted', 0, [{ x: 6, y: 6 }], [], () => 0);
    expect(corrupted.visualTell).toBe('scanline');
    const barrier = spawnArcadeApple('barrier', 0, [{ x: 6, y: 6 }], [], () => 0);
    expect(barrier.protectedDirections?.length).toBeGreaterThanOrEqual(1);
  });
});

describe('arcade quests', () => {
  it('does not add quests before score 5 and caps active quests at 2', () => {
    const save = createDefaultArcadeSnakeSaveData();
    const run = createArcadeSnakeRun(save, () => 0.99);
    expect(maybeAddArcadeQuest(run, () => 0)).toEqual([]);
    run.score = 5;
    maybeAddArcadeQuest(run, () => 0);
    run.score = 10;
    maybeAddArcadeQuest(run, () => 0);
    run.score = 20;
    maybeAddArcadeQuest(run, () => 0);
    expect(run.quests).toHaveLength(2);
  });

  it('updates and completes apple and loop quests', () => {
    const save = createDefaultArcadeSnakeSaveData();
    const run = createArcadeSnakeRun(save, () => 0.99);
    run.quests = [
      {
        id: 'golden-apples',
        label: 'Eat 2 golden apples',
        progress: 1,
        target: 2,
        completed: false,
        rewardXp: 10,
        startedAtScore: 5,
        startedAtTick: 1,
      },
      {
        id: 'screen-loops',
        label: 'Loop around the screen 5 times',
        progress: 4,
        target: 5,
        completed: false,
        rewardXp: 10,
        startedAtScore: 5,
        startedAtTick: 1,
      },
    ];
    expect(updateArcadeQuests(run, { type: 'apple', appleType: 'golden' })).toContainEqual({
      type: 'quest-complete',
      questId: 'golden-apples',
      label: 'Eat 2 golden apples',
    });
    expect(updateArcadeQuests(run, { type: 'loop' })).toContainEqual({
      type: 'quest-complete',
      questId: 'screen-loops',
      label: 'Loop around the screen 5 times',
    });
    expect(run.xp).toBe(20);
    expect(run.questsCompletedThisRun).toBe(2);
    expect(run.arcadeHat).toBe('None');
  });
});
