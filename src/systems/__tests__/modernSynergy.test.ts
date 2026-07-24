import { describe, expect, it } from 'vitest';
import { createExpeditionBoardState } from '../expeditionBoard.js';
import { createHighlightReelState } from '../highlightReel.js';
import { createModernRunState } from '../modernRun.js';
import {
  createModernSynergyState,
  evaluateModernSynergies,
  getModernSynergyDefinitions,
  getModernSynergySummary,
} from '../modernSynergy.js';

describe('modern synergy system', () => {
  it('unlocks Passport Press when Passport and Highlight Reel reinforce each other', () => {
    const modernRun = createModernRunState();
    modernRun.passport.appleTypeIds = ['base', 'golden', 'wasabi'];
    const highlightReel = createHighlightReelState();
    highlightReel.channel.subscribers = 12;

    const update = evaluateModernSynergies(createModernSynergyState(), {
      modernRun,
      highlightReel,
      expeditionBoard: createExpeditionBoardState(),
    });

    expect(update.state.unlockedIds).toEqual(['passport-press']);
    expect(update.scoreBonus).toBe(45);
    expect(update.messages[0]).toContain('SYNERGY: Passport Press');
  });

  it('derives a stronger run identity from multiple connected systems', () => {
    const modernRun = createModernRunState();
    modernRun.flow.bestTier = 2;
    modernRun.passport.appleTypeIds = ['base', 'golden', 'wasabi', 'mochi', 'caffeinated', 'jade'];
    modernRun.counters.enemies = 3;
    const highlightReel = createHighlightReelState();
    highlightReel.channel.subscribers = 40;
    highlightReel.channel.hype = 40;
    highlightReel.channel.rank = 2;
    highlightReel.clips = Array.from({ length: 6 }, (_, index) => ({
      id: `clip-${index}`,
      kind: 'treasure-pop',
      title: 'Clip',
      caption: 'Caption',
      roomId: '0,0,0',
      hype: 5,
      subscribers: 5,
    }));
    const expeditionBoard = createExpeditionBoardState(2);
    expeditionBoard.completedChapters = 1;

    const update = evaluateModernSynergies(createModernSynergyState(), {
      modernRun,
      highlightReel,
      expeditionBoard,
    });

    expect(update.state.unlockedIds).toEqual([
      'passport-press',
      'gallery-circuit',
      'field-producer',
      'danger-column',
      'whole-canvas',
    ]);
    expect(update.state.activeTitle).toBe('Whole Canvas Run');
    expect(update.state.bestTier).toBeGreaterThanOrEqual(8);
    expect(
      getModernSynergySummary(update.state, { modernRun, highlightReel, expeditionBoard }),
    ).toContain('Whole Canvas Run');
  });

  it('keeps synergy definitions explicit and inspectable', () => {
    expect(getModernSynergyDefinitions().map((synergy) => synergy.id)).toEqual([
      'passport-press',
      'gallery-circuit',
      'field-producer',
      'danger-column',
      'whole-canvas',
    ]);
  });
});
