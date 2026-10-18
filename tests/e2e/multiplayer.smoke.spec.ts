import { test, expect, type Page } from '@playwright/test';
import { SnakeGame } from '../../src/game/snakeGame.js';
import { QuestRegistry } from '../../src/quests/questRegistry.js';
import { AuthoritativeGameSession } from '../../src/session/AuthoritativeGameSession.js';
import { createGameServer } from '../../src/server/createGameServer.js';
import { defaultGameConfig } from '../../src/config/gameConfig.js';
import { createBaseActor } from '../../src/actors/actorFactory.js';
import { parseServerMessage } from '../../src/session/gameProtocol.js';
import type { GameSnapshot } from '../../src/session/GameSnapshot.js';

function observe(page: Page) {
  const state: { snapshot?: GameSnapshot } = {};
  page.on('websocket', (socket) => {
    if (new URL(socket.url()).pathname !== '/game') return;
    socket.on('framereceived', (frame) => {
      const message = parseServerMessage(frame.payload.toString());
      if (message.type === 'welcome' || message.type === 'snapshot')
        state.snapshot = message.snapshot;
    });
  });
  return state;
}

test('two browsers move independent snakes, render NPCs, talk, and view separate rooms', async ({
  page,
  context,
}) => {
  const registry = new QuestRegistry();
  await registry.loadBuiltIns();
  const game = new SnakeGame(
    { ...defaultGameConfig, rng: { seed: 'multiplayer-browser' } },
    registry,
  );
  game.reset();
  const room = game.getCurrentRoom();
  room.layout = room.layout.map((row) => '.'.repeat(row.length));
  // This input arena excludes boss gravity, which legitimately overrides queued turns.
  game.bosses.clearAll();
  const head = game.getSnakeBody()[0];
  const ada = createBaseActor({
    id: 'browser-ada',
    displayName: 'Ada',
    kind: 'civilian',
    role: 'resident',
    species: 'human',
    thickness: 'medium',
    currentRoomId: room.id,
  });
  ada.presence = {
    roomId: room.id,
    position: { x: head.x, y: head.y + 1 },
    materialized: true,
    stationary: true,
  };
  game.getActorSystem().registry.upsert(ada);
  const session = new AuthoritativeGameSession({ game, manageBasicFeatures: true });
  const server = createGameServer(session);
  const port = await server.listen(0);
  const bobPage = await context.newPage();
  const alice = observe(page);
  const bob = observe(bobPage);
  const errors: string[] = [];
  for (const browser of [page, bobPage])
    browser.on('pageerror', (error) => errors.push(error.message));
  try {
    const address = encodeURIComponent(`ws://127.0.0.1:${port}/game`);
    await page.goto(`?server=${address}&playerName=Alice`);
    await expect.poll(() => alice.snapshot?.localPlayerId).toBe('player-1');
    await bobPage.goto(`?server=${address}&playerName=Bob`);
    await expect.poll(() => Object.keys(bob.snapshot?.players ?? {}).length).toBe(2);
    const bobId = bob.snapshot!.localPlayerId;
    expect(bobId).not.toBe('player-1');
    expect(bob.snapshot!.players[bobId].body).not.toEqual(bob.snapshot!.players['player-1'].body);
    await page.keyboard.press('ArrowUp');
    await bobPage.keyboard.press('ArrowDown');
    // Acknowledged commands provide barriers after both keyboard messages.
    await expect.poll(() => game.getPlayer('player-1')!.snake.nextDirectionVector.y).toBe(-1);
    await expect.poll(() => game.getPlayer(bobId)!.snake.nextDirectionVector.y).toBe(1);
    await session.advance(100);
    await expect.poll(() => alice.snapshot?.players['player-1'].direction.y).toBe(-1);
    await expect.poll(() => bob.snapshot?.players[bobId].direction.y).toBe(1);
    expect(alice.snapshot!.viewport.rooms[room.id].npcs?.some((actor) => actor.id === ada.id)).toBe(
      true,
    );
    const canvas = await page.locator('canvas').boundingBox();
    if (!canvas) throw new Error('Missing canvas');
    await page.mouse.click(
      canvas.x + (((head.x + 0.5) * defaultGameConfig.grid.cell) / 768) * canvas.width,
      canvas.y + (((head.y + 1.5) * defaultGameConfig.grid.cell - 2) / 576) * canvas.height,
    );
    await expect.poll(() => alice.snapshot?.ui.interaction?.kind).toBe('actor');
    await page.keyboard.press('Enter');
    await expect.poll(() => alice.snapshot?.ui.messages?.join(' ')).toContain('Ada:');
    expect(bob.snapshot?.ui.messages?.join(' ')).not.toContain('Ada:');
    await page.keyboard.press('Escape');
    await expect.poll(() => alice.snapshot?.ui.interaction?.kind).toBe('actor');
    await page.keyboard.press('Escape');
    await expect.poll(() => alice.snapshot?.ui.interaction).toBeNull();
    await page.screenshot({ path: 'test-results/multiplayer-npcs.png' });
    game.runForPlayer(bobId, () =>
      game.placeSnakeBodyAtLocal('1,0,0', { x: 10, y: 10 }, { x: 1, y: 0 }),
    );
    session.refreshSnapshot();
    await expect.poll(() => bob.snapshot?.viewport.centerRoomId).toBe('1,0,0');
    expect(alice.snapshot?.viewport.centerRoomId).toBe('0,0,0');
    expect(errors).toEqual([]);
  } finally {
    await bobPage.close();
    await page.close();
    await server.close();
  }
});
