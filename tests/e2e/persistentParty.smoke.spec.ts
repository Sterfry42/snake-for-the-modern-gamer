import { SnapshotDeltaAssembler } from '../../src/session/SnapshotDelta.js';
import { test, expect } from '@playwright/test';
import type { Duplex } from 'node:stream';
import { SnakeGame } from '../../src/game/snakeGame.js';
import { defaultGameConfig } from '../../src/config/gameConfig.js';
import { QuestRegistry } from '../../src/quests/questRegistry.js';
import { AuthoritativeGameSession } from '../../src/session/AuthoritativeGameSession.js';
import { createGameServer } from '../../src/server/createGameServer.js';
import { getEmoticonDefinition } from '../../src/emoticons/emoticonCatalog.js';
import { parseServerMessage } from '../../src/session/gameProtocol.js';
import type { GameSnapshot } from '../../src/session/GameSnapshot.js';

test('friends keep their characters through refresh and a broken socket, see presence and emotes, and share safe invites', async ({
  page,
  browser,
}) => {
  const game = new SnakeGame(
    { ...defaultGameConfig, rng: { seed: 'crew-browser' } },
    new QuestRegistry(),
  );
  game.reset();
  game.bosses.clearAll();
  const room = game.getCurrentRoom();
  room.layout = room.layout.map((row) => '.'.repeat(row.length));
  const session = new AuthoritativeGameSession({ game, manageBasicFeatures: true });
  const server = createGameServer(session);
  const port = await server.listen(0);
  const wires = new Map<string, Duplex>();
  server.http.on('upgrade', (request, socket) => {
    wires.set(new URL(request.url!, 'http://localhost').searchParams.get('name')!, socket);
  });
  const bob = await browser.newPage({ baseURL: test.info().project.use.baseURL });
  const errors: string[] = [];
  let bobSnapshot: GameSnapshot | undefined;
  let bobId = '';
  let bobConnectionId = '';
  bob.on('websocket', (socket) => {
    if (new URL(socket.url()).pathname !== '/game') return;
    const assembler = new SnapshotDeltaAssembler();
    socket.on('framereceived', (frame) => {
      const wire = parseServerMessage(frame.payload.toString());
      if (wire.type === 'welcome') assembler.reset(wire.snapshot);
      const message =
        wire.type === 'delta'
          ? { type: 'snapshot' as const, snapshot: assembler.apply(wire.delta) }
          : wire;
      if (message.type === 'welcome') {
        bobId = message.playerId;
        bobConnectionId = message.connectionId;
      }
      if (message.type === 'snapshot' || message.type === 'welcome') bobSnapshot = message.snapshot;
    });
  });
  for (const client of [page, bob]) client.on('pageerror', (error) => errors.push(error.message));
  try {
    const endpoint = `ws://127.0.0.1:${port}/game`;
    await page.goto(`?server=${encodeURIComponent(endpoint)}&playerName=Alice`);
    await expect(page.getByRole('complementary', { name: 'Connected players' })).toContainText(
      'Alice (you)',
    );
    await page.getByRole('button', { name: 'Invite friend' }).click();
    const invite = await page.getByLabel('Invite link', { exact: true }).inputValue();
    expect(invite).not.toMatch(/resume|hostToken|playerName|enter=/);
    await bob.goto(invite);
    await expect(bob.getByRole('dialog', { name: 'Connect to a Server' })).toBeVisible();
    await expect(bob.getByLabel('Server URL')).toHaveValue(endpoint);
    await bob.getByLabel('Display name').fill('Bob');
    await bob.getByRole('button', { name: 'Enter World', exact: true }).click();
    await expect(bob.locator('.snake-party')).toContainText('Bob (you)');
    await expect(page.locator('.snake-party')).toContainText('Bob joined.');
    await expect(bob.locator('.snake-party')).toContainText(`room ${room.id}`);
    const id = bobId;
    expect(id).toBeTruthy();
    game.runForPlayer(id, () => {
      game.setScore(73);
      game.getInventory().addItem('healing-potion', 2);
    });
    session.refreshSnapshot();
    await expect.poll(() => bobSnapshot?.players[id].score).toBe(73);
    await bob.reload();
    await expect(bob.locator('.snake-party')).toContainText('Bob (you)');
    expect(bobId).toBe(id);
    await expect.poll(() => bobSnapshot?.players[id].score).toBe(73);
    expect(bobSnapshot?.ui.inventory?.['healing-potion']).toBe(2);
    await bob.keyboard.press('Tab');
    await bob.keyboard.press('Enter');
    await expect.poll(() => session.getSnapshot().players[id].activeEmoticon).toBeTruthy();
    await expect(page.locator('.snake-party li').filter({ hasText: 'Bob' })).toContainText(
      getEmoticonDefinition(session.getSnapshot().players[id].activeEmoticon!)!.label,
    );
    const previousConnection = bobConnectionId;
    await bob.getByRole('status').evaluate((element) => {
      const observer = new MutationObserver(() => {
        if (element.textContent?.includes('Reconnecting')) {
          element.setAttribute('data-reconnect-notice', 'seen');
          observer.disconnect();
        }
      });
      observer.observe(element, { childList: true, subtree: true });
    });
    wires.get('Bob')!.destroy();
    await expect(bob.getByRole('status')).toHaveAttribute('data-reconnect-notice', 'seen');
    await expect(bob.getByRole('status')).toHaveText('Connected');
    expect(bobId).toBe(id);
    expect(bobConnectionId).not.toBe(previousConnection);
    expect(bobSnapshot?.players[id].score).toBe(73);
    await expect(page.locator('.snake-party')).not.toContainText('Bob left.');
    await expect(page.locator('.snake-party')).not.toContainText('Bob reconnected.');
    expect(Object.values(session.getSnapshot().connections ?? {})).toHaveLength(2);
    await bob.screenshot({ path: 'test-results/persistent-crew.png' });
    await bob.getByRole('button', { name: 'Leave server', exact: true }).click();
    await expect(bob.getByRole('dialog', { name: 'Connect to a Server' })).toBeVisible();
    await expect(page.locator('.snake-party')).toContainText('Bob left.');
    expect(errors).toEqual([]);
  } finally {
    await bob.close();
    await page.close();
    await server.close();
  }
});

test('a broken socket keeps the local snake moving, buffers turns, and catches up through authority', async ({
  page,
}) => {
  const game = new SnakeGame(
    { ...defaultGameConfig, rng: { seed: 'movement-browser' } },
    new QuestRegistry(),
  );
  game.reset();
  game.bosses.clearAll();
  const room = game.getCurrentRoom();
  room.layout = room.layout.map((row) => '.'.repeat(row.length));
  room.portals = [];
  game.placeSnakeBodyAtLocal(room.id, { x: 10, y: 10 }, { x: 1, y: 0 });
  const session = new AuthoritativeGameSession({ game, manageBasicFeatures: true });
  const diagnostics: import('../../src/session/SessionDiagnostic.js').SessionDiagnostic[] = [];
  const server = createGameServer(session, { onDiagnostic: diagnostic => diagnostics.push(diagnostic) });
  const wires: Duplex[] = [];
  server.http.on('upgrade', (_request, socket) => wires.push(socket));
  const port = await server.listen(0);
  const errors: string[] = [];
  const requests: unknown[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('websocket', (socket) => {
    if (new URL(socket.url()).pathname !== '/game') return;
    socket.on('framesent', (frame) => requests.push(JSON.parse(frame.payload.toString())));
  });
  try {
    await page.goto(
      `?server=${encodeURIComponent(`ws://127.0.0.1:${port}/game`)}&playerName=Alice`,
    );
    await expect(page.locator('.snake-party')).toContainText('Alice (you)');
    await expect
      .poll(() => page.evaluate(() => window.snakeE2E?.getLifecycle().mode))
      .toBe('action');
    const id = session.getSnapshot().localPlayerId;
    const original = Object.keys(session.getSnapshot().connections!)[0];
    const body = session.getSnapshot(id).players[id].body;
    wires[0].destroy();
    await expect
      .poll(() => session.getSnapshot(id).connections?.[original]?.suspended, { intervals: [10] })
      .toBe(true);
    await page.keyboard.press('ArrowDown');
    await expect
      .poll(() => page.evaluate(() => window.snakeE2E!.getPresentation().movement?.body[0].y), {
        intervals: [10],
      })
      .toBeGreaterThan(body[0].y);
    expect(session.getSnapshot(id).players[id].body).toEqual(body);
    await expect(page.getByRole('status')).toHaveText('Connected');
    await expect.poll(() => Object.keys(session.getSnapshot().connections!)[0]).not.toBe(original);
    expect(session.getSnapshot(id).players[id].body[0].y).toBeGreaterThan(body[0].y);
    expect(session.getSnapshot(id).players[id].direction).toEqual({ x: 0, y: 1 });
    await expect.poll(() => diagnostics.some(diagnostic => diagnostic.event === 'client.connection-lost' && diagnostic.fields?.previousConnectionId === original)).toBe(true);
    expect(requests).toContainEqual(
      expect.objectContaining({
        type: 'movementResume',
        replay: expect.objectContaining({
          connectionId: original,
          steps: expect.any(Number),
          inputs: expect.arrayContaining([{ step: 0, direction: { x: 0, y: 1 } }]),
        }),
      }),
    );
    await page.screenshot({ path: 'test-results/movement-reconnect.png' });
    expect(errors).toEqual([]);
  } finally {
    await page.close();
    await server.close();
  }
});
