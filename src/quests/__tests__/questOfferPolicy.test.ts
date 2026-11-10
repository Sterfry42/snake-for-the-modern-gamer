import { describe, expect, it, vi } from 'vitest';
import { Quest, type QuestRuntime } from '../quest.js';
import { QuestRegistry } from '../questRegistry.js';
import { QuestController } from '../../systems/questController.js';
import { canOfferQuestFromSource, canRoleOfferQuest, canRoleOfferQuests } from '../questOfferPolicy.js';

class NeverCompletedQuest extends Quest {
  constructor(id: string) {
    super(id, id, `Do ${id}`);
  }
  override isCompleted(): boolean {
    return false;
  }
}

function fixture() {
  const registry = new QuestRegistry();
  for (const id of [
    'eat-5-apples',
    'garden-master',
    'archaeology.first-dig',
    'find-my-baby',
    'tanukis-shenanigans',
    'deep-lying-bouquet',
    'new-quest-with-no-policy',
  ]) registry.register(new NeverCompletedQuest(id));
  const flags = new Map<string, unknown>();
  const runtime: QuestRuntime = {
    getScore: () => 0,
    getSnakeLength: () => 3,
    addScore: vi.fn(),
    addItem: vi.fn(),
    addCosmeticReward: vi.fn(),
    getFlag: <T>(key: string) => flags.get(key) as T | undefined,
    setFlag: (key, value) => flags.set(key, value),
  };
  return { registry, runtime };
}

describe('quest distribution contracts', () => {
  it('never offers personal or staged stories from random houses or starting pools', () => {
    const { registry, runtime } = fixture();
    const controller = new QuestController(registry, { initialQuestCount: 0, rng: () => 0 });
    const house = controller.getOfferableQuests(runtime, 'some-house', 'house').map((q) => q.id);
    const starting = controller.getOfferableQuests(runtime, undefined, 'starting').map((q) => q.id);
    expect(house).toEqual(['eat-5-apples']);
    expect(starting).toEqual(['eat-5-apples']);
    expect(controller.getQuestForGiver('some-house', runtime).quest?.id).toBe('eat-5-apples');
  });

  it('keeps specialist challenges on the board and substantial jobs at the town contact', () => {
    const { registry, runtime } = fixture();
    const controller = new QuestController(registry, { initialQuestCount: 0 });
    const board = controller.getOfferableQuests(runtime, undefined, 'board').map((q) => q.id);
    expect(board).toContain('garden-master');
    expect(board).toContain('archaeology.first-dig');
    expect(board).not.toContain('new-quest-with-no-policy');
    expect(board).not.toContain('find-my-baby');
    expect(board).not.toContain('tanukis-shenanigans');
    expect(board).not.toContain('deep-lying-bouquet');
    expect(controller.getOfferableQuests(runtime, 'town-square', 'town').map((q) => q.id))
      .toEqual(['find-my-baby']);
  });

  it('keeps explicit named-character quest triggers working', () => {
    const { registry, runtime } = fixture();
    const controller = new QuestController(registry, { initialQuestCount: 0 });
    expect(controller.offerSpecificQuestById('tanukis-shenanigans', runtime, 'encounter-room')?.id)
      .toBe('tanukis-shenanigans');
    // A named encounter's original giver retains their own quest even though
    // random houses and public boards cannot originate it.
    expect(controller.getQuestForGiver('encounter-room', runtime)).toMatchObject({
      quest: { id: 'tanukis-shenanigans' },
      state: 'available',
    });
    expect(controller.acceptOffered(runtime)?.id).toBe('tanukis-shenanigans');
    expect(controller.getQuestForGiver('encounter-room', runtime).state).toBe('active');
  });

  it('rejects unclassified new quests from every public distribution source', () => {
    expect(canOfferQuestFromSource(
      new NeverCompletedQuest('new-quest-with-no-policy'), 'house',
    )).toBe(false);
    expect(canOfferQuestFromSource(
      new NeverCompletedQuest('new-quest-with-no-policy'), 'board',
    )).toBe(false);
  });
  it('gives actual professionals different jobs even when they share a room', () => {
    const { registry, runtime } = fixture();
    registry.register(new NeverCompletedQuest('alchemy-basics'));
    registry.register(new NeverCompletedQuest('hunt-rabbit'));
    registry.register(new NeverCompletedQuest('treasure-hunter'));
    const controller = new QuestController(registry, { initialQuestCount: 0, rng: () => 0 });

    const wizard = controller.getQuestForRoleGiver('wizard-a', 'wizard', 'town-square', runtime);
    const guard = controller.getQuestForRoleGiver('guard-b', 'guard', 'town-square', runtime);
    const thief = controller.getQuestForRoleGiver('thief-c', 'thiefContact', 'town-square', runtime);

    expect(wizard.quest?.id).toBe('alchemy-basics');
    expect(guard.quest?.id).toBe('hunt-rabbit');
    expect(thief.quest?.id).toBe('treasure-hunter');
    expect(controller.getQuestForRoleGiver('wizard-a', 'wizard', 'town-square', runtime).quest?.id)
      .toBe('alchemy-basics');
    expect(controller.getQuestForGiver('town-square', runtime).quest?.id).toBe('eat-5-apples');
    expect(canRoleOfferQuests('wizard')).toBe(true);
    expect(canRoleOfferQuest('wizard', 'deep-lying-bouquet')).toBe(false);
    expect(canRoleOfferQuest('guard', 'alchemy-basics')).toBe(false);
  });

  it('lets an actor finish or revisit their own accepted specialist quest', () => {
    const { registry, runtime } = fixture();
    registry.register(new NeverCompletedQuest('alchemy-basics'));
    const controller = new QuestController(registry, { initialQuestCount: 0, rng: () => 0 });
    expect(controller.getQuestForRoleGiver('wizard-a', 'wizard', 'town-square', runtime).state)
      .toBe('available');
    expect(controller.acceptOffered(runtime)?.id).toBe('alchemy-basics');
    expect(controller.getQuestForRoleGiver('wizard-a', 'wizard', 'town-square', runtime)).toMatchObject({
      quest: { id: 'alchemy-basics' },
      state: 'active',
    });
    const restored = new QuestController(registry, { initialQuestCount: 0 });
    restored.restoreQuestIds({
      active: controller.getActive().map((quest) => quest.id),
      accepted: controller.getAcceptedIds(),
      completed: controller.getCompletedIds(),
    }, runtime);
    expect(restored.getQuestForRoleGiver('wizard-a', 'wizard', 'town-square', runtime)).toMatchObject({
      quest: { id: 'alchemy-basics' },
      state: 'active',
    });
  });

});
