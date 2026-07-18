import { describe, it, expect, beforeEach } from 'vitest';
import { DreamPuzzleManager, DREAM_PUZZLE_DEFINITIONS } from '../DreamPuzzles.js';

function createMockRng(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return s / 2147483647;
  };
}

describe('DreamPuzzleManager', () => {
  let manager: DreamPuzzleManager;

  beforeEach(() => {
    manager = new DreamPuzzleManager();
  });

  describe('initialization', () => {
    it('has predefined puzzle definitions', () => {
      expect(DREAM_PUZZLE_DEFINITIONS.length).toBeGreaterThan(0);
    });

    it('starts with no solved puzzles', () => {
      expect(manager.getSolvedPuzzles()).toEqual([]);
    });
  });

  describe('puzzle retrieval', () => {
    it('gets puzzle by ID', () => {
      const puzzle = manager.getPuzzleById('color-match-1');
      expect(puzzle).toBeDefined();
      expect(puzzle!.id).toBe('color-match-1');
      expect(puzzle!.type).toBe('colorMatch');
    });

    it('returns undefined for non-existent puzzle', () => {
      expect(manager.getPuzzleById('non-existent')).toBeUndefined();
    });

    it('gets all puzzles', () => {
      const allPuzzles = manager.getAllPuzzles();
      expect(allPuzzles.length).toBe(DREAM_PUZZLE_DEFINITIONS.length);
    });
  });

  describe('color match puzzles', () => {
    it('solves color match puzzle with exact colors', () => {
      const state = manager.createPuzzleState('color-match-1');
      expect(state).not.toBeNull();

      const solution = DREAM_PUZZLE_DEFINITIONS[0].solution.colorMatch!;
      const result = manager.submitColorMatch(
        'color-match-1',
        solution.targetColors,
      );

      expect(result).toBe(true);
      expect(manager.isPuzzleSolved('color-match-1')).toBe(true);
    });

    it('solves color match puzzle within tolerance', () => {
      const state = manager.createPuzzleState('color-match-1');
      expect(state).not.toBeNull();

      const solution = DREAM_PUZZLE_DEFINITIONS[0].solution.colorMatch!;
      // Add some variation within tolerance
      const variedColors = solution.targetColors.map(
        (c) => c + Math.floor(solution.acceptableVariation / 2),
      );
      const result = manager.submitColorMatch('color-match-1', variedColors);

      expect(result).toBe(true);
    });

    it('fails color match puzzle with wrong colors', () => {
      const state = manager.createPuzzleState('color-match-1');
      expect(state).not.toBeNull();

      const result = manager.submitColorMatch('color-match-1', [
        0xffffff,
        0x000000,
        0xff0000,
      ]);

      expect(result).toBe(false);
      expect(manager.isPuzzleSolved('color-match-1')).toBe(false);
    });

    it('tracks attempts', () => {
      manager.createPuzzleState('color-match-1');

      manager.submitColorMatch('color-match-1', [0xffffff, 0x000000, 0xff0000]);
      manager.submitColorMatch('color-match-1', [0x111111, 0x222222, 0x333333]);

      const state = manager.getActivePuzzle('color-match-1');
      expect(state!.attempts).toBe(2);
    });
  });

  describe('symbol arrangement puzzles', () => {
    it('solves symbol arrangement puzzle with correct order', () => {
      const state = manager.createPuzzleState('symbol-arrange-1');
      expect(state).not.toBeNull();

      const solution = DREAM_PUZZLE_DEFINITIONS[2].solution.symbolArrange!;
      const result = manager.submitSymbolArrangement(
        'symbol-arrange-1',
        solution.correctOrder,
      );

      expect(result).toBe(true);
      expect(manager.isPuzzleSolved('symbol-arrange-1')).toBe(true);
    });

    it('fails symbol arrangement puzzle with wrong order', () => {
      const state = manager.createPuzzleState('symbol-arrange-1');
      expect(state).not.toBeNull();

      const solution = DREAM_PUZZLE_DEFINITIONS[2].solution.symbolArrange!;
      // Wrong order
      const wrongOrder = [...solution.correctOrder].reverse();
      const result = manager.submitSymbolArrangement(
        'symbol-arrange-1',
        wrongOrder,
      );

      expect(result).toBe(false);
    });
  });

  describe('apple sequence puzzles', () => {
    it('solves apple sequence puzzle with correct sequence', () => {
      const state = manager.createPuzzleState('apple-sequence-1');
      expect(state).not.toBeNull();

      const solution = DREAM_PUZZLE_DEFINITIONS[4].solution.appleSequence!;
      const result = manager.submitAppleSequence(
        'apple-sequence-1',
        solution.sequence,
      );

      expect(result).toBe(true);
      expect(manager.isPuzzleSolved('apple-sequence-1')).toBe(true);
    });

    it('fails apple sequence puzzle with wrong sequence', () => {
      const state = manager.createPuzzleState('apple-sequence-1');
      expect(state).not.toBeNull();

      const result = manager.submitAppleSequence('apple-sequence-1', [
        'nightmare',
        'nightmare',
        'nightmare',
      ]);

      expect(result).toBe(false);
    });
  });

  describe('puzzle rewards', () => {
    it('returns reward for solved puzzle', () => {
      // Solve the puzzle first
      const solution = DREAM_PUZZLE_DEFINITIONS[0].solution.colorMatch!;
      manager.createPuzzleState('color-match-1');
      manager.submitColorMatch('color-match-1', solution.targetColors);

      const reward = manager.getReward('color-match-1');
      expect(reward).not.toBeNull();
      expect(reward!.shards).toBe(10);
      expect(reward!.loreFragment).toBe('lore.dream.color_origin');
    });

    it('returns null for unsolved puzzle', () => {
      const reward = manager.getReward('color-match-1');
      expect(reward).toBeNull();
    });
  });

  describe('puzzle state management', () => {
    it('creates puzzle state', () => {
      const state = manager.createPuzzleState('color-match-1');
      expect(state).not.toBeNull();
      expect(state!.isSolved).toBe(false);
      expect(state!.progress).toBe(0);
      expect(state!.attempts).toBe(0);
    });

    it('does not create state for already solved puzzle', () => {
      const solution = DREAM_PUZZLE_DEFINITIONS[0].solution.colorMatch!;
      manager.createPuzzleState('color-match-1');
      manager.submitColorMatch('color-match-1', solution.targetColors);

      const newState = manager.createPuzzleState('color-match-1');
      expect(newState).toBeNull();
    });

    it('does not create state for non-existent puzzle', () => {
      const state = manager.createPuzzleState('non-existent');
      expect(state).toBeNull();
    });
  });

  describe('generated puzzles', () => {
    it('generates color match puzzle', () => {
      const rng = createMockRng(42);
      const puzzle = manager.generateRandomPuzzle(rng, 1);

      expect(puzzle.type).toBe('colorMatch');
      expect(puzzle.difficulty).toBe(1);
      expect(puzzle.reward.shards).toBeGreaterThan(0);
    });

    it('generates symbol arrangement puzzle', () => {
      // Generate multiple puzzles to find a symbolArrange one
      let foundSymbolPuzzle = false;
      const rng = createMockRng(42);
      for (let i = 0; i < 50; i++) {
        const puzzle = manager.generateRandomPuzzle(rng, 2);
        if (puzzle.type === 'symbolArrange') {
          foundSymbolPuzzle = true;
          expect(puzzle.difficulty).toBe(2);
          break;
        }
      }
      expect(foundSymbolPuzzle).toBe(true);
    });

    it('generates apple sequence puzzle', () => {
      // Generate multiple puzzles to find an appleSequence one
      let foundSequencePuzzle = false;
      const rng = createMockRng(123);
      for (let i = 0; i < 50; i++) {
        const puzzle = manager.generateRandomPuzzle(rng, 3);
        if (puzzle.type === 'appleSequence') {
          foundSequencePuzzle = true;
          expect(puzzle.difficulty).toBe(3);
          break;
        }
      }
      expect(foundSequencePuzzle).toBe(true);
    });

    it('increases puzzle difficulty with parameter', () => {
      const rng = createMockRng(42);
      const easyPuzzle = manager.generateRandomPuzzle(rng, 1);
      const hardPuzzle = manager.generateRandomPuzzle(rng, 5);

      expect(easyPuzzle.difficulty).toBe(1);
      expect(hardPuzzle.difficulty).toBe(5);
    });
  });
});
