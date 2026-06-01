export const DEFAULT_MULTIPLAYER_SMOKE_URL = 'wss://echo.websocket.org';
export const MULTIPLAYER_DISPLAY_NAME_STORAGE_KEY = 'snake.multiplayer.displayName';
export const MULTIPLAYER_SMOKE_URL_STORAGE_KEY = 'snake.multiplayer.websocketUrl';
export const MULTIPLAYER_UNDER_CONSTRUCTION_MESSAGE = 'Multiplayer Under Construction.';

const MAX_DISPLAY_NAME_LENGTH = 24;

export interface MultiplayerShellClient {
  loadDisplayName(): string;
  saveDisplayName(displayName: string): void;
  smokeTest(displayName: string): void;
}

export interface MultiplayerShellSubmitResult {
  displayName: string;
  message: typeof MULTIPLAYER_UNDER_CONSTRUCTION_MESSAGE;
}

function normalizeDisplayName(displayName: string): string {
  const trimmed = displayName.trim().slice(0, MAX_DISPLAY_NAME_LENGTH);
  return trimmed.length > 0 ? trimmed : 'Player';
}

export function submitMultiplayerShell(
  client: MultiplayerShellClient,
  displayName: string,
): MultiplayerShellSubmitResult {
  const normalizedDisplayName = normalizeDisplayName(displayName);
  client.saveDisplayName(normalizedDisplayName);
  client.smokeTest(normalizedDisplayName);
  return {
    displayName: normalizedDisplayName,
    message: MULTIPLAYER_UNDER_CONSTRUCTION_MESSAGE,
  };
}

function getBrowserGlobal(): typeof globalThis | null {
  return typeof globalThis === 'undefined' ? null : globalThis;
}

export class BrowserMultiplayerShellClient implements MultiplayerShellClient {
  loadDisplayName(): string {
    const browser = getBrowserGlobal();
    try {
      return normalizeDisplayName(
        browser?.localStorage?.getItem(MULTIPLAYER_DISPLAY_NAME_STORAGE_KEY) ?? 'Player',
      );
    } catch {
      return 'Player';
    }
  }

  saveDisplayName(displayName: string): void {
    const browser = getBrowserGlobal();
    try {
      browser?.localStorage?.setItem(
        MULTIPLAYER_DISPLAY_NAME_STORAGE_KEY,
        normalizeDisplayName(displayName),
      );
    } catch {
      console.info('[MultiplayerShell] Display name could not be persisted locally.');
    }
  }

  smokeTest(displayName: string): void {
    const browser = getBrowserGlobal();
    const WebSocketCtor = browser?.WebSocket;
    const url = this.getSmokeUrl();

    if (!WebSocketCtor) {
      console.info('[MultiplayerShell] WebSocket smoke failed: WebSocket is unavailable.', { url });
      return;
    }

    try {
      const socket = new WebSocketCtor(url);
      let settled = false;
      const timeoutId = browser.setTimeout(() => {
        if (settled) return;
        settled = true;
        console.info('[MultiplayerShell] WebSocket smoke failed: connection timed out.', { url });
        socket.close();
      }, 3500);

      const settle = (message: string, data: Record<string, unknown> = {}) => {
        if (settled) return;
        settled = true;
        browser.clearTimeout(timeoutId);
        console.info(message, { url, ...data });
      };

      socket.addEventListener('open', () => {
        settle('[MultiplayerShell] WebSocket smoke succeeded.', {
          displayName: normalizeDisplayName(displayName),
        });
        try {
          socket.send(
            JSON.stringify({
              type: 'multiplayer-shell-smoke',
              displayName: normalizeDisplayName(displayName),
              sentAt: new Date().toISOString(),
            }),
          );
        } catch {
          console.info('[MultiplayerShell] WebSocket smoke connected but send failed.', { url });
        }
        socket.close();
      });

      socket.addEventListener('error', () => {
        settle('[MultiplayerShell] WebSocket smoke failed: socket error.');
      });

      socket.addEventListener('close', (event) => {
        settle('[MultiplayerShell] WebSocket smoke failed: socket closed before opening.', {
          code: event.code,
          reason: event.reason,
        });
      });
    } catch (error) {
      console.info('[MultiplayerShell] WebSocket smoke failed: could not start connection.', {
        url,
        error,
      });
    }
  }

  private getSmokeUrl(): string {
    const browser = getBrowserGlobal();
    const queryUrl = this.getQuerySmokeUrl(browser);
    if (queryUrl) return queryUrl;

    try {
      return (
        browser?.localStorage?.getItem(MULTIPLAYER_SMOKE_URL_STORAGE_KEY)?.trim() ||
        DEFAULT_MULTIPLAYER_SMOKE_URL
      );
    } catch {
      return DEFAULT_MULTIPLAYER_SMOKE_URL;
    }
  }

  private getQuerySmokeUrl(browser: typeof globalThis | null): string | null {
    try {
      const search = browser?.location?.search ?? '';
      const params = new URLSearchParams(search);
      return (
        params.get('multiplayerSmokeUrl')?.trim() ||
        params.get('multiplayerWsUrl')?.trim() ||
        null
      );
    } catch {
      return null;
    }
  }
}
