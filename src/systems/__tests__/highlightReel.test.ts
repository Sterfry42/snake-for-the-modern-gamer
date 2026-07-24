import { describe, expect, it } from 'vitest';
import {
  createHighlightReelState,
  getHighlightReelSummary,
  processHighlightEvent,
} from '../highlightReel.js';

describe('highlight reel system', () => {
  it('publishes apple chain and stamp clips into a subscriber channel', () => {
    const update = processHighlightEvent(createHighlightReelState(), {
      kind: 'apple',
      appleTypeId: 'wasabi',
      streak: 5,
      roomId: '0,0,0',
      nowMs: 100,
    });

    expect(update.state.clips).toHaveLength(2);
    expect(update.state.channel.subscribers).toBeGreaterThan(0);
    expect(update.scoreBonus).toBeGreaterThan(0);
    expect(update.messages.some((message) => message.includes('HIGHLIGHT'))).toBe(true);
  });

  it('awards channel ranks once as subscribers grow', () => {
    let state = createHighlightReelState();
    let messages: string[] = [];
    for (let i = 0; i < 5; i += 1) {
      const update = processHighlightEvent(state, {
        kind: 'treasure',
        roomId: `${i},0,0`,
      });
      state = update.state;
      messages = [...messages, ...update.messages];
    }

    const update = processHighlightEvent(state, {
      kind: 'enemy',
      roomId: '9,0,0',
      humanoid: true,
    });
    messages = [...messages, ...update.messages];

    expect(update.state.channel.rank).toBeGreaterThanOrEqual(1);
    expect(update.state.channel.claimedRanks).toContain(1);
    expect(messages.some((message) => message.includes('CHANNEL RANK'))).toBe(true);
  });

  it('keeps the reel bounded to recent clips', () => {
    let state = createHighlightReelState();
    for (let i = 0; i < 20; i += 1) {
      state = processHighlightEvent(state, {
        kind: 'treasure',
        roomId: `${i},0,0`,
      }).state;
    }

    expect(state.clips).toHaveLength(12);
    expect(getHighlightReelSummary(state)).toContain('Subscribers');
  });
});
