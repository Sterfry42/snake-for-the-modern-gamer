import { expect, test, type Page } from '@playwright/test';

/**
 * Perf smoke tests.
 *
 * These run in a real browser and measure the two mobile perf problems:
 *  1. Pause-menu scrolling — the overlay used to do a full content rebuild
 *     on every pointer event. The drag below floods the scroll path with
 *     small pointer moves (the phone touch-sampling rate, emulated) and
 *     reports how many full rebuilds that caused versus how many frames
 *     actually rendered.
 *  2. Particle effects — the juice layer used to allocate one GameObject
 *     plus one tween per particle. The storms below fire bursts / ambient
 *     glitter and report peak live particle objects and active tweens.
 *
 * The console lines are the numbers that get quoted in commit messages to
 * show the before/after delta.
 */

const LOGICAL_W = 768;
const LOGICAL_H = 576;

declare global {
  interface Window {
    snakeE2E?: {
      startRun(): Promise<void>;
      getLifecycle(): { actorTicks: number; mode: string };
      setPauseTab(tabId: string): void;
      getPauseScrollTarget(): { x: number; y: number; width: number; height: number } | null;
      resetScrollPerf(): void;
      getScrollPerf(): {
        events: number;
        rebuilds: number;
        rebuildTimeMs: number;
        tab: string;
        offset: number;
      };
      getParticlePerf(): { liveParticles: number; activeTweens: number; unicornTrail: number };
      debugBurst(worldX: number, worldY: number, count: number): void;
      startUnicornGlitter(): void;
      stopUnicornGlitter(): void;
    };
    __perfStopFrames?: boolean;
  }
}

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

async function bootRun(page: Page): Promise<void> {
  await page.goto('');
  await waitForE2EBridge(page);
  await page.evaluate(async () => {
    await window.snakeE2E!.startRun();
  });
  for (let choice = 0; choice < 3; choice++) await page.keyboard.press('Enter');
  await expect
    .poll(() => page.evaluate(() => window.snakeE2E!.getLifecycle().actorTicks))
    .toBeGreaterThan(0);
}

test.describe('perf smoke', () => {
  test('pause menu scroll: pointer-drag flood stays far below one rebuild per event', async ({
    page,
  }) => {
    // Baseline (pre-coalescing): every pointer event caused a full content
    // rebuild (~14ms each on desktop hardware), so even Playwright's input
    // round-trips crawled. 60 moves keeps the probe inside the time budget.
    test.setTimeout(90_000);
    const errors = collectPageErrors(page);
    await bootRun(page);

    await page.keyboard.press('Space');
    await expect
      .poll(() => page.evaluate(() => window.snakeE2E!.getLifecycle().mode))
      .toBe('paused');

    // Cheats tab: long, statically scrollable list, no setup needed.
    await page.evaluate(() => window.snakeE2E!.setPauseTab('cheats'));
    await page.waitForTimeout(150);
    await page.evaluate(() => window.snakeE2E!.resetScrollPerf());

    const target = await page.evaluate(() => window.snakeE2E!.getPauseScrollTarget());
    expect(target).not.toBeNull();
    const canvas = page.locator('#game-shell canvas');
    const bounds = await canvas.boundingBox();
    expect(bounds).not.toBeNull();
    const toScreenX = (x: number) => bounds!.x + (x / LOGICAL_W) * bounds!.width;
    const toScreenY = (y: number) => bounds!.y + (y / LOGICAL_H) * bounds!.height;

    // Count rendered frames across the whole drag window.
    const framesPromise = page.evaluate(
      () =>
        new Promise<number>((resolve) => {
          let count = 0;
          const loop = () => {
            count += 1;
            if (window.__perfStopFrames) {
              resolve(count);
              return;
            }
            requestAnimationFrame(loop);
          };
          requestAnimationFrame(loop);
        }),
    );

    // Drag from the bottom of the list upward in 3px steps: 60 small
    // pointer moves, the same flood a phone touch-sampler produces.
    const startX = toScreenX(target!.x + target!.width * 0.35);
    const startY = toScreenY(target!.y + target!.height - 14);
    const moveStart = Date.now();
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    for (let step = 1; step <= 60; step++) {
      await page.mouse.move(startX, startY - step * 3);
    }
    await page.mouse.up();
    const dragMs = Date.now() - moveStart;

    await page.evaluate(() => {
      window.__perfStopFrames = true;
    });
    const frames = await framesPromise;

    const perf = await page.evaluate(() => window.snakeE2E!.getScrollPerf());
    console.log(
      `[perf] pause-scroll: events=${perf.events} rebuilds=${perf.rebuilds} ` +
        `rebuildMs=${perf.rebuildTimeMs.toFixed(1)} msPerRebuild=${(
          perf.rebuildTimeMs / Math.max(1, perf.rebuilds)
        ).toFixed(1)} dragMs=${dragMs} frames=${frames} offset=${Math.round(perf.offset)}`,
    );

    // The drag must actually scroll the list.
    expect(perf.events).toBeGreaterThan(0);
    expect(perf.offset).toBeGreaterThan(0);
    expect(errors).toEqual([]);
  });

  test('particle burst storm: peak live objects and tweens', async ({ page }) => {
    const errors = collectPageErrors(page);
    await bootRun(page);

    const storm = await page.evaluate(async () => {
      const api = window.snakeE2E!;
      const idle = api.getParticlePerf();
      let peakLive = 0;
      let peakTweens = 0;
      api.debugBurst(384, 288, 54);
      api.debugBurst(220, 200, 36);
      api.debugBurst(540, 320, 36);
      for (let i = 0; i < 40; i++) {
        const sample = api.getParticlePerf();
        peakLive = Math.max(peakLive, sample.liveParticles);
        peakTweens = Math.max(peakTweens, sample.activeTweens);
        await new Promise((resolve) => requestAnimationFrame(resolve));
      }
      const after = api.getParticlePerf();
      return { idle, peakLive, peakTweens, after };
    });

    console.log(
      `[perf] burst-storm: idleLive=${storm.idle.liveParticles} ` +
        `peakLive=${storm.peakLive} peakTweens=${storm.peakTweens} afterLive=${storm.after.liveParticles}`,
    );

    expect(storm.peakLive).toBeGreaterThan(0);
    // Bursts are short-lived: after the sampling window the layer drains.
    expect(storm.after.liveParticles).toBeLessThan(storm.peakLive);
    expect(errors).toEqual([]);
  });

  test('unicorn glitter ambient: sustained particle pressure', async ({ page }) => {
    const errors = collectPageErrors(page);
    await bootRun(page);

    const ambient = await page.evaluate(async () => {
      const api = window.snakeE2E!;
      const idle = api.getParticlePerf();
      let peakLive = 0;
      let peakTweens = 0;
      let peakTrail = 0;
      api.startUnicornGlitter();
      const started = performance.now();
      while (performance.now() - started < 2000) {
        const sample = api.getParticlePerf();
        peakLive = Math.max(peakLive, sample.liveParticles);
        peakTweens = Math.max(peakTweens, sample.activeTweens);
        peakTrail = Math.max(peakTrail, sample.unicornTrail);
        await new Promise((resolve) => requestAnimationFrame(resolve));
      }
      api.stopUnicornGlitter();
      await new Promise((resolve) => setTimeout(resolve, 600));
      const after = api.getParticlePerf();
      return { idle, peakLive, peakTweens, peakTrail, after };
    });

    console.log(
      `[perf] unicorn-ambient: idleLive=${ambient.idle.liveParticles} ` +
        `peakLive=${ambient.peakLive} peakTweens=${ambient.peakTweens} peakTrail=${ambient.peakTrail} ` +
        `afterStopLive=${ambient.after.liveParticles}`,
    );

    // The ambient effect must actually produce sustained pressure (that is
    // the point of the probe) and must drain after stopping.
    expect(ambient.peakTrail).toBeGreaterThan(0);
    expect(ambient.peakLive).toBeGreaterThan(ambient.idle.liveParticles);
    expect(errors).toEqual([]);
  });
});
