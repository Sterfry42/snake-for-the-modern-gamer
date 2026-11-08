import { SnapshotDeltaAssembler } from '../../src/session/SnapshotDelta.js';
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
    const assembler = new SnapshotDeltaAssembler();
    socket.on('framereceived', (frame) => {
      const wire = parseServerMessage(frame.payload.toString());
      if (wire.type === 'movement') {
        assembler.applyMovement(wire.update);
        return;
      }
      if (wire.type === 'welcome') assembler.reset(wire.snapshot);
      const message = wire.type === 'delta' ? { type: 'snapshot' as const, snapshot: assembler.apply(wire.delta) } : wire;
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

async function presentation(page: Page) {
  return page.evaluate(() => window.snakeE2E!.getPresentation());
}
async function finishDialogue(page: Page) {
  for (let i = 0; i < 20; i++) {
    if (!(await presentation(page)).quest.visible) return;
    await page.keyboard.press('Enter');
    await page.waitForTimeout(80);
  }
  throw new Error('Dialogue did not finish');
}
async function pick(page: Page, _state: ReturnType<typeof observe>, optionId: string) {
  await expect.poll(async () => { const menu = (await presentation(page)).choice; return menu.visible && menu.options.some(option => option.id === optionId); }).toBe(true);
  const menu = (await presentation(page)).choice;
  const index = menu.options.findIndex(option => option.id === optionId);
  expect(index, JSON.stringify(menu)).toBeGreaterThanOrEqual(0);
  const count = menu.options.length;
  for (let step = 0; step < (index - menu.selectedIndex + count) % count; step++) await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(100);
}

test('server NPC menus buy shared stock, accept private quests, and block world hotkeys', async ({
  page,
  context,
}) => {
  test.setTimeout(60000);
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
  const bobPage = await context.browser()!.newPage({ baseURL: test.info().project.use.baseURL });
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
        game.setFlag('ui.e2e.interactionReady', true);
      });
    session.refreshSnapshot();
    for (const [browser, state] of [
      [page, alice],
      [bobPage, bob],
    ] as const) {
      await expect.poll(() => browser.evaluate(() => window.snakeE2E!.getFlag('ui.e2e.interactionReady'))).toBe(true);
      const before = state.results;
      await clickTile(browser, 10, 10);
      await expect.poll(() => state.snapshot?.ui.interaction?.kind).toBe('actor');
      await expect.poll(() => state.results).toBeGreaterThan(before);
      await expect.poll(async () => (await presentation(browser)).quest.visible).toBe(true);
      expect((await presentation(browser)).quest.title).toBe('Ada');
      await finishDialogue(browser);
      await browser.keyboard.press('w');
      expect(game.getPlayer(state.snapshot!.localPlayerId)!.snake.nextDirectionVector).toEqual({
        x: 0,
        y: 1,
      });
      await pick(browser, state, 'shop');
      await expect.poll(async () => (await presentation(browser)).choice.options.some(option => option.id.startsWith('actor-category:'))).toBe(true);
    }
    const offer = game
      .getActorShopView('merchant')!
      .offers.find((entry) => entry.id === 'spell-tome-arcane-pulse')!;
    expect(offer.quantity).toBe(1);
    await pick(page, alice, `actor-category:${offer.category}`);
    for (let pageIndex = 0; pageIndex < 10 && !(await presentation(page)).choice.options.some(option => option.id === `actor-offer:${offer.id}`); pageIndex++) {
      const more = (await presentation(page)).choice.options.find(option => option.id.startsWith('actor-page:') && option.title === 'More');
      expect(more).toBeDefined();
      await pick(page, alice, more!.id);
    }
    await pick(page, alice, `actor-offer:${offer.id}`);
    await expect.poll(() => alice.snapshot?.ui.inventory?.[offer.itemId!]).toBe(1);
    expect(game.getActorShopView('merchant')!.offers.some(entry => entry.id === offer.id)).toBe(false);
    expect(alice.snapshot!.players[aliceId].score).toBe(10000 - offer.price);
    expect(bob.snapshot!.players[bobId].score).toBe(10000);
    await page.screenshot({ path: 'test-results/server-shop.png' });
    await pick(page, alice, 'back');
    await pick(page, alice, 'leave');
    expect(alice.snapshot!.ui.interaction).toBeNull();
    expect((await presentation(bobPage)).choice.visible).toBe(true);
    const before = alice.results;
    await clickTile(page, 9, 11);
    await expect.poll(() => alice.snapshot?.ui.interaction?.kind).toBe('actor');
    await expect.poll(() => alice.results).toBeGreaterThan(before);
    await expect.poll(async () => (await presentation(page)).quest.visible).toBe(true);
    await finishDialogue(page);
    await pick(page, alice, 'take-quest');
    await expect.poll(async () => (await presentation(page)).quest.visible).toBe(true);
    await page.screenshot({ path: 'test-results/server-quest.png' });
    await finishDialogue(page);
    expect(game.getAcceptedQuestIds()).toContain('eat-5-apples');
    expect(game.runForPlayer(bobId, () => game.getAcceptedQuestIds())).toEqual([]);
    await expect.poll(() => alice.snapshot?.ui.interaction).toBeNull();
    expect(session.getSnapshot().ui.paused).toBe(false);
    const actor = createBaseActor({ id: 'forced-wanderer', displayName: 'Road Sage', role: 'resident', kind: 'civilian', species: 'human', thickness: 'medium', currentRoomId: room.id });
    actor.presence = { roomId: room.id, position: { x: 8, y: 10 }, materialized: true, stationary: true };
    game.getActorSystem().registry.upsert(actor);
    game.setFlag('npc.randomEncounter', { id: 'forced-wanderer', actorId: actor.id, name: actor.displayName, kind: 'flavor', pages: ['The road remembers your scales.'], statsNote: 'Road Sage', roomId: room.id, portraitId: 'sage-1' });
    await session.executeCommand({ type: 'playerInteraction', playerId: aliceId, mode: 'playing' });
    await expect.poll(async () => (await presentation(page)).quest.title).toBe('Road Sage');
    await expect.poll(() => page.evaluate(() => window.snakeE2E!.getJuiceTrace().filter(effect => effect.name === 'wandererApproach').length)).toBe(1);
    const heldBody = session.getSnapshot().players[aliceId].body;
    for (let step = 0; step < 3; step++) session.refreshSnapshot();
    expect(session.getSnapshot().players[aliceId].body).toEqual(heldBody);
    expect(await bobPage.evaluate(() => window.snakeE2E!.getPresentation().quest.title)).not.toBe('Road Sage');
    await finishDialogue(page);
    await expect.poll(() => session.getSnapshot(aliceId).forcedEncounter).toBeNull();
    game.setFlag('ui.wallChomp', { x: 9, y: 10, roomId: room.id });
    await session.executeCommand({ type: 'playerInteraction', playerId: aliceId, mode: 'playing' });
    await expect.poll(() => page.evaluate(() => window.snakeE2E!.getJuiceTrace().filter(effect => effect.name === 'wallChomp').length)).toBe(1);
    for (let step = 0; step < 3; step++) session.refreshSnapshot();
    await page.waitForTimeout(100);
    expect(await page.evaluate(() => window.snakeE2E!.getJuiceTrace().filter(effect => effect.name === 'wallChomp').length)).toBe(1);
    game.placeSnakeBodyAtLocal(room.id, { x: game.config.grid.cols - 1, y: 8 }, { x: 1, y: 0 });
    session.actionStep(false);
    await expect.poll(() => page.evaluate(() => window.snakeE2E!.getJuiceTrace().filter(effect => effect.name === 'roomTransition').length)).toBe(1);
    expect(await page.evaluate(() => window.snakeE2E!.getJuiceTrace().some(effect => effect.name === 'movementTick'))).toBe(true);
    expect(errors).toEqual([]);
  } finally {
    await bobPage.close();
    await page.close();
    await server.close();
  }
});
