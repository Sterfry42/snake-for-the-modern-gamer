import { describe, expect, it } from 'vitest';
import { AchievementManager } from './achievementManager.js';
import { MemoryAchievementStorage } from './achievementStorage.js';
import type { AchievementDefinition, AchievementSnapshot } from './achievementTypes.js';

const definitions: AchievementDefinition[] = [
  { id: 'root', name: 'Root', description: 'Root', category: 'core', difficulty: 'easy', tree: { x: 0, y: 0, section: 'test' }, icon: { kind: 'apple', fallbackGlyph: 'A' }, criterion: { kind: 'event', eventType: 'apple:eaten' }, archipelago: { enabledByDefault: true } },
  { id: 'locked', name: 'Locked', description: 'Locked', category: 'stats', difficulty: 'hard', prerequisites: ['root'], tree: { x: 1, y: 0, section: 'test' }, icon: { kind: 'snake', fallbackGlyph: 'S' }, criterion: { kind: 'score', target: 10 }, progress: { target: 10, label: 'score' } },
];

const snapshot = (score: number): AchievementSnapshot => ({ score, length: 1, roomsVisited: 1, discoveredBiomeIds: [], inventoryItemIds: [], equippedSlots: [], cardsOwned: {}, artifactsOwned: [], skillTreeCompletedBranchIds: [] });

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
    manager.evaluateSnapshot(snapshot(4));
    expect(new AchievementManager(definitions, storage).getProgress('locked')?.current).toBe(4);
  });
});
