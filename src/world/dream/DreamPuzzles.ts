/**
 * Dream Puzzles
 *
 * The wise old snake's dream puzzles:
 * - The wise old snake's first puzzle was matching colors of floating apples
 * - The wise old snake's second puzzle was arranging symbols in dream order
 * - The wise old snake's third puzzle was a sequence of apple types to eat
 * - The wise old snake's puzzle room was shaped like a giant question mark
 * - The wise old snake's puzzle solution was always "eat the apple"
 * - The wise old snake's puzzle master was a dream version of itself
 * - The wise old snake's puzzle difficulty was "mildly confusing but fair"
 * - The wise old snake's puzzle trophy was a golden dream apple
 * - The wise old snake's puzzle book had 999 puzzles, all with the same answer
 * - The wise old snake considers dream puzzles "a nice change of pace"
 */
import type { Vector2Like } from '../../core/math.js';
import type { RandomGenerator } from '../../core/rng.js';
import type {
  PuzzleDefinition,
  PuzzleSolution,
  PuzzleType,
  ActivePuzzleState,
  PuzzleReward,
} from './types.js';

// ─── Puzzle Definitions ────────────────────────────────────────────────────────

export const DREAM_PUZZLE_DEFINITIONS: PuzzleDefinition[] = [
  // Color Match Puzzles
  {
    id: 'color-match-1',
    type: 'colorMatch',
    difficulty: 1,
    solution: {
      colorMatch: {
        targetColors: [0xb19cd9, 0x87ceeb, 0x98fb98],
        acceptableVariation: 30,
      },
    },
    reward: {
      shards: 10,
      loreFragment: 'lore.dream.color_origin',
    },
  },
  {
    id: 'color-match-2',
    type: 'colorMatch',
    difficulty: 2,
    solution: {
      colorMatch: {
        targetColors: [0xffd700, 0xff69b4, 0x8b0000, 0x4a0000],
        acceptableVariation: 20,
      },
    },
    reward: {
      shards: 20,
      loreFragment: 'lore.dream.color_memory',
    },
  },
  // Symbol Arrange Puzzles
  {
    id: 'symbol-arrange-1',
    type: 'symbolArrange',
    difficulty: 1,
    solution: {
      symbolArrange: {
        symbols: ['🌙', '⭐', '☁️', '🍎'],
        correctOrder: ['🌙', '⭐', '☁️', '🍎'],
      },
    },
    reward: {
      shards: 15,
      loreFragment: 'lore.dream.symbol_dream',
    },
  },
  {
    id: 'symbol-arrange-2',
    type: 'symbolArrange',
    difficulty: 2,
    solution: {
      symbolArrange: {
        symbols: ['🐍', '🍎', '🌙', '⭐', '☁️'],
        correctOrder: ['🐍', '🍎', '🌙', '⭐', '☁️'],
      },
    },
    reward: {
      shards: 25,
      loreFragment: 'lore.dream.symbol_snake',
    },
  },
  // Apple Sequence Puzzles
  {
    id: 'apple-sequence-1',
    type: 'appleSequence',
    difficulty: 1,
    solution: {
      appleSequence: {
        sequence: ['dream', 'dream', 'lucid'],
        tolerance: 0,
      },
    },
    reward: {
      shards: 12,
      loreFragment: 'lore.dream.sequence_first',
    },
  },
  {
    id: 'apple-sequence-2',
    type: 'appleSequence',
    difficulty: 2,
    solution: {
      appleSequence: {
        sequence: ['dream', 'nightmare', 'dream', 'lucid', 'dream'],
        tolerance: 0,
      },
    },
    reward: {
      shards: 30,
      loreFragment: 'lore.dream.sequence_cycle',
    },
  },
];

// ─── Puzzle Manager ────────────────────────────────────────────────────────────

export class DreamPuzzleManager {
  private solvedPuzzles: Set<string> = new Set();
  private activePuzzles: Map<string, ActivePuzzleState> = new Map();

  getPuzzleById(id: string): PuzzleDefinition | undefined {
    return DREAM_PUZZLE_DEFINITIONS.find((p) => p.id === id);
  }

  getAllPuzzles(): PuzzleDefinition[] {
    return DREAM_PUZZLE_DEFINITIONS;
  }

  getSolvedPuzzles(): string[] {
    return [...this.solvedPuzzles];
  }

  isPuzzleSolved(id: string): boolean {
    return this.solvedPuzzles.has(id);
  }

  markPuzzleSolved(id: string): void {
    this.solvedPuzzles.add(id);
    this.activePuzzles.delete(id);
  }

  createPuzzleState(puzzleId: string): ActivePuzzleState | null {
    const definition = this.getPuzzleById(puzzleId);
    if (!definition || this.isPuzzleSolved(puzzleId)) {
      return null;
    }

    const state: ActivePuzzleState = {
      definition,
      progress: 0,
      attempts: 0,
      isSolved: false,
      startTime: Date.now(),
    };

    this.activePuzzles.set(puzzleId, state);
    return state;
  }

  getActivePuzzle(puzzleId: string): ActivePuzzleState | null {
    return this.activePuzzles.get(puzzleId) ?? null;
  }

  submitColorMatch(puzzleId: string, submittedColors: number[]): boolean {
    const state = this.activePuzzles.get(puzzleId);
    if (!state || state.definition.type !== 'colorMatch') return false;

    state.attempts++;
    const solution = state.definition.solution.colorMatch;
    if (!solution) return false;

    // Check if submitted colors match target colors within tolerance
    const tolerance = solution.acceptableVariation;
    const allMatch = submittedColors.every((color, index) => {
      const target = solution.targetColors[index];
      if (target === undefined) return false;
      return Math.abs(color - target) <= tolerance;
    });

    if (allMatch) {
      this.completePuzzle(puzzleId);
      return true;
    }

    return false;
  }

  submitSymbolArrangement(puzzleId: string, submittedOrder: string[]): boolean {
    const state = this.activePuzzles.get(puzzleId);
    if (!state || state.definition.type !== 'symbolArrange') return false;

    state.attempts++;
    const solution = state.definition.solution.symbolArrange;
    if (!solution) return false;

    const isCorrect =
      submittedOrder.length === solution.correctOrder.length &&
      submittedOrder.every((symbol, index) => symbol === solution.correctOrder[index]);

    if (isCorrect) {
      this.completePuzzle(puzzleId);
      return true;
    }

    return false;
  }

  submitAppleSequence(puzzleId: string, submittedSequence: string[]): boolean {
    const state = this.activePuzzles.get(puzzleId);
    if (!state || state.definition.type !== 'appleSequence') return false;

    state.attempts++;
    const solution = state.definition.solution.appleSequence;
    if (!solution) return false;

    const isCorrect =
      submittedSequence.length === solution.sequence.length &&
      submittedSequence.every((apple, index) => apple === solution.sequence[index]);

    if (isCorrect) {
      this.completePuzzle(puzzleId);
      return true;
    }

    return false;
  }

  private completePuzzle(puzzleId: string): void {
    this.markPuzzleSolved(puzzleId);
  }

  getReward(puzzleId: string): PuzzleReward | null {
    const definition = this.getPuzzleById(puzzleId);
    if (!definition || !this.isPuzzleSolved(puzzleId)) {
      return null;
    }
    return definition.reward;
  }

  generateRandomPuzzle(rng: RandomGenerator, difficulty: number): PuzzleDefinition {
    const types: PuzzleType[] = ['colorMatch', 'symbolArrange', 'appleSequence'];
    const type = types[Math.floor(rng() * types.length)];

    switch (type) {
      case 'colorMatch': {
        const colorCount = Math.min(3 + difficulty, 7);
        const targetColors: number[] = [];
        for (let i = 0; i < colorCount; i++) {
          targetColors.push(Math.floor(rng() * 0xffffff));
        }
        return {
          id: `generated-color-${Date.now()}`,
          type: 'colorMatch',
          difficulty,
          solution: {
            colorMatch: {
              targetColors,
              acceptableVariation: Math.max(10, 40 - difficulty * 5),
            },
          },
          reward: {
            shards: 10 + difficulty * 5,
          },
        };
      }
      case 'symbolArrange': {
        const symbols = ['🌙', '⭐', '☁️', '🍎', '🐍', '🔮', '🌈'];
        const symbolCount = Math.min(3 + difficulty, symbols.length);
        const selected = symbols.slice(0, symbolCount);
        const shuffled = [...selected];
        for (let i = shuffled.length - 1; i > 0; i--) {
          const j = Math.floor(rng() * (i + 1));
          [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return {
          id: `generated-symbol-${Date.now()}`,
          type: 'symbolArrange',
          difficulty,
          solution: {
            symbolArrange: {
              symbols: selected,
              correctOrder: selected,
            },
          },
          reward: {
            shards: 15 + difficulty * 5,
          },
        };
      }
      case 'appleSequence': {
        const appleTypes = ['dream', 'nightmare', 'lucid'];
        const seqLength = Math.min(3 + difficulty, 7);
        const sequence: string[] = [];
        for (let i = 0; i < seqLength; i++) {
          sequence.push(appleTypes[Math.floor(rng() * appleTypes.length)]);
        }
        return {
          id: `generated-sequence-${Date.now()}`,
          type: 'appleSequence',
          difficulty,
          solution: {
            appleSequence: {
              sequence,
              tolerance: 0,
            },
          },
          reward: {
            shards: 12 + difficulty * 5,
          },
        };
      }
    }
  }
}
