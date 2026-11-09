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
      getShellPerf(): { frames: number; ms: number; avgMsPerFrame: number };
      resetShellPerf(): void;
    };
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
  test('pause menu scroll: touch flood stays far below one rebuild per event', async ({
    page,
  }) => {
    // Regression guard for the phone slow-scroll bug. A phone touch-sampler
    // reports at 120-240 Hz, so a swipe delivers a burst of pointer samples
    // to the page in one or two frames. Pre-fix, every one of those samples
    // caused a full content rebuild (~13ms each on desktop hardware); the
    // flood below must instead cause at most one rebuild per rendered frame.
    //
    // The flood is a single main-thread burst of synthetic mouse events
    // (mousedown + 200 mousemove + mouseup) — the same scene pointermove
    // path a phone touch-sampler feeds, without 200 awaited CDP round-trips
    // (which would be throttled by the browser rather than the game) and
    // without relying on Phaser's touch manager (disabled in headless
    // desktop because Phaser gates touch input on Device.input.touch).
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

    // Fire the flood: mousedown, then 200 mousemove samples of 3px each,
    // all in one main-thread turn, then mouseup.
    const logicalStart = {
      x: target!.x + target!.width * 0.35,
      y: target!.y + target!.height - 14,
    };
    const floodMs = await page.evaluate(
      ({ sx, sy, logicalW, logicalH }) => {
        const canvas = document.querySelector('#game-shell canvas') as HTMLCanvasElement;
        const rect = canvas.getBoundingClientRect();
        const toClientX = (lx: number) => rect.left + (lx / logicalW) * rect.width;
        const toClientY = (ly: number) => rect.top + (ly / logicalH) * rect.height;
        const fire = (type: string, x: number, y: number) => {
          canvas.dispatchEvent(
            new MouseEvent(type, {
              bubbles: true,
              cancelable: true,
              composed: true,
              button: 0,
              buttons: type === 'mouseup' ? 0 : 1,
              clientX: x,
              clientY: y,
            }),
          );
        };
        const startX = toClientX(sx);
        const startY = toClientY(sy);
        const started = performance.now();
        fire('mousedown', startX, startY);
        for (let step = 1; step <= 200; step++) {
          fire('mousemove', startX, startY - step * 3);
        }
        fire('mouseup', startX, startY - 200 * 3);
        return performance.now() - started;
      },
      {
        sx: logicalStart.x,
        sy: logicalStart.y,
        logicalW: LOGICAL_W,
        logicalH: LOGICAL_H,
      },
    );

    // Let a few frames run so the coalesced rebuild is due and can flush.
    await page.waitForTimeout(250);

    const perf = await page.evaluate(() => window.snakeE2E!.getScrollPerf());
    console.log(
      `[perf] pause-scroll: events=${perf.events} rebuilds=${perf.rebuilds} ` +
        `rebuildMs=${perf.rebuildTimeMs.toFixed(1)} floodMs=${floodMs.toFixed(1)} ` +
        `offset=${Math.round(perf.offset)}`,
    );

    // The flood must actually scroll the list.
    expect(perf.events).toBeGreaterThan(100);
    expect(perf.offset).toBeGreaterThan(0);
    // The work must stay bounded by rendered frames, not pointer samples:
    // a full rebuild is due at most once per frame, and a 200-sample burst
    // lands in one or two frames.
    expect(perf.rebuilds).toBeLessThanOrEqual(6);
    // The animated shell redraw is the menu's steady per-frame JS cost; it
    // has to stay small so the menu stays responsive on phones.
    const shell = await page.evaluate(() => window.snakeE2E!.getShellPerf());
    expect(shell.frames).toBeGreaterThan(0);
    expect(shell.avgMsPerFrame).toBeLessThan(5);
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
    // A 126-particle storm is one batched Graphics per burst: live objects
    // and tweens must stay near the ambient floor, not scale with the
    // particle count (legacy: 128 live objects, 154 tweens for this storm).
    expect(storm.peakLive).toBeLessThanOrEqual(12);
    expect(storm.peakTweens).toBeLessThanOrEqual(40);
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

    // Trails must still be produced (the effect still works), and the
    // whole ambient effect must cost about one batched render object plus
    // no per-particle tweens (legacy: ~45 live objects, ~70 tweens
    // sustained while active).
    expect(ambient.peakTrail).toBeGreaterThan(0);
    expect(ambient.peakLive).toBeLessThanOrEqual(ambient.idle.liveParticles + 6);
    expect(ambient.peakTweens).toBeLessThanOrEqual(ambient.idle.activeTweens + 10);
    expect(errors).toEqual([]);
  });
});
