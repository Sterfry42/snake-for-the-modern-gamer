import { describe, expect, it, beforeEach, vi } from 'vitest';
import { RhythmMiniGame } from '../RhythmMiniGame.js';
import type { AppleGenre } from '../MusicalAppleMap.js';
import type { RhythmRound, RhythmGameResult } from '../RhythmMiniGame.js';

describe('RhythmMiniGame', () => {
  let game: RhythmMiniGame;

  beforeEach(() => {
    game = new RhythmMiniGame();
  });

  describe('initial state', () => {
    it('starts in idle state', () => {
      expect(game.getState()).toBe('idle');
    });

    it('has no current round', () => {
      expect(game.getCurrentRound()).toBeNull();
    });

    it('has zero score', () => {
      expect(game.getScore()).toBe(0);
    });

    it('has zero progress', () => {
      expect(game.getProgress()).toBe(0);
    });
  });

  describe('startRound', () => {
    it('starts a round for calm genre', () => {
      const round = game.startRound('calm', 1);
      expect(round).not.toBeNull();
      expect(round!.genre).toBe('calm');
      expect(round!.difficulty).toBe(1);
      expect(round!.sequence.length).toBeGreaterThan(0);
    });

    it('starts a round for energetic genre', () => {
      const round = game.startRound('energetic', 1);
      expect(round!.genre).toBe('energetic');
    });

    it('starts a round for mysterious genre', () => {
      const round = game.startRound('mysterious', 1);
      expect(round!.genre).toBe('mysterious');
    });

    it('starts a round for festival genre', () => {
      const round = game.startRound('festival', 1);
      expect(round!.genre).toBe('festival');
    });

    it('creates correct difficulty settings', () => {
      const round1 = game.startRound('calm', 1);
      expect(round1!.timeLimit).toBe(15);
      expect(round1!.sequence.length).toBe(5);

      const round3 = game.startRound('calm', 3);
      expect(round3!.timeLimit).toBe(20);
      expect(round3!.sequence.length).toBe(12);

      const round5 = game.startRound('calm', 5);
      expect(round5!.timeLimit).toBe(25);
      expect(round5!.sequence.length).toBe(20);
    });

    it('clamps difficulty to valid range', () => {
      const round = game.startRound('calm', 10);
      // Difficulty is clamped by Math.min(5, Math.max(1, difficulty))
      expect(round!.difficulty).toBe(5);
    });

    it('calls onGameStart callback', () => {
      let startedRound: RhythmRound | undefined;
      game.onGameStart((round: RhythmRound) => {
        startedRound = round;
      });

      game.startRound('calm', 1);
      expect(startedRound).not.toBeNull();
    });
  });

  describe('onAppleEaten during rhythm game', () => {
    beforeEach(() => {
      game.startRound('calm', 1);
    });

    it('scores correctly for matching sequence', () => {
      const round = game.getCurrentRound();
      if (!round) return;

      // Eat apples in the correct sequence
      // The first apple may have timing issues (lastAppleTime starts at 0)
      // but subsequent ones should score if timing is within acceptable range
      let hitCount = 0;
      for (const appleId of round.sequence) {
        const result = game.onAppleEaten(appleId);
        expect(result.hit).toBe(true);
        if (result.hit) {
          hitCount++;
        }
      }
      // At least some apples should have hit
      expect(hitCount).toBeGreaterThan(0);
    });

    it('returns miss for wrong apple', () => {
      const result = game.onAppleEaten('wrongApple');
      expect(result.hit).toBe(false);
      expect(result.score).toBe(-2);
      expect(result.quality).toBe('miss');
    });

    it('tracks hits and misses', () => {
      const round = game.getCurrentRound();
      if (!round) return;

      // Correct first apple
      game.onAppleEaten(round.sequence[0]);

      // Wrong apple
      game.onAppleEaten('wrongApple');

      expect(game.getProgress()).toBeGreaterThan(0);
    });

    it('completes round when sequence is finished', () => {
      const round = game.getCurrentRound();
      if (!round) return;

      for (const appleId of round.sequence) {
        game.onAppleEaten(appleId);
      }

      expect(game.getState()).toBe('success');
    });

    it('triggers onBeatUpdate callback', () => {
      let beatIndex = 0;
      let totalBeats = 0;
      game.onBeatUpdate((index: number, total: number) => {
        beatIndex = index;
        totalBeats = total;
      });

      const round = game.getCurrentRound();
      if (round && round.sequence.length > 0) {
        game.onAppleEaten(round.sequence[0]);
        expect(beatIndex).toBe(1);
        expect(totalBeats).toBe(round.sequence.length);
      }
    });

    it('triggers onScoreUpdate callback', () => {
      let score = 0;
      let maxScore = 0;
      game.onScoreUpdate((s: number, m: number) => {
        score = s;
        maxScore = m;
      });

      const round = game.getCurrentRound();
      if (round && round.sequence.length > 0) {
        // Eat the full sequence to ensure scoring happens
        for (const appleId of round.sequence) {
          game.onAppleEaten(appleId);
        }
        expect(score).toBeGreaterThanOrEqual(0);
        expect(maxScore).toBeGreaterThan(0);
      }
    });
  });

  describe('checkTimeout', () => {
    it('returns false when not playing', () => {
      expect(game.checkTimeout()).toBe(false);
    });

    it('returns false when round is not timed out', () => {
      game.startRound('calm', 1);
      // Short timeout for testing
      const result = game.checkTimeout();
      expect(result).toBe(false);
    });
  });

  describe('getCurrentBeatInfo', () => {
    beforeEach(() => {
      game.startRound('calm', 1);
    });

    it('returns beat info for current beat', () => {
      const info = game.getCurrentBeatInfo();
      expect(info).not.toBeNull();
      expect(info!.appleId).toBeDefined();
      expect(info!.windowMs).toBeDefined();
      expect(info!.windowMs.perfect).toBeGreaterThan(0);
      expect(info!.windowMs.good).toBeGreaterThan(0);
      expect(info!.windowMs.ok).toBeGreaterThan(0);
    });

    it('returns null when no current beat', () => {
      // Complete the round
      const round = game.getCurrentRound();
      if (round) {
        for (const appleId of round.sequence) {
          game.onAppleEaten(appleId);
        }
      }
      expect(game.getCurrentBeatInfo()).toBeNull();
    });
  });

  describe('endGame', () => {
    it('triggers onResult callback on success', () => {
      let result: RhythmGameResult | undefined;
      game.onResult((r: RhythmGameResult) => {
        result = r;
      });

      game.startRound('calm', 1);
      const round = game.getCurrentRound();
      if (round) {
        for (const appleId of round.sequence) {
          game.onAppleEaten(appleId);
        }
      }

      expect(result).not.toBeNull();
      expect(result!.success).toBe(true);
      expect(result!.hits).toBeGreaterThan(0);
    });

    it('triggers onResult callback on timeout', () => {
      let result: RhythmGameResult | undefined;
      game.onResult((r: RhythmGameResult) => {
        result = r;
      });

      // Use difficulty 1 which has a 15 second time limit
      game.startRound('calm', 1);
      // End the game manually to trigger the callback
      game['endGame'](false);

      expect(result).not.toBeNull();
      expect(result!.success).toBe(false);
    });
  });

  describe('reset', () => {
    it('resets all state', () => {
      game.startRound('calm', 1);
      game.reset();

      expect(game.getState()).toBe('idle');
      expect(game.getCurrentRound()).toBeNull();
      expect(game.getScore()).toBe(0);
      expect(game.getProgress()).toBe(0);
    });
  });

  describe('getRemainingTime', () => {
    it('returns time limit for new round', () => {
      game.startRound('calm', 1);
      const time = game.getRemainingTime();
      expect(time).toBeGreaterThan(0);
      expect(time).toBeLessThanOrEqual(15);
    });
  });
});
