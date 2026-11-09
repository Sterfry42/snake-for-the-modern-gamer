import { describe, expect, it } from 'vitest';
import { Quest, type QuestRuntime } from '../../quests/quest.js';
import { QuestRegistry } from '../../quests/questRegistry.js';
import { QuestController } from '../questController.js';

class CountingQuest extends Quest {
  constructor(id: string) {
    super(id, id, 'Brew three potions.');
  }

  override isCompleted(runtime: QuestRuntime): boolean {
    return this.progressSinceAccept(runtime, 'potionsCrafted') >= 3;
  }

  protected override baselineKeys(): readonly string[] {
    return ['potionsCrafted'];
  }
}

function createRuntime() {
  const flags = new Map<string, unknown>();
  const runtime: QuestRuntime = {
    getSnakeLength: () => 3,
    getScore: () => 0,
    addScore: () => {},
    addItem: () => {},
    addCosmeticReward: () => {},
    getFlag: <T = unknown>(key: string) => flags.get(key) as T | undefined,
    setFlag: (key, value) => {
      flags.set(key, value);
    },
  };
  return { flags, runtime };
}

describe('quest acceptance and restoration', () => {
  it('preserves a quest progress baseline on save/load hydration', () => {
    const { flags, runtime } = createRuntime();
    const registry = new QuestRegistry();
    const quest = new CountingQuest('three-potions');
    registry.register(quest);
    const controller = new QuestController(registry, { initialQuestCount: 0 });
    quest.onAccept(runtime);
    flags.set('potionsCrafted', 2);

    controller.restoreQuestIds({ active: [quest.id], accepted: [quest.id] }, runtime);
    expect(flags.get('quest.baseline.three-potions')).toEqual({ potionsCrafted: 0 });
    flags.set('potionsCrafted', 3);
    expect(controller.handleCompletions(runtime).map((entry) => entry.id)).toEqual([quest.id]);
  });

  it('does not accept and strand a sixth quest when all slots are occupied', () => {
    const { runtime } = createRuntime();
    const registry = new QuestRegistry();
    const first = new CountingQuest('first');
    const second = new CountingQuest('second');
    registry.register(first);
    registry.register(second);
    const controller = new QuestController(registry, {
      initialQuestCount: 1,
      initialQuestIds: ['first'],
      maxActiveQuests: 1,
    });
    controller.reset(runtime);
    expect(controller.getActive().map((entry) => entry.id)).toEqual(['first']);
    expect(controller.offerSpecificQuestById('second', runtime)?.id).toBe('second');
    expect(controller.acceptOffered(runtime)).toBeNull();
    expect(controller.getOffered()?.id).toBe('second');
    expect(controller.getAcceptedIds()).not.toContain('second');
  });
});
