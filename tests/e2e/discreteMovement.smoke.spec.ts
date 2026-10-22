import { test, expect } from '@playwright/test';
import { SnakeGame } from '../../src/game/snakeGame.js';
import { defaultGameConfig } from '../../src/config/gameConfig.js';
import { QuestRegistry } from '../../src/quests/questRegistry.js';
import { AuthoritativeGameSession } from '../../src/session/AuthoritativeGameSession.js';
import { createGameServer } from '../../src/server/createGameServer.js';
import type { SessionDiagnostic } from '../../src/session/SessionDiagnostic.js';

test('two normal clients use discrete variable-speed steps, rapid turns, grid corrections and browser lifecycle resume', async ({
  page,
  browser,
}) => {
  test.setTimeout(60000);
  const game = new SnakeGame(
    { ...defaultGameConfig, rng: { seed: 'discrete-browser' } },
    new QuestRegistry(),
  );
  game.reset();
  game.bosses.clearAll();
  const room = game.getCurrentRoom();
  room.layout = room.layout.map((row) => '.'.repeat(row.length));
  room.portals = [];
  const session = new AuthoritativeGameSession({ game, manageBasicFeatures: true });
  const records: SessionDiagnostic[] = [];
  const server = createGameServer(session, { onDiagnostic: (record) => records.push(record) });
  const port = await server.listen(0);
  const bob = await browser.newPage({ baseURL: test.info().project.use.baseURL });
  const errors: string[] = [];
  const kinds: string[] = [];
  for (const client of [page, bob]) client.on('pageerror', (error) => errors.push(error.message));
  page.on('websocket', (socket) =>
    socket.on('framereceived', (frame) => kinds.push(JSON.parse(frame.payload.toString()).type)),
  );
  try {
    const url = `?server=${encodeURIComponent(`ws://127.0.0.1:${port}/game`)}`;
    await page.goto(`${url}&playerName=Alice`);
    await bob.goto(`${url}&playerName=Bob`);
    for (const client of [page, bob])
      await expect
        .poll(() => client.evaluate(() => window.snakeE2E?.getLifecycle().mode))
        .toBe('action');
    const alice = session.getSnapshot().localPlayerId;
    const bobId = Object.values(session.getSnapshot().connections!).find(
      (peer) => peer.displayName === 'Bob',
    )!.playerId;
    for (const [id, y, interval] of [
      [alice, 6, 50],
      [bobId, 18, 70],
    ] as const)
      game.runForPlayer(id, () => {
        game.placeSnakeBodyAtLocal(room.id, { x: 10, y }, { x: 1, y: 0 });
        game.setFlag('class.mods', {
          derivedModifiers: [
            { stat: 'actionStepIntervalScalar', operation: 'multiply', value: interval / 100 },
          ],
        });
      });
    await session.advance(0);
    session.refreshSnapshot();
    await page.keyboard.press('ArrowDown', { delay: 30 });
    await page.keyboard.press('ArrowLeft', { delay: 30 });
    for (let frame = 0; frame < 8; frame++) await session.advance(20);
    expect(session.getSnapshot(alice).players[alice].direction).toEqual({ x: -1, y: 0 });
    await expect.poll(() => kinds.filter((kind) => kind === 'movement').length).toBeGreaterThan(3);
    for (const interval of [50, 70, 100, 200]) {
      game.runForPlayer(alice, () =>
        game.setFlag('class.mods', {
          derivedModifiers: [
            { stat: 'actionStepIntervalScalar', operation: 'multiply', value: interval / 100 },
          ],
        }),
      );
      for (let frame = 0; frame < 3; frame++) await session.advance(20);
      await expect
        .poll(() => session.getSnapshot(alice).players[alice].movementIntervalMs)
        .toBe(interval);
      const sample = await page.evaluate(async () => {
        const frames = [];
        for (let i = 0; i < 8; i++) {
          await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
          const view = window.snakeE2E!.getPresentation();
          frames.push({ body: view.movement?.body ?? [], peers: view.players });
        }
        return frames;
      });
      expect(
        sample.every((frame) =>
          frame.body.every((point) => Number.isInteger(point.x) && Number.isInteger(point.y)),
        ),
      ).toBe(true);
      expect(session.getSnapshot(bobId).players[bobId].movementRevision).toBeGreaterThan(0);
    }
    // A real authoritative relocation corrects immediately to grid cells.
    game.runForPlayer(alice, () =>
      game.placeSnakeBodyAtLocal(room.id, { x: 20, y: 6 }, { x: 1, y: 0 }),
    );
    session.refreshSnapshot();
    await expect
      .poll(() => page.evaluate(() => window.snakeE2E!.getPresentation().movement?.body[0].x))
      .toBeGreaterThanOrEqual(20);
    const connection = Object.values(session.getSnapshot().connections!).find(
      (peer) => peer.playerId === alice,
    )!.connectionId;
    await page.evaluate(() =>
      window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: true })),
    );
    await expect
      .poll(() =>
        records.some(
          (record) =>
            record.event === 'connection.closed' &&
            record.fields?.connectionId === connection &&
            record.fields?.cause === 'browser-page-lifecycle',
        ),
      )
      .toBe(true);
    const peerRevision = session.getSnapshot(bobId).players[bobId].movementRevision!;
    for (let frame = 0; frame < 5; frame++) await session.advance(20);
    expect(session.getSnapshot(bobId).players[bobId].movementRevision).toBeGreaterThan(
      peerRevision,
    );
    await page.evaluate(() =>
      window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true })),
    );
    await expect
      .poll(() =>
        Object.values(session.getSnapshot().connections!).some(
          (peer) => peer.playerId === alice && peer.connectionId !== connection,
        ),
      )
      .toBe(true);
    await expect(page.getByRole('status')).toHaveText('Connected');
    expect(
      records.some(
        (record) => record.event === 'player.detached' && record.fields?.playerId === alice,
      ),
    ).toBe(false);
    expect(
      records.some(
        (record) =>
          record.event === 'client.browser-lifecycle' && record.fields?.browserState === 'pagehide',
      ),
    ).toBe(true);
    await page.screenshot({ path: 'test-results/discrete-multiplayer-movement.png' });
    expect(errors).toEqual([]);
  } finally {
    await page.close();
    await bob.close();
    await server.close();
  }
});
