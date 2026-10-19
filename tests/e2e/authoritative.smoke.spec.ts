import { test, expect } from '@playwright/test';
import { AuthoritativeGameSession } from '../../src/session/AuthoritativeGameSession.js';
import { createGameServer } from '../../src/server/createGameServer.js';
import { parseServerMessage } from '../../src/session/gameProtocol.js';
import type { GameSnapshot } from '../../src/session/GameSnapshot.js';
import { defaultGameConfig } from '../../src/config/gameConfig.js';

test('browser renders the shared authority and routes keyboard input over WebSocket', async ({
  page,
  context,
}) => {
  const session = await AuthoritativeGameSession.create({
    config: { ...defaultGameConfig, rng: { seed: 'browser-authority' } },
  });
  await session.executeCommand({ type: 'pause', playerId: session.getSnapshot().localPlayerId });
  const server = createGameServer(session, { hostToken: 'browser-owner-key-explicit' });
  const port = await server.listen(0);
  await page.addInitScript(({ key, token }) => localStorage.setItem(key, token), {
    key: `snake.serverIdentity:ws://127.0.0.1:${port}/game:host`, token: 'browser-owner-key-explicit',
  });
  const errors: string[] = [];
  page.on('pageerror', (error) => { errors.push(error.message); console.error(error.stack); });
  let latest: GameSnapshot | undefined;
  const commands: string[] = [];
  page.on('websocket', (socket) => {
    if (new URL(socket.url()).pathname !== '/game') return;
    socket.on('framereceived', (frame) => {
      const message = parseServerMessage(frame.payload.toString());
      if (message.type === 'snapshot' || message.type === 'welcome') latest = message.snapshot;
    });
    socket.on('framesent', (frame) => commands.push(frame.payload.toString()));
  });
  try {
    await page.goto(`?server=${encodeURIComponent(`ws://127.0.0.1:${port}/game`)}`);
    await expect.poll(() => page.evaluate(() => window.snakeE2E?.getLifecycle().mode)).toMatch(/action|manual-room|paused/);
    await expect.poll(() => latest?.localPlayerId).toBe('player-1');
    await expect(page.locator('canvas')).toBeVisible();
    const observer = await context.browser()!.newPage({ baseURL: test.info().project.use.baseURL });
    await observer.goto(`?server=${encodeURIComponent(`ws://127.0.0.1:${port}/game`)}`);
    await expect.poll(() => observer.evaluate(() => window.snakeE2E?.getLifecycle().mode)).toMatch(/action|manual-room|paused/);
    await expect(observer.locator('canvas')).toBeVisible();
    await page.keyboard.press('ArrowUp');
    await expect
      .poll(() => commands.some((command) => command.includes('setDirection')))
      .toBe(true);
    await page.keyboard.press('Space');
    await expect.poll(() => latest?.ui.playerInteraction).toBe('paused');
    expect(latest?.ui.paused).toBe(true);
    await session.executeCommand({ type: 'resume', playerId: 'player-1' });
    const heldBody = latest!.players['player-1'].body;
    await session.advance(100);
    await expect.poll(() => latest?.tick).toBe(100);
    expect(latest!.players['player-1'].body).toEqual(heldBody);
    await page.keyboard.press('Space');
    await expect.poll(() => latest?.ui.playerInteraction).toBe('playing');
    await session.advance(100);
    await expect.poll(() => latest?.players['player-1'].direction.y).toBe(-1);
    expect(latest?.players['player-1'].body).toEqual(
      session.getSnapshot().players['player-1'].body,
    );
    await page.screenshot({ path: 'test-results/authoritative-client.png' });
    expect(errors).toEqual([]);
    await observer.close();
  } finally {
    await page.close();
    await server.close();
  }
});
