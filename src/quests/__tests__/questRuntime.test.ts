import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Quest } from '../quest.js';

/** Minimal quest subclass for registry behavior tests. */
class TestQuest extends Quest {
  constructor(id: string, label: string, description: string) {
    super(id, label, description);
  }

  isCompleted(): boolean {
    return false;
  }
}

// Mock the console.warn to prevent it from cluttering the test output
vi.spyOn(console, 'warn').mockImplementation(() => {});

describe('Quest System', () => {
  let questSystem: {
    registerQuest: (q: Quest) => void;
    getAvailableQuests: (completedQuestIds: string[]) => Quest[];
    _clearQuests: () => void;
  };

  beforeEach(async () => {
    // Isolate modules for each test to ensure a clean state
    questSystem = await vi.importActual('../questRuntime.js');
    // This is a helper to reset the internal state of the module
    questSystem._clearQuests();
  });

  it('should register a new quest', () => {
    const quest1 = new TestQuest('quest-1', 'Quest 1', 'First quest');
    questSystem.registerQuest(quest1);
    const available = questSystem.getAvailableQuests([]);
    expect(available).toHaveLength(1);
    expect(available[0]).toEqual(quest1);
  });

  it('should not register a quest with a duplicate id', () => {
    questSystem.registerQuest(new TestQuest('quest-1', 'Quest 1', 'First quest'));
    questSystem.registerQuest(new TestQuest('quest-1', 'Duplicate Quest', 'Second quest'));
    const available = questSystem.getAvailableQuests([]);
    expect(available).toHaveLength(1);
    expect(console.warn).toHaveBeenCalledWith(
      'Quest with id "quest-1" is already registered. Skipping.',
    );
  });

  it('should return available quests, filtering out completed ones', () => {
    questSystem.registerQuest(new TestQuest('quest-1', 'Quest 1', 'First quest'));
    questSystem.registerQuest(new TestQuest('quest-2', 'Quest 2', 'Second quest'));

    const available = questSystem.getAvailableQuests(['quest-1']);
    expect(available).toHaveLength(1);
    expect(available[0].id).toBe('quest-2');
  });
});
