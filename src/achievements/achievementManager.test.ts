import { describe, expect, it } from 'vitest';
import { AchievementManager } from './achievementManager.js';
import { MemoryAchievementStorage } from './achievementStorage.js';
import type { AchievementDefinition, AchievementSnapshot } from './achievementTypes.js';

const definitions: AchievementDefinition[] = [
  {
    id: 'root',
    name: 'Root',
    description: 'Root',
    category: 'core',
    difficulty: 'easy',
    tree: { x: 0, y: 0, section: 'test' },
    icon: { kind: 'apple', fallbackGlyph: 'A' },
    criterion: { kind: 'event', eventType: 'apple:eaten' },
    archipelago: { enabledByDefault: true },
  },
  {
    id: 'locked',
    name: 'Locked',
    description: 'Locked',
    category: 'stats',
    difficulty: 'hard',
    prerequisites: ['root'],
    tree: { x: 1, y: 0, section: 'test' },
    icon: { kind: 'snake', fallbackGlyph: 'S' },
    criterion: { kind: 'snapshot', field: 'score', target: 10 },
    progress: { target: 10, label: 'score' },
  },
];

const snapshot = (score: number): AchievementSnapshot => ({
  score,
  length: 1,
  roomsVisited: 1,
  discoveredBiomeIds: [],
  waterTilesSwum: 0,
  discoverableBiomeIds: [],
  wantedLevel: 0,
  questsCompleted: 0,
  treasuresCollected: 0,
  equippedSlots: [],
  cardIdsOwned: [],
  fishTypeIdsCaught: [],
  artifactsOwned: [],
  skillTreeCompletedBranchIds: [],
  skillTreeBranchCount: 3,
  hotSurvivalMs: 0,
  coldSurvivalMs: 0,
  heatResistance: 0,
  coldResistance: 0,
  cowbellTilesWalked: 0,
  wardDamageTypesHeld: 0,
  trainZonesTraveled: 0,
  maxSpecialStat: 5,
});

describe('AchievementManager', () => {
  it('completes locked achievements early and is idempotent', () => {
    const manager = new AchievementManager(definitions, new MemoryAchievementStorage());
    expect(manager.getAchievementStatus('locked')).toBe('locked');
    expect(manager.evaluateSnapshot(snapshot(10)).map((result) => result.id)).toEqual(['locked']);
    expect(manager.getAchievementStatus('locked')).toBe('completed');
    expect(manager.evaluateSnapshot(snapshot(20))).toEqual([]);
  });

  it('emits AP metadata and persists progress', () => {
    const storage = new MemoryAchievementStorage();
    const manager = new AchievementManager(definitions, storage);
    const [unlock] = manager.recordEvent({ type: 'apple:eaten', appleTypeId: 'normal' });
    expect(unlock.archipelago?.locationKey).toBe('achievement_root');
    expect(unlock.scoreReward).toBe(30);
    manager.evaluateSnapshot(snapshot(4));
    expect(new AchievementManager(definitions, storage).getProgress('locked')?.current).toBe(4);
  });

  it('clears local achievements between runs but preserves server-confirmed achievements', () => {
    const manager = new AchievementManager(definitions, new MemoryAchievementStorage());
    manager.complete('root');
    manager.resetForNewRun();
    expect(manager.isCompleted('root')).toBe(false);

    manager.complete('root');
    manager.markApSubmitted('root');
    manager.resetForNewRun();
    expect(manager.isCompleted('root')).toBe(true);
  });

  it('backfills completion state from checked Archipelago locations', () => {
    const manager = new AchievementManager(definitions, new MemoryAchievementStorage());
    const imported = manager.reconcileApProgress(new Set([42]), (id) =>
      id === 'root' ? 42 : undefined,
    );

    expect(imported.map((unlock) => unlock.id)).toEqual(['root']);
    expect(manager.isCompleted('root')).toBe(true);
    expect(manager.getPendingApAchievementIds()).toEqual([]);
  });

  it('preserves completed pending AP checks when an AP run resets offline', () => {
    const manager = new AchievementManager(definitions, new MemoryAchievementStorage());
    manager.complete('root');
    manager.resetForNewRun(true);
    expect(manager.isCompleted('root')).toBe(true);
    expect(manager.getPendingApAchievementIds()).toEqual(['root']);
  });

  it('restores local completion and progress from a game save snapshot', () => {
    const manager = new AchievementManager(definitions, new MemoryAchievementStorage());
    manager.complete('root');
    manager.evaluateSnapshot(snapshot(7));
    const saved = manager.getState();

    const restored = new AchievementManager(definitions, new MemoryAchievementStorage());
    restored.restoreState(saved);
    expect(restored.isCompleted('root')).toBe(true);
    expect(restored.getProgress('locked')?.current).toBe(7);
  });
});
