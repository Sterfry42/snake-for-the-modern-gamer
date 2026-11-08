import { expect, test, type Page } from '@playwright/test';

// Title-screen buttons in logical 768x576 game coordinates.
const CREDITS_BUTTON = { x: 635, y: 536 };
const NEW_GAME_BUTTON = { x: 635, y: 306 };
const CREDITS_BACKDROP_POINT = { x: 96, y: 96 };

async function clickCanvas(page: Page, x: number, y: number) {
  const box = await page.locator('canvas').boundingBox();
  if (!box) throw new Error('Missing game canvas');
  await page.mouse.click(box.x + (x / 768) * box.width, box.y + (y / 576) * box.height);
}

async function openTitle(page: Page) {
  await page.goto('?');
  await expect
    .poll(() => page.evaluate(() => typeof window.snakeE2E), { timeout: 30_000 })
    .toBe('object');
  await expect
    .poll(() => page.evaluate(() => window.snakeE2E?.getLifecycle().mode), { timeout: 30_000 })
    .toBe('title');
}

// Clicks the New Game button and waits for a run to start. If the credits
// overlay is still on top, the click lands on its full-screen dismiss zone
// instead, so no run starts and this poll times out.
async function expectNewGameClickStartsRun(page: Page) {
  await clickCanvas(page, NEW_GAME_BUTTON.x, NEW_GAME_BUTTON.y);
  await expect
    .poll(() => page.evaluate(() => window.snakeE2E?.getLifecycle().mode), { timeout: 30_000 })
    .not.toBe('title');
}

async function openCreditsMidScroll(page: Page) {
  await clickCanvas(page, CREDITS_BUTTON.x, CREDITS_BUTTON.y);
  // Let the scroll get moving so a dismiss happens mid-scroll, not before it.
  await page.waitForTimeout(1_500);
}

test('title credits dismiss with Enter, Space, or click at any point in the scroll', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));

  // Visit 1: Enter mid-scroll dismisses the credits.
  await openTitle(page);
  await openCreditsMidScroll(page);
  await page.keyboard.press('Enter');
  await expectNewGameClickStartsRun(page);

  // Visit 2: re-entry — Space mid-scroll dismisses the credits.
  await page.evaluate(() => window.snakeE2E!.showTitle());
  await expect.poll(() => page.evaluate(() => window.snakeE2E?.getLifecycle().mode)).toBe('title');
  await openCreditsMidScroll(page);
  await page.keyboard.press('Space');
  await expectNewGameClickStartsRun(page);

  // Visit 3: a click on the credits backdrop dismisses the credits.
  await page.evaluate(() => window.snakeE2E!.showTitle());
  await expect.poll(() => page.evaluate(() => window.snakeE2E?.getLifecycle().mode)).toBe('title');
  await openCreditsMidScroll(page);
  await clickCanvas(page, CREDITS_BACKDROP_POINT.x, CREDITS_BACKDROP_POINT.y);
  await expectNewGameClickStartsRun(page);

  expect(errors).toEqual([]);
});
