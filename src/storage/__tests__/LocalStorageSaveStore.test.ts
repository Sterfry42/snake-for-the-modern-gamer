import { LocalStorageSaveStore } from '../LocalStorageSaveStore.js';
import { LocalStorageStringSaveStore } from '../LocalStorageStringSaveStore.js';

describe('LocalStorageSaveStore', () => {
  beforeEach(() => {
    const storage = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
      removeItem: (key: string) => storage.delete(key),
      clear: () => storage.clear(),
    });
  });

  it('saves, loads, detects, and clears a slot', async () => {
    const store = new LocalStorageSaveStore<{ score: number }>('snake-test');

    expect(await store.load('slot-a')).toBeNull();
    expect(await store.has('slot-a')).toBe(false);

    await store.save('slot-a', { score: 42 });

    expect(await store.has('slot-a')).toBe(true);
    expect(await store.load('slot-a')).toEqual({ score: 42 });

    await store.clear('slot-a');

    expect(await store.load('slot-a')).toBeNull();
    expect(await store.has('slot-a')).toBe(false);
  });
});

describe('LocalStorageStringSaveStore', () => {
  beforeEach(() => {
    const storage = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
      removeItem: (key: string) => storage.delete(key),
      clear: () => storage.clear(),
    });
  });

  it('preserves the legacy empty-slot key shape', () => {
    const store = new LocalStorageStringSaveStore('snakeGameSave');

    store.save('', '{"score":12}');

    expect(localStorage.getItem('snakeGameSave')).toBe('{"score":12}');
    expect(store.load('')).toBe('{"score":12}');
    expect(store.has('')).toBe(true);

    store.clear('');

    expect(localStorage.getItem('snakeGameSave')).toBeNull();
  });
});
