import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DLSS5_STORAGE_KEY, loadDlss5Settings, saveDlss5Settings } from './dlss5Settings.js';

describe('DLSS 5 settings', () => {
  const originalWindow = globalThis.window;
  let storage = new Map<string, string>();

  beforeEach(() => {
    storage = new Map();
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: {
        localStorage: {
          getItem: (key: string) => storage.get(key) ?? null,
          setItem: (key: string, value: string) => storage.set(key, value),
          removeItem: (key: string) => storage.delete(key),
        },
      },
    });
  });

  afterEach(() => {
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: originalWindow,
    });
  });

  it('defaults off and persists enabled state locally', () => {
    expect(loadDlss5Settings()).toEqual({ enabled: false });

    saveDlss5Settings({ enabled: true });

    expect(storage.get(DLSS5_STORAGE_KEY)).toBe('true');
    expect(loadDlss5Settings()).toEqual({ enabled: true });
  });
});
