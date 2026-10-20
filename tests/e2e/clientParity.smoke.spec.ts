import { test, expect } from '@playwright/test';
import { SnakeGame } from '../../src/game/snakeGame.js';
import { QuestRegistry } from '../../src/quests/questRegistry.js';
import { defaultGameConfig } from '../../src/config/gameConfig.js';
import { AuthoritativeGameSession } from '../../src/session/AuthoritativeGameSession.js';
import { createGameServer } from '../../src/server/createGameServer.js';
import type { GameSaveData } from '../../src/game/saveTypes.js';

test('the normal multiplayer pause shell renders every available tab and sends inventory actions to authority', async ({ page, context }) => {
  const game = new SnakeGame({ ...defaultGameConfig, rng: { seed: 'normal-client-parity' } }, new QuestRegistry());
  game.reset();
  const room = game.getCurrentRoom();
  room.layout = room.layout.map(row => '.'.repeat(row.length));
  game.bosses.clearAll();
  game.getInventory().addItem('boots-quick', 1);
  game.getInventory().addItem('healing-potion', 1);
  game.getInventory().addItem('baseball-bat', 1);
  game.getInventory().addItem('fishing-rod', 1);
  game.setFlag('player.health', 1);
  const saves = new Map<string, GameSaveData>();
  const session = new AuthoritativeGameSession({ game, manageBasicFeatures: true, saveStore: {
    load: async id => structuredClone(saves.get(id) ?? null),
    save: async (id, data) => { saves.set(id, structuredClone(data)); },
    clear: async id => { saves.delete(id); },
    has: async id => saves.has(id),
  } });
  const server = createGameServer(session, { hostToken: 'browser-owner-key-explicit' });
  const port = await server.listen(0);
  await page.addInitScript(({ key, token }) => localStorage.setItem(key, token), {
    key: `snake.serverIdentity:ws://127.0.0.1:${port}/game:host`, token: 'browser-owner-key-explicit',
  });
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.stack ?? error.message));
  const bobPage = await context.browser()!.newPage({ baseURL: test.info().project.use.baseURL });
  try {
    const url = `?server=${encodeURIComponent(`ws://127.0.0.1:${port}/game`)}`;
    await page.goto(url);
    await expect.poll(() => page.evaluate(() => window.snakeE2E?.getLifecycle().mode)).toBe('action');
    await bobPage.goto(url);
    await expect.poll(() => bobPage.evaluate(() => window.snakeE2E?.getLifecycle().mode)).toBe('action');
    const [alice, bob] = Object.keys(session.getSnapshot().players);
    await page.keyboard.press('Space');
    await expect.poll(() => session.getSnapshot(alice).ui.playerInteraction).toBe('paused');
    const held = session.getSnapshot(alice).players[alice].body;
    const moving = session.getSnapshot(bob).players[bob].body;
    await session.advance(100);
    expect(session.getSnapshot().players[alice].body).toEqual(held);
    expect(session.getSnapshot().players[bob].body).not.toEqual(moving);
    expect(session.getSnapshot().ui.paused).toBe(false);
    const visited = await page.evaluate(() => {
      const api = window.snakeE2E!;
      const visited = new Set<string>();
      const available = api.getPauseState().availableTabs;
      for (let group = 0; group < 4; group++) {
        for (let tab = 0; tab < available.length; tab++) {
          visited.add(api.getPauseState().activeTab);
          api.navigatePause('subTabNext');
        }
        api.navigatePause('primaryTabNext');
      }
      return { visited: [...visited].sort(), available: [...available].sort() };
    });
    expect(visited.visited).toEqual(visited.available);
    expect(await page.evaluate(() => window.snakeE2E!.equipItem('boots-quick'))).toBe(true);
    expect(game.getInventory().getEquipped('boots')).toBe('boots-quick');
    expect(await page.evaluate(() => window.snakeE2E!.useItem('healing-potion'))).toMatchObject({ ok: true });
    expect(game.getInventory().getItemCount('healing-potion')).toBe(0);
    await expect.poll(() => page.evaluate(() => window.snakeE2E!.getInventoryCount('healing-potion'))).toBe(0);
    await page.screenshot({ path: 'test-results/normal-multiplayer-pause.png' });
    await page.keyboard.press('Space');
    await expect.poll(() => page.evaluate(() => window.snakeE2E!.getLifecycle().mode)).toBe('action');
    const canvas = await page.locator('canvas').boundingBox();
    if (!canvas) throw new Error('Missing canvas');
    await page.mouse.click(canvas.x + 70 / 768 * canvas.width, canvas.y + 548 / 576 * canvas.height);
    await expect.poll(() => saves.size).toBe(1);
    const savedScore = game.getScore();
    game.addScore(100);
    session.refreshSnapshot();
    expect(await page.evaluate(() => window.snakeE2E!.loadCheckpoint())).toBe(true);
    expect(game.getScore()).toBe(savedScore);
    expect(Object.keys(session.getSnapshot().players)).toContain(bob);
    expect(await page.evaluate(() => window.snakeE2E!.equipItem('baseball-bat'))).toBe(true);
    await page.keyboard.press('b');
    await expect.poll(() => page.evaluate(() => window.snakeE2E!.getLifecycle().mode)).toBe('baseball');
    await session.advance(100);
    await page.keyboard.press('Space');
    await expect.poll(() => game.getFlag<{ swings: number }>('baseball.stats')?.swings).toBe(1);
    await page.screenshot({ path: 'test-results/normal-multiplayer-baseball.png' });
    for (let step = 0; step < 14; step++) await session.advance(100);
    await expect.poll(() => page.evaluate(() => window.snakeE2E!.getLifecycle().mode)).toBe('action');
    expect(await page.evaluate(() => window.snakeE2E!.equipItem('fishing-rod'))).toBe(true);
    const currentRoom = game.getCurrentRoom();
    currentRoom.biomeId = 'verdigris-basin';
    game.placeSnakeBodyAtLocal(currentRoom.id, { x: 5, y: 12 }, { x: 1, y: 0 });
    const row = currentRoom.layout[11]!;
    currentRoom.layout[11] = row.slice(0, 5) + '~' + row.slice(6);
    session.refreshSnapshot();
    await page.keyboard.press('f');
    await expect.poll(() => page.evaluate(() => window.snakeE2E!.getLifecycle().mode)).toBe('fishing');
    await page.screenshot({ path: 'test-results/normal-multiplayer-fishing.png' });
    // Fishing polls keys on browser frames; hold until authority acknowledges
    // instead of releasing a synthetic press before Phaser can observe it.
    await page.keyboard.down('Escape');
    try {
      await expect.poll(() => session.getSnapshot().minigame).toBeNull();
    } finally {
      await page.keyboard.up('Escape');
    }
    expect(errors).toEqual([]);
  } finally {
    await page.close();
    await bobPage.close();
    await server.close();
  }
});
