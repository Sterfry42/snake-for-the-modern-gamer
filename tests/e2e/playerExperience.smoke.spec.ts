import { test, expect, type Page } from '@playwright/test';
import { SnakeGame } from '../../src/game/snakeGame.js';
import { defaultGameConfig } from '../../src/config/gameConfig.js';
import { QuestRegistry } from '../../src/quests/questRegistry.js';
import { AuthoritativeGameSession } from '../../src/session/AuthoritativeGameSession.js';
import { createGameServer } from '../../src/server/createGameServer.js';

async function view(page: Page) {
  await page.waitForFunction(() => Boolean(window.snakeE2E));
  return page.evaluate(() => window.snakeE2E!.getPresentation());
}
async function pick(page: Page, id: string) {
  await expect
    .poll(async () => {
      const state = (await view(page)).choice;
      return state.visible && state.options.some((option) => option.id === id);
    })
    .toBe(true);
  const state = (await view(page)).choice;
  const index = state.options.findIndex((option) => option.id === id);
  for (
    let step = 0;
    step < (index - state.selectedIndex + state.options.length) % state.options.length;
    step++
  )
    await page.keyboard.press('ArrowDown', { delay: 35 });
  await expect.poll(async () => (await view(page)).choice.selectedIndex).toBe(index);
  await page.keyboard.press('Enter', { delay: 35 });
}
async function finishDialogue(page: Page) {
  for (let step = 0; step < 20; step++) {
    if (!(await view(page)).quest.visible) return;
    await page.keyboard.press('Enter', { delay: 35 });
    await page.waitForTimeout(80);
  }
  throw new Error('Authored dialogue did not finish');
}
function fixture(creation: boolean) {
  const game = new SnakeGame(
    { ...defaultGameConfig, rng: { seed: 'movement-browser' } },
    new QuestRegistry(),
  );
  game.reset();
  game.bosses.clearAll();
  for (const id of ['0,0,0', '2,0,0']) {
    const room = game.getRoom(id);
    room.layout = room.layout.map((row) => '.'.repeat(row.length));
    room.portals = [];
  }
  const session = new AuthoritativeGameSession({
    game,
    manageBasicFeatures: true,
    requireCharacterCreation: creation,
  });
  const server = createGameServer(session);
  return { game, session, server };
}

for (const destination of ['heaven', 'hell'] as const)
  test(`terminal ${destination} shows the authored afterlife and Ledger with player-only recovery`, async ({
    page,
    browser,
  }) => {
    test.setTimeout(60000);
    const { game, session, server } = fixture(false);
    const port = await server.listen(0);
    const bob = await browser.newPage({ baseURL: test.info().project.use.baseURL });
    const errors: string[] = [];
    for (const client of [page, bob]) client.on('pageerror', (error) => errors.push(error.message));
    try {
      for (const [client, name] of [
        [page, 'Alice'],
        [bob, 'Bob'],
      ] as const) {
        await client.goto(
          `?server=${encodeURIComponent(`ws://127.0.0.1:${port}/game`)}&playerName=${name}`,
        );
        await expect(client.locator('.snake-party')).toContainText(`${name} (you)`);
        await expect
          .poll(() => client.evaluate(() => window.snakeE2E?.getLifecycle().mode))
          .toBe('action');
      }
      const alice = session.getSnapshot().localPlayerId;
      const bobId = Object.values(session.getSnapshot().connections!).find(
        (peer) => peer.displayName === 'Bob',
      )!.playerId;
      await bob.keyboard.press('Space', { delay: 35 });
      await expect.poll(() => session.getSnapshot(bobId).ui.playerInteraction).toBe('paused');
      if (destination === 'hell') {
        game.setKarmaToMinimum('test');
        game.getInventory().addItem('get-out-of-hell-free-card', 1);
      }
      game.setScore(88);
      game.getInventory().addItem('healing-potion', 2);
      game.placeSnakeBodyAtLocal('0,0,0', { x: 10, y: 10 }, { x: 1, y: 0 });
      game.runForPlayer(bobId, () =>
        game.placeSnakeBodyAtLocal('0,0,0', { x: 11, y: 10 }, { x: 0, y: 1 }),
      );
      session.actionStep(false);
      const peer = session.getSnapshot(bobId).players[bobId];
      await expect.poll(async () => (await view(page)).quest.title).toBe('The Angel');
      await finishDialogue(page);
      await expect
        .poll(async () => (await view(page)).quest.title)
        .toBe(destination === 'heaven' ? 'The Light' : 'The Dark');
      await finishDialogue(page);
      await expect.poll(async () => (await view(page)).quest.title).toBe('The Ledger');
      await finishDialogue(page);
      if (destination === 'heaven') {
        await expect
          .poll(async () => (await view(page)).choice.title)
          .toBe('Return to the shared world');
        await pick(page, 'return');
      }
      await expect.poll(() => session.getSnapshot(alice).lifecycle?.kind).toBe('active');
      expect(session.getSnapshot(alice).players[alice].roomId).toBe(
        destination === 'hell' ? '0,0,-1000' : '0,0,0',
      );
      expect(session.getSnapshot(alice).players[alice].score).toBe(88);
      expect(session.getSnapshot(alice).ui.inventory?.['healing-potion']).toBe(2);
      expect(session.getSnapshot(bobId).players[bobId]).toEqual(peer);
      if (destination === 'hell') {
        await page.evaluate(() => window.snakeE2E!.setAppearance('midnight', 'cowboy'));
        await expect
          .poll(() => session.getSnapshot(alice).players[alice].appearance?.themeId)
          .toBe('midnight');
        session.refreshSnapshot();
        await page.screenshot({ path: 'test-results/hell-escape-changed-cosmetics.png' });
        await expect
          .poll(() => session.getSnapshot(alice).players[alice].appearance?.activeHat)
          .toBe('cowboy');
      }
      expect(errors).toEqual([]);
    } finally {
      await page.close();
      await bob.close();
      await server.close();
    }
  });

test('four normal clients create independent characters, join at origin behind a travelled host, and resume unfinished creation', async ({
  page,
  browser,
}) => {
  test.setTimeout(60000);
  const { game, session, server } = fixture(true);
  const port = await server.listen(0);
  const pages = [
    page,
    await browser.newPage({ baseURL: test.info().project.use.baseURL }),
    await browser.newPage({ baseURL: test.info().project.use.baseURL }),
    await browser.newPage({ baseURL: test.info().project.use.baseURL }),
  ];
  const errors: string[] = [];
  for (const client of pages) client.on('pageerror', (error) => errors.push(error.message));
  const enter = (client: Page, name: string) =>
    client.goto(`?server=${encodeURIComponent(`ws://127.0.0.1:${port}/game`)}&playerName=${name}`);
  async function create(client: Page, offset = 0) {
    for (let step = 0; step < 3; step++) {
      await expect.poll(async () => (await view(client)).choice.visible).toBe(true);
      const lifecycle = (await view(client)).lifecycle;
      if (lifecycle?.kind !== 'creating') throw new Error('Missing normal creation flow');
      const stage = lifecycle.stage;
      const id = lifecycle.offers[stage][offset % lifecycle.offers[stage].length];
      await pick(client, id);
      await expect
        .poll(async () => {
          const next = (await view(client)).lifecycle;
          return next?.kind === 'active' || (next?.kind === 'creating' && next.stage !== stage);
        })
        .toBe(true);
      if ((await view(client)).lifecycle?.kind === 'active') return;
    }
  }
  try {
    await enter(page, 'Alice');
    await create(page);
    const alice = session.getSnapshot().localPlayerId;
    game.placeSnakeBodyAtLocal('2,0,0', { x: 10, y: 12 }, { x: 1, y: 0 });
    session.refreshSnapshot();
    for (let index = 1; index < pages.length; index++)
      await enter(pages[index], ['Alice', 'Bob', 'Carol', 'Dave'][index]);
    for (const client of pages.slice(1))
      await expect(client.locator('.snake-party')).toContainText(
        'Creating your character at origin.',
      );
    const guests = Object.values(session.getSnapshot().connections!)
      .filter((peer) => peer.playerId !== alice)
      .map((peer) => peer.playerId);
    expect(guests).toHaveLength(3);
    expect(guests.every((id) => session.getSnapshot(id).players[id].roomId === '0,0,0')).toBe(true);
    const occupied = guests.flatMap((id) =>
      session.getSnapshot(id).players[id].body.map((point) => `${point.x},${point.y}`),
    );
    expect(new Set(occupied).size).toBe(9);
    const before = (await view(pages[2])).lifecycle;
    if (before?.kind !== 'creating') throw new Error('Missing Carol setup');
    await pick(pages[2], before.offers.faith[0]);
    await expect
      .poll(async () => {
        const next = (await view(pages[2])).lifecycle;
        return next?.kind === 'creating' && next.stage;
      })
      .toBe('background');
    const carol = Object.values(session.getSnapshot().connections!).find(
      (peer) => peer.displayName === 'Carol',
    )!.playerId;
    const lives = session.getSnapshot(carol).lives;
    await pages[2].reload();
    await expect
      .poll(async () => {
        const next = (await view(pages[2])).lifecycle;
        return next?.kind === 'creating' && next.stage;
      })
      .toBe('background');
    expect(session.getSnapshot(carol).lives).toEqual(lives);
    await create(pages[1], 0);
    await create(pages[2], 1);
    await create(pages[3], 2);
    for (const client of pages)
      await expect.poll(async () => (await view(client)).lifecycle?.kind).toBe('active');
    for (const id of guests)
      expect(session.getSnapshot(id).clientState?.flags['character.setup.completed']).toBe(true);
    await page.locator('.snake-party summary').click();
    await expect(page.locator('.snake-party')).toContainText('last successful checkpoint');
    await expect(page.locator('.snake-party')).toContainText('Unavailable here:');
    expect(session.getSnapshot(alice).players[alice].roomId).toBe('2,0,0');
    expect(errors).toEqual([]);
  } finally {
    for (const client of pages) await client.close();
    await server.close();
  }
});

test('Angel and Goblin Angel use the authored screens, preserve pending romance on refresh, and leave peers moving', async ({
  page,
  browser,
}) => {
  test.setTimeout(90000);
  const { game, session, server } = fixture(false);
  const port = await server.listen(0);
  const bob = await browser.newPage({ baseURL: test.info().project.use.baseURL });
  const carol = await browser.newPage({ baseURL: test.info().project.use.baseURL });
  const errors: string[] = [];
  for (const client of [page, bob, carol])
    client.on('pageerror', (error) => errors.push(error.message));
  try {
    for (const [client, name] of [
      [page, 'Alice'],
      [bob, 'Bob'],
      [carol, 'Carol'],
    ] as const) {
      await client.goto(
        `?server=${encodeURIComponent(`ws://127.0.0.1:${port}/game`)}&playerName=${name}`,
      );
      await expect(client.locator('.snake-party')).toContainText(`${name} (you)`);
      await expect
        .poll(() => client.evaluate(() => window.snakeE2E?.getLifecycle().mode))
        .toBe('action');
    }
    const alice = session.getSnapshot().localPlayerId;
    const peers = Object.values(session.getSnapshot().connections!);
    const bobId = peers.find((peer) => peer.displayName === 'Bob')!.playerId;
    const carolId = peers.find((peer) => peer.displayName === 'Carol')!.playerId;
    await bob.keyboard.press('Space', { delay: 35 });
    await carol.keyboard.press('Space', { delay: 35 });
    await expect.poll(() => session.getSnapshot(bobId).ui.playerInteraction).toBe('paused');
    await expect.poll(() => session.getSnapshot(carolId).ui.playerInteraction).toBe('paused');
    game.setFlag('skills.extraLifeCharges', 1);
    game.placeSnakeBodyAtLocal('0,0,0', { x: 10, y: 10 }, { x: 1, y: 0 });
    game.runForPlayer(bobId, () =>
      game.placeSnakeBodyAtLocal('0,0,0', { x: 11, y: 10 }, { x: 0, y: 1 }),
    );
    session.actionStep(false);
    await expect
      .poll(async () => {
        const state = (await view(page)).lifecycle;
        return state?.kind === 'death' && state.encounter.rescuer;
      })
      .toBe('angel');
    await bob.keyboard.press('Space', { delay: 35 });
    await expect.poll(() => session.getSnapshot(bobId).ui.playerInteraction).toBe('playing');
    game.runForPlayer(bobId, () => {
      game.setFlag('wards.contracts', { self: 1 });
      game.placeSnakeBodyAtLocal('0,0,0', { x: 9, y: 17 }, { x: 1, y: 0 });
    });
    game.runForPlayer(carolId, () =>
      game.placeSnakeBodyAtLocal('0,0,0', { x: 10, y: 17 }, { x: 0, y: 1 }),
    );
    session.actionStep(false);
    await expect
      .poll(async () => {
        const state = (await view(bob)).lifecycle;
        return state?.kind === 'death' && state.encounter.rescuer;
      })
      .toBe('goblin-angel');
    await carol.keyboard.press('Space', { delay: 35 });
    await expect.poll(() => session.getSnapshot(carolId).ui.playerInteraction).toBe('playing');
    game.runForPlayer(carolId, () =>
      game.placeSnakeBodyAtLocal('0,0,0', { x: 5, y: 20 }, { x: 1, y: 0 }),
    );
    const revision = session.getSnapshot(carolId).players[carolId].movementRevision!;
    session.start((error) => {
      throw error;
    });
    await expect
      .poll(() => session.getSnapshot(carolId).players[carolId].movementRevision)
      .toBeGreaterThan(revision);
    session.stop();
    await expect.poll(async () => (await view(page)).quest.title).toBe('The Angel');
    await expect.poll(async () => (await view(bob)).quest.title).toBe('The Goblin Angel');
    await finishDialogue(page);
    await finishDialogue(bob);
    await pick(bob, 'romance');
    await expect
      .poll(async () => {
        const state = (await view(bob)).lifecycle;
        return state?.kind === 'death' && Boolean(state.encounter.romance);
      })
      .toBe(true);
    const pending = session.getSnapshot(bobId).lifecycle;
    await bob.reload();
    await expect.poll(async () => (await view(bob)).lifecycle).toEqual(pending);
    await expect.poll(async () => (await view(bob)).quest.visible).toBe(true);
    for (
      let step = 0;
      step < 25 && session.getSnapshot(bobId).lifecycle?.kind === 'death';
      step++
    ) {
      await bob.keyboard.press('Enter', { delay: 35 });
      await bob.waitForTimeout(100);
    }
    await expect.poll(() => session.getSnapshot(bobId).lifecycle?.kind).toBe('active');
    await pick(page, 'return');
    await expect.poll(() => session.getSnapshot(alice).lifecycle?.kind).toBe('active');
    expect(session.getSnapshot(alice).lives?.skill).toBe(0);
    expect(session.getSnapshot(bobId).lives?.ward).toBe(0);
    expect(errors).toEqual([]);
  } finally {
    await page.close();
    await bob.close();
    await carol.close();
    await server.close();
  }
});
