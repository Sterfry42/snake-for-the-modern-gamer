import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  connectionsMenuUrl,
  loadServerConnectionSettings,
  normalizeDisplayName,
  normalizeServerUrl,
  serverGameUrl,
  serverInviteUrl,
  serverCredentialKey,
} from '../connectionSettings.js';

describe('server connection settings', () => {
  afterEach(() => vi.unstubAllEnvs());
  it('offers a configured default server and lets an invite select its own endpoint', () => {
    vi.stubEnv('VITE_SNAKE_SERVER_URL', 'https://friends.test/game');
    expect(loadServerConnectionSettings('https://game.test/snake/').serverUrl).toBe(
      'wss://friends.test/game',
    );
    expect(
      loadServerConnectionSettings('https://game.test/snake/?server=ws%3A%2F%2Fother.test%2Fgame')
        .serverUrl,
    ).toBe('ws://other.test/game');
  });
  it('shares a credential-free invite and accepts it as a server address', () => {
    const invite = serverInviteUrl(
      'https://game.test/snake/?playerName=Owner&enter=1#secret',
      'wss://server.test/game?resume=private&hostToken=owner&name=Owner',
    );
    expect(invite).not.toMatch(/private|owner|Owner|secret|enter/);
    expect(normalizeServerUrl(invite)).toBe('wss://server.test/game');
    expect(serverCredentialKey('https://server.test/game?name=Alice')).toBe(
      serverCredentialKey('wss://server.test/game'),
    );
    expect(serverCredentialKey('wss://other.test/game')).not.toBe(
      serverCredentialKey('wss://server.test/game'),
    );
  });
  it('accepts ordinary host addresses and maps HTTP addresses to their WebSocket endpoint', () => {
    expect(normalizeServerUrl(' localhost:8787 ')).toBe('ws://localhost:8787/game');
    expect(normalizeServerUrl('https://example.test/socket')).toBe('wss://example.test/socket');
    expect(normalizeServerUrl('example.test', true)).toBe('wss://example.test/game');
    expect(normalizeServerUrl('ws://example.test/game?room=shared')).toBe(
      'ws://example.test/game?room=shared',
    );
    for (const value of [
      '',
      'not a host',
      'ftp://example.test',
      'ws://user:password@example.test',
    ]) {
      expect(() => normalizeServerUrl(value)).toThrow();
    }
  });

  it('bounds display names and preserves complete Unicode characters', () => {
    expect(normalizeDisplayName('  Alice\nBob  ')).toBe('Alice Bob');
    expect(normalizeDisplayName('   ')).toBe('Player');
    expect(normalizeDisplayName('🐍'.repeat(30))).toBe('🐍'.repeat(24));
  });

  it('joins and leaves through the existing game URL while preserving unrelated options', () => {
    const joined = new URL(
      serverGameUrl('https://game.test/snake/?lifecycle=1&connection=local&multiplayer=server', {
        serverUrl: 'wss://game.test/game',
        displayName: 'Alice & Bob',
      }),
    );
    expect(joined.pathname).toBe('/snake/');
    expect(joined.searchParams.get('server')).toBe('wss://game.test/game');
    expect(joined.searchParams.get('playerName')).toBe('Alice & Bob');
    expect(joined.searchParams.has('connection')).toBe(false);
    const left = new URL(connectionsMenuUrl(joined.href));
    expect(left.searchParams.get('multiplayer')).toBe('server');
    expect(left.searchParams.get('lifecycle')).toBe('1');
    expect(left.searchParams.has('server')).toBe(false);
    expect(left.searchParams.has('playerName')).toBe(false);
    expect(left.searchParams.has('enter')).toBe(false);
  });
});
