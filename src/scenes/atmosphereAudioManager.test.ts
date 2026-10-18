import { describe, expect, it, vi } from 'vitest';
import { createHeadlessScenario } from '../test/headless/headlessScenario.js';
import { AtmosphereAudioManager } from './atmosphereAudioManager.js';

vi.mock('phaser', () => ({ default: {} }));

describe('atmosphere presentation invalidation', () => {
  it('reads current title/pause state and avoids unchanged visual redraws', () => {
    const scenario = createHeadlessScenario({ seed: 'atmosphere-live-state' });
    let titleVisible = true;
    let paused = false;
    const dirty = vi.fn();
    const manager = new AtmosphereAudioManager({
      snakeGame: scenario.game,
      getTime: () => 0,
      showQuestHintPopup: vi.fn(),
      setIsDirty: dirty,
      isTitleVisible: () => titleVisible,
      isPaused: () => paused,
    });
    manager.advance(0);
    expect(dirty).not.toHaveBeenCalled();
    titleVisible = false;
    manager.advance(0);
    expect(dirty).toHaveBeenCalledTimes(1);
    manager.advance(0);
    expect(dirty).toHaveBeenCalledTimes(1);
    paused = true;
    manager.advance(5000);
    expect(dirty).toHaveBeenCalledTimes(1);
    paused = false;
    manager.advance(0);
    expect(dirty).toHaveBeenCalledTimes(2);
  });
});
