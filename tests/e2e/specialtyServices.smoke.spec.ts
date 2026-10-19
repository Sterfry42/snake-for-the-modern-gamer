import { test, expect, type Page } from '@playwright/test';
import { SnakeGame } from '../../src/game/snakeGame.js';
import { defaultGameConfig } from '../../src/config/gameConfig.js';
import { QuestRegistry } from '../../src/quests/questRegistry.js';
import { AuthoritativeGameSession } from '../../src/session/AuthoritativeGameSession.js';
import { createGameServer } from '../../src/server/createGameServer.js';
import { createPhysicalHumanTown, discoverThievesGuild } from '../../src/world/town.js';
import { createBaseActor } from '../../src/actors/actorFactory.js';

async function pick(page: Page, id: string) {
  await expect.poll(() => page.evaluate(target => { const menu = window.snakeE2E!.getPresentation().choice; return menu.visible && menu.options.some(option => option.id === target); }, id)).toBe(true);
  const menu = await page.evaluate(() => window.snakeE2E!.getPresentation().choice);
  const index = menu.options.findIndex(option => option.id === id);
  expect(index, JSON.stringify(menu)).toBeGreaterThanOrEqual(0);
  for (let step = 0; step < (index - menu.selectedIndex + menu.options.length) % menu.options.length; step++) await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
}

test('the normal excavation overlay follows authority, keeps world time running, and returns to the foreman', async ({ page, context }) => {
  test.setTimeout(60000);
  const game = new SnakeGame({ ...defaultGameConfig, rng: { seed: 'specialty-browser' } }, new QuestRegistry());
  game.reset();
  const room = game.getCurrentRoom();
  room.layout = room.layout.map(row => '.'.repeat(row.length));
  game.bosses.clearAll();
  expect(game.spawnMolemanDigSite()).toBe(true);
  const site = room.molemanDigSite!;
  room.layout = room.layout.map(row => '.'.repeat(row.length));
  const session = new AuthoritativeGameSession({ game, manageBasicFeatures: true });
  const server = createGameServer(session);
  const port = await server.listen(0);
  const bobPage = await context.browser()!.newPage({ baseURL: test.info().project.use.baseURL });
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  bobPage.on('pageerror', error => errors.push(error.message));
  try {
    const url = `?server=${encodeURIComponent(`ws://127.0.0.1:${port}/game`)}`;
    await page.goto(url);
    await expect.poll(() => page.evaluate(() => Boolean(window.snakeE2E))).toBe(true);
    await bobPage.goto(url);
    await expect.poll(() => bobPage.evaluate(() => Boolean(window.snakeE2E))).toBe(true);
    const [alice, bob] = Object.keys(session.getSnapshot().players);
    game.placeSnakeBodyAtLocal(room.id, { x: site.foreman.x - 1, y: site.foreman.y }, { x: 0, y: -1 });
    game.runForPlayer(bob, () => game.placeSnakeBodyAtLocal(room.id, { x: 3, y: 3 }, { x: 0, y: 1 }));
    game.setFlag('ui.e2e.specialtyReady', true);
    session.refreshSnapshot();
    await expect.poll(() => page.evaluate(() => window.snakeE2E!.getFlag('ui.e2e.specialtyReady'))).toBe(true);
    await page.keyboard.press('e');
    await pick(page, 'dig');
    await expect.poll(() => page.evaluate(() => window.snakeE2E!.getExcavationPresentation().visible)).toBe(true);
    expect(await bobPage.evaluate(() => window.snakeE2E!.getExcavationPresentation().visible)).toBe(false);
    const before = session.getSnapshot().players;
    const initial = session.getSnapshot(alice).archaeology!.state;
    await session.advance(100);
    expect(session.getSnapshot().players[alice].body).toEqual(before[alice].body);
    expect(session.getSnapshot().players[bob].body).not.toEqual(before[bob].body);
    await expect.poll(() => page.evaluate(() => window.snakeE2E!.getExcavationPresentation().state?.riseProgress)).toBeGreaterThan(initial.riseProgress);
    await page.keyboard.press('ArrowRight');
    await expect.poll(() => session.getSnapshot(alice).archaeology!.state.cursor.x).toBe(initial.cursor.x + 1);
    await page.keyboard.press('Enter');
    await expect.poll(() => page.evaluate(() => window.snakeE2E!.getJuiceTrace().some(effect => effect.name === 'archaeologySwap'))).toBe(true);
    await page.screenshot({ path: 'test-results/authoritative-excavation.png' });
    await page.keyboard.press('Escape');
    await expect.poll(() => Boolean(session.getSnapshot(alice).archaeology?.result)).toBe(true);
    await expect.poll(() => page.evaluate(() => window.snakeE2E!.getExcavationPresentation().visible)).toBe(false);
    await pick(page, 'continue');
    await expect.poll(() => session.getSnapshot(alice).archaeology).toBeNull();
    await pick(page, 'date');
    await expect.poll(() => page.evaluate(() => window.snakeE2E!.getPresentation().quest.title)).toBe(site.foreman.name);
    expect(errors).toEqual([]);
  } finally {
    await bobPage.close();
    await page.close();
    await server.close();
  }
});

test('the ordinary guild menu pays for wanted reduction and purchases through the black market contact', async ({ page }) => {
  test.setTimeout(60000);
  const game = new SnakeGame({ ...defaultGameConfig, rng: { seed: 'guild-browser' } }, new QuestRegistry());
  game.reset();
  const room = game.getCurrentRoom();
  room.layout = room.layout.map(row => '.'.repeat(row.length));
  game.bosses.clearAll();
  const town = discoverThievesGuild(createPhysicalHumanTown({ biomeId: 'verdigris-basin', seed: 712, townId: 'browser-guild', districtRoomIds: { [room.id]: 'guildHideout' }, entranceRoomId: room.id, exitRoomIds: [] }));
  town.wantedLevel = 2;
  room.town = town;
  for (const [id, name, role, x, y] of [['contact', 'Guild Broker', 'thiefContact', 6, 5], ['merchant', 'Black Market Merchant', 'blackMarketMerchant', 18, 12]] as const) {
    const actor = createBaseActor({ id, displayName: name, kind: 'civilian', role, species: 'human', thickness: 'medium', currentRoomId: room.id });
    actor.presence = { roomId: room.id, position: { x, y }, materialized: true, stationary: true };
    game.getActorSystem().registry.upsert(actor);
  }
  game.placeSnakeBodyAtLocal(room.id, { x: 5, y: 5 }, { x: 0, y: -1 });
  game.setScore(1000);
  const session = new AuthoritativeGameSession({ game, manageBasicFeatures: true });
  const server = createGameServer(session);
  const port = await server.listen(0);
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  try {
    await page.goto(`?server=${encodeURIComponent(`ws://127.0.0.1:${port}/game`)}`);
    await expect.poll(() => page.evaluate(() => window.snakeE2E?.getLifecycle().mode)).toMatch(/action|manual-room|paused/);
    await page.keyboard.press('e');
    await expect.poll(() => page.evaluate(() => window.snakeE2E!.getPresentation().quest.title)).toBe('Guild Broker');
    await page.keyboard.press('Enter');
    await pick(page, 'guild-menu');
    await expect.poll(() => page.evaluate(() => window.snakeE2E!.getPresentation().choice.title)).toContain('Thieves Guild');
    await pick(page, 'guild-lower-wanted');
    await expect.poll(() => game.getCurrentTown()!.wantedLevel).toBeLessThan(2);
    const score = game.getScore();
    expect(score).toBeLessThan(1000);
    await pick(page, 'guild-fence');
    await expect.poll(() => game.getScore()).toBe(score + 6);
    await pick(page, 'guild-black-market');
    const offer = game.getActorShopView('merchant')!.offers.find(entry => entry.itemId)!;
    await pick(page, `actor-category:${offer.category}`);
    await pick(page, `actor-offer:${offer.id}`);
    await expect.poll(() => game.getInventory().getItemCount(offer.itemId!)).toBe(1);
    expect(game.getScore()).toBe(score + 6 - offer.price);
    await pick(page, 'back');
    await pick(page, 'leave');
    await expect.poll(() => session.getSnapshot().ui.interaction).toBeNull();
    expect(errors).toEqual([]);
  } finally {
    await page.close();
    await server.close();
  }
});
