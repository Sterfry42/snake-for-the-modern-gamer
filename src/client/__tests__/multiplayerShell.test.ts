import {
  BrowserMultiplayerShellClient,
  MULTIPLAYER_DISPLAY_NAME_STORAGE_KEY,
  MULTIPLAYER_UNDER_CONSTRUCTION_MESSAGE,
  submitMultiplayerShell,
} from '../multiplayerShell.js';

type Listener = (event: { code?: number; reason?: string }) => void;

class FakeWebSocket {
  static instances: FakeWebSocket[] = [];

  readonly listeners: Record<string, Listener[]> = {};
  readonly sentMessages: string[] = [];
  closed = false;

  constructor(readonly url: string) {
    FakeWebSocket.instances.push(this);
  }

  addEventListener(type: string, listener: Listener): void {
    this.listeners[type] = [...(this.listeners[type] ?? []), listener];
  }

  send(message: string): void {
    this.sentMessages.push(message);
  }

  close(): void {
    this.closed = true;
  }

  emit(type: string, event: { code?: number; reason?: string } = {}): void {
    for (const listener of this.listeners[type] ?? []) {
      listener(event);
    }
  }
}

describe('BrowserMultiplayerShellClient', () => {
  beforeEach(() => {
    FakeWebSocket.instances = [];
    const storage = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
      removeItem: (key: string) => storage.delete(key),
      clear: () => storage.clear(),
    });
    vi.stubGlobal('location', { search: '' });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('persists a normalized display name locally', () => {
    const client = new BrowserMultiplayerShellClient();

    client.saveDisplayName('  Arcade Snake  ');

    expect(localStorage.getItem(MULTIPLAYER_DISPLAY_NAME_STORAGE_KEY)).toBe('Arcade Snake');
    expect(client.loadDisplayName()).toBe('Arcade Snake');
  });

  it('starts a configurable smoke WebSocket without joining a session', () => {
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => undefined);
    vi.stubGlobal('location', {
      search: '?multiplayerSmokeUrl=wss%3A%2F%2Fexample.test%2Fsmoke',
    });
    vi.stubGlobal('WebSocket', FakeWebSocket);
    const client = new BrowserMultiplayerShellClient();

    client.smokeTest('Tester');

    expect(FakeWebSocket.instances).toHaveLength(1);
    expect(FakeWebSocket.instances[0].url).toBe('wss://example.test/smoke');

    FakeWebSocket.instances[0].emit('open');

    expect(FakeWebSocket.instances[0].sentMessages[0]).toContain('multiplayer-shell-smoke');
    expect(FakeWebSocket.instances[0].closed).toBe(true);
    expect(infoSpy).toHaveBeenCalledWith(
      '[MultiplayerShell] WebSocket smoke succeeded.',
      expect.objectContaining({ url: 'wss://example.test/smoke', displayName: 'Tester' }),
    );
  });

  it('returns the under-construction flow result regardless of smoke outcome', () => {
    const client = {
      loadDisplayName: vi.fn(() => 'Player'),
      saveDisplayName: vi.fn(),
      smokeTest: vi.fn(),
    };

    const result = submitMultiplayerShell(client, '  Racer  ');

    expect(client.saveDisplayName).toHaveBeenCalledWith('Racer');
    expect(client.smokeTest).toHaveBeenCalledWith('Racer');
    expect(result).toEqual({
      displayName: 'Racer',
      message: MULTIPLAYER_UNDER_CONSTRUCTION_MESSAGE,
    });
  });
});
