import { test, expect, type Page } from '@playwright/test';
import { SnakeGame } from '../../src/game/snakeGame.js';
import { QuestRegistry } from '../../src/quests/questRegistry.js';
import { defaultGameConfig } from '../../src/config/gameConfig.js';
import { AuthoritativeGameSession } from '../../src/session/AuthoritativeGameSession.js';
import { createGameServer } from '../../src/server/createGameServer.js';
import { serverCredentialKey } from '../../src/session/connectionSettings.js';
import { SnapshotDeltaAssembler } from '../../src/session/SnapshotDelta.js';
import { parseServerMessage } from '../../src/session/gameProtocol.js';
import type { GameSnapshot } from '../../src/session/GameSnapshot.js';
import { WORLD_DAY_MS } from '../../src/farming/farmingState.js';

function observe(page: Page) {
  const state: { snapshot?: GameSnapshot } = {};
  page.on('websocket', socket => {
    if (new URL(socket.url()).pathname !== '/game') return;
    const assembler = new SnapshotDeltaAssembler();
    socket.on('framereceived', frame => {
      const wire = parseServerMessage(frame.payload.toString());
      if (wire.type === 'welcome') { assembler.reset(wire.snapshot); state.snapshot = wire.snapshot; }
      else if (wire.type === 'delta') state.snapshot = assembler.apply(wire.delta);
      else if (wire.type === 'snapshot') state.snapshot = wire.snapshot;
    });
  });
  return state;
}
async function pick(page: Page, id: string) {
  await expect.poll(() => page.evaluate(() => window.snakeE2E?.getPresentation().choice.visible)).toBe(true);
  const menu = await page.evaluate(() => window.snakeE2E!.getPresentation().choice);
  const index = menu.options.findIndex(option => option.id === id);
  expect(index, `Missing ${id} in ${menu.title}`).toBeGreaterThanOrEqual(0);
  for (let i = menu.selectedIndex; i < index; i++) await page.keyboard.press('ArrowDown');
  for (let i = menu.selectedIndex; i > index; i--) await page.keyboard.press('ArrowUp');
  await expect.poll(() => page.evaluate(() => { const menu = window.snakeE2E!.getPresentation().choice; return menu.options[menu.selectedIndex]?.id; })).toBe(id);
  await page.keyboard.press('Enter');
}

test('two browsers cultivate free wilderness, share one harvest, enforce a paid claim and reconnect', async ({ page, browser }) => {
  test.setTimeout(60000);
  const game = new SnakeGame({ ...defaultGameConfig, rng: { seed: 'agriculture-authority' } }, new QuestRegistry()); game.reset();
  const room = game.getCurrentRoom(); room.layout = room.layout.map(row => '.'.repeat(row.length)); room.portals = []; room.vegetation = []; game.bosses.clearAll();
  for (let i = 0; i < 20 && game.getEnemies(room.id).length; i++) game.damageCarImpactAt(room.id, game.getEnemies(room.id).map(enemy => enemy.position));
  const session = new AuthoritativeGameSession({ game, manageBasicFeatures: true });
  expect(session.handleCommand({ type: 'pause', playerId: game.getLocalPlayerId() }).ok).toBe(true);
  const token = 'agriculture-browser-host-token'; const server = createGameServer(session, { hostToken: token }); const port = await server.listen(0);
  await page.addInitScript(({ key, token }) => localStorage.setItem(key, token), { key: `${serverCredentialKey(`ws://127.0.0.1:${port}/game`)}:host`, token });
  const bob = await browser.newPage({ baseURL: test.info().project.use.baseURL });
  const a = observe(page), b = observe(bob), errors: string[] = [];
  for (const client of [page, bob]) client.on('pageerror', error => errors.push(error.message));
  try {
    const url = `?server=${encodeURIComponent(`ws://127.0.0.1:${port}/game`)}`;
    await page.goto(`${url}&playerName=Alice`); await bob.goto(`${url}&playerName=Bob`);
    for (const client of [page, bob]) await expect.poll(() => client.evaluate(() => window.snakeE2E?.getLifecycle().mode)).toMatch(/paused|action/);
    const connections = Object.values(session.getSnapshot().connections!);
    const aliceId = connections.find(peer => peer.displayName === 'Alice')!.playerId;
    const bobId = connections.find(peer => peer.displayName === 'Bob')!.playerId;
    for (const [id, x] of [[aliceId, 5], [bobId, 6]] as const) game.runForPlayer(id, () => {
      game.placeSnakeBodyAtLocal(room.id, { x, y: 5 }, { x: 1, y: 0 }); game.getInventory().addItem('farm-hoe'); game.getInventory().addItem('watering-can'); game.getInventory().addItem('seed-radish', 2); game.setScore(40);
    });
    session.refreshSnapshot(); await session.executeCommand({ type: 'resume', playerId: aliceId });
    for (const client of [page, bob]) { await expect.poll(() => client.evaluate(() => window.snakeE2E?.getLifecycle().mode)).toBe('action'); await client.keyboard.press('j'); }
    await pick(page, 'till'); await expect.poll(() => game.getFarmCells().length).toBe(1);
    expect(game.getRoomClaim()).toBeUndefined(); expect(game.runForPlayer(aliceId, () => game.getScore())).toBe(40);
    await pick(page, 'plant'); await pick(page, 'seed-radish'); await expect.poll(() => game.getFarmCells()[0]?.crop?.cropId).toBe('radish');
    await pick(page, 'water'); await expect.poll(() => game.runForPlayer(aliceId, () => game.getFlag('farm.canCharges'))).toBe(7);
    game.updateAtmosphere(WORLD_DAY_MS); session.refreshSnapshot();
    await expect.poll(() => a.snapshot?.clientState?.farming?.rooms[0]?.cells[0]?.crop?.stage).toBe('ready');
    await expect.poll(() => b.snapshot?.clientState?.farming?.rooms[0]?.cells[0]?.crop?.stage).toBe('ready');
    await page.screenshot({ path: 'test-results/agriculture-ready-crop.png' });
    await pick(bob, 'target'); await pick(bob, '4');
    await Promise.all([pick(page, 'harvest'), pick(bob, 'harvest')]);
    await expect.poll(() => game.getFarmCells()[0]?.crop).toBeUndefined();
    const produce = () => [aliceId, bobId].reduce((sum, id) => sum + game.runForPlayer(id, () => game.getInventory().getAllItems().filter(([id]) => id.startsWith('produce-radish')).reduce((sum, [,count]) => sum + count, 0)), 0);
    expect(produce()).toBe(2);
    await pick(page, 'territory'); await pick(page, 'claim'); await expect.poll(() => game.getRoomClaim()?.ownerId).toBe(aliceId);
    expect(game.runForPlayer(aliceId, () => game.getScore())).toBe(0);
    await pick(bob, 'till'); await expect.poll(() => b.snapshot?.clientState?.farming?.actions?.[0]?.nonce).toBe(2);
    expect(game.getFarmCells()).toHaveLength(1); expect(produce()).toBe(2);
    await bob.reload(); await expect.poll(() => b.snapshot?.localPlayerId).toBe(bobId);
    await expect.poll(() => b.snapshot?.clientState?.construction.claim?.ownerId).toBe(aliceId);
    await expect.poll(() => b.snapshot?.clientState?.farming?.rooms[0]?.cells.length).toBe(1);
    expect(errors).toEqual([]);
  } finally { session.stop(); await page.close(); await bob.close(); await server.close(); }
});
