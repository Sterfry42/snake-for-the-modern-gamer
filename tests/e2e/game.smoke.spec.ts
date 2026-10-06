import { expect, test, type Page } from '@playwright/test';

test.describe('Snake for the Modern Gamer smoke tests', () => {
  test('starts a new run when older sessions fill the save quota', async ({ page }) => {
    const errors = collectPageErrors(page);
    await page.goto('');
    await waitForE2EBridge(page);
    await page.evaluate(() => {
      const data = {
        version: '3.0.0',
        timestamp: 1,
        score: 0,
        inventory: {},
        equipment: {},
        flags: {},
      };
      for (let index = 1; index <= 2; index++) {
        localStorage.setItem(
          `snake-save:sess:old-${index}`,
          JSON.stringify({
            sessionId: `old-${index}`,
            createdAt: index,
            saves: [{ timestamp: index, data }],
          }),
        );
      }
      const originalSetItem = Storage.prototype.setItem;
      Storage.prototype.setItem = function (key: string, value: string): void {
        const sessions = Object.keys(this).filter((id) => id.startsWith('snake-save:sess:'));
        if (
          key.startsWith('snake-save:sess:') &&
          this.getItem(key) === null &&
          sessions.length >= 2
        ) {
          throw new DOMException('Simulated full save storage', 'QuotaExceededError');
        }
        originalSetItem.call(this, key, value);
      };
      window.snakeE2E!.startRun();
    });
    await expect
      .poll(() =>
        page.evaluate(() =>
          Object.keys(localStorage).some((key) => key.startsWith('snake-save:sess:s-')),
        ),
      )
      .toBe(true);
    const retained = await page.evaluate(() => ({
      oldest: localStorage.getItem('snake-save:sess:old-1'),
      newer: localStorage.getItem('snake-save:sess:old-2'),
      count: Object.keys(localStorage).filter((key) => key.startsWith('snake-save:sess:')).length,
    }));
    expect(retained.oldest).toBeNull();
    expect(retained.newer).not.toBeNull();
    expect(retained.count).toBe(2);
    expect(errors).toEqual([]);
  });

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

  test('learns and casts Arcane Pulse through the real game runtime', async ({ page }) => {
    const errors = collectPageErrors(page);
    await page.goto('');

    const canvas = page.locator('#game-shell canvas');
    await expect(canvas).toBeVisible({ timeout: 30_000 });
    await waitForE2EBridge(page);

    const learned = await page.evaluate(() => {
      window.snakeE2E!.startRun();
      window.snakeE2E!.grantManaBloom();
      window.snakeE2E!.grantItem('spell-tome-arcane-pulse', 1);
      return {
        useResult: window.snakeE2E!.useItem('spell-tome-arcane-pulse'),
        known: window.snakeE2E!.getFlag<string[]>('arcane.spellbook.known'),
        loadout: window.snakeE2E!.getFlag<string[]>('arcane.spellbook.loadout'),
        tomeCount: window.snakeE2E!.getInventoryCount('spell-tome-arcane-pulse'),
      };
    });

    expect(learned.useResult).toMatchObject({ ok: true });
    expect(learned.known).toContain('arcane-pulse');
    expect(learned.loadout).toContain('arcane-pulse');
    expect(learned.tomeCount).toBe(0);

    const cast = await page.evaluate(() => {
      const before = window.snakeE2E!.getScore();
      const handled = window.snakeE2E!.castPrimary();
      return {
        handled,
        before,
        after: window.snakeE2E!.getScore(),
      };
    });

    expect(cast.handled).toBe(true);
    expect(cast.after).toBeGreaterThan(cast.before);
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
  await page.mouse.click(bounds.x + (x / 768) * bounds.width, bounds.y + (y / 576) * bounds.height);
}

async function waitForE2EBridge(page: Page): Promise<void> {
  await expect
    .poll(async () => page.evaluate(() => typeof window.snakeE2E), { timeout: 30_000 })
    .toBe('object');
}

declare global {
  interface Window {
    snakeE2E?: {
      startRun(): void;
      grantManaBloom(): boolean;
      grantItem(itemId: string, count?: number): void;
      useItem(itemId: string): { ok: boolean; message: string; color?: string };
      castPrimary(): boolean;
      getFlag<T = unknown>(key: string): T | undefined;
      getInventoryCount(itemId: string): number;
      getScore(): number;
    };
  }
}
