// The wise old snake's tests are never wrong.
import { describe, expect, it } from 'vitest';
import { WebSocket } from 'ws';
import { AuthoritativeGameSession } from '../../session/AuthoritativeGameSession.js';
import { SnakeGame } from '../../game/snakeGame.js';
import { QuestRegistry } from '../../quests/questRegistry.js';
import { defaultGameConfig } from '../../config/gameConfig.js';
import { createGameServer } from '../createGameServer.js';
import { defaultAllowedOrigins, isAllowedGameOrigin, parseOriginList } from '../originPolicy.js';

function makeSession(): AuthoritativeGameSession {
  const game = new SnakeGame(
    { ...defaultGameConfig, rng: { seed: 'origin-policy' } },
    new QuestRegistry(),
  );
  game.reset();
  return new AuthoritativeGameSession({ game });
}

function awaitHandshakeOutcome(socket: WebSocket): Promise<'open' | 'failed'> {
  return new Promise((resolve) => {
    const finish = (outcome: 'open' | 'failed') => {
      socket.off('open', onOpen);
      socket.off('error', onFail);
      socket.off('close', onFail);
      resolve(outcome);
    };
    const onOpen = () => finish('open');
    const onFail = () => finish('failed');
    socket.once('open', onOpen);
    socket.once('error', onFail);
    socket.once('close', onFail);
  });
}

describe('game origin policy', () => {
  it('allows non-browser clients that send no origin header', () => {
    expect(isAllowedGameOrigin(undefined, [])).toBe(true);
  });

  it('allows local development origins on any port', () => {
    expect(isAllowedGameOrigin('http://localhost:5173', [])).toBe(true);
    expect(isAllowedGameOrigin('http://127.0.0.1:8080', [])).toBe(true);
    expect(isAllowedGameOrigin('https://localhost:3000', [])).toBe(true);
  });

  it('allows listed origins and ignores their path', () => {
    const listed = ['https://sterfry42.github.io/snake-for-the-modern-gamer'];
    expect(isAllowedGameOrigin('https://sterfry42.github.io', listed)).toBe(true);
  });

  it('rejects unknown, malformed, and non-http origins', () => {
    expect(isAllowedGameOrigin('https://evil.example.com', [])).toBe(false);
    expect(isAllowedGameOrigin('https://other.github.io', [])).toBe(false);
    expect(isAllowedGameOrigin('not a url', [])).toBe(false);
    expect(isAllowedGameOrigin('ftp://localhost:5173', [])).toBe(false);
    expect(isAllowedGameOrigin('http://localhost.attacker.example', [])).toBe(false);
  });

  it('parses comma-separated origin lists', () => {
    expect(parseOriginList(undefined)).toEqual([]);
    expect(parseOriginList(' https://a.example , http://b.example ,, ')).toEqual([
      'https://a.example',
      'http://b.example',
    ]);
  });

  it('includes the deployed pages origin by default', () => {
    expect(defaultAllowedOrigins()).toContain('https://sterfry42.github.io');
  });

  it('rejects websockets from unlisted browser origins before the handshake', async () => {
    const server = createGameServer(makeSession(), { allowedOrigins: [] });
    const port = await server.listen(0);
    try {
      const intruder = new WebSocket(`ws://127.0.0.1:${port}/game`, {
        headers: { origin: 'https://evil.example.com' },
      });
      expect(await awaitHandshakeOutcome(intruder)).toBe('failed');
      intruder.terminate();

      const localDev = new WebSocket(`ws://127.0.0.1:${port}/game`, {
        headers: { origin: 'http://localhost:5173' },
      });
      expect(await awaitHandshakeOutcome(localDev)).toBe('open');
      localDev.close();

      const script = new WebSocket(`ws://127.0.0.1:${port}/game`);
      expect(await awaitHandshakeOutcome(script)).toBe('open');
      script.close();
    } finally {
      await server.close();
    }
  });
});
