import { expect, test, type Page } from '@playwright/test';

test.describe('Snake for the Modern Gamer smoke tests', () => {
  test('boots the Phaser game without browser errors', async ({ page }) => {
    const errors = collectPageErrors(page);

    await page.goto('');

    const canvas = page.locator('#game-shell canvas');
    await expect(canvas).toBeVisible({ timeout: 30_000 });
    await expect(canvas).toHaveAttribute('tabindex', '1');
    const bounds = await canvas.boundingBox();
    expect(bounds?.width).toBeGreaterThan(0);
    expect(bounds?.height).toBeGreaterThan(0);
    expect(errors).toEqual([]);
  });

  test('starts a new playable run from the title screen', async ({ page }) => {
    const errors = collectPageErrors(page);
    await page.goto('');

    const canvas = page.locator('#game-shell canvas');
    await expect(canvas).toBeVisible({ timeout: 30_000 });
    const titleFrame = await canvas.screenshot();
    await clickLogicalCanvasPoint(page, 630, 305);

    await expect
      .poll(async () => (await canvas.screenshot()).equals(titleFrame), { timeout: 15_000 })
      .toBe(false);
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(500);

    expect(errors).toEqual([]);
  });
});

function collectPageErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  return errors;
}

async function clickLogicalCanvasPoint(page: Page, x: number, y: number): Promise<void> {
  const canvas = page.locator('#game-shell canvas');
  const bounds = await canvas.boundingBox();
  if (!bounds) throw new Error('Game canvas has no visible bounds.');
  await page.mouse.click(
    bounds.x + (x / 768) * bounds.width,
    bounds.y + (y / 576) * bounds.height,
  );
}
