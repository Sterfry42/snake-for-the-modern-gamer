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
import { serverCredentialKey } from '../../src/session/connectionSettings.js';
import { TOUCH_CONTROLS_STORAGE_KEY } from '../../src/input/touchDetection.js';

function observe(page: Page) {
  const state: { snapshot?: GameSnapshot; seenHeads: Set<string> } = { seenHeads: new Set() };
  page.on('websocket', (socket) => {
    if (new URL(socket.url()).pathname !== '/game') return;
    const assembler = new SnapshotDeltaAssembler();
    socket.on('framereceived', (frame) => {
      const wire = parseServerMessage(frame.payload.toString());
      if (wire.type === 'movement') {
        state.snapshot = assembler.applyMovement(wire.update) ?? state.snapshot;
        const head = wire.update.player.body[0];
        state.seenHeads.add(`${wire.update.player.id}:${head.x},${head.y}`);
        return;
      }
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
  expect(session.handleCommand({ type: 'pause', playerId: game.getLocalPlayerId() }).ok).toBe(true);
  const hostToken = 'multiplayer-smoke-browser-host';
  const server = createGameServer(session, { hostToken });
  const port = await server.listen(0);
  await page.addInitScript(
    ({ key, token, touchControlsKey }) => {
      localStorage.setItem(key, token);
      localStorage.setItem(touchControlsKey, 'off');
    },
    {
      key: `${serverCredentialKey(`ws://127.0.0.1:${port}/game`)}:host`,
      token: hostToken,
      touchControlsKey: TOUCH_CONTROLS_STORAGE_KEY,
    },
  );
  const bobPage = await context.browser()!.newPage({ baseURL: test.info().project.use.baseURL });
  const alice = observe(page);
  const bob = observe(bobPage);
  const errors: string[] = [];
  session.start((error) => errors.push(String(error)));
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
    game.runForPlayer('player-1', () => game.placeSnakeBodyAtLocal(room.id, head, { x: 1, y: 0 }));
    session.refreshSnapshot();
    await expect.poll(() => bob.seenHeads.has(`${bobId}:15,15`)).toBe(true);
    expect((await session.executeCommand({ type: 'resume', playerId: 'player-1' })).ok).toBe(true);
    for (const client of [page, bobPage])
      await expect
        .poll(() => client.evaluate(() => window.snakeE2E?.getLifecycle().mode))
        .toBe('action');
    await page.keyboard.press('ArrowUp');
    await bobPage.keyboard.press('ArrowDown');
    // Intended directions become authoritative only when their movement step commits.
    await expect.poll(() => game.getPlayer('player-1')!.snake.directionVector.y).toBe(-1);
    await expect.poll(() => game.getPlayer(bobId)!.snake.directionVector.y).toBe(1);
    session.stop();
    await expect.poll(() => alice.snapshot?.players['player-1'].direction.y).toBe(-1);
    await expect.poll(() => bob.snapshot?.players[bobId].direction.y).toBe(1);
    // The actor clock may move Ada while the snakes are steering.
    const adaPosition = game.getActorSystem().registry.get(ada.id)?.presence?.position;
    if (!adaPosition) throw new Error('Ada has no position');
    const besideAda = { x: adaPosition.x - 1, y: adaPosition.y };
    game.runForPlayer('player-1', () => {
      game.placeSnakeBodyAtLocal(room.id, besideAda, { x: 0, y: -1 });
      game.setFlag('ui.e2e.interactionReady', true);
    });
    expect(game.canInteractWithActor(ada.id)).toBe(true);
    session.refreshSnapshot();
    await expect.poll(() => alice.snapshot?.players['player-1'].body[0]).toEqual(besideAda);
    await expect
      .poll(() => page.evaluate(() => window.snakeE2E!.getFlag('ui.e2e.interactionReady')))
      .toBe(true);
    const canvas = await page.locator('canvas').boundingBox();
    if (!canvas) throw new Error('Missing canvas');
    await page.mouse.click(
      canvas.x + (((adaPosition.x + 0.5) * defaultGameConfig.grid.cell) / 768) * canvas.width,
      canvas.y + (((adaPosition.y + 0.5) * defaultGameConfig.grid.cell - 2) / 576) * canvas.height,
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
    session.stop();
    await bobPage.close();
    await page.close();
    await server.close();
  }
});

test('hosted movement recovers after room entry, a pause, death, tab restore, and reconnect', async ({
  page,
}) => {
  const game = new SnakeGame(
    { ...defaultGameConfig, rng: { seed: 'multiplayer-recovery-browser' } },
    new QuestRegistry(),
  );
  game.reset();
  const room = game.getCurrentRoom();
  room.layout = room.layout.map((row) => '.'.repeat(row.length));
  room.portals = [];
  const house = game.getWorld().getRoom('0,-1,0');
  house.layout = house.layout.map((row, y) =>
    y === 10 ? '.'.repeat(8) + 'WWWW' + '.'.repeat(row.length - 12) : '.'.repeat(row.length),
  );
  house.portals = [];
  game.bosses.clearAll();
  const session = new AuthoritativeGameSession({ game, manageBasicFeatures: true });
  const faults: string[] = [];
  const server = createGameServer(session, {
    onDiagnostic: (record) => {
      if (record.event === 'client.presentation-error') faults.push(JSON.stringify(record.fields));
    },
  });
  const port = await server.listen(0);
  const client = observe(page);
  const id = game.getLocalPlayerId();
  const revision = () => client.snapshot?.players[id]?.movementRevision ?? -1;
  const mode = () => page.evaluate(() => window.snakeE2E?.getLifecycle().mode);
  const advance = async () => {
    const before = revision();
    await session.advance(120);
    await session.advance(120);
    await expect.poll(revision).toBeGreaterThan(before);
    await expect
      .poll(() => client.snapshot?.players[id].body)
      .toEqual(session.getSnapshot(id).players[id].body);
  };
  page.on('pageerror', (error) => faults.push(error.message));
  try {
    await page.goto(
      `?server=${encodeURIComponent(`ws://127.0.0.1:${port}/game`)}&playerName=Alice`,
    );
    await expect.poll(mode).toBe('action');
    await advance();

    game.placeSnakeBodyAtLocal(room.id, { x: 8, y: 0 }, { x: 0, y: -1 });
    session.actionStep(false);
    await expect.poll(() => client.snapshot?.viewport.centerRoomId).toBe(house.id);
    game.placeSnakeBodyAtLocal(house.id, { x: 8, y: 10 }, { x: 1, y: 0 });
    game.setFlag('timeSinceEat', 40);
    session.refreshSnapshot();
    await expect.poll(() => client.snapshot?.players[id].roomId).toBe(house.id);
    await expect.poll(mode).toBe('manual-room');
    const inside = revision();
    await page.keyboard.press('ArrowRight');
    await expect.poll(revision).toBeGreaterThan(inside);
    expect(game.getFlag('timeSinceEat')).toBe(0);

    game.placeSnakeBodyAtLocal(room.id, { x: 10, y: 10 }, { x: 1, y: 0 });
    session.refreshSnapshot();
    await expect.poll(mode).toBe('action');
    await page.keyboard.press('Space');
    await expect.poll(() => client.snapshot?.ui.playerInteraction).toBe('paused');
    const held = revision();
    await session.advance(240);
    expect(session.getSnapshot(id).players[id].movementRevision).toBe(held);
    await page.keyboard.press('Space');
    await expect.poll(() => client.snapshot?.ui.playerInteraction).toBe('playing');
    await advance();

    const blocker = session.registerConnection('recovery-blocker', 'Blocker');
    game.placeSnakeBodyAtLocal(room.id, { x: 10, y: 10 }, { x: 1, y: 0 });
    game.runForPlayer(blocker, () =>
      game.placeSnakeBodyAtLocal(room.id, { x: 11, y: 10 }, { x: 0, y: 1 }),
    );
    await session.executeCommand({ type: 'playerInteraction', playerId: blocker, mode: 'paused' });
    game.setFlag('skills.extraLifeCharges', 1);
    session.actionStep(false);
    await expect.poll(mode).toBe('death-cutscene');
    const lifecycle = session.getSnapshot(id).lifecycle;
    if (lifecycle?.kind !== 'death') throw new Error('Expected a death encounter');
    await session.detachConnection('recovery-blocker');
    expect(
      await session.executeCommand({
        type: 'deathEncounterAction',
        playerId: id,
        encounterId: lifecycle.encounter.id,
        revision: lifecycle.encounter.revision,
        choice: 'return',
      }),
    ).toMatchObject({ ok: true });
    await expect.poll(mode).toBe('action');
    await expect.poll(() => client.snapshot?.ui.playerInteraction).toBe('playing');
    await advance();

    const before = Object.keys(client.snapshot?.connections ?? {});
    await page.evaluate(() => {
      Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' });
      document.dispatchEvent(new Event('visibilitychange'));
      window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: true }));
    });
    await expect.poll(() => session.getPerformanceReport().suspendedPlayers).toBe(1);
    await page.evaluate(() => {
      Reflect.deleteProperty(document, 'visibilityState');
      document.dispatchEvent(new Event('visibilitychange'));
      window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true }));
    });
    await expect.poll(() => Object.keys(client.snapshot?.connections ?? {})).not.toEqual(before);
    await expect.poll(() => client.snapshot?.localPlayerId).toBe(id);
    await expect.poll(mode).toBe('action');
    await advance();
    expect(faults).toEqual([]);
  } finally {
    await page.close();
    await server.close();
  }
});

test('shows one local apple bite before the authoritative step commits', async ({ page }) => {
  const game = new SnakeGame(
    {
      ...defaultGameConfig,
      rng: { seed: 'headless-apple-hooks' },
      apples: {
        ...defaultGameConfig.apples,
        types: defaultGameConfig.apples.types.filter(({ id }) => id === 'normal'),
      },
    },
    new QuestRegistry(),
  );
  game.reset();
  game.bosses.clearAll();
  const room = game.getCurrentRoom();
  room.layout = room.layout.map((row) => '.'.repeat(row.length));
  room.portals = [];
  const apple = game.getApple(room.id);
  if (!apple) throw new Error('Expected a stationary apple');
  const direction = apple.position.x >= 4 ? { x: 1, y: 0 } : { x: -1, y: 0 };
  game.placeSnakeBodyAtLocal(
    room.id,
    { x: apple.position.x - direction.x, y: apple.position.y },
    direction,
  );
  const session = new AuthoritativeGameSession({ game, manageBasicFeatures: true });
  const server = createGameServer(session);
  const port = await server.listen(0);
  const client = observe(page);
  const bites = () =>
    page.evaluate(
      () => window.snakeE2E!.getJuiceTrace().filter((entry) => entry.name === 'appleChomp').length,
    );
  try {
    await page.goto(
      `?server=${encodeURIComponent(`ws://127.0.0.1:${port}/game`)}&playerName=Alice`,
    );
    await expect
      .poll(() => page.evaluate(() => window.snakeE2E?.getLifecycle().mode))
      .toBe('action');
    const id = client.snapshot!.localPlayerId;
    const score = game.getScore();
    await expect.poll(bites).toBe(1);
    expect(session.getSnapshot(id).players[id].movementRevision).toBe(0);
    expect(game.getScore()).toBe(score);
    session.actionStep(false);
    await expect.poll(() => client.snapshot?.players[id].score).toBeGreaterThan(score);
    await expect
      .poll(() => client.snapshot?.viewport.rooms[room.id]?.apples?.spawnId)
      .not.toBe(apple.spawnId);
    expect(await bites()).toBe(1);
  } finally {
    await page.close();
    await server.close();
  }
});
