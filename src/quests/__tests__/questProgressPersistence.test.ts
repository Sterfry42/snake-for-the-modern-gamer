import { describe, expect, it, vi } from 'vitest';
import { CountingQuest } from '../definitions/countingQuest.js';
import type { QuestRuntime } from '../quest.js';
import { QuestRegistry } from '../questRegistry.js';
import { QuestController } from '../../systems/questController.js';

describe('quest progress save restoration', () => {
  it('keeps the original acceptance baseline when an active counter quest is loaded', () => {
    const flags = new Map<string, unknown>([['applesEaten', 0]]);
    const runtime: QuestRuntime = {
      getSnakeLength: () => 3,
      getScore: () => 0,
      addScore: vi.fn(),
      addItem: vi.fn(),
      addCosmeticReward: vi.fn(),
      getFlag: <T>(key: string) => flags.get(key) as T | undefined,
      setFlag: (key, value) => flags.set(key, value),
    };
    const registry = new QuestRegistry();
    const quest = new CountingQuest('eat-5-apples', 'Apples', 'Eat three apples.', 'applesEaten', 3);
    registry.register(quest);
    const original = new QuestController(registry, { initialQuestCount: 0 });

    expect(original.acceptSpecificQuestById(quest.id, runtime, 'giver-room')).toBe(quest);
    runtime.setFlag('applesEaten', 2);

    const saved = {
      active: original.getActive().map((entry) => entry.id),
      accepted: original.getAcceptedIds(),
      completed: original.getCompletedIds(),
    };
    const restored = new QuestController(registry, { initialQuestCount: 0 });
    restored.restoreQuestIds(saved, runtime);

    expect(runtime.getFlag<Record<string, number>>('quest.baseline.eat-5-apples')).toEqual({
      applesEaten: 0,
    });
    runtime.setFlag('applesEaten', 3);
    expect(restored.handleCompletions(runtime)).toEqual([quest]);
    expect(restored.getCompletedIds()).toEqual([quest.id]);
  });
});
