import { describe, expect, it, vi } from 'vitest';
import { Quest, type QuestRuntime } from '../quest.js';
import bouquetQuest from '../definitions/deepLyingBouquet.js';
import { QuestRegistry } from '../questRegistry.js';
import { QuestController } from '../../systems/questController.js';

class OrdinaryQuest extends Quest {
  constructor() {
    super('ordinary', 'Ordinary errand', 'An ordinary quest.');
  }

  override isCompleted(): boolean {
    return false;
  }
}

function fixture() {
  const flags = new Map<string, unknown>();
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
  registry.register(bouquetQuest);
  return { registry, runtime };
}

describe('quest acquisition ownership', () => {
  it('never hands a wedding proposal to a random room quest giver', () => {
    const { registry, runtime } = fixture();
    const controller = new QuestController(registry, { initialQuestCount: 0, rng: () => 0 });

    expect(controller.getOfferableQuests(runtime, 'random-house')).toEqual([]);
    expect(controller.getQuestForGiver('random-house', runtime)).toEqual({
      quest: null,
      state: 'none',
    });
    expect(controller.getOfferableQuests(runtime)).toEqual([]);
  });

  it('does not randomly assign a scripted proposal as an initial quest', () => {
    const { registry, runtime } = fixture();
    registry.register(new OrdinaryQuest());
    const controller = new QuestController(registry, {
      initialQuestCount: 2,
      initialQuestIds: ['deep-lying-bouquet', 'ordinary'],
      rng: () => 0,
    });

    controller.reset(runtime);
    expect(controller.getActive().map((quest) => quest.id)).toEqual(['ordinary']);
    expect(controller.getAcceptedIds()).not.toContain('deep-lying-bouquet');
  });

  it('still allows the relationship system to start the real wedding quest explicitly', () => {
    const { registry, runtime } = fixture();
    const controller = new QuestController(registry, { initialQuestCount: 0 });
    expect(controller.offerSpecificQuestById('deep-lying-bouquet', runtime, 'wedding-room')).toBe(
      bouquetQuest,
    );
    expect(controller.acceptOffered(runtime)).toBe(bouquetQuest);
    expect(controller.getActive().map((quest) => quest.id)).toContain('deep-lying-bouquet');
  });
});
