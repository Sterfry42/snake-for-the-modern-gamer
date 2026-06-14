import { describe, expect, it } from 'vitest';
import { createDefaultAchievementState, MemoryAchievementStorage } from './achievementStorage.js';

describe('achievement storage', () => {
  it('round trips independent copies', () => {
    const storage = new MemoryAchievementStorage();
    const state = createDefaultAchievementState();
    state.completed.test = { completedAtMs: 1, source: 'local' };
    storage.save(state);
    const loaded = storage.load();
    loaded.completed.other = { completedAtMs: 2, source: 'debug' };
    expect(storage.load().completed).toEqual({ test: { completedAtMs: 1, source: 'local' } });
  });
});
