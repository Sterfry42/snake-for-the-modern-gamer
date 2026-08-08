import { describe, expect, it } from 'vitest';
import {
  createHighlightReelState,
  getHighlightReelSummary,
  previewHighlightSubmission,
  processHighlightEvent,
  recordHighlightCaptureEvent,
  startHighlightRecording,
  submitHighlightRecording,
} from '../highlightReel.js';

describe('highlight reel system', () => {
  it('does not auto-publish passive clips from ordinary run events', () => {
    const update = processHighlightEvent(createHighlightReelState(), {
      kind: 'apple',
      appleTypeId: 'wasabi',
      streak: 5,
      roomId: '0,0,0',
      nowMs: 100,
    });

    expect(update.state.clips).toHaveLength(0);
    expect(update.scoreBonus).toBe(0);
    expect(update.messages).toEqual([]);
  });

  it('previews and submits an explicit GoPro recording', () => {
    let state = startHighlightRecording(createHighlightReelState(), 100);
    state = recordHighlightCaptureEvent(
      state,
      { kind: 'apple', appleTypeId: 'wasabi', streak: 5, roomId: '0,0,0', nowMs: 200 },
      1200,
    );
    state = recordHighlightCaptureEvent(state, { kind: 'treasure', roomId: '0,0,0' }, 2600);

    const preview = previewHighlightSubmission(state, 5000, 4000);
    state = submitHighlightRecording(state, preview.clip);

    expect(preview.clip.tags).toEqual(
      expect.arrayContaining(['apple-eaten', 'rare-apple', 'apple-chain', 'treasure-pop']),
    );
    expect(preview.clip.scoreAwarded).toBe(Math.floor(preview.clip.views / 100));
    expect(state.clips).toHaveLength(1);
    expect(state.channel.lifetimeViews).toBe(preview.clip.views);
    expect(getHighlightReelSummary(state)).toContain('Followers');
  });

  it('keeps only three submitted clips', () => {
    let state = createHighlightReelState();
    for (let i = 0; i < 4; i += 1) {
      state = startHighlightRecording(state, i);
      state = recordHighlightCaptureEvent(state, { kind: 'treasure', roomId: `${i},0,0` }, 500);
      const preview = previewHighlightSubmission(state, i + 100, 3000);
      state = submitHighlightRecording(state, preview.clip);
    }

    expect(state.clips).toHaveLength(3);
    expect(getHighlightReelSummary(state)).toContain('Clips 3/3');
  });
});
