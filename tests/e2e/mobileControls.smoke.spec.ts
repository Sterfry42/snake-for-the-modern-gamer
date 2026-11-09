import { expect, test, type Page } from '@playwright/test';

test.describe('Mobile controls (touch devices)', () => {
  test('deck shows on touch devices and the Start button toggles the pause menu', async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium-touch', 'requires a touch device');
    const errors = collectPageErrors(page);
    await page.goto('');
    await waitForE2EBridge(page);

    // This project emulates a touch device; the deck's auto-detection must
    // trust its touch signals.
    expect(await page.evaluate(() => navigator.maxTouchPoints)).toBeGreaterThan(0);

    // On the title screen the deck stays out of the way...
    await expect(page.locator('.mobile-controls__shell')).toHaveCount(0);

    await page.evaluate(() => {
      void window.snakeE2E!.startRun();
    });
    await expect(page.locator('.mobile-controls__shell'), 'deck appears when the run starts').toBeVisible({
      timeout: 15_000,
    });

    // A fresh profile opens the one-time religion/background/class flow on
    // the first run; confirm the default options so the run is actually live.
    for (let step = 0; step < 3; step++) {
      await expect
        .poll(
          async () => page.evaluate(() => window.snakeE2E!.getStartChoicesOpen()),
          { timeout: 15_000 },
        )
        .toBe(true);
      await page.keyboard.press('Enter');
      await page.waitForTimeout(200);
    }

    const startButton = page.locator('.mobile-controls__utility-button--start');
    const pauseVisible = async () =>
      page.evaluate(() => window.snakeE2E!.getPauseState().visible);

    // One press opens the pause menu (regression: the old wiring toggled
    // the pause state twice per press, so a press from "playing" was a no-op).
    await startButton.tap();
    await expect.poll(pauseVisible, { timeout: 10_000 }).toBe(true);

    // One more press resumes (regression: the menu went away but the game
    // stayed paused unless the bottom-right PAUSE button was used).
    await startButton.tap();
    await expect.poll(pauseVisible, { timeout: 10_000 }).toBe(false);

    // The settings override kills the deck even on a touch device...
    await page.evaluate(() => {
      window.localStorage.setItem('snake.touchControls', 'off');
      window.snakeE2E!.syncMobileControls();
    });
    await expect(page.locator('.mobile-controls__shell')).toHaveCount(0);

    // ...and forcing "on" brings it straight back.
    await page.evaluate(() => {
      window.localStorage.setItem('snake.touchControls', 'on');
      window.snakeE2E!.syncMobileControls();
    });
    await expect(page.locator('.mobile-controls__shell'), 'deck returns when forced on').toBeVisible({
      timeout: 10_000,
    });

    expect(errors).toEqual([]);
  });
});

function collectPageErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  return errors;
}

async function waitForE2EBridge(page: Page): Promise<void> {
  await expect
    .poll(async () => page.evaluate(() => typeof window.snakeE2E), { timeout: 30_000 })
    .toBe('object');
}

declare global {
  interface Window {
    snakeE2E?: {
      startRun(): Promise<void>;
      showTitle(): void;
      getPauseState(): { visible: boolean; activeTab: string; availableTabs: string[] };
      syncMobileControls(): void;
      getTouchControlsPreference(): 'auto' | 'on' | 'off';
      getStartChoicesOpen(): boolean;
    };
  }
}
