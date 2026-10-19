import { test, expect, type Page } from '@playwright/test';
import { AuthoritativeGameSession } from '../../src/session/AuthoritativeGameSession.js';
import { createGameServer } from '../../src/server/createGameServer.js';
import { defaultGameConfig } from '../../src/config/gameConfig.js';
import { parseServerMessage } from '../../src/session/gameProtocol.js';
import type { GameSnapshot } from '../../src/session/GameSnapshot.js';

async function clickCanvas(page: Page, x: number, y: number) {
  const box = await page.locator('canvas').boundingBox();
  if (!box) throw new Error('Missing game canvas');
  await page.mouse.click(box.x + (x / 768) * box.width, box.y + (y / 576) * box.height);
}

async function openServerMenu(page: Page) {
  await page.goto('?');
  await expect
    .poll(() => page.evaluate(() => typeof window.snakeE2E), { timeout: 30000 })
    .toBe('object');
  await clickCanvas(page, 635, 443);
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog', { name: 'Connect to a Server' })).toBeVisible();
}

function observeWorld(page: Page) {
  const observed: { snapshot?: GameSnapshot } = {};
  page.on('websocket', (socket) => {
    if (new URL(socket.url()).pathname !== '/game') return;
    socket.on('framereceived', (frame) => {
      const message = parseServerMessage(frame.payload.toString());
      if (message.type === 'welcome' || message.type === 'snapshot')
        observed.snapshot = message.snapshot;
    });
  });
  return observed;
}

test('Multiplayer offers Server and Archipelago, then enters a named shared world', async ({
  page,
  context,
}) => {
  const session = await AuthoritativeGameSession.create({
    config: { ...defaultGameConfig, rng: { seed: 'connections-menu' } },
  });
  const server = createGameServer(session);
  const port = await server.listen(0);
  const errors: string[] = [];
  const browserGameConstructions: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.text().includes('[SnakeGame]')) browserGameConstructions.push(message.text());
  });
  const alice = observeWorld(page);
  try {
    await openServerMenu(page);
    await expect(page.getByLabel('Server URL')).toBeFocused();
    await page.keyboard.press('Shift+Tab');
    await expect(page.getByRole('button', { name: 'Enter World', exact: true })).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(page.getByLabel('Server URL')).toBeFocused();
    await page.getByRole('button', { name: 'Back', exact: true }).click();
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    await expect(page.getByRole('dialog')).toBeHidden();
    await page.screenshot({ path: 'test-results/connections-archipelago.png' });
    await clickCanvas(page, 384, 500);
    await page.keyboard.press('Enter');
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.getByLabel('Server URL').fill('ftp://invalid.test');
    await page.getByRole('button', { name: 'Enter World', exact: true }).click();
    await expect(page.getByRole('alert')).toContainText('ws:// or wss://');
    await page.getByLabel('Server URL').fill(`127.0.0.1:${port}`);
    await page.getByLabel('Display name').fill('');
    await page.getByLabel('Display name').pressSequentially('Alice');
    await page.screenshot({ path: 'test-results/connections-server-menu.png' });
    await page.getByLabel('Display name').press('Enter');
    await expect.poll(() => alice.snapshot?.ui.paused).toBe(false);
    expect(
      Object.values(alice.snapshot?.connections ?? {}).map((peer) => peer.displayName),
    ).toEqual(['Alice']);
    await expect.poll(() => page.evaluate(() => window.snakeE2E?.getLifecycle().mode)).toMatch(/action|manual-room/);
    await page.keyboard.press('Space');
    await expect.poll(() => alice.snapshot?.ui.playerInteraction).toBe('paused');
    expect(alice.snapshot?.ui.paused).toBe(false);
    const remembered = await context.storageState();
    for (const origin of remembered.origins) origin.localStorage = origin.localStorage.filter(entry => !entry.name.startsWith('snake.serverIdentity:'));
    const second = await context.browser()!.newPage({ baseURL: test.info().project.use.baseURL, storageState: remembered });
    const bob = observeWorld(second);
    await openServerMenu(second);
    await expect(second.getByLabel('Server URL')).toHaveValue(`ws://127.0.0.1:${port}/game`);
    await expect(second.getByLabel('Display name')).toHaveValue('Alice');
    await second.getByLabel('Display name').fill('Bob');
    await second.getByRole('button', { name: 'Enter World', exact: true }).click();
    await expect
      .poll(() =>
        Object.values(bob.snapshot?.connections ?? {})
          .map((peer) => peer.displayName)
          .sort(),
      )
      .toEqual(['Alice', 'Bob']);
    expect(bob.snapshot?.ui.paused).toBe(false);
    expect(bob.snapshot?.ui.playerInteraction).toBe('playing');
    await expect.poll(() => Object.keys(alice.snapshot?.connections ?? {}).length).toBe(2);
    await page.screenshot({ path: 'test-results/connections-nameplates.png' });
    await expect.poll(() => second.evaluate(() => window.snakeE2E?.getLifecycle().mode)).toMatch(/action|manual-room/);
    await clickCanvas(second, 530, 548);
    await expect(second.getByRole('dialog', { name: 'Connect to a Server' })).toBeVisible();
    await expect
      .poll(() => Object.values(alice.snapshot?.connections ?? {}).map((peer) => peer.displayName))
      .toEqual(['Alice']);
    expect(errors).toEqual([]);
    expect(browserGameConstructions).toEqual([]);
    await second.close();
  } finally {
    await page.close();
    await server.close();
  }
});

test('a failed server connection returns to the form with its URL and name retained', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 760 });
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const failed = new Promise<void>((resolve) =>
    page.on('websocket', (socket) => {
      if (new URL(socket.url()).pathname === '/game') socket.on('socketerror', () => resolve());
    }),
  );
  await openServerMenu(page);
  await page.getByLabel('Server URL').fill('ws://127.0.0.1:1/game');
  await page.getByLabel('Display name').fill('Retry Player');
  await page.getByRole('button', { name: 'Enter World', exact: true }).click();
  await failed;
  await expect(page.getByRole('dialog', { name: 'Connect to a Server' })).toBeVisible();
  await expect(page.getByLabel('Server URL')).toHaveValue('ws://127.0.0.1:1/game');
  await expect(page.getByLabel('Display name')).toHaveValue('Retry Player');
  expect(errors).toEqual([]);
});
