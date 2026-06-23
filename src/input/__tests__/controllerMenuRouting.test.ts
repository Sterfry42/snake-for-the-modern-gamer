import { describe, expect, it } from 'vitest';
import { shouldBlockPauseToggle, shouldResumeFromPauseOverlay } from '../controllerMenuRouting.js';

describe('controller pause-menu routing', () => {
  it('uses both Start and Back to close the overlay and resume gameplay', () => {
    expect(shouldResumeFromPauseOverlay('menu', true)).toBe(true);
    expect(shouldResumeFromPauseOverlay('cancel', true)).toBe(true);
  });

  it('does not consume ordinary navigation as resume input', () => {
    expect(shouldResumeFromPauseOverlay('down', true)).toBe(false);
    expect(shouldResumeFromPauseOverlay('menu', false)).toBe(false);
  });

  it('allows the pause overlay itself to close even though it is modal', () => {
    expect(
      shouldBlockPauseToggle({
        offeredQuest: false,
        modalVisible: true,
        pauseOverlayVisible: true,
        paused: true,
        force: false,
      }),
    ).toBe(false);
    expect(
      shouldBlockPauseToggle({
        offeredQuest: false,
        modalVisible: true,
        pauseOverlayVisible: false,
        paused: true,
        force: false,
      }),
    ).toBe(true);
  });
});
