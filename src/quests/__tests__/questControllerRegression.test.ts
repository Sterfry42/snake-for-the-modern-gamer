import { describe, expect, it, vi } from 'vitest';
import { Quest, type QuestRuntime } from '../quest.js';
import { QuestRegistry } from '../questRegistry.js';
import { QuestController } from '../../systems/questController.js';

class CounterQuest extends Quest {
  constructor(id: string) {
    super(id, id, 'Collect three apples.');
  }
  protected override baselineKeys(): readonly string[] {
    return ['applesEaten'];
  }
  override isCompleted(runtime: QuestRuntime): boolean {
    return this.progressSinceAccept(runtime, 'applesEaten') >= 3;
  }
}

function fixture(maxActiveQuests = 2) {
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
  const first = new CounterQuest('first');
  const second = new CounterQuest('second');
  registry.register(first);
  registry.register(second);
  const controller = new QuestController(registry, { maxActiveQuests });
  return { controller, runtime, first, second };
}

describe('quest controller acceptance and restore', () => {
  it('preserves counting quest baseline across save restoration', () => {
    const { controller, runtime, first } = fixture();
    expect(controller.acceptSpecificQuestById('first', runtime, '1,1,0')).toBe(first);
    runtime.setFlag('applesEaten', 2);
    const save = {
      active: controller.getActive().map((q) => q.id),
      accepted: controller.getAcceptedIds(),
      completed: controller.getCompletedIds(),
    };
    controller.restoreQuestIds(save, runtime);
    runtime.setFlag('applesEaten', 3);
    expect(controller.handleCompletions(runtime)).toEqual([first]);
  });

  it('never silently accepts a quest that cannot enter the active list', () => {
    const { controller, runtime, first, second } = fixture(1);
    expect(controller.acceptSpecificQuestById('first', runtime, '1,1,0')).toBe(first);
    expect(controller.acceptSpecificQuestById('second', runtime, '1,1,0')).toBeNull();
    expect(controller.getAcceptedIds()).toEqual(['first']);
    expect(controller.getActive()).toEqual([first]);
    runtime.setFlag('applesEaten', 3);
    controller.handleCompletions(runtime);
    // The pending offer may be accepted after a slot becomes available.
    expect(controller.acceptOffered(runtime)).toBe(second);
    expect(controller.getCompletedIds()).toContain('first');
    expect(controller.getActive()).toEqual([second]);
  });
});
