import { describe, expect, it, vi } from 'vitest';
import { createHeadlessScenario } from '../test/headless/headlessScenario.js';
import { AtmosphereAudioManager } from './atmosphereAudioManager.js';

vi.mock('phaser', () => ({ default: {} }));

describe('atmosphere presentation invalidation', () => {
  it('observes state without advancing gameplay, weather, or its RNG', () => {
    const scenario = createHeadlessScenario({ seed: 'atmosphere-read-only' });
    const advance = vi.spyOn(scenario.game, 'updateAtmosphere');
    const weather = vi.spyOn(scenario.game, 'forceAtmosphereWeather');
    const rngState = scenario.game.getSaveData().rngState;
    const before = scenario.game.getAtmosphereState();
    const manager = new AtmosphereAudioManager({
      snakeGame: scenario.game,
      getTime: () => 0,
      showQuestHintPopup: vi.fn(),
      setIsDirty: vi.fn(),
      isTitleVisible: () => false,
      isPaused: () => false,
    });
    manager.refresh();
    manager.refresh();
    expect(advance).not.toHaveBeenCalled();
    expect(weather).not.toHaveBeenCalled();
    expect(scenario.game.getAtmosphereState()).toEqual(before);
    expect(scenario.game.getSaveData().rngState).toBe(rngState);
  });
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
    manager.refresh();
    expect(dirty).not.toHaveBeenCalled();
    titleVisible = false;
    manager.refresh();
    expect(dirty).toHaveBeenCalledTimes(1);
    manager.refresh();
    expect(dirty).toHaveBeenCalledTimes(1);
    paused = true;
    scenario.game.updateAtmosphere(5000);
    manager.refresh();
    expect(dirty).toHaveBeenCalledTimes(1);
    paused = false;
    manager.refresh();
    expect(dirty).toHaveBeenCalledTimes(2);
  });
});
