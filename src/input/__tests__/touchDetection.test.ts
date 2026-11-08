import { describe, expect, it } from 'vitest';
import {
  createBrowserTouchEnvironment,
  hasTouchSignal,
  loadTouchControlsPreference,
  nextTouchControlsPreference,
  saveTouchControlsPreference,
  shouldShowTouchControls,
  type TouchControlsPreference,
  type TouchDetectionEnvironment,
} from '../touchDetection.js';

const desktopEnv: TouchDetectionEnvironment = {
  maxTouchPoints: 0,
  matchesMedia: () => false,
  hasTouchStartProperty: false,
  sawTouchEvent: false,
};

const androidEnv: TouchDetectionEnvironment = {
  maxTouchPoints: 5,
  matchesMedia: (query) => query === '(pointer: coarse)',
  hasTouchStartProperty: true,
  sawTouchEvent: false,
};

const webkitGtkTouchEnv: TouchDetectionEnvironment = {
  // WebKit hardcodes maxTouchPoints to 0 off iOS, and its pointer media
  // queries do not match on the Plasma Mobile device in the field.
  maxTouchPoints: 0,
  matchesMedia: () => false,
  hasTouchStartProperty: true,
  sawTouchEvent: false,
};

class MemoryStorage {
  private readonly store = new Map<string, string>();

  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }
}

describe('hasTouchSignal', () => {
  it('returns false for a desktop with no touch signals', () => {
    expect(hasTouchSignal(desktopEnv)).toBe(false);
  });

  it('trusts maxTouchPoints on Android and iOS browsers', () => {
    expect(hasTouchSignal(androidEnv)).toBe(true);
  });

  it('trusts the pointer coarse media query', () => {
    expect(
      hasTouchSignal({ ...desktopEnv, matchesMedia: (query) => query === '(any-pointer: coarse)' }),
    ).toBe(true);
  });

  it('trusts the legacy ontouchstart property exposed by WebKitGTK (Angelfish)', () => {
    expect(hasTouchSignal(webkitGtkTouchEnv)).toBe(true);
  });

  it('trusts a real touch event even when every static signal failed', () => {
    expect(hasTouchSignal({ ...desktopEnv, sawTouchEvent: true })).toBe(true);
  });
});

describe('shouldShowTouchControls', () => {
  it('always shows for "on", even on a desktop without touch', () => {
    expect(shouldShowTouchControls('on', desktopEnv)).toBe(true);
  });

  it('never shows for "off", even on a touch device', () => {
    expect(shouldShowTouchControls('off', androidEnv)).toBe(false);
  });

  it('follows detection in "auto"', () => {
    expect(shouldShowTouchControls('auto', desktopEnv)).toBe(false);
    expect(shouldShowTouchControls('auto', androidEnv)).toBe(true);
    expect(shouldShowTouchControls('auto', webkitGtkTouchEnv)).toBe(true);
  });
});

describe('touch controls preference persistence', () => {
  it('defaults to auto when nothing is stored', () => {
    expect(loadTouchControlsPreference(new MemoryStorage())).toBe('auto');
  });

  it('round-trips on/off and ignores garbage', () => {
    const storage = new MemoryStorage();
    saveTouchControlsPreference('on', storage);
    expect(loadTouchControlsPreference(storage)).toBe('on');
    saveTouchControlsPreference('off', storage);
    expect(loadTouchControlsPreference(storage)).toBe('off');
    storage.setItem('snake.touchControls', 'banana');
    expect(loadTouchControlsPreference(storage)).toBe('auto');
  });

  it('survives missing storage', () => {
    expect(() => saveTouchControlsPreference('on', undefined)).not.toThrow();
    expect(loadTouchControlsPreference(undefined)).toBe('auto');
  });
});

describe('nextTouchControlsPreference', () => {
  it('cycles auto -> on -> off -> auto', () => {
    const order: TouchControlsPreference[] = ['auto', 'on', 'off'];
    let current: TouchControlsPreference = 'auto';
    for (const expected of order) {
      expect(current).toBe(expected);
      current = nextTouchControlsPreference(current);
    }
    expect(current).toBe('auto');
  });
});

describe('createBrowserTouchEnvironment', () => {
  it('reads the real browser globals without throwing', () => {
    const env = createBrowserTouchEnvironment();
    expect(typeof env.maxTouchPoints).toBe('number');
    expect(typeof env.matchesMedia('(pointer: coarse)')).toBe('boolean');
    expect(typeof env.hasTouchStartProperty).toBe('boolean');
    expect(typeof env.sawTouchEvent).toBe('boolean');
  });
});
