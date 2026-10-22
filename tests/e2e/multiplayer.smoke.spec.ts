import { SnapshotDeltaAssembler } from '../../src/session/SnapshotDelta.js';
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
    const assembler = new SnapshotDeltaAssembler();
    socket.on('framereceived', (frame) => {
      const wire = parseServerMessage(frame.payload.toString());
      if (wire.type === 'welcome') assembler.reset(wire.snapshot);
      const message =
        wire.type === 'delta'
          ? { type: 'snapshot' as const, snapshot: assembler.apply(wire.delta) }
          : wire;
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
  const bobPage = await context.browser()!.newPage({ baseURL: test.info().project.use.baseURL });
  const alice = observe(page);
  const bob = observe(bobPage);
  const errors: string[] = [];
  for (const browser of [page, bobPage])
    browser.on('pageerror', (error) => {
      errors.push(error.message);
      console.error(error.stack);
    });
  try {
    const address = encodeURIComponent(`ws://127.0.0.1:${port}/game`);
    await page.goto(`?server=${address}&playerName=Alice`);
    await expect
      .poll(() => page.evaluate(() => window.snakeE2E?.getLifecycle().mode))
      .toMatch(/action|manual-room|paused/);
    await expect.poll(() => alice.snapshot?.localPlayerId).toBe('player-1');
    await bobPage.goto(`?server=${address}&playerName=Bob`);
    await expect
      .poll(() => bobPage.evaluate(() => window.snakeE2E?.getLifecycle().mode))
      .toMatch(/action|manual-room|paused/);
    await expect.poll(() => Object.keys(bob.snapshot?.players ?? {}).length).toBe(2);
    const bobId = bob.snapshot!.localPlayerId;
    expect(bobId).not.toBe('player-1');
    expect(bob.snapshot!.players[bobId].body).not.toEqual(bob.snapshot!.players['player-1'].body);
    // Keep the steering arena independent of origin placement: opposing turns
    // from nearby spawn lanes can legitimately collide and open an afterlife.
    game.runForPlayer(bobId, () =>
      game.placeSnakeBodyAtLocal(room.id, { x: 15, y: 15 }, { x: 1, y: 0 }),
    );
    session.refreshSnapshot();
    await expect.poll(() => bob.snapshot?.players[bobId].body[0]).toEqual({ x: 15, y: 15 });
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
    await expect
      .poll(() => page.evaluate(() => window.snakeE2E!.getPresentation().quest.visible))
      .toBe(true);
    expect(await page.evaluate(() => window.snakeE2E!.getPresentation().quest.title)).toBe('Ada');
    await page.keyboard.press('Enter');
    await expect
      .poll(() => page.evaluate(() => window.snakeE2E!.getPresentation().choice.visible))
      .toBe(true);
    const menu = await page.evaluate(() => window.snakeE2E!.getPresentation().choice);
    const talk = menu.options.findIndex((option) => option.id === 'talk');
    expect(talk).toBeGreaterThanOrEqual(0);
    for (
      let i = 0;
      i < (talk - menu.selectedIndex + menu.options.length) % menu.options.length;
      i++
    )
      await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    await expect
      .poll(() => page.evaluate(() => window.snakeE2E!.getPresentation().quest.visible))
      .toBe(true);
    expect(await page.evaluate(() => window.snakeE2E!.getPresentation().quest.text)).not.toBe('');
    expect(await bobPage.evaluate(() => window.snakeE2E!.getPresentation().quest.visible)).toBe(
      false,
    );
    for (
      let i = 0;
      i < 10 && (await page.evaluate(() => window.snakeE2E!.getPresentation().quest.visible));
      i++
    ) {
      await page.keyboard.press('Enter');
      await page.waitForTimeout(60);
    }
    await expect.poll(() => alice.snapshot?.ui.interaction).toBeNull();
    await bobPage.evaluate(() => window.snakeE2E!.setAppearance('midnight', 'cowboy'));
    await expect.poll(() => alice.snapshot?.players[bobId].appearance?.activeHat).toBe('cowboy');
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            window.snakeE2E!.getPresentation().players.find((player) => player.hat !== null)?.hat,
        ),
      )
      .toContain('hat');
    const remote = await page.evaluate(() => window.snakeE2E!.getPresentation().players);
    expect(
      remote
        .find((player) => player.id === bobId)
        ?.textures.some((texture) => texture.includes('snake')),
    ).toBe(true);
    expect(alice.snapshot?.players[bobId].appearance?.themeId).toBe('midnight');
    await page.screenshot({ path: 'test-results/multiplayer-npcs.png' });
    await bobPage.reload();
    await expect
      .poll(() => bobPage.evaluate(() => window.snakeE2E?.getLifecycle().mode))
      .toBe('action');
    await bobPage.screenshot({ path: 'test-results/multiplayer-restored-cosmetics.png' });
    await expect.poll(() => bob.snapshot?.players[bobId].appearance?.activeHat).toBe('cowboy');
    await expect.poll(() => alice.snapshot?.players[bobId].appearance?.themeId).toBe('midnight');
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
