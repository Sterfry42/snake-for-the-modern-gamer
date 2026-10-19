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

test('friends keep their characters through refresh and a broken socket, see presence and emotes, and share safe invites', async ({ page, browser }) => {
  const game = new SnakeGame({ ...defaultGameConfig, rng: { seed: 'crew-browser' } }, new QuestRegistry());
  game.reset();
  game.bosses.clearAll();
  const room = game.getCurrentRoom();
  room.layout = room.layout.map(row => '.'.repeat(row.length));
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
  bob.on('websocket', socket => {
    if (new URL(socket.url()).pathname !== '/game') return;
    const assembler = new SnapshotDeltaAssembler();
    socket.on('framereceived', frame => {
      const wire = parseServerMessage(frame.payload.toString());
      if (wire.type === 'welcome') assembler.reset(wire.snapshot);
      const message = wire.type === 'delta' ? { type: 'snapshot' as const, snapshot: assembler.apply(wire.delta) } : wire;
      if (message.type === 'welcome') { bobId = message.playerId; bobConnectionId = message.connectionId; }
      if (message.type === 'snapshot' || message.type === 'welcome') bobSnapshot = message.snapshot;
    });
  });
  for (const client of [page, bob]) client.on('pageerror', error => errors.push(error.message));
  try {
    const endpoint = `ws://127.0.0.1:${port}/game`;
    await page.goto(`?server=${encodeURIComponent(endpoint)}&playerName=Alice`);
    await expect(page.getByRole('complementary', { name: 'Connected players' })).toContainText('Alice (you)');
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
    await expect(page.locator('.snake-party li').filter({ hasText: 'Bob' })).toContainText(getEmoticonDefinition(session.getSnapshot().players[id].activeEmoticon!)!.label);
    const previousConnection = bobConnectionId;
    wires.get('Bob')!.destroy();
    await expect(bob.getByRole('status')).toContainText('Reconnecting');
    await expect(bob.getByRole('status')).toHaveText('Connected');
    expect(bobId).toBe(id);
    expect(bobConnectionId).not.toBe(previousConnection);
    expect(bobSnapshot?.players[id].score).toBe(73);
    await expect(page.locator('.snake-party')).toContainText('Bob reconnected.');
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
