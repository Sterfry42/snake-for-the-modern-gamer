import { describe, expect, it } from 'vitest';
import { defaultGameConfig } from '../../config/gameConfig.js';
import { QuestRegistry } from '../../quests/questRegistry.js';
import { SnakeGame } from '../snakeGame.js';

interface ModernRunHarness {
  applyModernRunEvent(
    event:
      | {
          kind: 'apple';
          appleTypeId?: string;
          streak: number;
          roomId: string;
          nowMs: number;
        }
      | { kind: 'room'; roomId: string }
      | { kind: 'treasure'; roomId: string }
      | { kind: 'enemy'; roomId: string; humanoid: boolean },
  ): void;
}

describe('modern run integration', () => {
  it('keeps passive modern run rewards disabled during ordinary gameplay events', () => {
    const game = new SnakeGame(defaultGameConfig, new QuestRegistry(), {});
    const harness = game as unknown as ModernRunHarness;
    const startingScore = game.getScore();

    harness.applyModernRunEvent({
      kind: 'apple',
      appleTypeId: 'wasabi',
      streak: 5,
      roomId: game.getCurrentRoom().id,
      nowMs: 500,
    });

    const state = game.getModernRunState();
    const reel = game.getHighlightReelState();
    const feedback = game.getFlag<{ messages?: string[] }>('ui.modernRun');
    const highlight = game.getFlag<{ messages?: string[] }>('ui.highlightReel');

    expect(game.getScore()).toBe(startingScore);
    expect(state.flow.bestTier).toBe(0);
    expect(state.passport.appleTypeIds).toEqual([]);
    expect(reel.clips).toHaveLength(0);
    expect(feedback).toBeUndefined();
    expect(highlight).toBeUndefined();
  });

  it('summarizes active modern run progress for HUD or snapshot consumers', () => {
    const game = new SnakeGame(defaultGameConfig, new QuestRegistry(), {});

    expect(game.getModernRunSummary()).toContain('Snack Sprint');
    expect(game.getModernRunSummary()).toContain('Apple Curator');
    expect(game.getHighlightReelSummary()).toContain('Followers');
    expect(game.getExpeditionBoardSummary()).toContain('Chapter 1');
    expect(game.getModernSynergySummary()).toContain('Unsigned Run');
  });

  it('does not advance the expedition board from ordinary run events', () => {
    const game = new SnakeGame(defaultGameConfig, new QuestRegistry(), {});
    const harness = game as unknown as ModernRunHarness;

    for (let i = 0; i < 6; i += 1) {
      harness.applyModernRunEvent({
        kind: 'apple',
        appleTypeId: 'base',
        streak: 1,
        roomId: game.getCurrentRoom().id,
        nowMs: i,
      });
    }
    for (let i = 0; i < 5; i += 1) {
      harness.applyModernRunEvent({ kind: 'room', roomId: `${i},0,0` });
    }
    for (let i = 0; i < 2; i += 1) {
      harness.applyModernRunEvent({ kind: 'treasure', roomId: `${i},1,0` });
    }

    expect(game.getExpeditionBoardState().chapter).toBe(1);
    expect(game.getFlag('ui.expeditionBoard')).toBeUndefined();
  });

  it('does not unlock cross-system synergies while the passive systems are disabled', () => {
    const game = new SnakeGame(defaultGameConfig, new QuestRegistry(), {});
    const harness = game as unknown as ModernRunHarness;

    for (const appleTypeId of ['base', 'golden', 'wasabi']) {
      harness.applyModernRunEvent({
        kind: 'apple',
        appleTypeId,
        streak: 5,
        roomId: game.getCurrentRoom().id,
        nowMs: game.getScore() + 100,
      });
    }
    for (let i = 0; i < 3; i += 1) {
      harness.applyModernRunEvent({ kind: 'treasure', roomId: `${i},0,0` });
    }

    expect(game.getModernSynergyState().unlockedIds).toEqual([]);
    expect(game.getFlag('ui.modernSynergy')).toBeUndefined();
    expect(
      game
        .getRecentWorldRumors(8)
        .some((rumor) => rumor.tags.includes('modern-run') && rumor.tags.includes('synergy')),
    ).toBe(false);
  });

  it('awards score only after submitting a GoPro highlight recording', () => {
    const game = new SnakeGame(defaultGameConfig, new QuestRegistry(), {});
    const harness = game as unknown as ModernRunHarness;
    const startingScore = game.getScore();

    game.startHighlightRecording(100);
    harness.applyModernRunEvent({
      kind: 'apple',
      appleTypeId: 'wasabi',
      streak: 5,
      roomId: game.getCurrentRoom().id,
      nowMs: 200,
    });
    harness.applyModernRunEvent({ kind: 'treasure', roomId: game.getCurrentRoom().id });

    const preview = game.previewHighlightSubmission(500, 4000);
    expect(preview.clip.views).toBeGreaterThan(100);

    game.submitHighlightRecording(preview.clip);

    expect(game.getScore()).toBe(startingScore + preview.clip.scoreAwarded);
    expect(game.getHighlightReelState().clips).toHaveLength(1);
    expect(game.getHighlightReelSummary()).toContain('Followers');
  });
});
