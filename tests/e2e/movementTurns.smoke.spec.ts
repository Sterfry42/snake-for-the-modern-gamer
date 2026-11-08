import { test, expect } from '@playwright/test';
import { movementTurnFixture } from '../../src/test/movementTurnScenario.js';
import { createGameServer } from '../../src/server/createGameServer.js';
import type { SessionDiagnostic } from '../../src/session/SessionDiagnostic.js';
import { serverCredentialKey } from '../../src/session/connectionSettings.js';

test('two browsers retain intended turn steps over delayed, jittered sockets at five speeds', async ({
  page,
  browser,
}) => {
  test.setTimeout(60000);
  const { game, room, session } = await movementTurnFixture();
  expect(session.handleCommand({ type: 'pause', playerId: game.getLocalPlayerId() }).ok).toBe(true);
  // The browser transport must allocate the two real connections.
  session.unregisterConnection('alice');
  const records: SessionDiagnostic[] = [];
  const hostToken = 'movement-turn-browser-host';
  const server = createGameServer(session, {
    hostToken,
    onDiagnostic: (record) => records.push(record),
  });
  const port = await server.listen(0);
  await page.addInitScript(({ key, token }) => localStorage.setItem(key, token), {
    key: `${serverCredentialKey(`ws://127.0.0.1:${port}/game`)}:host`,
    token: hostToken,
  });
  const bob = await browser.newPage({ baseURL: test.info().project.use.baseURL });
  const errors: string[] = [];
  session.start((error) => errors.push(String(error)));
  for (const client of [page, bob]) {
    client.on('pageerror', (error) => errors.push(error.message));
    await client.routeWebSocket('**/game?**', (socket) => {
      const upstream = socket.connectToServer();
      let delivery = Promise.resolve();
      let turn = 0;
      socket.onMessage((message) => {
        const value = JSON.parse(message.toString());
        if (value.type === 'command' && value.command.type === 'setDirection') {
          const delay = [15, 35, 55][turn++ % 3];
          delivery = delivery.then(async () => {
            await new Promise((resolve) => setTimeout(resolve, delay));
            upstream.send(message);
          });
        } else upstream.send(message);
      });
    });
  }
  try {
    const url = `?server=${encodeURIComponent(`ws://127.0.0.1:${port}/game`)}`;
    await page.goto(`${url}&playerName=Alice`);
    await bob.goto(`${url}&playerName=Bob`);
    for (const client of [page, bob])
      await expect
        .poll(() => client.evaluate(() => window.snakeE2E?.getLifecycle().mode))
        .toMatch(/action|paused/);
    const players = Object.values(session.getSnapshot().connections!);
    const aliceId = players.find((peer) => peer.displayName === 'Alice')!.playerId;
    const bobId = players.find((peer) => peer.displayName === 'Bob')!.playerId;
    expect((await session.executeCommand({ type: 'resume', playerId: aliceId })).ok).toBe(true);
    for (const client of [page, bob])
      await expect
        .poll(() => client.evaluate(() => window.snakeE2E?.getLifecycle().mode))
        .toBe('action');
    for (const interval of [50, 70, 100, 126, 200]) {
      for (const [id, y] of [
        [aliceId, 6],
        [bobId, 18],
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
      // Let both browser replicas observe the authoritative relocation and speed.
      for (const client of [page, bob])
        await expect
          .poll(() =>
            client.evaluate(() => ({
              direction: window.snakeE2E?.getPresentation().movement?.direction.x,
              interval: window.snakeE2E?.getPresentation().movementDiagnostics?.intervalMs,
            })),
          )
          .toEqual({ direction: 1, interval });
      const before = records.length;
      await Promise.all([page.keyboard.press('ArrowDown'), bob.keyboard.press('ArrowDown')]);
      await expect
        .poll(
          () =>
            records.slice(before).filter((record) => record.event === 'movement.turn-applied')
              .length,
        )
        .toBe(2);
      await Promise.all([page.keyboard.press('ArrowLeft'), bob.keyboard.press('ArrowLeft')]);
      await expect
        .poll(
          () =>
            records.slice(before).filter((record) => record.event === 'movement.turn-applied')
              .length,
        )
        .toBe(4);
      const applied = records
        .slice(before)
        .filter((record) => record.event === 'movement.turn-applied');
      expect(
        applied.every(
          (record) =>
            record.fields?.intendedRevision === record.fields?.appliedRevision &&
            record.fields?.reason === 'applied',
        ),
      ).toBe(true);
      expect(
        records
          .slice(before)
          .filter(
            (record) => record.event === 'movement.turn' && record.fields?.reason !== 'scheduled',
          ),
      ).toEqual([]);
      for (const client of [page, bob]) {
        const sample = await client.evaluate(async () => {
          const frames = [];
          for (let i = 0; i < 5; i++) {
            await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
            frames.push(window.snakeE2E!.getPresentation());
          }
          return frames;
        });
        expect(
          sample.every((frame) =>
            frame.movement?.body.every(
              (point) => Number.isInteger(point.x) && Number.isInteger(point.y),
            ),
          ),
        ).toBe(true);
        expect(sample.every((frame) => frame.movementDiagnostics?.correctionTiles === 0)).toBe(
          true,
        );
      }
    }
    await page.screenshot({ path: 'test-results/movement-turn-authority.png' });
    expect(errors).toEqual([]);
  } finally {
    await test.info().attach('movement-turn-diagnostics', {
      body: JSON.stringify(
        records.filter((record) => record.event.startsWith('movement.')),
        null,
        2,
      ),
      contentType: 'application/json',
    });
    session.stop();
    await page.close();
    await bob.close();
    await server.close();
  }
});
