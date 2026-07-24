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
  it('applies Flow, Passport, Highlight, and Contract rewards through the game reward path', () => {
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

    expect(game.getScore()).toBeGreaterThan(startingScore);
    expect(state.flow.bestTier).toBe(2);
    expect(state.passport.appleTypeIds).toEqual(['wasabi']);
    expect(reel.clips.length).toBeGreaterThan(0);
    expect(feedback?.messages?.some((message) => message.includes('FLOW HOT'))).toBe(true);
    expect(highlight?.messages?.some((message) => message.includes('HIGHLIGHT'))).toBe(true);
  });

  it('summarizes active modern run progress for HUD or snapshot consumers', () => {
    const game = new SnakeGame(defaultGameConfig, new QuestRegistry(), {});

    expect(game.getModernRunSummary()).toContain('Snack Sprint');
    expect(game.getModernRunSummary()).toContain('Apple Curator');
    expect(game.getHighlightReelSummary()).toContain('Subscribers');
    expect(game.getExpeditionBoardSummary()).toContain('Chapter 1');
    expect(game.getModernSynergySummary()).toContain('Unsigned Run');
  });

  it('advances the expedition board and applies chapter clear rewards', () => {
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

    expect(game.getExpeditionBoardState().chapter).toBe(2);
    expect(game.getFlag('ui.expeditionBoard')).toMatchObject({
      messages: expect.arrayContaining([expect.stringContaining('EXPEDITION BOARD CLEARED')]),
    });
  });

  it('unlocks cross-system synergies and sends them into the world rumor pipeline', () => {
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

    expect(game.getModernSynergyState().unlockedIds).toContain('passport-press');
    expect(game.getFlag('ui.modernSynergy')).toMatchObject({
      messages: expect.arrayContaining([expect.stringContaining('SYNERGY: Passport Press')]),
    });
    expect(
      game
        .getRecentWorldRumors(8)
        .some((rumor) => rumor.tags.includes('modern-run') && rumor.tags.includes('synergy')),
    ).toBe(true);
  });
});
