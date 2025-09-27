import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Quest } from '../quests';
import type SnakeScene from '../src/scenes/snakeScene';

// Mock the console.warn to prevent it from cluttering the test output
vi.spyOn(console, 'warn').mockImplementation(() => {});

describe('Quest System', () => {
    let questSystem: {
        registerQuest: (q: Quest) => void;
        getAvailableQuests: (completedQuestIds: string[]) => Quest[];
        _clearQuests: () => void;
    };

    // Mock quests
    const quest1: Quest = {
        id: 'quest-1',
        label: 'Quest 1',
        description: 'First quest',
        isCompleted: () => false,
    };

    const quest2: Quest = {
        id: 'quest-2',
        label: 'Quest 2',
        description: 'Second quest',
        isCompleted: () => false,
    };

    beforeEach(async () => {
        // Isolate modules for each test to ensure a clean state
        questSystem = await vi.importActual('../quests.ts');
        // This is a helper to reset the internal state of the module
        questSystem._clearQuests();
    });

    it('should register a new quest', () => {
        questSystem.registerQuest(quest1);
        const available = questSystem.getAvailableQuests([]);
        expect(available).toHaveLength(1);
        expect(available[0]).toEqual(quest1);
    });

    it('should not register a quest with a duplicate id', () => {
        questSystem.registerQuest(quest1);
        questSystem.registerQuest({ ...quest1, label: 'Duplicate Quest' });
        const available = questSystem.getAvailableQuests([]);
        expect(available).toHaveLength(1);
        expect(console.warn).toHaveBeenCalledWith('Quest with id "quest-1" is already registered. Skipping.');
    });

    it('should return available quests, filtering out completed ones', () => {
        questSystem.registerQuest(quest1);
        questSystem.registerQuest(quest2);

        const available = questSystem.getAvailableQuests(['quest-1']);
        expect(available).toHaveLength(1);
        expect(available[0].id).toBe('quest-2');
    });
});