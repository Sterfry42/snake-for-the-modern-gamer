import { test, expect, type Page } from '@playwright/test';
import { SnakeGame } from '../../src/game/snakeGame.js';
import { QuestRegistry } from '../../src/quests/questRegistry.js';
import eatApples from '../../src/quests/definitions/eatApples.js';
import { AuthoritativeGameSession } from '../../src/session/AuthoritativeGameSession.js';
import { createGameServer } from '../../src/server/createGameServer.js';
import { defaultGameConfig } from '../../src/config/gameConfig.js';
import { createBaseActor } from '../../src/actors/actorFactory.js';
import { parseServerMessage, parseCommandMessage } from '../../src/session/gameProtocol.js';
import type { GameSnapshot } from '../../src/session/GameSnapshot.js';

function observe(page: Page) {
  const state: { snapshot?: GameSnapshot; results: number } = { results: 0 };
  page.on('websocket', (socket) => {
    if (new URL(socket.url()).pathname !== '/game') return;
    const pending = new Map<number, string>();
    socket.on('framesent', frame => {
      const command = parseCommandMessage(frame.payload.toString());
      if (command) pending.set(command.id, command.command.type);
    });
    socket.on('framereceived', (frame) => {
      const message = parseServerMessage(frame.payload.toString());
      if (message.type === 'welcome' || message.type === 'snapshot')
        state.snapshot = message.snapshot;
      if (message.type === 'result') {
        if (pending.get(message.id) !== 'playerInteraction') state.results += 1;
        pending.delete(message.id);
      }
    });
  });
  return state;
}

async function clickTile(page: Page, x: number, y: number) {
  const box = await page.locator('canvas').boundingBox();
  if (!box) throw new Error('Missing game canvas');
  await page.mouse.click(
    box.x + (((x + 0.5) * defaultGameConfig.grid.cell) / 768) * box.width,
    box.y + (((y + 0.5) * defaultGameConfig.grid.cell - 2) / 576) * box.height,
  );
}

async function pick(page: Page, state: ReturnType<typeof observe>, optionId: string) {
  const menu = state.snapshot?.ui.interaction;
  if (!menu) throw new Error('No interaction menu');
  const index = menu.options
    .filter((option) => option.enabled)
    .findIndex((option) => option.id === optionId);
  expect(index).toBeGreaterThanOrEqual(0);
  for (let step = 0; step < index; step += 1) await page.keyboard.press('ArrowDown');
  const before = state.results;
  await page.keyboard.press('Enter');
  await expect.poll(() => state.results).toBe(before + 1);
}

test('server NPC menus buy shared stock, accept private quests, and block world hotkeys', async ({
  page,
  context,
}) => {
  const registry = new QuestRegistry();
  registry.register(eatApples);
  const game = new SnakeGame(
    { ...defaultGameConfig, rng: { seed: 'browser-server-menus' } },
    registry,
  );
  game.reset();
  expect(
    game.loadFromSaveData({
      ...game.getSaveData(),
      atmosphere: { ...game.getAtmosphereState(), dayPhase: 'day', phaseProgress: 0 },
    }),
  ).toBe(true);
  const room = game.getCurrentRoom();
  room.layout = room.layout.map((row) => '.'.repeat(row.length));
  game.bosses.clearAll();
  for (const [id, name, role, position] of [
    ['merchant', 'Ada', 'wizard', { x: 10, y: 10 }],
    ['quest-giver', 'Mae', 'questGiver', { x: 9, y: 11 }],
  ] as const) {
    const actor = createBaseActor({
      id,
      displayName: name,
      role,
      kind: 'civilian',
      species: 'human',
      thickness: 'medium',
      currentRoomId: room.id,
    });
    actor.presence = { roomId: room.id, position, materialized: true, stationary: true };
    game.getActorSystem().registry.upsert(actor);
  }
  const session = new AuthoritativeGameSession({ game, manageBasicFeatures: true });
  const server = createGameServer(session);
  const port = await server.listen(0);
  const bobPage = await context.newPage();
  const alice = observe(page);
  const bob = observe(bobPage);
  const errors: string[] = [];
  for (const browser of [page, bobPage])
    browser.on('pageerror', (error) => { errors.push(error.message); console.error(error.stack); });
  try {
    const address = encodeURIComponent(`ws://127.0.0.1:${port}/game`);
    await page.goto(`?server=${address}&playerName=Alice`);
    await expect.poll(() => page.evaluate(() => window.snakeE2E?.getLifecycle().mode)).toMatch(/action|manual-room|paused/);
    await expect.poll(() => alice.snapshot?.localPlayerId).toBe('player-1');
    await bobPage.goto(`?server=${address}&playerName=Bob`);
    await expect.poll(() => bobPage.evaluate(() => window.snakeE2E?.getLifecycle().mode)).toMatch(/action|manual-room|paused/);
    await expect.poll(() => Object.keys(bob.snapshot?.players ?? {}).length).toBe(2);
    const aliceId = alice.snapshot!.localPlayerId;
    const bobId = bob.snapshot!.localPlayerId;
    for (const id of [aliceId, bobId])
      game.runForPlayer(id, () => {
        game.placeSnakeBodyAtLocal(room.id, { x: id === aliceId ? 9 : 11, y: 10 }, { x: 0, y: 1 });
        game.setScore(10000);
      });
    session.refreshSnapshot();
    for (const [browser, state] of [
      [page, alice],
      [bobPage, bob],
    ] as const) {
      const before = state.results;
      await clickTile(browser, 10, 10);
      await expect.poll(() => state.snapshot?.ui.interaction?.kind).toBe('actor');
      await expect.poll(() => state.results).toBe(before + 1);
      await browser.keyboard.press('w');
      expect(game.getPlayer(state.snapshot!.localPlayerId)!.snake.nextDirectionVector).toEqual({
        x: 0,
        y: 1,
      });
      await pick(browser, state, 'shop');
      await expect.poll(() => state.snapshot?.ui.interaction?.kind).toBe('shop');
    }
    const offer = game
      .getActorShopView('merchant')!
      .offers.find((entry) => entry.id === 'spell-tome-arcane-pulse')!;
    expect(offer.quantity).toBe(1);
    await pick(page, alice, `offer:${offer.id}`);
    await expect.poll(() => alice.snapshot?.ui.inventory?.[offer.itemId!]).toBe(1);
    await expect
      .poll(() =>
        bob.snapshot?.ui.interaction?.options.some((option) => option.id === `offer:${offer.id}`),
      )
      .toBe(false);
    expect(alice.snapshot!.players[aliceId].score).toBe(10000 - offer.price);
    expect(bob.snapshot!.players[bobId].score).toBe(10000);
    await page.screenshot({ path: 'test-results/server-shop.png' });
    await pick(page, alice, 'close');
    expect(alice.snapshot!.ui.interaction).toBeNull();
    expect(bob.snapshot!.ui.interaction?.kind).toBe('shop');
    const before = alice.results;
    await clickTile(page, 9, 11);
    await expect.poll(() => alice.snapshot?.ui.interaction?.kind).toBe('actor');
    await expect.poll(() => alice.results).toBe(before + 1);
    await pick(page, alice, 'take-quest');
    await expect.poll(() => alice.snapshot?.ui.interaction?.kind).toBe('quest');
    await page.screenshot({ path: 'test-results/server-quest.png' });
    await pick(page, alice, 'accept');
    expect(game.getAcceptedQuestIds()).toContain('eat-5-apples');
    expect(game.runForPlayer(bobId, () => game.getAcceptedQuestIds())).toEqual([]);
    await page.keyboard.press('Escape');
    await expect.poll(() => alice.snapshot?.ui.interaction?.kind).toBe('actor');
    await page.keyboard.press('Escape');
    await expect.poll(() => alice.snapshot?.ui.interaction).toBeNull();
    expect(session.getSnapshot().ui.paused).toBe(false);
    expect(errors).toEqual([]);
  } finally {
    await bobPage.close();
    await page.close();
    await server.close();
  }
});
